const { generatePatch, generateAndSubmitFixPR } = require("./patch.service");
const { validatePatch } = require("./patchValidator");
const { analyzeRootCause } = require("../rca/rca.service");

async function handleGeneratePatch(req, res, next) {
  try {
    const { sourceCode, filePath, issueDescription, suggestedFix } = req.body;

    if (!sourceCode) {
      return res.status(400).json({ error: "Missing required field 'sourceCode'" });
    }
    if (!issueDescription) {
      return res.status(400).json({ error: "Missing required field 'issueDescription'" });
    }

    const result = await generatePatch({
      sourceCode,
      filePath,
      issueDescription,
      suggestedFix,
    });

    return res.json(result);
  } catch (err) {
    return next(err);
  }
}

async function handleValidatePatch(req, res, next) {
  try {
    const { originalCode, patchedCode, unifiedDiff, filePath } = req.body;

    const result = validatePatch({
      originalCode,
      patchedCode,
      unifiedDiff,
      filePath,
    });

    return res.json(result);
  } catch (err) {
    return next(err);
  }
}

async function handleCreateFixPR(req, res, next) {
  try {
    const {
      repoOwner,
      repoName,
      baseBranch,
      filePath,
      sourceCode,
      issueDescription,
      suggestedFix,
      githubToken,
    } = req.body;

    if (!repoOwner || !repoName || !filePath || !sourceCode || !issueDescription) {
      return res.status(400).json({
        error: "Missing required parameters (repoOwner, repoName, filePath, sourceCode, issueDescription)",
      });
    }

    const result = await generateAndSubmitFixPR({
      repoOwner,
      repoName,
      baseBranch,
      filePath,
      sourceCode,
      issueDescription,
      suggestedFix,
      githubToken: githubToken || req.headers["x-github-token"],
    });

    return res.json(result);
  } catch (err) {
    return next(err);
  }
}

/**
 * End-to-end Auto-Fix Pipeline:
 * Runtime Incident -> RCA -> Patch Generation -> Validation -> Fix PR
 */
async function handleAutoFixPipeline(req, res, next) {
  try {
    const {
      incident,
      executionGraph,
      sourceCode,
      filePath,
      fileContext,
      repoOwner,
      repoName,
      baseBranch,
      githubToken,
    } = req.body;

    if (!incident || !sourceCode) {
      return res.status(400).json({ error: "Missing 'incident' or 'sourceCode'" });
    }

    // Step 1: Root Cause Analysis
    const rca = await analyzeRootCause({
      incident,
      executionGraph,
      sourceCode,
      fileContext,
    });

    // Step 2: Patch Generation & Validation
    const patchResult = await generatePatch({
      sourceCode,
      filePath: filePath || rca.failedLocation.file,
      issueDescription: `${rca.rootCause}: ${rca.explanation}`,
      suggestedFix: rca.suggestedFixDescription,
    });

    // Step 3: Optional GitHub PR creation if tokens provided
    let githubPR = null;
    let prCreated = false;

    const token = githubToken || req.headers["x-github-token"];
    if (token && repoOwner && repoName && patchResult.isValid) {
      const prRes = await generateAndSubmitFixPR({
        repoOwner,
        repoName,
        baseBranch: baseBranch || "main",
        filePath: filePath || rca.failedLocation.file,
        sourceCode,
        issueDescription: rca.rootCause,
        suggestedFix: rca.suggestedFixDescription,
        githubToken: token,
      });
      githubPR = prRes.githubPR;
      prCreated = prRes.prCreated;
    }

    return res.json({
      rca,
      patchResult,
      prCreated,
      githubPR,
    });
  } catch (err) {
    return next(err);
  }
}

module.exports = {
  handleGeneratePatch,
  handleValidatePatch,
  handleCreateFixPR,
  handleAutoFixPipeline,
};
