/**
 * Quick sanity check without spinning up the server or a real GitHub PR.
 * Run: npm run test:review
 * Requires ANTHROPIC_API_KEY to be set in .env
 */
const fs = require("fs");
const path = require("path");
const { reviewPullRequest } = require("../src/modules/review/review.service");
const { detectSlop } = require("../src/modules/slop/slop.service");

async function main() {
  const diff = fs.readFileSync(path.join(__dirname, "sample-diff.txt"), "utf-8");

  console.log("Running PR review...\n");
  const reviewResult = await reviewPullRequest({
    diff,
    prTitle: "Add payment charge retry logic",
    prDescription: "Adds a helper to charge the card and handle errors.",
  });
  console.log(JSON.stringify(reviewResult, null, 2));

  console.log("\nRunning slop detection...\n");
  const slopResult = await detectSlop({ diff });
  console.log(JSON.stringify(slopResult, null, 2));
}

main().catch((err) => {
  console.error("Test failed:", err);
  process.exit(1);
});
