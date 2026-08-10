const { webhookService } = require("../../services/webhook.service");
const { sanitizeError } = require("../../utils/sanitizer");

/**
 * Handle incoming GitHub Webhooks after signature verification
 * POST /api/webhooks/github
 */
const handleGitHubWebhook = async (req, res) => {
  try {
    const event = req.headers["x-github-event"] || "unknown";
    const deliveryId = req.headers["x-github-delivery"] || null;

    console.log(`[WEBHOOK] Received event '${event}' (Delivery: ${deliveryId})`);

    const result = await webhookService.processGitHubEvent(event, req.body);
    return res.status(200).json({
      received: true,
      deliveryId,
      ...result,
    });
  } catch (error) {
    const safeMsg = sanitizeError(error.message || error);
    console.error("[WEBHOOK ERROR] Failed processing GitHub webhook:", safeMsg);
    return res.status(500).json({ error: safeMsg || "Internal server error" });
  }
};

module.exports = {
  handleGitHubWebhook,
};
