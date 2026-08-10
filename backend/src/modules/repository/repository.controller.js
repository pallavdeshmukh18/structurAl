const mongoose = require("mongoose");
const Repository = require("../../models/Repository");
const RepositorySnapshot = require("../../models/RepositorySnapshot");
const CodeSymbol = require("../../models/CodeSymbol");
const CodeRelation = require("../../models/CodeRelation");
const User = require("../../models/User");
const githubService = require("../../integrations/github/github.service");
const { indexerService } = require("../../services/indexer.service");

/**
 * List repositories accessible to the user via GitHub API
 * GET /api/repositories
 */
const listUserRepositories = async (req, res) => {
  try {
    const userId = req.user._id;
    const githubRepos = await githubService.getUserRepositories(userId, req.query);

    const repositories = (Array.isArray(githubRepos) ? githubRepos : []).map((repo) => ({
      id: repo.id,
      name: repo.name,
      fullName: repo.full_name,
      owner: typeof repo.owner === "object" && repo.owner ? repo.owner.login : repo.owner,
      url: repo.html_url,
      cloneUrl: repo.clone_url,
      defaultBranch: repo.default_branch || "main",
      language: repo.language || null,
      visibility: repo.visibility || (repo.private ? "private" : "public"),
    }));

    return res.json({ repositories });
  } catch (error) {
    console.error("Error listing user repositories:", error.message);
    return res.status(error.status || 500).json({
      error: error.message || "Failed to fetch repositories from GitHub",
    });
  }
};

/**
 * Connect and persist a GitHub repository to StructurAI
 * POST /api/repositories
 */
const connectRepository = async (req, res) => {
  try {
    let { owner, name, fullName, cloneUrl, defaultBranch } = req.body;

    if (!owner && fullName && fullName.includes("/")) {
      [owner, name] = fullName.split("/");
    }

    if (!owner || !name) {
      return res.status(400).json({
        error: "Repository 'owner' and 'name' (or 'fullName') are required.",
      });
    }

    // Resolve userId: from authenticated session or find/create active default user
    let userId = req.user ? req.user._id : null;
    if (!userId) {
      let defaultUser = await User.findOne();
      if (!defaultUser) {
        defaultUser = await User.create({
          email: "extension-user@structurai.dev",
          name: "StructurAI Explorer",
        });
      }
      userId = defaultUser._id;
    }

    // 1. Attempt to fetch repository from GitHub API
    let githubRepo = null;
    try {
      githubRepo = await githubService.getRepository(userId, owner, name);
    } catch (apiErr) {
      console.warn(`[RepositoryController] GitHub API lookup warning: ${apiErr.message}`);
    }

    const calculatedFullName = fullName || `${owner}/${name}`;
    const calculatedCloneUrl = cloneUrl || (githubRepo?.clone_url) || `https://github.com/${calculatedFullName}.git`;
    const calculatedDefaultBranch = defaultBranch || (githubRepo?.default_branch) || "main";
    const githubId = githubRepo?.id || Math.abs(calculatedFullName.split("").reduce((a, b) => ((a << 5) - a) + b.charCodeAt(0), 0));

    // 2. Prepare payload and upsert Repository model
    const repoPayload = {
      ownerId: userId,
      github: {
        id: githubId,
        owner: owner,
        name: name,
        fullName: calculatedFullName,
        url: githubRepo?.html_url || `https://github.com/${calculatedFullName}`,
        cloneUrl: calculatedCloneUrl,
        defaultBranch: calculatedDefaultBranch,
        installationId: null,
      },
      language: githubRepo?.language || "TypeScript",
      visibility: githubRepo?.visibility || (githubRepo?.private ? "private" : "public"),
      indexing: {
        status: "indexing",
        lastIndexedCommit: null,
        lastIndexedAt: null,
        error: null,
      },
    };

    const repository = await Repository.findOneAndUpdate(
      { ownerId: userId, "github.fullName": calculatedFullName },
      repoPayload,
      { upsert: true, returnDocument: "after", runValidators: true }
    );

    // 3. Trigger AST Indexing Pipeline asynchronously
    indexerService.indexRepository(repository._id, {
      branch: calculatedDefaultBranch,
    }).catch((indexErr) => {
      console.error(`[RepositoryController] Indexing pipeline background error:`, indexErr.message);
    });

    return res.status(201).json({
      repository,
      message: "Repository connected and AST indexing initiated.",
    });
  } catch (error) {
    console.error("Error connecting repository:", error.message);
    return res.status(error.status || 500).json({
      error: error.message || "Failed to connect repository",
    });
  }
};

/**
 * Get single repository details by ID
 * GET /api/repositories/:id
 */
const getRepositoryById = async (req, res) => {
  try {
    const repoId = req.params.id;

    if (!mongoose.Types.ObjectId.isValid(repoId)) {
      return res.status(404).json({ error: "Repository not found" });
    }

    const query = { _id: repoId };
    if (req.user) {
      query.ownerId = req.user._id;
    }

    let repository = await Repository.findOne(query);
    if (!repository) {
      repository = await Repository.findById(repoId);
    }

    if (!repository) {
      return res.status(404).json({ error: "Repository not found" });
    }

    return res.json({ repository });
  } catch (error) {
    console.error("Error getting repository by ID:", error.message);
    return res.status(500).json({ error: "Internal server error" });
  }
};

/**
 * Trigger Repository Indexing Pipeline
 * POST /api/repositories/:id/index
 */
const triggerRepositoryIndexing = async (req, res) => {
  try {
    const repoId = req.params.id;

    if (!mongoose.Types.ObjectId.isValid(repoId)) {
      return res.status(404).json({ error: "Repository not found" });
    }

    const repository = await Repository.findById(repoId);
    if (!repository) {
      return res.status(404).json({ error: "Repository not found or access denied." });
    }

    const result = await indexerService.indexRepository(repoId, req.body || {});
    return res.json({ message: "Repository indexed successfully", result });
  } catch (error) {
    console.error("Error indexing repository:", error.message);
    return res.status(500).json({ error: error.message || "Failed to index repository" });
  }
};

/**
 * Get snapshots for a repository
 * GET /api/repositories/:id/snapshots
 */
const getRepositorySnapshots = async (req, res) => {
  try {
    const repoId = req.params.id;

    if (!mongoose.Types.ObjectId.isValid(repoId)) {
      return res.status(404).json({ error: "Repository not found" });
    }

    const repository = await Repository.findById(repoId);
    if (!repository) {
      return res.status(404).json({ error: "Repository not found" });
    }

    const snapshots = await RepositorySnapshot.find({ repositoryId: repoId }).sort({ createdAt: -1 });
    return res.json({ snapshots });
  } catch (error) {
    console.error("Error fetching repository snapshots:", error.message);
    return res.status(500).json({ error: "Failed to fetch snapshots" });
  }
};

/**
 * Get symbols for a repository/snapshot
 * GET /api/repositories/:id/symbols
 */
const getRepositorySymbols = async (req, res) => {
  try {
    const repoId = req.params.id;
    const { snapshotId, filePath, type } = req.query;

    if (!mongoose.Types.ObjectId.isValid(repoId)) {
      return res.status(404).json({ error: "Repository not found" });
    }

    const repository = await Repository.findById(repoId);
    if (!repository) {
      return res.status(404).json({ error: "Repository not found" });
    }

    const query = { repositoryId: repoId };
    if (snapshotId) query.snapshotId = snapshotId;
    if (filePath) query.filePath = filePath;
    if (type) query["symbol.type"] = type;

    const symbols = await CodeSymbol.find(query).limit(500);
    return res.json({ count: symbols.length, symbols });
  } catch (error) {
    console.error("Error fetching repository symbols:", error.message);
    return res.status(500).json({ error: "Failed to fetch symbols" });
  }
};

/**
 * Get relations for a repository/snapshot
 * GET /api/repositories/:id/relations
 */
const getRepositoryRelations = async (req, res) => {
  try {
    const repoId = req.params.id;
    const { snapshotId, relationType } = req.query;

    if (!mongoose.Types.ObjectId.isValid(repoId)) {
      return res.status(404).json({ error: "Repository not found" });
    }

    const repository = await Repository.findById(repoId);
    if (!repository) {
      return res.status(404).json({ error: "Repository not found" });
    }

    const query = { repositoryId: repoId };
    if (snapshotId) query.snapshotId = snapshotId;
    if (relationType) query.relationType = relationType;

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
    const contents = await githubService.getRepositoryContents(userId, owner, name, path, defaultBranch);

    if (Array.isArray(contents)) {
      return res.status(400).json({ error: "Requested path is a directory, not a file" });
    }

    // GitHub API returns base64 encoded content
    const fileContent = contents.content 
      ? Buffer.from(contents.content, 'base64').toString('utf8')
      : "";

    return res.json({ content: fileContent, metadata: contents });
  } catch (error) {
    console.error("Error fetching repository file contents:", error.message);
    return res.status(500).json({ error: "Failed to fetch file contents" });
  }
};

/**
 * Get list of pull requests for a repository
 * GET /api/repositories/:id/pulls
 */
const getRepositoryPullRequests = async (req, res) => {
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

    const { owner, name } = repository.github;
    const pulls = await githubService.getPullRequests(userId, owner, name, req.query);

    return res.json({ pulls });
  } catch (error) {
    console.error("Error fetching repository pull requests:", error.message);
    return res.status(500).json({ error: "Failed to fetch pull requests" });
  }
};

/**
 * Get details of a specific pull request
 * GET /api/repositories/:id/pulls/:number
 */
const getRepositoryPullRequestDetails = async (req, res) => {
  try {
    const userId = req.user._id;
    const repoId = req.params.id;
    const prNumber = req.params.number;

    if (!mongoose.Types.ObjectId.isValid(repoId)) {
      return res.status(404).json({ error: "Repository not found" });
    }

    const repository = await Repository.findOne({ _id: repoId, ownerId: userId });
    if (!repository) {
      return res.status(404).json({ error: "Repository not found" });
    }

    const { owner, name } = repository.github;
    
    const [pullRequest, files] = await Promise.all([
      githubService.getPullRequest(userId, owner, name, prNumber),
      githubService.getPullRequestFiles(userId, owner, name, prNumber)
    ]);

    return res.json({ pullRequest, files });
  } catch (error) {
    console.error("Error fetching repository pull request details:", error.message);
    return res.status(500).json({ error: "Failed to fetch pull request details" });
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
};
