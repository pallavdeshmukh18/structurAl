const { reviewPullRequest } = require("./review.service");
const { detectSlop } = require("../slop/slop.service");
const { extractTouchedFiles } = require("../../utils/diffParser");

/**
 * POST /api/pr/review
 * Body: { diff, prTitle?, prDescription?, fileContext? }
 * Returns: { score, findings }
 */
async function handleReview(req, res, next) {
  try {
    const { diff, prTitle, prDescription, fileContext } = req.body;
    const result = await reviewPullRequest({ diff, prTitle, prDescription, fileContext });
    res.json(result);
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/pr/analyze
 * Body: { diff, prTitle?, prDescription?, fileContext?, files? }
 *
 * Runs the reviewer and the slop detector in parallel and returns a single
 * combined payload. This is what Rohan's PR Review UI (Diff / AI findings /
 * Slop score / Code Health Score / Suggested fixes) consumes directly.
 *
 * Returns:
 * {
 *   score,               // overall PR quality score (from reviewer)
 *   findings,            // bug/security/logic findings
 *   codeHealth: { overall, complexity, maintainability, errorHandling, duplication, aiSlop },
 *   slopFindings,        // slop-specific findings
 *   touchedFiles
 * }
 */
async function handleAnalyze(req, res, next) {
  try {
    const { diff, prTitle, prDescription, fileContext, files } = req.body;

    if (!diff || typeof diff !== "string" || diff.trim().length === 0) {
      return res.status(400).json({ error: "'diff' (unified diff string) is required" });
    }

    const [reviewResult, slopResult] = await Promise.all([
      reviewPullRequest({ diff, prTitle, prDescription, fileContext }),
      detectSlop({ diff, files }),
    ]);

    res.json({
      score: reviewResult.score,
      findings: reviewResult.findings,
      codeHealth: slopResult.codeHealth,
      slopFindings: slopResult.findings,
      touchedFiles: extractTouchedFiles(diff),
    });
  } catch (err) {
    next(err);
  }
}

module.exports = { handleReview, handleAnalyze };
