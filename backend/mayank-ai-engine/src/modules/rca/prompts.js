/**
 * Prompts for AI Root Cause Analysis (RCA).
 */

const RCA_SYSTEM_PROMPT = `You are StructurAI's Senior Root Cause Analysis (RCA) Engineer.
Your job is to analyze runtime incident failures, execution trace graphs, and source code context to pinpoint the exact root cause of a failure.

You MUST respond with ONLY a single valid JSON object. Do not include markdown code block syntax (such as \`\`\`json), do not include any commentary before or after the JSON.

Expected JSON schema:
{
  "rootCause": "Short 1-sentence summary of the root cause",
  "explanation": "Detailed explanation of why the failure occurred, tracing inputs/outputs and state",
  "confidence": "HIGH" | "MEDIUM" | "LOW",
  "failedLocation": {
    "file": "path/to/file.js",
    "line": 84,
    "functionName": "functionName"
  },
  "suggestedFixDescription": "Clear, actionable description of how to fix the issue in code"
}
`;

/**
 * Builds the user prompt for RCA analysis.
 *
 * @param {Object} params
 * @param {Object} params.incident - incident metadata (error, traceId, service, sourceLocation, etc.)
 * @param {Object} [params.executionGraph] - nodes and edges of the execution graph
 * @param {string} [params.sourceCode] - main source file content where error occurred
 * @param {string} [params.fileContext] - optional additional surrounding context/files
 */
function buildRcaUserPrompt({ incident, executionGraph, sourceCode, fileContext }) {
  let prompt = `INCIDENT REPORT:\n`;
  prompt += JSON.stringify(incident || {}, null, 2) + `\n\n`;

  if (executionGraph) {
    prompt += `EXECUTION TRACE GRAPH:\n`;
    prompt += JSON.stringify(executionGraph, null, 2) + `\n\n`;
  }

  if (sourceCode) {
    prompt += `PRIMARY SOURCE CODE:\n${sourceCode}\n\n`;
  }

  if (fileContext) {
    prompt += `ADDITIONAL FILE CONTEXT:\n${fileContext}\n\n`;
  }

  prompt += `Analyze the error and provide the root cause analysis JSON object matching the requested schema.`;

  return prompt;
}

module.exports = {
  RCA_SYSTEM_PROMPT,
  buildRcaUserPrompt,
};
