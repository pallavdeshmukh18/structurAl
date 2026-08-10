const Repository = require("../../models/Repository");
const { triggerRepositoryIndexing } = require("../indexer/indexer.service");
const { incidentService } = require("../../services/incident.service");
const { sanitizeError } = require("../../utils/sanitizer");

/**
 * Handle incoming GitHub Webhooks after signature verification
 * POST /api/webhooks/github
 */
const handleGitHubWebhook = async (req, res) => {
  try {
    const event = req.headers["x-github-event"] || "unknown";
    const deliveryId = req.headers["x-github-delivery"] || null;

    const repositoryFullName =
      req.body && req.body.repository && req.body.repository.full_name
        ? req.body.repository.full_name
        : "pallavdeshmukh18/structurAl";

    const repoName =
      req.body && req.body.repository && req.body.repository.name
        ? req.body.repository.name
        : repositoryFullName.split("/")[1] || "structurAl";

    const repoOwner =
      req.body && req.body.repository && req.body.repository.owner
        ? req.body.repository.owner.login || req.body.repository.owner.name
        : repositoryFullName.split("/")[0] || "pallavdeshmukh18";

    const githubId = req.body && req.body.repository ? req.body.repository.id : null;

    // 1. Resolve or Auto-Link Repository Document in MongoDB
    let repoDoc = null;
    if (githubId) {
      repoDoc = await Repository.findOne({ "github.id": githubId });
    }
    if (!repoDoc && repositoryFullName) {
      repoDoc = await Repository.findOne({
        "github.fullName": { $regex: new RegExp(`^${repositoryFullName}$`, "i") },
      });
    }
    if (!repoDoc) {
      // Fall back to matching repo name or default active repo
      repoDoc = await Repository.findOne({
        $or: [
          { "github.name": repoName },
          { "github.fullName": "pallavdeshmukh18/structurAl" },
        ],
      });
    }

    if (!repoDoc) {
      // Create lightweight connected repository record
      repoDoc = await Repository.create({
        github: {
          id: githubId || Date.now(),
          owner: repoOwner,
          name: repoName,
          fullName: repositoryFullName,
          defaultBranch: req.body?.repository?.default_branch || "main",
          url: req.body?.repository?.html_url || `https://github.com/${repositoryFullName}`,
        },
        language: req.body?.repository?.language || "TypeScript",
        visibility: req.body?.repository?.private ? "private" : "public",
        status: "active",
        indexing: { status: "not_indexed" },
      });
    }

    // 2. Route events to Incident Service & Trigger Automated Indexing
    let createdIncident = null;

    if (event === "push") {
      const commitSha = req.body ? req.body.after || (req.body.head_commit && req.body.head_commit.id) : null;
      const ref = req.body ? req.body.ref : null;

      // Ignore branch deletions
      if (commitSha && commitSha !== "0000000000000000000000000000000000000000") {
        try {
          createdIncident = await incidentService.createIncidentFromPush(repoDoc, req.body);
        } catch (incErr) {
          console.warn("[WEBHOOK] Incident push creation warning:", incErr.message);
        }

        // Asynchronously trigger indexing
        triggerRepositoryIndexing({
          repositoryId: repoDoc._id,
          commitSha,
          ref,
        }).catch((err) => {
          console.error(`[WEBHOOK ERROR] Indexing trigger failed for ${repoDoc._id}:`, sanitizeError(err.message));
        });
      }
    } else if (event === "pull_request") {
      try {
        createdIncident = await incidentService.createIncidentFromPullRequest(repoDoc, req.body);
      } catch (incErr) {
        console.warn("[WEBHOOK] Incident PR creation warning:", incErr.message);
      }
    } else if (event === "ping") {
      try {
        createdIncident = await incidentService.createIncidentFromPing(repoDoc, req.body);
      } catch (incErr) {
        console.warn("[WEBHOOK] Incident ping creation warning:", incErr.message);
      }
    }

    return res.status(200).json({
      received: true,
      event,
      deliveryId,
      repository: repositoryFullName,
      incidentId: createdIncident?._id || null,
      status: "processed",
    });
  } catch (error) {
    const safeMsg = sanitizeError(error.message || error);
    console.error("[WEBHOOK ERROR] Failed processing GitHub webhook:", safeMsg);
    return res.status(500).json({ error: safeMsg || "Internal server error" });
  }
};

module.exports = {
  handleGitHubWebhook,
};
