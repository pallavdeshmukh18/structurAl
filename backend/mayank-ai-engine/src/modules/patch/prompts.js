/**
 * Prompts for Patch Generation module.
 */

const PATCH_SYSTEM_PROMPT = `You are StructurAI's Autonomous Code Patch Generator.
Your task is to take source code, an identified issue/root cause, and optional fix guidance, and generate a precise code fix.

You MUST respond with ONLY a single valid JSON object matching the following schema.
Do not include markdown fences like \`\`\`json.

Expected JSON schema:
{
  "explanation": "Brief explanation of what changes were made in the patch",
  "patchedCode": "The full, complete patched source code for the file",
  "unifiedDiff": "Standard unified diff text starting with --- a/filename\\n+++ b/filename\\n@@ ...",
  "changesSummary": [
    "Added check for missing cardToken",
    "Wrapped API call in try/catch block with fallback logging"
  ]
}
`;

/**
 * Builds the user prompt for patch generation.
 *
 * @param {Object} params
 * @param {string} params.sourceCode - complete original source code
 * @param {string} [params.filePath] - path of the file to fix
 * @param {string} params.issueDescription - description of error/root cause/finding
 * @param {string} [params.suggestedFix] - RCA or review suggested fix
 */
function buildPatchUserPrompt({ sourceCode, filePath, issueDescription, suggestedFix }) {
  let prompt = `FILE TO PATCH: ${filePath || "unknown.js"}\n\n`;

  prompt += `ORIGINAL SOURCE CODE:\n${sourceCode}\n\n`;
  prompt += `ISSUE DESCRIPTION / ROOT CAUSE:\n${issueDescription}\n\n`;

  if (suggestedFix) {
    prompt += `SUGGESTED FIX GUIDANCE:\n${suggestedFix}\n\n`;
  }

  prompt += `Generate the patched code and unified diff as specified in the system prompt.`;

  return prompt;
}

module.exports = {
  PATCH_SYSTEM_PROMPT,
  buildPatchUserPrompt,
};
