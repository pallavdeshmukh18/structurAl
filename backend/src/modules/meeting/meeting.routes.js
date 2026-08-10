const express = require("express");
const router = express.Router();
const {
  generateRtcToken,
  createMeeting,
  listMeetings,
  getMeeting,
} = require("./meeting.controller");
const { optionalAuth } = require("../../middleware/auth");

// Token generation
router.post("/token", optionalAuth, generateRtcToken);
router.post("/meeting/token", optionalAuth, generateRtcToken);

// Meeting sessions
router.post("/", optionalAuth, createMeeting);
router.post("/meetings", optionalAuth, createMeeting);
router.get("/", optionalAuth, listMeetings);
router.get("/meetings", optionalAuth, listMeetings);
router.get("/:idOrChannel", optionalAuth, getMeeting);
router.get("/meetings/:idOrChannel", optionalAuth, getMeeting);

module.exports = router;
