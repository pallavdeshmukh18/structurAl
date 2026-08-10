const { askForJson } = require("../../llm/groqClient");
const { RCA_SYSTEM_PROMPT, buildRcaUserPrompt } = require("./prompts");

const VALID_CONFIDENCES = new Set(["HIGH", "MEDIUM", "LOW"]);

/**
 * Sanitizes and validates the RCA output returned by LLM.
 */
function sanitizeRcaResult(raw) {
  const rootCause = typeof raw.rootCause === "string" && raw.rootCause.trim()
    ? raw.rootCause.trim()
    : "Unknown failure during execution";

  const explanation = typeof raw.explanation === "string" && raw.explanation.trim()
    ? raw.explanation.trim()
    : "No detailed explanation provided by analysis engine.";

  const confidence = VALID_CONFIDENCES.has(raw.confidence) ? raw.confidence : "MEDIUM";

  const loc = raw.failedLocation || {};
  const failedLocation = {
    file: typeof loc.file === "string" ? loc.file : "unknown",
    line: Number.isFinite(loc.line) ? loc.line : null,
    functionName: typeof loc.functionName === "string" ? loc.functionName : "unknown",
  };

  const suggestedFixDescription = typeof raw.suggestedFixDescription === "string" && raw.suggestedFixDescription.trim()
    ? raw.suggestedFixDescription.trim()
    : "Inspect the failing function and add proper error handling/validation.";

  return {
    rootCause,
    explanation,
    confidence,
    failedLocation,
    suggestedFixDescription,
  };
}

/**
 * Executes Root Cause Analysis on a runtime incident.
 *
 * @param {Object} params
 * @param {Object} params.incident
 * @param {Object} [params.executionGraph]
 * @param {string} [params.sourceCode]
 * @param {string} [params.fileContext]
 * @returns {Promise<Object>}
 */
async function analyzeRootCause({ incident, executionGraph, sourceCode, fileContext }) {
  if (!incident) {
    throw new Error("analyzeRootCause requires an 'incident' object");
  }

  const raw = await askForJson({
    system: RCA_SYSTEM_PROMPT,
    user: buildRcaUserPrompt({ incident, executionGraph, sourceCode, fileContext }),
    maxTokens: 2500,
    retries: 1,
  });

  return sanitizeRcaResult(raw);
}

module.exports = {
  analyzeRootCause,
  sanitizeRcaResult,
};
