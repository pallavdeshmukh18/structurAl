const express = require("express");
const router = express.Router();
const { handleGitHubWebhook } = require("./webhook.controller");

// Endpoint for GitHub Webhooks
router.post("/github", handleGitHubWebhook);
router.post("/", handleGitHubWebhook);

module.exports = router;
