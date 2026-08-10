const mongoose = require("mongoose");
const Repository = require("../../models/Repository");
const githubService = require("../../integrations/github/github.service");

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
    const userId = req.user._id;
    const { owner, name } = req.body;

    if (!owner || !name) {
      return res.status(400).json({
        error: "Repository 'owner' and 'name' are required.",
      });
    }

    // 1. Fetch repository from GitHub API to verify access and metadata
    const githubRepo = await githubService.getRepository(userId, owner, name);

    if (!githubRepo || !githubRepo.id) {
      return res.status(404).json({
        error: "Repository not found on GitHub or access denied.",
      });
    }

    // 2. Prepare payload and upsert Repository model
    const repoPayload = {
      ownerId: userId,
      github: {
        id: githubRepo.id,
        owner: githubRepo.owner.login,
        name: githubRepo.name,
        fullName: githubRepo.full_name,
        url: githubRepo.html_url,
        cloneUrl: githubRepo.clone_url,
        defaultBranch: githubRepo.default_branch || "main",
        installationId: null,
      },
      language: githubRepo.language || null,
      visibility: githubRepo.visibility || (githubRepo.private ? "private" : "public"),
      indexing: {
        status: "pending",
        lastIndexedCommit: null,
        lastIndexedAt: null,
        error: null,
      },
    };

    const repository = await Repository.findOneAndUpdate(
      { ownerId: userId, "github.id": githubRepo.id },
      repoPayload,
      { upsert: true, returnDocument: "after", runValidators: true }
    );

    return res.status(201).json({ repository });
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
    const userId = req.user._id;
    const repoId = req.params.id;

    if (!mongoose.Types.ObjectId.isValid(repoId)) {
      return res.status(404).json({ error: "Repository not found" });
    }

    const repository = await Repository.findOne({
      _id: repoId,
      ownerId: userId,
    });

    if (!repository) {
      return res.status(404).json({ error: "Repository not found" });
    }

    return res.json({ repository });
  } catch (error) {
    console.error("Error getting repository by ID:", error.message);
    return res.status(500).json({ error: "Internal server error" });
  }
};

module.exports = {
  listUserRepositories,
  connectRepository,
  getRepositoryById,
};
