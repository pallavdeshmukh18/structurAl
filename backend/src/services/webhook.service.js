const crypto = require("crypto");
const { Repository, PullRequest } = require("../models");
const { indexerService } = require("./indexer.service");
const { sanitizeError } = require("../utils/sanitizer");

/**
 * Verify GitHub Webhook Signature
 * @param {string} payload Raw stringified body
 * @param {string} signature Value of x-hub-signature-256 header
 * @param {string} secret Webhook secret
 * @returns {boolean}
 */
const verifyWebhookSignature = (payload, signature, secret) => {
  if (!secret) return true; // If no secret is configured, bypass verification
  if (!signature) return false;

  try {
    const hmac = crypto.createHmac("sha256", secret);
    const digest = "sha256=" + hmac.update(payload).digest("hex");
    return crypto.timingSafeEqual(Buffer.from(digest), Buffer.from(signature));
  } catch (err) {
    console.error("Signature verification error:", err.message);
    return false;
  }
};

class WebhookService {
  /**
   * Process GitHub Webhook Payload
   * @param {string} event Event type from x-github-event header
   * @param {object} payload JSON payload
   * @returns {Promise<object>} Processing result
   */
  async processGitHubEvent(event, payload) {
    switch (event) {
      case "pull_request":
        return await this.handlePullRequestEvent(payload);

      case "push":
        return await this.handlePushEvent(payload);

      case "ping":
        return {
          status: "ok",
          event: "ping",
          message: "GitHub webhook successfully verified.",
          zen: payload.zen,
          hookId: payload.hook_id,
        };

      default:
        return {
          status: "ignored",
          event,
          message: `Unhandled event type: ${event}`,
        };
    }
  }

  /**
   * Handle Pull Request Webhook Event
   * Triggered on: opened, synchronize, reopened, closed, edited
   */
  async handlePullRequestEvent(payload) {
    const action = payload.action;
    const prData = payload.pull_request;
    const repoData = payload.repository;

    if (!prData || !repoData) {
      throw new Error("Invalid pull_request webhook payload structure.");
    }

    console.log(`[WebhookService] Processing pull_request event: ${action} on #${prData.number} (${repoData.full_name})`);

    // 1. Locate repository in MongoDB
    let repository = await Repository.findOne({ "github.id": repoData.id });
    if (!repository) {
      repository = await Repository.findOne({ "github.fullName": repoData.full_name });
    }

    if (!repository) {
      return {
        status: "ignored",
        action,
        reason: `Repository ${repoData.full_name} (ID: ${repoData.id}) is not connected in StructurAI.`,
      };
    }

    // 2. Map PR status
    let status = "OPEN";
    if (prData.merged || action === "closed" && prData.merged_at) {
      status = "MERGED";
    } else if (prData.state === "closed" || action === "closed") {
      status = "CLOSED";
    }

    // 3. Upsert PullRequest in MongoDB
    const prPayload = {
      repositoryId: repository._id,
      github: {
        id: prData.id,
        number: prData.number,
        url: prData.html_url,
        baseBranch: prData.base?.ref || "main",
        headBranch: prData.head?.ref || null,
        baseSha: prData.base?.sha || null,
        headSha: prData.head?.sha || null,
        author: {
          id: prData.user?.id || null,
          username: prData.user?.login || null,
        },
      },
      title: prData.title || `PR #${prData.number}`,
      description: prData.body || null,
      status,
      changedFiles: prData.changed_files || 0,
      additions: prData.additions || 0,
      deletions: prData.deletions || 0,
      mergedAt: prData.merged_at ? new Date(prData.merged_at) : null,
    };

    const pullRequest = await PullRequest.findOneAndUpdate(
      { repositoryId: repository._id, "github.number": prData.number },
      prPayload,
      { upsert: true, returnDocument: "after", runValidators: true }
    );

    let indexingResult = null;

    // 4. Trigger Automatic Indexing / Analysis on PR Opened or Synchronized (new commits pushed)
    if (action === "opened" || action === "synchronize" || action === "reopened") {
      pullRequest.analysisStatus = "ANALYZING";
      await pullRequest.save();

      const headCommitSha = prData.head?.sha;
      if (headCommitSha) {
        try {
          console.log(`[WebhookService] Triggering indexing for PR #${prData.number} commit: ${headCommitSha}`);
          indexingResult = await indexerService.indexRepository(repository._id, {
            commitSha: headCommitSha,
            branch: prData.head?.ref || undefined,
          });

          pullRequest.analysisStatus = "COMPLETED";
          await pullRequest.save();
        } catch (indexErr) {
          console.error(`[WebhookService] PR Indexing error:`, sanitizeError(indexErr.message));
          pullRequest.analysisStatus = "FAILED";
          await pullRequest.save();
        }
      }
    }

    return {
      status: "processed",
      event: "pull_request",
      action,
      repository: repoData.full_name,
      pullRequest: {
        id: pullRequest._id.toString(),
        number: pullRequest.github.number,
        status: pullRequest.status,
        analysisStatus: pullRequest.analysisStatus,
        headSha: pullRequest.github.headSha,
      },
      indexingResult: indexingResult
        ? {
            snapshotId: indexingResult.snapshotId,
            stats: indexingResult.stats,
          }
        : null,
    };
  }

  /**
   * Handle Push Webhook Event
   */
  async handlePushEvent(payload) {
    const repoData = payload.repository;
    const ref = payload.ref;
    const headCommitSha = payload.after;

    if (!repoData || !headCommitSha) {
      throw new Error("Invalid push webhook payload structure.");
    }

    let repository = await Repository.findOne({ "github.id": repoData.id });
    if (!repository) {
      repository = await Repository.findOne({ "github.fullName": repoData.full_name });
    }

    if (!repository) {
      return {
        status: "ignored",
        reason: `Repository ${repoData.full_name} is not connected in StructurAI.`,
      };
    }

    const defaultBranch = repository.github.defaultBranch || "main";
    const isDefaultBranch = ref === `refs/heads/${defaultBranch}` || ref === defaultBranch;

    let indexingResult = null;
    if (isDefaultBranch && headCommitSha !== "0000000000000000000000000000000000000000") {
      console.log(`[WebhookService] Default branch updated (${ref}). Indexing commit ${headCommitSha}...`);
      indexingResult = await indexerService.indexRepository(repository._id, {
        commitSha: headCommitSha,
        branch: defaultBranch,
      });
    }

    return {
      status: "processed",
      event: "push",
      repository: repoData.full_name,
      ref,
      commitSha: headCommitSha,
      indexingResult: indexingResult ? indexingResult.stats : null,
    };
  }
}

const webhookService = new WebhookService();

module.exports = {
  verifyWebhookSignature,
  WebhookService,
  webhookService,
};
