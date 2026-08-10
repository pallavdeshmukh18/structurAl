const { askForJson } = require("../../llm/groqClient");
const { SLOP_SYSTEM_PROMPT, buildSlopUserPrompt } = require("./prompts");
const { sanitizeReviewResult } = require("../review/review.service");

const SCORE_KEYS = ["overall", "complexity", "maintainability", "errorHandling", "duplication", "aiSlop"];

function clampScore(n, fallback = 50) {
  return Number.isFinite(n) ? Math.max(0, Math.min(100, Math.round(n))) : fallback;
}

function sanitizeSlopResult(raw) {
  const rawHealth = raw.codeHealth || {};
  const codeHealth = {};
  for (const key of SCORE_KEYS) {
    codeHealth[key] = clampScore(rawHealth[key]);
  }

  // sanitizeReviewResult only needs { score, findings } shape, reuse its
  // finding-cleanup logic to avoid duplicating validation code.
  const { findings } = sanitizeReviewResult({ score: 0, findings: raw.findings });

  return { codeHealth, findings };
}

/**
 * Runs AI slop / code health detection against a diff and/or full file contents.
 *
 * @param {Object} params
 * @param {string} [params.diff] - unified diff text
 * @param {Array<{path: string, content: string}>} [params.files] - full file contents
 * @returns {Promise<{codeHealth: Object, findings: Array}>}
 */
async function detectSlop({ diff, files }) {
  if (!diff && (!files || files.length === 0)) {
    throw new Error("detectSlop requires at least a 'diff' or 'files' array");
  }

  const raw = await askForJson({
    system: SLOP_SYSTEM_PROMPT,
    user: buildSlopUserPrompt({ diff, files }),
    maxTokens: 2000,
    retries: 1,
  });

  return sanitizeSlopResult(raw);
}

module.exports = { detectSlop, sanitizeSlopResult };
