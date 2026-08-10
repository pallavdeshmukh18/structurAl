const mongoose = require("mongoose");
const {
  Repository,
  RepositorySnapshot,
  CodeSymbol,
  CodeRelation,
} = require("../models");
const githubService = require("../integrations/github/github.service");
const { parseSourceFile, shouldIgnorePath, detectLanguage } = require("./parser/ast.parser");
const { sanitizeError } = require("../utils/sanitizer");

class IndexerService {
  /**
   * Main Indexing Pipeline Entrypoint
   * @param {string|mongoose.Types.ObjectId} repositoryId
   * @param {object} [options]
   * @param {string} [options.branch] Optional branch override
   * @param {string} [options.commitSha] Optional commit SHA override
   * @param {Array<{path: string, content: string}>} [options.providedFiles] Optional in-memory files for testing
   * @returns {Promise<object>} Indexing summary result
   */
  async indexRepository(repositoryId, options = {}) {
    if (!repositoryId || !mongoose.Types.ObjectId.isValid(repositoryId)) {
      throw new Error(`Invalid repositoryId: ${repositoryId}`);
    }

    // 1. Verification: Ensure repository exists in MongoDB
    const repository = await Repository.findById(repositoryId);
    if (!repository) {
      throw new Error(`Repository with ID ${repositoryId} not found in database.`);
    }

    // Set indexing status to "indexing"
    repository.indexing.status = "indexing";
    repository.indexing.error = null;
    await repository.save();

    let snapshot = null;
    const unsupportedFiles = [];

    try {
      const ownerId = repository.ownerId;
      const owner = repository.github.owner;
      const repo = repository.github.name;
      const defaultBranch = options.branch || repository.github.defaultBranch || "main";

      let commitSha = options.commitSha || null;
      let commitMessage = "Indexed by StructurAI";
      let commitAuthor = owner;

      // 2. Fetch HEAD Commit SHA via GitHub Service (if not provided)
      if (!commitSha) {
        try {
          const branchData = await githubService.getBranch(ownerId, owner, repo, defaultBranch);
          if (branchData && branchData.commit) {
            commitSha = branchData.commit.sha;
            commitMessage = branchData.commit.commit?.message || commitMessage;
            commitAuthor = branchData.commit.commit?.author?.name || commitAuthor;
          }
        } catch (branchErr) {
          // Fallback to latest commit ref
          try {
            const commitData = await githubService.getCommit(ownerId, owner, repo, defaultBranch);
            commitSha = commitData.sha;
            commitMessage = commitData.commit?.message || commitMessage;
            commitAuthor = commitData.commit?.author?.name || commitAuthor;
          } catch (commitErr) {
            // If direct API fails, generate consistent fallback SHA or use last known
            commitSha = repository.indexing.lastIndexedCommit || `head-${Date.now()}`;
          }
        }
      }

      // 3. Snapshot & Idempotency: Overwrite/Clean up prior symbols/relations if snapshot exists
      snapshot = await RepositorySnapshot.findOne({
        repositoryId: repository._id,
        "commit.sha": commitSha,
      });

      if (snapshot) {
        // Clean up previous records for this snapshot to prevent duplicates
        await Promise.all([
          CodeSymbol.deleteMany({ repositoryId: repository._id, snapshotId: snapshot._id }),
          CodeRelation.deleteMany({ repositoryId: repository._id, snapshotId: snapshot._id }),
        ]);

        snapshot.status = "indexing";
        snapshot.startedAt = new Date();
        snapshot.completedAt = null;
        snapshot.stats = { files: 0, lines: 0, functions: 0, classes: 0, routes: 0 };
        await snapshot.save();
      } else {
        snapshot = await RepositorySnapshot.create({
          repositoryId: repository._id,
          commit: {
            sha: commitSha,
            branch: defaultBranch,
            message: commitMessage,
            author: commitAuthor,
          },
          status: "indexing",
          startedAt: new Date(),
          stats: { files: 0, lines: 0, functions: 0, classes: 0, routes: 0 },
        });
      }

      // 4. File Retrieval: Recursively retrieve repository source files
      let sourceFiles = [];

      if (options.providedFiles && Array.isArray(options.providedFiles)) {
        sourceFiles = options.providedFiles;
      } else {
        sourceFiles = await this.retrieveRepositoryFiles(ownerId, owner, repo, commitSha, defaultBranch);
      }

      // 5. AST Parsing & Symbol/Relation Extraction
      const rawSymbolsToInsert = [];
      const rawRelationsToProcess = [];
      let totalLines = 0;
      let functionCount = 0;
      let classCount = 0;
      let routeCount = 0;
      let parsedFileCount = 0;

      for (const file of sourceFiles) {
        if (shouldIgnorePath(file.path)) {
          continue;
        }

        const lang = detectLanguage(file.path);
        if (!lang) {
          unsupportedFiles.push(file.path);
          continue;
        }

        try {
          const parseResult = parseSourceFile(file.path, file.content || "");
          parsedFileCount++;
          totalLines += parseResult.lineCount || 0;

          for (const sym of parseResult.symbols) {
            if (sym.symbol.type === "function" || sym.symbol.type === "method") functionCount++;
            if (sym.symbol.type === "class" || sym.symbol.type === "interface") classCount++;
            if (sym.symbol.type === "route") routeCount++;

            rawSymbolsToInsert.push({
              repositoryId: repository._id,
              snapshotId: snapshot._id,
              filePath: sym.filePath,
              symbol: sym.symbol,
              location: sym.location,
              signature: sym.signature,
              metadata: sym.metadata,
              codeHash: sym.codeHash,
              parentTempId: sym.parentTempId || null,
              tempId: sym.tempId || null,
            });
          }

          for (const rel of parseResult.relations) {
            rawRelationsToProcess.push({
              repositoryId: repository._id,
              snapshotId: snapshot._id,
              filePath: file.path,
              ...rel,
            });
          }
        } catch (parseErr) {
          const safeErr = sanitizeError(parseErr.message || parseErr);
          console.warn(`[IndexerService] Skipped file ${file.path} (repository: ${repository._id}, snapshot: ${snapshot._id}) due to parsing error:`, safeErr);
          unsupportedFiles.push(file.path);
        }
      }

      // 6. Bulk Insertion & Linking of CodeSymbol records
      let createdSymbols = [];
      if (rawSymbolsToInsert.length > 0) {
        createdSymbols = await CodeSymbol.insertMany(rawSymbolsToInsert, { ordered: false });
      }

      // Build Map for fast ID resolution: tempId -> MongoDB _id, and symbolName -> MongoDB _id
      const tempIdToObjectId = new Map();
      const nameToSymbolMap = new Map();

      createdSymbols.forEach((sym, idx) => {
        const raw = rawSymbolsToInsert[idx];
        if (raw && raw.tempId) {
          tempIdToObjectId.set(raw.tempId, sym._id);
        }
        nameToSymbolMap.set(sym.symbol.name, sym._id);
        nameToSymbolMap.set(`${sym.filePath}:${sym.symbol.name}`, sym._id);
      });

      // Update parentSymbolId if any symbols had parentTempIds
      const parentUpdateOps = [];
      rawSymbolsToInsert.forEach((raw, idx) => {
        if (raw.parentTempId && tempIdToObjectId.has(raw.parentTempId)) {
          const parentObjectId = tempIdToObjectId.get(raw.parentTempId);
          const childSym = createdSymbols[idx];
          parentUpdateOps.push(
            CodeSymbol.updateOne({ _id: childSym._id }, { $set: { parentSymbolId: parentObjectId } })
          );
        }
      });

      if (parentUpdateOps.length > 0) {
        await Promise.all(parentUpdateOps);
      }

      // 7. Resolve and Bulk Insert CodeRelation records
      const relationsToInsert = [];
      for (const rel of rawRelationsToProcess) {
        const sourceSymbolId = rel.sourceTempId ? tempIdToObjectId.get(rel.sourceTempId) : null;
        let targetSymbolId = null;

        if (rel.targetName) {
          targetSymbolId =
            nameToSymbolMap.get(`${rel.filePath}:${rel.targetName}`) ||
            nameToSymbolMap.get(rel.targetName) ||
            null;
        }

        // If both source and target symbols are resolved in the graph
        if (sourceSymbolId && targetSymbolId) {
          relationsToInsert.push({
            repositoryId: repository._id,
            snapshotId: snapshot._id,
            sourceSymbolId,
            targetSymbolId,
            relationType: rel.relationType,
            metadata: {
              filePath: rel.filePath,
              line: rel.line || 1,
            },
          });
        }
      }

      let createdRelations = [];
      if (relationsToInsert.length > 0) {
        createdRelations = await CodeRelation.insertMany(relationsToInsert, { ordered: false });
      }

      // 8. Update Snapshot Stats & Status
      snapshot.stats = {
        files: parsedFileCount,
        lines: totalLines,
        functions: functionCount,
        classes: classCount,
        routes: routeCount,
      };
      snapshot.status = "completed";
      snapshot.completedAt = new Date();
      await snapshot.save();

      // 9. Update Repository State to "ready"
      repository.indexing.status = "ready";
      repository.indexing.lastIndexedCommit = commitSha;
      repository.indexing.lastIndexedAt = new Date();
      repository.indexing.error = null;
      await repository.save();

      return {
        success: true,
        repositoryId: repository._id.toString(),
        repositoryName: repository.github.fullName,
        snapshotId: snapshot._id.toString(),
        commitSha,
        stats: {
          filesIndexed: parsedFileCount,
          totalLines,
          symbolsCreated: createdSymbols.length,
          relationsCreated: createdRelations.length,
          functions: functionCount,
          classes: classCount,
          routes: routeCount,
        },
        unsupportedFiles,
      };
    } catch (err) {
      const sanitizedErrMsg = sanitizeError(err.message || err);
      console.error(`[IndexerService] Error indexing repository ${repositoryId}:`, sanitizedErrMsg);

      // On failure, set Repository.indexing.status = "failed"
      repository.indexing.status = "failed";
      repository.indexing.error = sanitizedErrMsg;
      await repository.save();

      if (snapshot) {
        snapshot.status = "failed";
        await snapshot.save();
      }

      throw new Error(sanitizedErrMsg);
    }
  }

  /**
   * Recursively retrieve files using GitHub API
   */
  async retrieveRepositoryFiles(userId, owner, repo, commitSha, defaultBranch) {
    const files = [];

    try {
      // 1. Try Git Trees API (recursive, fast)
      const treeRef = commitSha || defaultBranch;
      const treeData = await githubService.getGitTree(userId, owner, repo, treeRef, true);

      if (treeData && Array.isArray(treeData.tree)) {
        for (const item of treeData.tree) {
          if (item.type === "blob" && !shouldIgnorePath(item.path)) {
            const lang = detectLanguage(item.path);
            if (lang) {
              try {
                // Fetch file blob content
                let content = "";
                if (item.sha) {
                  const blob = await githubService.getGitBlob(userId, owner, repo, item.sha);
                  if (blob && blob.content) {
                    content = Buffer.from(blob.content, blob.encoding === "base64" ? "base64" : "utf8").toString("utf8");
                  }
                } else {
                  const fileContent = await githubService.getRepositoryContents(userId, owner, repo, item.path, commitSha);
                  if (fileContent && fileContent.content) {
                    content = Buffer.from(fileContent.content, fileContent.encoding === "base64" ? "base64" : "utf8").toString("utf8");
                  }
                }
                files.push({ path: item.path, content });
              } catch (blobErr) {
                console.warn(`[IndexerService] Skipping file ${item.path}:`, sanitizeError(blobErr.message));
              }
            }
          }
        }
        return files;
      }
    } catch (treeErr) {
      console.warn(`[IndexerService] Git Trees API failed, falling back to contents traversal:`, sanitizeError(treeErr.message));
    }

    // 2. Fallback: Recursive Contents Traversal
    const queue = [""];
    while (queue.length > 0) {
      const currentPath = queue.shift();
      try {
        const contents = await githubService.getRepositoryContents(userId, owner, repo, currentPath, commitSha);
        const items = Array.isArray(contents) ? contents : [contents];

        for (const item of items) {
          if (!item) continue;
          if (shouldIgnorePath(item.path)) continue;

          if (item.type === "dir") {
            queue.push(item.path);
          } else if (item.type === "file") {
            const lang = detectLanguage(item.path);
            if (lang) {
              let content = "";
              if (item.content) {
                content = Buffer.from(item.content, item.encoding === "base64" ? "base64" : "utf8").toString("utf8");
              }
              files.push({ path: item.path, content });
            }
          }
        }
      } catch (err) {
        console.warn(`[IndexerService] Error traversing path ${currentPath}:`, sanitizeError(err.message));
      }
    }

    return files;
  }
}

const indexerService = new IndexerService();

module.exports = {
  IndexerService,
  indexerService,
};
