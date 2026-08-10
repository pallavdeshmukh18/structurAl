const express = require("express");
const router = express.Router();

const {
  createChannel,
  getChannels,
  inviteToChannel,
  sendMessage,
  getMessages,
} = require("./chat.controller");
const { isAuthenticated } = require("../../middleware/auth");

router.post("/channels", isAuthenticated, createChannel);
router.get("/channels/:repoId/:prNumber", isAuthenticated, getChannels);
router.post("/channels/:channelId/invite", isAuthenticated, inviteToChannel);
router.post("/channels/:channelId/messages", isAuthenticated, sendMessage);
router.get("/channels/:channelId/messages", isAuthenticated, getMessages);

module.exports = router;
