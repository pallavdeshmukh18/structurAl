const Repository = require("../../models/Repository");
const RepositorySnapshot = require("../../models/RepositorySnapshot");
const CodeSymbol = require("../../models/CodeSymbol");
const CodeRelation = require("../../models/CodeRelation");
const githubService = require("../../services/github.service");
const mongoose = require("mongoose");

/**
 * List user repositories
 * GET /api/repositories
 */
const listUserRepositories = async (req, res) => {
  try {
    const userId = req.user._id;

    const repositories = await Repository.find({ ownerId: userId })
      .sort({ updatedAt: -1 });

    return res.json({ repositories });
  } catch (error) {
    console.error("Error listing user repositories:", error.message);
    return res.status(500).json({ error: "Failed to list repositories" });
  }
};

/**
 * Connect a GitHub repository
 * POST /api/repositories/connect
 */
const connectRepository = async (req, res) => {
  try {
    const userId = req.user._id;
    const { owner, name } = req.body;

    if (!owner || !name) {
      return res.status(400).json({ error: "Repository owner and name are required" });
    }

    // 1. Verify access via GitHub API
    let githubRepo;
    try {
      githubRepo = await githubService.getRepositoryDetails(userId, owner, name);
    } catch (err) {
      return res.status(404).json({ error: "GitHub repository not found or access denied" });
    }

    // 2. Check if already connected by this user
    let existingRepo = await Repository.findOne({
      "github.githubId": githubRepo.id,
      ownerId: userId,
    });

    if (existingRepo) {
      return res.status(200).json({
        message: "Repository already connected",
        repository: existingRepo,
      });
    }

    // 3. Create repository record
    const repository = await Repository.create({
      ownerId: userId,
      github: {
        githubId: githubRepo.id,
        owner: githubRepo.owner.login,
        name: githubRepo.name,
        fullName: githubRepo.full_name,
        defaultBranch: githubRepo.default_branch || "main",
        url: githubRepo.html_url,
      },
      visibility: githubRepo.private ? "private" : "public",
      status: "active",
    });

    return res.status(201).json({
      message: "Repository connected successfully",
      repository,
    });
  } catch (error) {
    console.error("Error connecting repository:", error.message);
    return res.status(500).json({ error: "Failed to connect repository" });
  }
};

/**
 * Get repository details by ID
 * GET /api/repositories/:id
 */
const getRepositoryById = async (req, res) => {
  try {
    const userId = req.user._id;
    const repoId = req.params.id;

    if (!mongoose.Types.ObjectId.isValid(repoId)) {
      return res.status(404).json({ error: "Repository not found" });
    }

    const repository = await Repository.findOne({ _id: repoId, ownerId: userId });

    if (!repository) {
      return res.status(404).json({ error: "Repository not found" });
    }

    return res.json({ repository });
  } catch (error) {
    console.error("Error getting repository by ID:", error.message);
    return res.status(500).json({ error: "Failed to fetch repository" });
  }
};

/**
 * Trigger manual repository indexing
 * POST /api/repositories/:id/index
 */
const triggerRepositoryIndexing = async (req, res) => {
  try {
    const userId = req.user._id;
    const repoId = req.params.id;
    const { branch } = req.body;

    if (!mongoose.Types.ObjectId.isValid(repoId)) {
      return res.status(404).json({ error: "Repository not found" });
    }

    const repository = await Repository.findOne({ _id: repoId, ownerId: userId });
    if (!repository) {
      return res.status(404).json({ error: "Repository not found" });
    }

    const targetBranch = branch || repository.github.defaultBranch || "main";

    // Fetch latest commit SHA
    let commitSha;
    try {
      const branchDetails = await githubService.getBranchDetails(
        userId,
        repository.github.owner,
        repository.github.name,
        targetBranch
      );
      commitSha = branchDetails.commit.sha;
    } catch (err) {
      return res.status(400).json({ error: `Failed to fetch branch details for ${targetBranch}` });
    }

    // Trigger async indexing
    const indexerService = require("../../services/indexer.service");
    const snapshot = await indexerService.startIndexing(
      repository._id,
      commitSha,
      targetBranch,
      userId
    );

    return res.status(202).json({
      message: "Indexing job started successfully",
      snapshot,
    });
  } catch (error) {
    console.error("Error triggering indexing:", error.message);
    return res.status(500).json({ error: "Failed to trigger indexing" });
  }
};

/**
 * Get repository indexing snapshots
 * GET /api/repositories/:id/snapshots
 */
const getRepositorySnapshots = async (req, res) => {
  try {
    const userId = req.user._id;
    const repoId = req.params.id;

    if (!mongoose.Types.ObjectId.isValid(repoId)) {
      return res.status(404).json({ error: "Repository not found" });
    }

    const repository = await Repository.findOne({ _id: repoId, ownerId: userId });
    if (!repository) {
      return res.status(404).json({ error: "Repository not found" });
    }

    const snapshots = await RepositorySnapshot.find({ repositoryId: repoId })
      .sort({ createdAt: -1 })
      .limit(20);

    return res.json({ snapshots });
  } catch (error) {
    console.error("Error fetching repository snapshots:", error.message);
    return res.status(500).json({ error: "Failed to fetch snapshots" });
  }
};

/**
 * Get symbols for a repository/snapshot
 * GET /api/repositories/:id/symbols?snapshotId=...&filePath=...
 */
const getRepositorySymbols = async (req, res) => {
  try {
    const userId = req.user._id;
    const repoId = req.params.id;
    const { snapshotId, filePath } = req.query;

    if (!mongoose.Types.ObjectId.isValid(repoId)) {
      return res.status(404).json({ error: "Repository not found" });
    }

    const repository = await Repository.findOne({ _id: repoId, ownerId: userId });
    if (!repository) {
      return res.status(404).json({ error: "Repository not found" });
    }

    const query = { repositoryId: repoId };
    if (snapshotId && mongoose.Types.ObjectId.isValid(snapshotId)) {
      query.snapshotId = snapshotId;
    }
    if (filePath) {
      query.filePath = filePath;
    }

    const symbols = await CodeSymbol.find(query)
      .sort({ "location.startLine": 1 })
      .limit(500);

    return res.json({ count: symbols.length, symbols });
  } catch (error) {
    console.error("Error fetching repository symbols:", error.message);
    return res.status(500).json({ error: "Failed to fetch symbols" });
  }
};

/**
 * Get relations for a repository/snapshot
 * GET /api/repositories/:id/relations?snapshotId=...
 */
const getRepositoryRelations = async (req, res) => {
  try {
    const userId = req.user._id;
    const repoId = req.params.id;
    const { snapshotId } = req.query;

    if (!mongoose.Types.ObjectId.isValid(repoId)) {
      return res.status(404).json({ error: "Repository not found" });
    }

    const repository = await Repository.findOne({ _id: repoId, ownerId: userId });
    if (!repository) {
      return res.status(404).json({ error: "Repository not found" });
    }

    const query = { repositoryId: repoId };
    if (snapshotId && mongoose.Types.ObjectId.isValid(snapshotId)) {
      query.snapshotId = snapshotId;
    }

    const relations = await CodeRelation.find(query)
      .populate("sourceSymbolId")
      .populate("targetSymbolId")
      .limit(500);

    return res.json({ count: relations.length, relations });
  } catch (error) {
    console.error("Error fetching repository relations:", error.message);
    return res.status(500).json({ error: "Failed to fetch relations" });
  }
};

/**
 * Get the file tree for a repository
 * GET /api/repositories/:id/tree?path=...
 */
const getRepositoryTree = async (req, res) => {
  try {
    const userId = req.user._id;
    const repoId = req.params.id;
    const path = req.query.path || "";

    if (!mongoose.Types.ObjectId.isValid(repoId)) {
      return res.status(404).json({ error: "Repository not found" });
    }

    const repository = await Repository.findOne({ _id: repoId, ownerId: userId });
    if (!repository) {
      return res.status(404).json({ error: "Repository not found" });
    }

    const { owner, name, defaultBranch } = repository.github;
    
    // Get the full recursive tree for the default branch
    const treeData = await githubService.getGitTree(userId, owner, name, defaultBranch, true);

    return res.json({ tree: treeData.tree || [] });
  } catch (error) {
    console.error("Error fetching repository tree:", error.message);
    return res.status(500).json({ error: "Failed to fetch repository tree" });
  }
};

/**
 * Get file content for a repository
 * GET /api/repositories/:id/contents?path=...
 */
const getRepositoryFileContent = async (req, res) => {
  try {
    const userId = req.user._id;
    const repoId = req.params.id;
    const path = req.query.path;

    if (!path) {
      return res.status(400).json({ error: "Path parameter is required" });
    }

    if (!mongoose.Types.ObjectId.isValid(repoId)) {
      return res.status(404).json({ error: "Repository not found" });
    }

    const repository = await Repository.findOne({ _id: repoId, ownerId: userId });
    if (!repository) {
      return res.status(404).json({ error: "Repository not found" });
    }

    const { owner, name, defaultBranch } = repository.github;
    const fileData = await githubService.getFileContent(userId, owner, name, path, defaultBranch);

    return res.json(fileData);
  } catch (error) {
    console.error("Error fetching repository file content:", error.message);
    return res.status(500).json({ error: "Failed to fetch file content" });
  }
};

/**
 * Get Pull Requests for a repository
 * GET /api/repositories/:id/pulls
 */
const getRepositoryPullRequests = async (req, res) => {
  try {
    const userId = req.user._id;
    const repoId = req.params.id;
    const state = req.query.state || "open";

    if (!mongoose.Types.ObjectId.isValid(repoId)) {
      return res.status(404).json({ error: "Repository not found" });
    }

    const repository = await Repository.findOne({ _id: repoId, ownerId: userId });
    if (!repository) {
      return res.status(404).json({ error: "Repository not found" });
    }

    const { owner, name } = repository.github;
    const pulls = await githubService.getPullRequests(userId, owner, name, state);

    return res.json({ pulls });
  } catch (error) {
    console.error("Error fetching repository pull requests:", error.message);
    return res.status(500).json({ error: "Failed to fetch pull requests" });
  }
};

/**
 * Get Pull Request details with diff
 * GET /api/repositories/:id/pulls/:pullNumber
 */
const getRepositoryPullRequestDetails = async (req, res) => {
  try {
    const userId = req.user._id;
    const repoId = req.params.id;
    const pullNumber = parseInt(req.params.pullNumber, 10);

    if (isNaN(pullNumber)) {
      return res.status(400).json({ error: "Invalid pull request number" });
    }

    if (!mongoose.Types.ObjectId.isValid(repoId)) {
      return res.status(404).json({ error: "Repository not found" });
    }

    const repository = await Repository.findOne({ _id: repoId, ownerId: userId });
    if (!repository) {
      return res.status(404).json({ error: "Repository not found" });
    }

    const { owner, name } = repository.github;
    const pullDetails = await githubService.getPullRequestDetails(userId, owner, name, pullNumber);

    return res.json(pullDetails);
  } catch (error) {
    console.error("Error fetching pull request details:", error.message);
    return res.status(500).json({ error: "Failed to fetch pull request details" });
  }
};

/**
 * Get normalized repository dependency graph
 * GET /api/repositories/:id/graph
 */
const getRepositoryGraph = async (req, res) => {
  try {
    const userId = req.user._id;
    const repoId = req.params.id;
    const { snapshotId, filePath, limit } = req.query;

    if (!mongoose.Types.ObjectId.isValid(repoId)) {
      return res.status(404).json({ error: "Repository not found" });
    }

    // 1. Verify repository ownership
    const repository = await Repository.findOne({ _id: repoId, ownerId: userId });
    if (!repository) {
      return res.status(404).json({ error: "Repository not found" });
    }

    // 2. Parse limit (default = 1000, max = 2000)
    let parsedLimit = 1000;
    if (limit) {
      const parsed = parseInt(limit, 10);
      if (!isNaN(parsed) && parsed > 0) {
        parsedLimit = Math.min(parsed, 2000);
      }
    }

    // 3. Resolve snapshot
    let snapshot = null;
    if (snapshotId) {
      if (!mongoose.Types.ObjectId.isValid(snapshotId)) {
        return res.status(404).json({ error: "Snapshot not found or not completed" });
      }
      snapshot = await RepositorySnapshot.findOne({
        _id: snapshotId,
        repositoryId: repoId,
        status: "completed",
      });
      if (!snapshot) {
        return res.status(404).json({ error: "Snapshot not found or not completed" });
      }
    } else {
      snapshot = await RepositorySnapshot.findOne({
        repositoryId: repoId,
        status: "completed",
      }).sort({ createdAt: -1 });

      if (!snapshot) {
        return res.status(404).json({ error: "No completed snapshot found for this repository" });
      }
    }

    // 4. Query symbols for snapshot
    const symbolQuery = {
      repositoryId: repoId,
      snapshotId: snapshot._id,
    };
    if (filePath) {
      symbolQuery.filePath = filePath;
    }

    const rawSymbols = await CodeSymbol.find(symbolQuery)
      .limit(parsedLimit)
      .lean();

    // 5. Build nodes, nodeIdSet, and filePathsSet
    const nodeIdSet = new Set();
    const uniqueFilesSet = new Set();

    const nodes = rawSymbols.map((sym) => {
      const idStr = sym._id.toString();
      nodeIdSet.add(idStr);
      if (sym.filePath) {
        uniqueFilesSet.add(sym.filePath);
      }

      return {
        id: idStr,
        name: sym.symbol?.name || "",
        type: sym.symbol?.type || "",
        filePath: sym.filePath,
        language: sym.symbol?.language || null,
        location: {
          startLine: sym.location?.startLine ?? null,
          startColumn: sym.location?.startColumn ?? null,
          endLine: sym.location?.endLine ?? null,
          endColumn: sym.location?.endColumn ?? null,
        },
        parentSymbolId: sym.parentSymbolId ? sym.parentSymbolId.toString() : null,
        metadata: sym.metadata || {},
      };
    });

    // 6. Query relations for snapshot (without populating full symbols)
    const relationQuery = {
      repositoryId: repoId,
      snapshotId: snapshot._id,
    };

    const rawRelations = await CodeRelation.find(relationQuery).lean();

    // 7. Filter relations to avoid dangling edges
    const edges = [];
    for (const rel of rawRelations) {
      const sourceId = rel.sourceSymbolId ? rel.sourceSymbolId.toString() : null;
      const targetId = rel.targetSymbolId ? rel.targetSymbolId.toString() : null;

      if (sourceId && targetId && nodeIdSet.has(sourceId) && nodeIdSet.has(targetId)) {
        edges.push({
          id: rel._id.toString(),
          source: sourceId,
          target: targetId,
          type: rel.relationType,
          metadata: rel.metadata || {},
        });
      }
    }

    // 8. Return normalized response
    return res.json({
      repositoryId: repository._id.toString(),
      snapshot: {
        id: snapshot._id.toString(),
        commitSha: snapshot.commit?.sha || null,
        branch: snapshot.commit?.branch || null,
        status: snapshot.status,
        completedAt: snapshot.completedAt,
      },
      stats: {
        nodeCount: nodes.length,
        edgeCount: edges.length,
        fileCount: uniqueFilesSet.size,
      },
      nodes,
      edges,
    });
  } catch (error) {
    console.error("Error fetching repository graph:", error.message);
    return res.status(500).json({ error: "Failed to fetch repository graph" });
  }
};

module.exports = {
  listUserRepositories,
  connectRepository,
  getRepositoryById,
  triggerRepositoryIndexing,
  getRepositorySnapshots,
  getRepositorySymbols,
  getRepositoryRelations,
  getRepositoryTree,
  getRepositoryFileContent,
  getRepositoryPullRequests,
  getRepositoryPullRequestDetails,
  getRepositoryGraph,
};
