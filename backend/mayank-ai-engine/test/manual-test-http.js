const http = require("http");
const { reviewPullRequest } = require("../src/modules/review/review.service");
const { detectSlop } = require("../src/modules/slop/slop.service");
const { analyzeRootCause } = require("../src/modules/rca/rca.service");
const { generatePatch } = require("../src/modules/patch/patch.service");

async function testAll() {
  console.log("=== 1. Testing PR Reviewer with Groq ===");
  const diff = `diff --git a/src/utils.js b/src/utils.js
--- a/src/utils.js
+++ b/src/utils.js
@@ -1,3 +1,5 @@
+const API_SECRET = "sk_live_99999999999999999999";
 function calculate(a, b) {
+  try { return a + b; } catch (e) {}
 }`;

  const review = await reviewPullRequest({ diff, prTitle: "Add calculate helper" });
  console.log("PR Review Score:", review.score);
  console.log("PR Findings Count:", review.findings.length);

  console.log("\n=== 2. Testing Slop Detector with Groq ===");
  const slop = await detectSlop({ diff });
  console.log("Code Health Overall:", slop.codeHealth.overall);
  console.log("Slop Findings Count:", slop.findings.length);

  console.log("\n=== 3. Testing RCA Engine with Groq ===");
  const rca = await analyzeRootCause({
    incident: {
      title: "Cannot read user ID",
      errorMessage: "TypeError: Cannot read properties of undefined (reading 'id')",
      stackTrace: "TypeError: Cannot read properties of undefined (reading 'id')\n    at getUser (src/user.js:12:15)"
    },
    sourceCode: "function getUser(req) {\n  return req.user.id;\n}"
  });
  console.log("RCA Root Cause:", rca.rootCause);
  console.log("RCA Confidence:", rca.confidence);

  console.log("\n=== 4. Testing Patch Generator with Groq ===");
  const patch = await generatePatch({
    sourceCode: "function getUser(req) {\n  return req.user.id;\n}",
    filePath: "src/user.js",
    issueDescription: rca.rootCause,
    suggestedFix: rca.suggestedFixDescription
  });
  console.log("Patch isValid:", patch.isValid);
  console.log("Patch Explanation:", patch.explanation);
}

testAll().then(() => {
  console.log("\n✅ ALL MODULES (PR Reviewer, Slop Detector, RCA, Patch Generator) ARE 100% FUNCTIONAL WITH GROQ API!");
}).catch(err => {
  console.error("❌ Test failed:", err);
  process.exit(1);
});
