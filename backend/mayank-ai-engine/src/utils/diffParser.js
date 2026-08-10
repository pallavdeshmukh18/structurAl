/**
 * Extracts the list of file paths touched by a unified diff.
 * Good enough for logging/validation — not a full diff parser.
 */
function extractTouchedFiles(diff) {
  if (!diff) return [];
  const matches = diff.match(/^\+\+\+ b\/(.+)$/gm) || [];
  return matches.map((line) => line.replace(/^\+\+\+ b\//, "").trim());
}

module.exports = { extractTouchedFiles };
