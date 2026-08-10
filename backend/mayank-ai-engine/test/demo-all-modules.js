const { reviewPullRequest } = require("../src/modules/review/review.service");
const { detectSlop } = require("../src/modules/slop/slop.service");
const { analyzeRootCause } = require("../src/modules/rca/rca.service");
const { generatePatch } = require("../src/modules/patch/patch.service");

async function runDemo() {
  console.log("=================================================");
  console.log("🤖 STRUCTURAI AI ENGINE - DEMO & VERIFICATION");
  console.log("=================================================\n");

  const sampleDiff = `diff --git a/src/auth.js b/src/auth.js
--- a/src/auth.js
+++ b/src/auth.js
@@ -1,5 +1,8 @@
+const OAUTH_SECRET = "sk_live_abc123987xyz456";
 function authenticateUser(token) {
+  try {
     return jwt.verify(token, OAUTH_SECRET);
+  } catch(e) {}
 }`;

  console.log("📌 1. RUNNING PR REVIEWER...");
  const reviewResult = await reviewPullRequest({
    diff: sampleDiff,
    prTitle: "Add hardcoded auth secret and swallow verify errors",
    prDescription: "Quick patch for auth token verification."
  });
  console.log(JSON.stringify(reviewResult, null, 2));

  console.log("\n-------------------------------------------------\n");

  console.log("📌 2. RUNNING SLOP DETECTOR & CODE HEALTH SCAN...");
  const slopResult = await detectSlop({ diff: sampleDiff });
  console.log(JSON.stringify(slopResult, null, 2));

  console.log("\n-------------------------------------------------\n");

  console.log("📌 3. RUNNING ROOT CAUSE ANALYSIS (RCA) ENGINE...");
  const rcaResult = await analyzeRootCause({
    incident: {
      title: "Unhandled Rejection in Payment Webhook Handler",
      errorMessage: "TypeError: Cannot read properties of null (reading 'customer_id')",
      stackTrace: "TypeError: Cannot read properties of null (reading 'customer_id')\n    at handleWebhook (src/webhook.js:24:32)\n    at processTicksAndRejections (node:internal/process/task_queues:95:5)"
    },
    sourceCode: "async function handleWebhook(event) {\n  const payload = event.data.object;\n  const customerId = payload.customer_id;\n  await updateCustomerBilling(customerId);\n}"
  });
  console.log(JSON.stringify(rcaResult, null, 2));

  console.log("\n-------------------------------------------------\n");

  console.log("📌 4. RUNNING AI PATCH GENERATOR & AUTO-FIX ENGINE...");
  const patchResult = await generatePatch({
    sourceCode: "async function handleWebhook(event) {\n  const payload = event.data.object;\n  const customerId = payload.customer_id;\n  await updateCustomerBilling(customerId);\n}",
    filePath: "src/webhook.js",
    issueDescription: rcaResult.rootCause,
    suggestedFix: rcaResult.suggestedFixDescription
  });
  console.log(JSON.stringify(patchResult, null, 2));

  console.log("\n=================================================");
  console.log("🎉 ALL 4 AI ENGINE MODULES EXECUTED SUCCESSFULLY!");
  console.log("=================================================");
}

runDemo().catch((err) => {
  console.error("❌ Execution error:", err);
  process.exit(1);
});
