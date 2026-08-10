const { askForJson } = require("../../llm/claudeClient");
const { PATCH_SYSTEM_PROMPT, buildPatchUserPrompt } = require("./prompts");
const { validatePatch } = require("./patchValidator");
const { openFixPullRequest } = require("../../integrations/githubClient");

/**
 * Generates and validates an AI patch for a source file.
 *
 * @param {Object} params
 * @param {string} params.sourceCode - original source code
 * @param {string} [params.filePath] - relative path of file
 * @param {string} params.issueDescription - error/root cause/finding description
 * @param {string} [params.suggestedFix] - RCA or review suggested fix
 * @returns {Promise<{
 *   patch: string,
 *   patchedCode: string,
 *   explanation: string,
 *   changesSummary: string[],
 *   isValid: boolean,
 *   validationErrors: string[]
 * }>}
 */
async function generatePatch({ sourceCode, filePath, issueDescription, suggestedFix }) {
  if (!sourceCode || typeof sourceCode !== "string") {
    throw new Error("generatePatch requires non-empty 'sourceCode'");
  }
  if (!issueDescription || typeof issueDescription !== "string") {
    throw new Error("generatePatch requires 'issueDescription'");
  }

  const raw = await askForJson({
    system: PATCH_SYSTEM_PROMPT,
    user: buildPatchUserPrompt({ sourceCode, filePath, issueDescription, suggestedFix }),
    maxTokens: 3000,
    retries: 1,
  });

  const patchedCode = typeof raw.patchedCode === "string" ? raw.patchedCode : sourceCode;
  const unifiedDiff = typeof raw.unifiedDiff === "string" ? raw.unifiedDiff : "";
  const explanation = typeof raw.explanation === "string" ? raw.explanation : "Automated code patch generated.";
  const changesSummary = Array.isArray(raw.changesSummary) ? raw.changesSummary.filter((s) => typeof s === "string") : [];

  // Run patch validation engine
  const validation = validatePatch({
    originalCode: sourceCode,
    patchedCode,
    unifiedDiff,
    filePath,
  });

  return {
    patch: unifiedDiff,
    patchedCode,
    explanation,
    changesSummary,
    isValid: validation.isValid,
    validationErrors: validation.errors,
  };
}

/**
 * Generates patch and optionally submits a Pull Request to GitHub.
 *
 * @param {Object} params
 */
async function generateAndSubmitFixPR({
  repoOwner,
  repoName,
  baseBranch = "main",
  filePath,
  sourceCode,
  issueDescription,
  suggestedFix,
  githubToken,
}) {
  const patchResult = await generatePatch({
    sourceCode,
    filePath,
    issueDescription,
    suggestedFix,
  });

  if (!patchResult.isValid) {
    return {
      patchResult,
      prCreated: false,
      error: `Patch validation failed: ${patchResult.validationErrors.join("; ")}`,
    };
  }

  if (!githubToken) {
    return {
      patchResult,
      prCreated: false,
      message: "Patch generated and validated successfully. Provide 'githubToken' to submit PR automatically.",
    };
  }

  const prTitle = `fix: Automated StructurAI patch for ${filePath || "code issue"}`;
  const prBody = `## 🤖 StructurAI Automated Fix\n\n### Issue Description\n${issueDescription}\n\n### Changes Summary\n` +
    patchResult.changesSummary.map((c) => `- ${c}`).join("\n") +
    `\n\n### Explanation\n${patchResult.explanation}`;

  const prRes = await openFixPullRequest({
    repoOwner,
    repoName,
    baseBranch,
    filePath,
    patchedCode: patchResult.patchedCode,
    commitMessage: prTitle,
    prTitle,
    prBody,
    githubToken,
  });

  return {
    patchResult,
    prCreated: true,
    githubPR: prRes,
  };
}

module.exports = {
  generatePatch,
  generateAndSubmitFixPR,
};
