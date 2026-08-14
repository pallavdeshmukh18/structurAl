const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, ".env") });
const mongoose = require("mongoose");
const { WebClient } = require("@slack/web-api");

// MongoDB Incident Schema Definition
const incidentSchema = new mongoose.Schema(
  {
    repositoryId: { type: mongoose.Schema.Types.ObjectId, ref: "Repository" },
    title: { type: String, required: true },
    description: { type: String },
    severity: { type: String, default: "MEDIUM" },
    status: { type: String, default: "OPEN" },
    source: { type: String, default: "GITHUB_PUSH" },
    error: {
      type: { type: String },
      message: { type: String },
      stacktrace: { type: String },
    },
    metadata: {
      commitSha: { type: String },
      author: { type: String },
      url: { type: String },
      branch: { type: String },
    },
  },
  { timestamps: true }
);

const Incident = mongoose.models.Incident || mongoose.model("Incident", incidentSchema);

const slackToken = process.env.SLACK_BOT_TOKEN;
const channelId = process.env.SLACK_CHANNEL_ID;
const mongoUri = process.env.MONGODB_URI;
const pollInterval = parseInt(process.env.POLL_INTERVAL_MS || "5000", 10);

const slack = new WebClient(slackToken);

let lastCheckedTime = new Date();

function getSeverityEmoji(severity) {
  switch (severity) {
    case "CRITICAL":
      return "🔴";
    case "HIGH":
      return "🟠";
    case "MEDIUM":
      return "🟡";
    case "LOW":
      return "🔵";
    default:
      return "ℹ️";
  }
}

function getSourceBadge(source) {
  switch (source) {
    case "GITHUB_PING":
      return "📡 GitHub Health Ping";
    case "GITHUB_PUSH":
      return "🚀 GitHub Push Event";
    case "GITHUB_PR":
      return "🔀 GitHub Pull Request";
    case "OTEL_TRACE":
      return "⚡ OpenTelemetry Trace";
    default:
      return "🛠 System Incident";
  }
}

async function formatSlackMessage(incident) {
  const emoji = getSeverityEmoji(incident.severity);
  const sourceText = getSourceBadge(incident.source);
  const title = incident.title || "New Incident Recorded";
  const desc = incident.description || incident.error?.message || "No description provided.";
  const author = incident.metadata?.author ? `👤 *Author:* ${incident.metadata.author}\n` : "";
  const commit = incident.metadata?.commitSha ? `🔗 *Commit:* \`${incident.metadata.commitSha.substring(0, 7)}\`\n` : "";
  const url = incident.metadata?.url ? `<${incident.metadata.url}|View Event on GitHub>` : "";

  return {
    channel: channelId,
    text: `${emoji} *[StructurAI Alert]* ${title}`,
    blocks: [
      {
        type: "header",
        text: {
          type: "plain_text",
          text: `${emoji} StructurAI Telemetry Alert`,
          emoji: true,
        },
      },
      {
        type: "section",
        fields: [
          {
            type: "mrkdwn",
            text: `*Title:*\n${title}`,
          },
          {
            type: "mrkdwn",
            text: `*Severity:*\n\`${incident.severity}\``,
          },
          {
            type: "mrkdwn",
            text: `*Source:*\n${sourceText}`,
          },
          {
            type: "mrkdwn",
            text: `*Status:*\n\`${incident.status}\``,
          },
        ],
      },
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: `*Details:*\n${desc}\n\n${author}${commit}${url}`,
        },
      },
      {
        type: "divider",
      },
      {
        type: "context",
        elements: [
          {
            type: "mrkdwn",
            text: `Timestamp: ${new Date(incident.createdAt).toLocaleString()} | StructurAI Engine`,
          },
        ],
      },
    ],
  };
}

async function sendSlackNotification(incident) {
  try {
    const message = await formatSlackMessage(incident);
    const result = await slack.chat.postMessage(message);
    console.log(`[SLACK BOT] Successfully posted alert for Incident ID: ${incident._id} (TS: ${result.ts})`);
  } catch (error) {
    console.error("[SLACK BOT ERROR] Failed to send message to Slack:", error.message);
  }
}

async function checkForNewIncidents() {
  try {
    const newIncidents = await Incident.find({
      createdAt: { $gt: lastCheckedTime },
    }).sort({ createdAt: 1 });

    if (newIncidents.length > 0) {
      console.log(`[SLACK BOT] Detected ${newIncidents.length} new incident(s)/ping(s). Publishing...`);
      for (const incident of newIncidents) {
        await sendSlackNotification(incident);
        if (incident.createdAt > lastCheckedTime) {
          lastCheckedTime = new Date(incident.createdAt);
        }
      }
    }
  } catch (err) {
    console.error("[SLACK BOT ERROR] Polling query failed:", err.message);
  }
}

async function startBot() {
  console.log("🚀 Starting StructurAI Slack Bot Service...");
  
  if (!mongoUri) {
    console.error("❌ MONGODB_URI is not defined in environment.");
    process.exit(1);
  }

  if (!slackToken || slackToken === "xoxb-your-slack-bot-token") {
    console.warn("⚠️ SLACK_BOT_TOKEN is missing or using placeholder. Slack messaging will fail until a valid bot token (xoxb-...) is provided.");
  }

  if (!channelId || channelId === "C0123456789") {
    console.warn("⚠️ SLACK_CHANNEL_ID is missing or using placeholder. Specify your Slack Channel ID (e.g. C0123456789).");
  }

  try {
    await mongoose.connect(mongoUri);
    console.log("✅ Connected to MongoDB.");

    // Initial check time
    lastCheckedTime = new Date();

    console.log(`📡 Polling for new pings and incidents every ${pollInterval / 1000}s...`);
    setInterval(checkForNewIncidents, pollInterval);
  } catch (err) {
    console.error("❌ MongoDB connection error:", err.message);
    process.exit(1);
  }
}

startBot();
