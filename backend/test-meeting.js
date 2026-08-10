require("dotenv").config();
const mongoose = require("mongoose");
const { Meeting, Repository, User } = require("./src/models");
const { RtcTokenBuilder, RtcRole } = require("agora-access-token");

async function testAgoraMeeting() {
  console.log("==================================================");
  console.log("🎥 StructurAI Agora RTC Meeting & Token Verification");
  console.log("==================================================");

  // 1. Test Dynamic RTC Token Generation
  const testAppId = process.env.AGORA_APP_ID || "test_agora_app_id_99";
  const testCert = process.env.AGORA_APP_CERTIFICATE || "test_cert_1234567890abcdef1234567890abcdef";
  const testChannel = "pr-review-77-payment-gateway";
  const testUid = 1001;
  const privilegeExpiredTs = Math.floor(Date.now() / 1000) + 3600;

  const token = RtcTokenBuilder.buildTokenWithUid(
    testAppId,
    testCert,
    testChannel,
    testUid,
    RtcRole.PUBLISHER,
    privilegeExpiredTs
  );

  console.log("✅ Token generated successfully:");
  console.log(`  • Channel: ${testChannel}`);
  console.log(`  • UID: ${testUid}`);
  console.log(`  • Token Length: ${token.length} chars`);
  console.log(`  • Token Preview: ${token.slice(0, 30)}...`);

  // 2. Connect to MongoDB and verify Meeting model persistence
  const mongoUri = process.env.MONGODB_URI;
  if (!mongoUri) {
    console.warn("⚠️ MONGODB_URI not configured, skipping DB persistence check.");
    return;
  }

  await mongoose.connect(mongoUri, { serverSelectionTimeoutMS: 5000 });
  console.log("\n📦 Connected to MongoDB Atlas");

  const meeting = await Meeting.findOneAndUpdate(
    { channelName: testChannel },
    {
      title: "Live PR #77 Slop Review & Call Flow Debug",
      channelName: testChannel,
      prNumber: 77,
      scheduledAt: new Date(),
      status: "LIVE",
      creatorName: "Alex Senior Reviewer",
    },
    { upsert: true, returnDocument: "after", runValidators: true }
  );

  console.log(`✅ Meeting session persisted in DB: ID ${meeting._id}`);
  console.log(`  • Title: "${meeting.title}"`);
  console.log(`  • Status: [${meeting.status}]`);
  console.log(`  • Channel: ${meeting.channelName}`);

  await mongoose.disconnect();
  console.log("\n🎉 Agora meeting backend verification successful!");
}

testAgoraMeeting().catch((err) => {
  console.error("❌ Meeting test error:", err);
  process.exit(1);
});
