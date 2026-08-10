/**
 * Manual test script for Root Cause Analysis (RCA) and Patch Generator.
 * Run: npm run test:patch
 * Requires ANTHROPIC_API_KEY to be set in .env
 */

const { analyzeRootCause } = require("../src/modules/rca/rca.service");
const { generatePatch } = require("../src/modules/patch/patch.service");

const sampleIncident = {
  traceId: "tr-98721-abc",
  service: "payment-service",
  error: "TypeError: Cannot read properties of undefined (reading 'cardToken')",
  status: "ERROR",
  timestamp: "2026-08-11T00:15:00Z",
  sourceLocation: {
    file: "src/services/payment.js",
    line: 16,
    function: "processPayment",
  },
};

const sampleExecutionGraph = {
  nodes: [
    { id: "span-1", operation: "POST /api/checkout", status: "OK", durationMs: 12 },
    { id: "span-2", operation: "processPayment", status: "ERROR", durationMs: 45, error: "TypeError: Cannot read properties of undefined (reading 'cardToken')" },
  ],
  edges: [
    { source: "span-1", target: "span-2" },
  ],
};

const buggySourceCode = `
async function processPayment(order) {
  const amount = order.total;

  // Attempting to charge card without validating order or order.cardToken
  const result = await chargeCard(order.cardToken, amount);
  return result;
}

module.exports = { processPayment };
`;

async function main() {
  console.log("=== STEP 1: Running Root Cause Analysis (RCA) ===");
  const rcaResult = await analyzeRootCause({
    incident: sampleIncident,
    executionGraph: sampleExecutionGraph,
    sourceCode: buggySourceCode,
  });
  console.log("\n[RCA Result]:");
  console.log(JSON.stringify(rcaResult, null, 2));

  console.log("\n=== STEP 2: Running AI Patch Engine ===");
  const patchResult = await generatePatch({
    sourceCode: buggySourceCode,
    filePath: "src/services/payment.js",
    issueDescription: `${rcaResult.rootCause}: ${rcaResult.explanation}`,
    suggestedFix: rcaResult.suggestedFixDescription,
  });
  console.log("\n[Patch Result]:");
  console.log(JSON.stringify(patchResult, null, 2));
}

main().catch((err) => {
  console.error("Test failed:", err);
  process.exit(1);
});
