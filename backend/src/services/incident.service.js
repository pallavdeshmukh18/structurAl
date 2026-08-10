const mongoose = require("mongoose");
const { Incident, Repository } = require("../models");
const { sanitizeError } = require("../utils/sanitizer");

/**
 * Keyword rules for automated severity assignment
 */
const SEVERITY_RULES = [
  {
    severity: "CRITICAL",
    keywords: [
      "vulnerability", "cve", "security", "leak", "auth bypass", "bypass",
      "exploit", "rce", "injection", "outage", "fatal",
      "data loss", "corrupt", "privilege escalation", "dos"
    ],
  },
  {
    severity: "HIGH",
    keywords: [
      "crash", "panic", "bug", "broken", "error", "exception", "timeout",
      "fail", "failure", "revert", "regression", "deadlock", "race condition",
      "nullpointer", "unhandled", "500", "segfault", "oom", "memory leak"
    ],
  },
  {
    severity: "MEDIUM",
    keywords: [
      "fix", "patch", "hotfix", "issue", "warning", "retry", "degraded",
      "workaround", "slow", "latency", "flaky", "mismatch", "invalid"
    ],
  },
  {
    severity: "LOW",
    keywords: [
      "refactor", "cleanup", "lint", "typo", "optimize", "minor",
      "formatting", "style", "docs", "test", "chore", "update"
    ],
  },
];

/**
 * Determine severity and matched keywords based on text and file paths
 * @param {string} text Commit message, PR title, or description
 * @param {string[]} [files] List of modified file paths
 * @returns {{ severity: string, matchedKeywords: string[] }}
 */
const evaluateSeverity = (text = "", files = []) => {
  const normalizedText = (text + " " + files.join(" ")).toLowerCase();
  const matchedKeywords = [];

  for (const rule of SEVERITY_RULES) {
    for (const kw of rule.keywords) {
      const regex = new RegExp(`\\b${kw.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "i");
      if (regex.test(normalizedText)) {
        matchedKeywords.push(kw);
      }
    }

    if (matchedKeywords.length > 0) {
      return {
        severity: rule.severity,
        matchedKeywords,
      };
    }
  }

  return {
    severity: "INFO",
    matchedKeywords: [],
  };
};

class IncidentService {
  /**
   * Create Incident from GitHub Push Webhook
   */
  async createIncidentFromPush(repository, payload) {
    if (!repository || !repository._id) {
      throw new Error("createIncidentFromPush requires a valid Repository document.");
    }

    const ref = payload.ref || "refs/heads/main";
    const branch = ref.replace(/^refs\/heads\//, "");
    const headCommit = payload.head_commit || (payload.commits && payload.commits[0]) || {};
    const commitSha = payload.after || headCommit.id || "unknown";
    const commitMsg = headCommit.message || `Push to ${branch}`;
    const authorName = headCommit.author?.name || headCommit.author?.username || payload.pusher?.name || "Unknown Author";
    const commitUrl = headCommit.url || payload.compare || null;

    const addedFiles = headCommit.added || [];
    const modifiedFiles = headCommit.modified || [];
    const removedFiles = headCommit.removed || [];
    const allFiles = [...addedFiles, ...modifiedFiles, ...removedFiles];

    const { severity, matchedKeywords } = evaluateSeverity(commitMsg, allFiles);

    // Create structured Incident
    const incident = await Incident.create({
      repositoryId: repository._id,
      title: `Push to ${branch}: ${commitMsg.split("\n")[0]}`,
      description: commitMsg,
      severity,
      status: "OPEN",
      source: "GITHUB_PUSH",
      error: matchedKeywords.length > 0 ? {
        type: "THREAT_KEYWORD_MATCH",
        message: `Detected keywords: ${matchedKeywords.join(", ")}`,
      } : undefined,
      metadata: {
        commitSha,
        author: authorName,
        url: commitUrl,
        branch,
        addedFiles,
        modifiedFiles,
        removedFiles,
      },
      firstSeenAt: new Date(),
      lastSeenAt: new Date(),
    });

    console.log(`[IncidentService] Created Push Incident (${severity}) for ${repository.github.fullName}: "${incident.title}"`);
    return incident;
  }

  /**
   * Create Incident from GitHub Pull Request Webhook
   */
  async createIncidentFromPullRequest(repository, payload) {
    if (!repository || !repository._id) {
      throw new Error("createIncidentFromPullRequest requires a valid Repository document.");
    }

    const action = payload.action;
    const pr = payload.pull_request || {};
    const prNumber = pr.number || payload.number;
    const prTitle = pr.title || `PR #${prNumber}`;
    const prBody = pr.body || "";
    const author = pr.user?.login || "Unknown Author";
    const prUrl = pr.html_url || null;
    const headBranch = pr.head?.ref || "head";
    const headSha = pr.head?.sha || null;

    const { severity, matchedKeywords } = evaluateSeverity(`${prTitle} ${prBody}`);

    // If PR is closed or merged, map status accordingly
    let status = "OPEN";
    if (pr.merged || (action === "closed" && pr.merged_at)) {
      status = "RESOLVED";
    }

    const incident = await Incident.create({
      repositoryId: repository._id,
      title: `PR #${prNumber} (${action}): ${prTitle}`,
      description: prBody || `Pull Request #${prNumber} ${action} by ${author}`,
      severity,
      status,
      source: "GITHUB_PR",
      error: matchedKeywords.length > 0 ? {
        type: "PR_KEYWORD_MATCH",
        message: `Matched keywords: ${matchedKeywords.join(", ")}`,
      } : undefined,
      metadata: {
        prNumber,
        prAction: action,
        author,
        url: prUrl,
        branch: headBranch,
        commitSha: headSha,
      },
      firstSeenAt: new Date(),
      lastSeenAt: new Date(),
      resolvedAt: status === "RESOLVED" ? new Date() : null,
    });

    console.log(`[IncidentService] Created PR Incident (${severity}) for ${repository.github.fullName}: "${incident.title}"`);
    return incident;
  }

  /**
   * Create Incident from GitHub Ping Webhook
   */
  async createIncidentFromPing(repository, payload) {
    if (!repository || !repository._id) return null;

    const incident = await Incident.create({
      repositoryId: repository._id,
      title: `GitHub Webhook Connected: ${repository.github.fullName}`,
      description: `Webhook verified successfully. Zen: "${payload.zen || 'Verified'}"`,
      severity: "INFO",
      status: "RESOLVED",
      source: "GITHUB_PING",
      metadata: {
        url: repository.github.url,
      },
      firstSeenAt: new Date(),
      resolvedAt: new Date(),
    });

    return incident;
  }

  /**
   * List Incidents with filtering, search, and pagination
   */
  async listIncidents({
    repositoryId,
    severity,
    status,
    search,
    limit = 50,
    page = 1,
  }) {
    const query = {};

    if (repositoryId && mongoose.Types.ObjectId.isValid(repositoryId)) {
      query.repositoryId = repositoryId;
    }

    if (severity && severity !== "ALL") {
      query.severity = severity.toUpperCase();
    }

    if (status && status !== "ALL") {
      query.status = status.toUpperCase();
    }

    if (search && typeof search === "string" && search.trim()) {
      const searchRegex = new RegExp(search.trim(), "i");
      query.$or = [
        { title: searchRegex },
        { description: searchRegex },
        { "metadata.author": searchRegex },
        { "metadata.branch": searchRegex },
        { "error.message": searchRegex },
      ];
    }

    const parsedLimit = Math.min(Math.max(parseInt(limit, 10) || 20, 1), 100);
    const parsedPage = Math.max(parseInt(page, 10) || 1, 1);
    const skip = (parsedPage - 1) * parsedLimit;

    const [incidents, total] = await Promise.all([
      Incident.find(query)
        .populate("repositoryId", "github.fullName github.name github.owner language visibility")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parsedLimit)
        .lean(),
      Incident.countDocuments(query),
    ]);

    return {
      incidents,
      pagination: {
        total,
        page: parsedPage,
        limit: parsedLimit,
        pages: Math.ceil(total / parsedLimit) || 1,
      },
    };
  }

  /**
   * Get single Incident by ID
   */
  async getIncidentById(id) {
    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      throw new Error("Invalid incident ID format.");
    }

    const incident = await Incident.findById(id)
      .populate("repositoryId", "github.fullName github.name github.owner github.url language defaultBranch")
      .populate("sourceLocation.symbolId")
      .populate("suggestedFix.patchId");

    if (!incident) {
      throw new Error("Incident not found.");
    }

    return incident;
  }

  /**
   * Update Incident status
   */
  async updateIncidentStatus(id, newStatus) {
    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      throw new Error("Invalid incident ID format.");
    }

    const validStatuses = ["OPEN", "INVESTIGATING", "IN_PROGRESS", "FIX_GENERATED", "RESOLVED", "IGNORED"];
    const normalizedStatus = (newStatus || "").toUpperCase();

    if (!validStatuses.includes(normalizedStatus)) {
      throw new Error(`Invalid status '${newStatus}'. Allowed: ${validStatuses.join(", ")}`);
    }

    const updateFields = {
      status: normalizedStatus === "IN_PROGRESS" ? "INVESTIGATING" : normalizedStatus,
      lastSeenAt: new Date(),
    };

    if (normalizedStatus === "RESOLVED") {
      updateFields.resolvedAt = new Date();
    } else {
      updateFields.resolvedAt = null;
    }

    const updated = await Incident.findByIdAndUpdate(
      id,
      { $set: updateFields },
      { returnDocument: "after", runValidators: true }
    ).populate("repositoryId", "github.fullName github.name");

    if (!updated) {
      throw new Error("Incident not found.");
    }

    return updated;
  }
}

const incidentService = new IncidentService();

module.exports = {
  evaluateSeverity,
  IncidentService,
  incidentService,
};
