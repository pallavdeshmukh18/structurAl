require("dotenv").config();
const mongoose = require("mongoose");
const { User, Repository, Incident } = require("./src/models");
const { webhookService } = require("./src/services/webhook.service");
const { incidentService, evaluateSeverity } = require("./src/services/incident.service");

async function runIncidentVerification() {
  console.log("==================================================");
  console.log("🚀 StructurAI Incidents Service Verification Test");
  console.log("==================================================");

  // 1. Test Severity Evaluator Unit Tests
  console.log("\n🧪 1. Testing Severity & Keyword Rules:");
  const testCases = [
    { text: "fix: auth bypass vulnerability in JWT validator", expected: "CRITICAL" },
    { text: "investigate: database crash and fatal panic", expected: "HIGH" },
    { text: "hotfix: patch degraded latency in order service", expected: "MEDIUM" },
    { text: "add new feature flag for beta users", expected: "INFO" },
  ];

  testCases.forEach(({ text, expected }) => {
    const res = evaluateSeverity(text);
    const passed = res.severity === expected;
    console.log(`  • "${text.slice(0, 45)}..." -> [${res.severity}] (Expected: ${expected}) -> ${passed ? "✅ PASS" : "❌ FAIL"}`);
    if (res.matchedKeywords.length > 0) {
      console.log(`    Matched: ${res.matchedKeywords.join(", ")}`);
    }
  });

  // 2. Connect to MongoDB
  const mongoUri = process.env.MONGODB_URI;
  if (!mongoUri) {
    console.warn("⚠️ MONGODB_URI not configured, skipping DB integration test.");
    return;
  }

  await mongoose.connect(mongoUri, { serverSelectionTimeoutMS: 5000 });
  console.log("\n Connected to MongoDB Atlas");

  // 3. Ensure test repository exists
  let user = await User.findOne({ email: "incident-tester@structurai.dev" });
  if (!user) {
    user = await User.create({
      email: "incident-tester@structurai.dev",
      name: "Incident Test Agent",
    });
  }

  let repo = await Repository.findOne({ "github.id": 99887766 });
  if (!repo) {
    repo = await Repository.create({
      ownerId: user._id,
      github: {
        id: 99887766,
        owner: "structurai",
        name: "payment-gateway",
        fullName: "structurai/payment-gateway",
        defaultBranch: "main",
      },
      language: "TypeScript",
      indexing: { status: "ready" },
    });
  }

  console.log(` Test Repository: ${repo.github.fullName} (${repo._id})`);

  // 4. Simulate Push Webhook with Critical Severity
  console.log("\n📦 2. Simulating GitHub Push Webhook (Critical Threat):");
  const pushPayload = {
    ref: "refs/heads/main",
    after: "c9a8b7f6e5d4c3b2a100112233445566778899aa",
    repository: {
      id: 99887766,
      name: "payment-gateway",
      full_name: "structurai/payment-gateway",
    },
    pusher: { name: "alex-dev" },
    head_commit: {
      id: "c9a8b7f6e5d4c3b2a100112233445566778899aa",
      message: "urgent: fix auth bypass and credential leak vulnerability",
      url: "https://github.com/structurai/payment-gateway/commit/c9a8b7f6",
      author: { name: "alex-dev" },
      added: [],
      modified: ["src/auth/jwt.service.ts"],
      removed: [],
    },
  };

  const pushResult = await webhookService.processGitHubEvent("push", pushPayload);
  console.log("  • Push Webhook Processed:", JSON.stringify(pushResult, null, 2));

  const savedPushIncident = await Incident.findById(pushResult.incidentId);
  console.log(`  • Incident Persisted in DB: ${savedPushIncident ? "✅ YES" : "❌ NO"}`);
  console.log(`  • Severity: [${savedPushIncident?.severity}] | Status: [${savedPushIncident?.status}]`);
  console.log(`  • Title: "${savedPushIncident?.title}"`);

  // 5. Simulate PR Webhook with High Severity
  console.log("\n📬 3. Simulating GitHub Pull Request Webhook (High Severity):");
  const prPayload = {
    action: "opened",
    number: 77,
    repository: {
      id: 99887766,
      name: "payment-gateway",
      full_name: "structurai/payment-gateway",
    },
    pull_request: {
      id: 1122334455,
      number: 77,
      title: "fix: database crash and deadlocks in worker thread",
      body: "Resolves unhandled deadlock and database crash during high-throughput batches.",
      state: "open",
      html_url: "https://github.com/structurai/payment-gateway/pull/77",
      head: { ref: "fix/memory-leak", sha: "deadbeef12345678" },
      base: { ref: "main", sha: "c9a8b7f6" },
      user: { login: "worker-dev" },
      changed_files: 2,
    },
  };

  const prResult = await webhookService.processGitHubEvent("pull_request", prPayload);
  console.log("  • PR Webhook Processed:", JSON.stringify(prResult, null, 2));

  const savedPRIncident = await Incident.findById(prResult.incidentId);
  console.log(`  • PR Incident Persisted in DB: ${savedPRIncident ? "✅ YES" : "❌ NO"}`);
  console.log(`  • Severity: [${savedPRIncident?.severity}] | Status: [${savedPRIncident?.status}]`);

  // 6. Test Incident Listing & Filters
  console.log("\n🔍 4. Testing Incident Query API:");
  const listResult = await incidentService.listIncidents({
    repositoryId: repo._id,
    limit: 10,
  });
  console.log(`  • Total Incidents Found: ${listResult.pagination.total}`);
  listResult.incidents.forEach((inc) => {
    console.log(`    - [${inc.severity}] ${inc.status}: ${inc.title} (Source: ${inc.source})`);
  });

  // 7. Test Updating Incident Status
  console.log("\n🔄 5. Testing Incident Status Update (OPEN -> INVESTIGATING -> RESOLVED):");
  const updated1 = await incidentService.updateIncidentStatus(savedPushIncident._id, "INVESTIGATING");
  console.log(`  • Status after update to INVESTIGATING: ${updated1.status}`);

  const updated2 = await incidentService.updateIncidentStatus(savedPushIncident._id, "RESOLVED");
  console.log(`  • Status after update to RESOLVED: ${updated2.status} (resolvedAt: ${updated2.resolvedAt})`);

  // Allow short delay for async logs
  await new Promise((resolve) => setTimeout(resolve, 500));
  await mongoose.disconnect();
  console.log("\n✅ Incidents Service verification complete!");
}

runIncidentVerification().catch((err) => {
  console.error("❌ Incident verification failed:", err);
  process.exit(1);
});
