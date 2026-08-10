const express = require("express");
const router = express.Router();

const { verifyGitHubSignature } = require("../../middleware/githubWebhook");
const { handleGitHubWebhook } = require("./github.webhook.controller");

router.post("/github", verifyGitHubSignature, handleGitHubWebhook);
router.post("/", verifyGitHubSignature, handleGitHubWebhook);

module.exports = router;
