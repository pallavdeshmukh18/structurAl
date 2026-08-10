const { webhookService, verifyWebhookSignature } = require("../../services/webhook.service");
const { sanitizeError } = require("../../utils/sanitizer");

/**
 * Handle incoming GitHub Webhooks
 * POST /api/webhooks/github
 */
const handleGitHubWebhook = async (req, res) => {
  try {
    const event = req.headers["x-github-event"];
    const deliveryId = req.headers["x-github-delivery"];
    const signature = req.headers["x-hub-signature-256"];

    if (!event) {
      return res.status(400).json({ error: "Missing X-GitHub-Event header" });
    }

    // Verify webhook signature if GITHUB_WEBHOOK_SECRET is configured
    const secret = process.env.GITHUB_WEBHOOK_SECRET;
    if (secret && signature) {
      const rawBody = JSON.stringify(req.body);
      const isValid = verifyWebhookSignature(rawBody, signature, secret);
      if (!isValid) {
        console.warn(`[WebhookController] Invalid webhook signature for delivery ${deliveryId}`);
        return res.status(401).json({ error: "Invalid webhook signature" });
      }
    }

    const result = await webhookService.processGitHubEvent(event, req.body);
    return res.status(200).json(result);
  } catch (error) {
    const safeError = sanitizeError(error.message || error);
    console.error("[WebhookController] Webhook handling error:", safeError);
    return res.status(500).json({ error: safeError || "Failed to process webhook" });
  }
};

module.exports = {
  handleGitHubWebhook,
};
