/**
 * Slack Integration Controller
 * Checks Slack Bot connection status & provides installation details.
 * Keeps SLACK_BOT_TOKEN server-side and never exposes secrets.
 */
const getSlackStatus = async (req, res) => {
  try {
    const slackBotToken = process.env.SLACK_BOT_TOKEN;
    const slackChannelId = process.env.SLACK_CHANNEL_ID;

    const isConfigured = Boolean(
      slackBotToken &&
      slackBotToken !== "xoxb-your-slack-bot-token" &&
      slackBotToken.startsWith("xoxb-")
    );

    return res.json({
      isConfigured,
      channelId: isConfigured ? slackChannelId : null,
      installUrl: "https://api.slack.com/apps",
      botName: "StructurAI Telemetry Alert Bot",
    });
  } catch (error) {
    console.error("[SlackController] Error fetching Slack status:", error.message);
    return res.status(500).json({ error: "Failed to fetch Slack status" });
  }
};

module.exports = {
  getSlackStatus,
};
