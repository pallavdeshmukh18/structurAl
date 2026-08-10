require("dotenv").config();
const mongoose = require("mongoose");
const { User, Repository, PullRequest } = require("./src/models");
const { webhookService, verifyWebhookSignature } = require("./src/services/webhook.service");

async function testWebhook() {
  console.log("==================================================");
  console.log("🚀 StructurAI GitHub PR Webhook Verification Test");
  console.log("==================================================");

  const mongoUri = process.env.MONGODB_URI;
  if (!mongoUri) {
    console.warn("⚠️ MONGODB_URI not found. Testing in-memory webhook logic...");
  } else {
    try {
      await mongoose.connect(mongoUri, { serverSelectionTimeoutMS: 3000 });
      console.log(" Connected to MongoDB");
    } catch (e) {
      console.warn("⚠️ Could not connect to live MongoDB, testing service logic directly.");
    }
  }

  // 1. Test Webhook Signature verification
  console.log("\n🔐 1. Testing Webhook HMAC Signature Verification:");
  const testSecret = "secret-test-key-123";
  const testPayload = JSON.stringify({ action: "opened", number: 42 });
  const crypto = require("crypto");
  const validSig = "sha256=" + crypto.createHmac("sha256", testSecret).update(testPayload).digest("hex");
  const isSigValid = verifyWebhookSignature(testPayload, validSig, testSecret);
  const isBadSigValid = verifyWebhookSignature(testPayload, "sha256=invalid", testSecret);
  console.log(`  • Valid Signature Verified: ${isSigValid ? "PASSED" : "FAILED"}`);
  console.log(`  • Bad Signature Rejected: ${!isBadSigValid ? "PASSED" : "FAILED"}`);

  // 2. Test Ping Event
  console.log("\n📡 2. Testing 'ping' Event Handling:");
  const pingRes = await webhookService.processGitHubEvent("ping", { zen: "Design for failure.", hook_id: 123456 });
  console.log("  • Ping Result:", JSON.stringify(pingRes));

  if (mongoose.connection.readyState === 1) {
    // 3. Setup test user & repository
    let user = await User.findOne({ email: "webhook-test@structurai.dev" });
    if (!user) {
      user = await User.create({
        email: "webhook-test@structurai.dev",
        name: "Webhook Tester",
      });
    }

    let repo = await Repository.findOne({ "github.id": 123456789 });
    if (!repo) {
      repo = await Repository.create({
        ownerId: user._id,
        github: {
          id: 123456789,
          owner: "structurai-org",
          name: "core-repo",
          fullName: "structurai-org/core-repo",
          defaultBranch: "main",
        },
        language: "TypeScript",
        indexing: { status: "ready" },
      });
    }

    // 4. Test PR Opened Webhook
    console.log("\n📬 3. Testing PR 'opened' Event:");
    const prOpenedPayload = {
      action: "opened",
      number: 101,
      repository: {
        id: 123456789,
        name: "core-repo",
        full_name: "structurai-org/core-repo",
        owner: { login: "structurai-org" },
      },
      pull_request: {
        id: 987654321,
        number: 101,
        title: "feat(auth): add OAuth2 refresh token rotation",
        body: "Implements secure refresh token rotation and anti-tampering logic.",
        state: "open",
        html_url: "https://github.com/structurai-org/core-repo/pull/101",
        base: { ref: "main", sha: "base-sha-111" },
        head: { ref: "feature/token-rotation", sha: "head-sha-222" },
        user: { id: 555, login: "dev-contributor" },
        changed_files: 3,
        additions: 120,
        deletions: 15,
        merged: false,
      },
    };

    const prOpenResult = await webhookService.processGitHubEvent("pull_request", prOpenedPayload);
    console.log("  • PR Opened Result:", JSON.stringify(prOpenResult, null, 2));

    const savedPR = await PullRequest.findOne({ repositoryId: repo._id, "github.number": 101 });
    console.log(`  • PullRequest created in DB: ${savedPR ? "YES" : "NO"}`);
    console.log(`  • PR Title: "${savedPR?.title}"`);
    console.log(`  • PR Status: ${savedPR?.status}`);
    console.log(`  • PR Head SHA: ${savedPR?.github.headSha}`);

    // 5. Test PR Synchronize Webhook (new commit pushed to PR)
    console.log("\n🔄 4. Testing PR 'synchronize' (commit pushed to PR) Event:");
    const prSyncPayload = {
      ...prOpenedPayload,
      action: "synchronize",
      pull_request: {
        ...prOpenedPayload.pull_request,
        head: { ref: "feature/token-rotation", sha: "head-sha-333-updated" },
      },
    };

    const prSyncResult = await webhookService.processGitHubEvent("pull_request", prSyncPayload);
    console.log("  • PR Sync Result:", JSON.stringify(prSyncResult, null, 2));

    const updatedPR = await PullRequest.findOne({ repositoryId: repo._id, "github.number": 101 });
    console.log(`  • PR Updated Head SHA: ${updatedPR?.github.headSha}`);

    // 6. Test PR Merged / Closed Webhook
    console.log("\n🏁 5. Testing PR 'closed' & 'merged' Event:");
    const prClosedPayload = {
      ...prOpenedPayload,
      action: "closed",
      pull_request: {
        ...prOpenedPayload.pull_request,
        state: "closed",
        merged: true,
        merged_at: new Date().toISOString(),
      },
    };

    const prClosedResult = await webhookService.processGitHubEvent("pull_request", prClosedPayload);
    console.log("  • PR Closed Result:", JSON.stringify(prClosedResult, null, 2));

    const closedPR = await PullRequest.findOne({ repositoryId: repo._id, "github.number": 101 });
    console.log(`  • Final PR Status in DB: ${closedPR?.status}`);
    console.log(`  • Merged At: ${closedPR?.mergedAt}`);

    await mongoose.disconnect();
    console.log("\n Webhook test completed successfully!");
  }
}

testWebhook().catch((err) => {
  console.error("❌ Test failed:", err);
  process.exit(1);
});
