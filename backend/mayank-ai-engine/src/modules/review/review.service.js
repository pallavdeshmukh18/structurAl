const { askForJson } = require("../../llm/claudeClient");
const { REVIEW_SYSTEM_PROMPT, buildReviewUserPrompt } = require("./prompts");

const VALID_SEVERITIES = new Set(["CRITICAL", "HIGH", "MEDIUM", "LOW"]);

/**
 * Normalizes/validates whatever Claude returns so a malformed field never
 * breaks Rohan's frontend or Pallav's DB write. Bad findings are dropped
 * rather than crashing the request.
 */
function sanitizeReviewResult(raw) {
  const score = Number.isFinite(raw.score) ? Math.max(0, Math.min(100, Math.round(raw.score))) : 0;

  const findings = Array.isArray(raw.findings)
    ? raw.findings
        .filter((f) => f && typeof f.message === "string" && typeof f.file === "string")
        .map((f) => ({
          severity: VALID_SEVERITIES.has(f.severity) ? f.severity : "MEDIUM",
          file: f.file,
          line: Number.isFinite(f.line) ? f.line : null,
          category: typeof f.category === "string" ? f.category : "general",
          message: f.message,
        }))
        .slice(0, 15)
    : [];

  return { score, findings };
}

/**
 * Runs an AI PR review against a diff.
 *
 * @param {Object} params
 * @param {string} params.diff - unified diff text
 * @param {string} [params.prTitle]
 * @param {string} [params.prDescription]
 * @param {string} [params.fileContext] - extra surrounding source for better context
 * @returns {Promise<{score: number, findings: Array}>}
 */
async function reviewPullRequest({ diff, prTitle, prDescription, fileContext }) {
  if (!diff || typeof diff !== "string" || diff.trim().length === 0) {
    throw new Error("reviewPullRequest requires a non-empty 'diff' string");
  }

  const raw = await askForJson({
    system: REVIEW_SYSTEM_PROMPT,
    user: buildReviewUserPrompt({ diff, prTitle, prDescription, fileContext }),
    maxTokens: 2000,
    retries: 1,
  });

  return sanitizeReviewResult(raw);
}

module.exports = { reviewPullRequest, sanitizeReviewResult };
