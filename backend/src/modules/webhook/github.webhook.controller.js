const Repository = require("../../models/Repository");
const { triggerRepositoryIndexing } = require("../indexer/indexer.service");
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
        : null;

    if (event === "push") {
      const githubId = req.body && req.body.repository ? req.body.repository.id : null;
      const commitSha = req.body ? req.body.after || (req.body.head_commit && req.body.head_commit.id) : null;
      const ref = req.body ? req.body.ref : null;

      // 1. Branch Deletion Check: SHA "0000000000000000000000000000000000000000" represents branch deletion
      if (!commitSha || commitSha === "0000000000000000000000000000000000000000") {
        console.log(`[WEBHOOK] Push ignored due to branch deletion for repository: ${repositoryFullName}`);
        return res.status(200).json({
          received: true,
          event,
          deliveryId,
          repository: repositoryFullName,
          status: "ignored_branch_deletion",
        });
      }

      if (!githubId) {
        return res.status(200).json({
          received: true,
          event,
          deliveryId,
          repository: repositoryFullName,
          status: "ignored_missing_github_id",
        });
      }

      // 2. Lookup matching Repository connected to StructurAI
      const repoDoc = await Repository.findOne({ "github.id": githubId });

      if (!repoDoc) {
        console.log(`[WEBHOOK] Push received for unconnected repository: ${repositoryFullName} (github.id: ${githubId})`);
        return res.status(200).json({
          received: true,
          event,
          deliveryId,
          repository: repositoryFullName,
          status: "ignored_unconnected",
        });
      }

      // 3. Asynchronously trigger indexing without blocking HTTP response
      triggerRepositoryIndexing({
        repositoryId: repoDoc._id,
        commitSha,
        ref,
      }).catch((err) => {
        const safeErr = sanitizeError(err.message || err);
        console.error(`[WEBHOOK ERROR] Asynchronous indexing trigger failed for repo ${repoDoc._id}:`, safeErr);
      });

      return res.status(200).json({
        received: true,
        event,
        deliveryId,
        repository: repositoryFullName,
        status: "indexing_queued",
      });
    }

    // Ping & pull_request events or general acknowledgement
    return res.status(200).json({
      received: true,
      event,
      deliveryId,
      repository: repositoryFullName,
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
