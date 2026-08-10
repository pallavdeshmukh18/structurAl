const { RtcTokenBuilder, RtcRole } = require("agora-access-token");
const mongoose = require("mongoose");
const { Meeting, Repository, User } = require("../../models");

/**
 * Generate Agora RTC Token for a channel
 * POST /api/reviews/meeting/token or POST /api/meetings/token
 */
const generateRtcToken = async (req, res) => {
  try {
    const { channelName, uid, role = "publisher" } = req.body;

    if (!channelName) {
      return res.status(400).json({ error: "Channel name is required" });
    }

    const appId = process.env.AGORA_APP_ID || "demo_app_id_structurai";
    const appCertificate = process.env.AGORA_APP_CERTIFICATE || "";

    // Parse numeric UID or default to 0 for auto-allocation
    const numericUid = parseInt(uid, 10) || 0;
    const rtcRole = role === "audience" ? RtcRole.SUBSCRIBER : RtcRole.PUBLISHER;
    const expirationTimeInSeconds = 3600; // 1 hour
    const currentTimestamp = Math.floor(Date.now() / 1000);
    const privilegeExpiredTs = currentTimestamp + expirationTimeInSeconds;

    let token = "";

    if (appId && appCertificate) {
      token = RtcTokenBuilder.buildTokenWithUid(
        appId,
        appCertificate,
        channelName,
        numericUid,
        rtcRole,
        privilegeExpiredTs
      );
    } else {
      // Development fallback token if no Agora credentials configured yet
      token = `DEV_MOCK_TOKEN_${channelName}_${Date.now()}`;
    }

    return res.json({
      token,
      appId,
      channelName,
      uid: numericUid,
      expiresAt: privilegeExpiredTs,
    });
  } catch (error) {
    console.error("[MeetingController] Error generating RTC token:", error.message);
    return res.status(500).json({ error: "Failed to generate RTC token" });
  }
};

/**
 * Schedule or Start a Meeting Session
 * POST /api/meetings or POST /api/reviews/meetings
 */
const createMeeting = async (req, res) => {
  try {
    const {
      title,
      channelName,
      repositoryId,
      prNumber,
      scheduledAt,
      creatorName,
    } = req.body;

    const formattedChannel = channelName
      ? channelName.toLowerCase().replace(/[^a-z0-9_-]/g, "-")
      : `pr-review-${prNumber || "room"}-${Date.now().toString(36)}`;

    const userId = req.user ? req.user._id : null;
    const resolvedCreator = req.user ? (req.user.name || req.user.email) : (creatorName || "Review Lead");

    let repoObjectId = null;
    if (repositoryId && mongoose.Types.ObjectId.isValid(repositoryId)) {
      repoObjectId = repositoryId;
    }

    const meeting = await Meeting.findOneAndUpdate(
      { channelName: formattedChannel },
      {
        title: title || `PR #${prNumber || "Live"} Code Review Session`,
        channelName: formattedChannel,
        repositoryId: repoObjectId,
        prNumber: prNumber ? parseInt(prNumber, 10) : undefined,
        scheduledAt: scheduledAt ? new Date(scheduledAt) : new Date(),
        status: "LIVE",
        createdById: userId,
        creatorName: resolvedCreator,
      },
      { upsert: true, returnDocument: "after", runValidators: true }
    ).populate("repositoryId", "github.fullName github.name language");

    // Generate initial token for the session
    const appId = process.env.AGORA_APP_ID || "demo_app_id_structurai";
    const appCertificate = process.env.AGORA_APP_CERTIFICATE || "";
    let token = "";

    if (appId && appCertificate) {
      token = RtcTokenBuilder.buildTokenWithUid(
        appId,
        appCertificate,
        formattedChannel,
        0,
        RtcRole.PUBLISHER,
        Math.floor(Date.now() / 1000) + 3600
      );
    } else {
      token = `DEV_MOCK_TOKEN_${formattedChannel}_${Date.now()}`;
    }

    return res.status(201).json({
      meeting,
      token,
      appId,
      channelName: formattedChannel,
    });
  } catch (error) {
    console.error("[MeetingController] Error creating meeting:", error.message);
    return res.status(500).json({ error: error.message || "Failed to create meeting" });
  }
};

/**
 * List meetings for a repository or pull request
 * GET /api/meetings
 */
const listMeetings = async (req, res) => {
  try {
    const { repositoryId, prNumber, status } = req.query;
    const query = {};

    if (repositoryId && mongoose.Types.ObjectId.isValid(repositoryId)) {
      query.repositoryId = repositoryId;
    }

    if (prNumber) {
      query.prNumber = parseInt(prNumber, 10);
    }

    if (status && status !== "ALL") {
      query.status = status.toUpperCase();
    }

    const meetings = await Meeting.find(query)
      .populate("repositoryId", "github.fullName github.name language")
      .sort({ createdAt: -1 })
      .limit(50);

    return res.json({ meetings });
  } catch (error) {
    console.error("[MeetingController] Error listing meetings:", error.message);
    return res.status(500).json({ error: "Failed to list meetings" });
  }
};

/**
 * Get single meeting details
 * GET /api/meetings/:idOrChannel
 */
const getMeeting = async (req, res) => {
  try {
    const { idOrChannel } = req.params;
    let meeting = null;

    if (mongoose.Types.ObjectId.isValid(idOrChannel)) {
      meeting = await Meeting.findById(idOrChannel).populate("repositoryId", "github.fullName github.name language defaultBranch");
    }

    if (!meeting) {
      meeting = await Meeting.findOne({ channelName: idOrChannel }).populate("repositoryId", "github.fullName github.name language defaultBranch");
    }

    if (!meeting) {
      return res.status(404).json({ error: "Meeting session not found" });
    }

    return res.json({ meeting });
  } catch (error) {
    console.error("[MeetingController] Error getting meeting:", error.message);
    return res.status(500).json({ error: "Failed to get meeting details" });
  }
};

module.exports = {
  generateRtcToken,
  createMeeting,
  listMeetings,
  getMeeting,
};
