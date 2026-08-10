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
   * Helper / alias method to start indexing with positional arguments
   * @param {string|mongoose.Types.ObjectId} repositoryId
   * @param {string} [commitSha]
   * @param {string} [branch]
   * @param {string|mongoose.Types.ObjectId} [userId]
   * @returns {Promise<object>}
   */
  async startIndexing(repositoryId, commitSha = null, branch = null, userId = null) {
    return await this.indexRepository(repositoryId, { commitSha, branch });
  }

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

    // Set indexing status to "indexing" with timestamp and stage
    repository.indexing.status = "indexing";
    repository.indexing.stage = "fetching_files";
    repository.indexing.startedAt = new Date();
    repository.indexing.error = null;
    await repository.save();

    let snapshot = null;
    const unsupportedFiles = [];

    try {
      const ownerId = options.userId || repository.ownerId;
      if (ownerId && String(repository.ownerId) !== String(ownerId)) {
        repository.ownerId = ownerId;
        await repository.save().catch(() => {});
      }
      const owner = repository.github.owner;
      const repo = repository.github.name;
      let defaultBranch = options.branch || repository.github.defaultBranch || "main";
      let commitSha = (options.commitSha && options.commitSha !== "HEAD") ? options.commitSha : null;
      let commitMessage = "Indexed by StructurAI";
      let commitAuthor = owner;

      console.log(`[INDEX] Starting repository indexing for ${owner}/${repo} (${repository._id})`);

      // 2. Fetch HEAD Commit SHA via GitHub Service (if not provided or "HEAD")
      if (!commitSha) {
        try {
          const branchData = await githubService.getBranch(ownerId, owner, repo, defaultBranch);
          if (branchData && branchData.commit) {
            commitSha = branchData.commit.sha;
            commitMessage = branchData.commit.commit?.message || commitMessage;
            commitAuthor = branchData.commit.commit?.author?.name || commitAuthor;
          }
        } catch (branchErr) {
          try {
            // Attempt resolving actual default branch if specified branch failed
            const repoDetails = await githubService.getRepositoryDetails(ownerId, owner, repo);
            if (repoDetails && repoDetails.default_branch) {
              defaultBranch = repoDetails.default_branch;
              repository.github.defaultBranch = defaultBranch;
              await repository.save();

              const branchData = await githubService.getBranch(ownerId, owner, repo, defaultBranch);
              if (branchData && branchData.commit) {
                commitSha = branchData.commit.sha;
                commitMessage = branchData.commit.commit?.message || commitMessage;
                commitAuthor = branchData.commit.commit?.author?.name || commitAuthor;
              }
            }
          } catch (repoErr) {
            // Fallback to defaultBranch name as ref
            commitSha = defaultBranch;
          }
        }
      }

      if (!commitSha || commitSha === "HEAD") {
        commitSha = defaultBranch;
      }

      console.log(`[INDEX] Resolved commit SHA ${commitSha} on branch ${defaultBranch}`);

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
      console.log(`[INDEX] Stage: fetching_files for ${owner}/${repo}`);
      let sourceFiles = [];

      if (options.providedFiles && Array.isArray(options.providedFiles)) {
        sourceFiles = options.providedFiles;
      } else {
        sourceFiles = await this.retrieveRepositoryFiles(ownerId, owner, repo, commitSha, defaultBranch);
      }

      if (!sourceFiles || sourceFiles.length === 0) {
        throw new Error(`No indexable source files found in ${owner}/${repo}. Check repository content or access permissions.`);
      }

      console.log(`[INDEX] Fetched ${sourceFiles.length} source files`);

      // 5. AST Parsing & Symbol/Relation Extraction
      console.log(`[INDEX] Stage: parsing_ast for ${owner}/${repo}`);
      repository.indexing.stage = "parsing_ast";
      await repository.save().catch(() => {});

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
          console.warn(`[INDEX] Skipped file ${file.path} due to parsing error:`, safeErr);
          unsupportedFiles.push(file.path);
        }
      }

      // 6. Bulk Insertion & Linking of CodeSymbol records
      console.log(`[INDEX] Stage: building_symbols (${rawSymbolsToInsert.length} symbols)`);
      repository.indexing.stage = "building_symbols";
      await repository.save().catch(() => {});

      let createdSymbols = [];
      if (rawSymbolsToInsert.length > 0) {
        createdSymbols = await CodeSymbol.insertMany(rawSymbolsToInsert, { ordered: false });
      }

      // Build Map for fast ID resolution
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
      console.log(`[INDEX] Stage: building_relations (${rawRelationsToProcess.length} relations)`);
      repository.indexing.stage = "building_relations";
      await repository.save().catch(() => {});

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
      console.log(`[INDEX] Stage: complete for ${owner}/${repo}`);
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
      repository.indexing.stage = "complete";
      repository.indexing.lastIndexedCommit = commitSha;
      repository.indexing.lastIndexedAt = new Date();
      repository.indexing.error = null;
      await repository.save();

      console.log(`[INDEX] Successfully indexed ${owner}/${repo}: ${parsedFileCount} files, ${createdSymbols.length} symbols, ${createdRelations.length} relations`);

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
      console.error(`[INDEX] FAILED indexing repository ${repositoryId}:`, sanitizedErrMsg);

      // On failure, set Repository.indexing.status = "failed"
      repository.indexing.status = "failed";
      repository.indexing.stage = "failed";
      repository.indexing.error = sanitizedErrMsg;
      await repository.save().catch(() => {});

      if (snapshot) {
        snapshot.status = "failed";
        await snapshot.save().catch(() => {});
      }

      throw new Error(sanitizedErrMsg);
    }
  }

  /**
   * Recursively retrieve files using GitHub API
   */
  async retrieveRepositoryFiles(userId, owner, repo, commitSha, defaultBranch) {
    const files = [];
    const treeRef = (commitSha && commitSha !== "HEAD") ? commitSha : defaultBranch;

    try {
      // 1. Try Git Trees API (recursive, fast)
      const treeData = await githubService.getGitTree(userId, owner, repo, treeRef, true);

      if (treeData && Array.isArray(treeData.tree)) {
        const eligibleItems = treeData.tree.filter(
          (item) => item.type === "blob" && !shouldIgnorePath(item.path) && Boolean(detectLanguage(item.path))
        );

        const batchSize = 10;
        for (let i = 0; i < eligibleItems.length; i += batchSize) {
          const batch = eligibleItems.slice(i, i + batchSize);
          const results = await Promise.all(
            batch.map(async (item) => {
              try {
                let content = "";
                if (item.sha) {
                  const blob = await githubService.getGitBlob(userId, owner, repo, item.sha);
                  if (blob && blob.content) {
                    content = Buffer.from(
                      blob.content,
                      blob.encoding === "base64" ? "base64" : "utf8"
                    ).toString("utf8");
                  }
                } else {
                  const fileContent = await githubService.getRepositoryContents(
                    userId,
                    owner,
                    repo,
                    item.path,
                    treeRef
                  );
                  if (fileContent && fileContent.content) {
                    content = Buffer.from(
                      fileContent.content,
                      fileContent.encoding === "base64" ? "base64" : "utf8"
                    ).toString("utf8");
                  }
                }
                return { path: item.path, content };
              } catch (blobErr) {
                console.warn(`[IndexerService] Skipping file ${item.path}:`, sanitizeError(blobErr.message));
                return null;
              }
            })
          );

          results.forEach((res) => {
            if (res && res.content !== undefined) {
              files.push(res);
            }
          });
        }
        return files;
      }
    } catch (treeErr) {
      console.warn(`[IndexerService] Git Trees API failed for ref ${treeRef}, falling back to contents traversal:`, sanitizeError(treeErr.message));
    }

    // 2. Fallback: Recursive Contents Traversal
    const queue = [""];
    const visited = new Set();
    while (queue.length > 0) {
      const currentPath = queue.shift();
      if (visited.has(currentPath)) continue;
      visited.add(currentPath);

      try {
        const contents = await githubService.getRepositoryContents(userId, owner, repo, currentPath, treeRef);
        const items = Array.isArray(contents) ? contents : [contents];

        for (const item of items) {
          if (!item) continue;
          if (shouldIgnorePath(item.path)) continue;

          if (item.type === "dir") {
            queue.push(item.path);
          } else if (item.type === "file") {
            const lang = detectLanguage(item.path);
            if (lang) {
              try {
                let content = "";
                if (item.content) {
                  content = Buffer.from(item.content, item.encoding === "base64" ? "base64" : "utf8").toString("utf8");
                } else {
                  const fetchedFile = await githubService.getFileContent(userId, owner, repo, item.path, treeRef);
                  if (fetchedFile && fetchedFile.content) {
                    content = typeof fetchedFile.content === "string" ? fetchedFile.content : String(fetchedFile.content);
                  }
                }
                files.push({ path: item.path, content });
              } catch (fileErr) {
                console.warn(`[INDEX] Error fetching content for file ${item.path}:`, sanitizeError(fileErr.message));
              }
            }
          }
        }
      } catch (err) {
        console.warn(`[INDEX] Error traversing path ${currentPath}:`, sanitizeError(err.message));
      }
    }

    return files;
  }
}

const indexerService = new IndexerService();

module.exports = indexerService;
module.exports.IndexerService = IndexerService;
module.exports.indexerService = indexerService;
