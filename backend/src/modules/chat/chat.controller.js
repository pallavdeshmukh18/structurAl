const mongoose = require("mongoose");
const PRChannel = require("../../models/PRChannel");
const PRMessage = require("../../models/PRMessage");
const User = require("../../models/User");

// Create a new channel for a PR
exports.createChannel = async (req, res) => {
  try {
    const { repositoryId, prNumber, name } = req.body;

    if (!repositoryId || !prNumber || !name) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const channel = new PRChannel({
      repository: repositoryId,
      prNumber: parseInt(prNumber),
      name,
      createdBy: req.user._id,
      members: [req.user._id], // Creator is always a member
    });

    await channel.save();
    
    // Populate createdBy and members before returning
    await channel.populate("createdBy", "name email avatarUrl");
    await channel.populate("members", "name email avatarUrl");

    res.status(201).json({ channel });
  } catch (error) {
    console.error("Error creating channel:", error);
    res.status(500).json({ error: "Failed to create channel" });
  }
};

// Get channels for a specific repo and PR that the user is a member of
exports.getChannels = async (req, res) => {
  try {
    const { repoId, prNumber } = req.params;

    if (!repoId || !mongoose.Types.ObjectId.isValid(repoId) || !prNumber) {
      return res.json({ channels: [] });
    }

    const channels = await PRChannel.find({
      repository: repoId,
      prNumber: parseInt(prNumber),
      members: req.user._id, // Must be a member
    })
      .populate("createdBy", "name email avatarUrl")
      .populate("members", "name email avatarUrl")
      .sort({ createdAt: -1 });

    res.json({ channels });
  } catch (error) {
    console.error("Error fetching channels:", error);
    res.status(500).json({ error: "Failed to fetch channels" });
  }
};

// Invite a user to a channel
exports.inviteToChannel = async (req, res) => {
  try {
    const { channelId } = req.params;
    const { userId } = req.body;

    const channel = await PRChannel.findById(channelId);
    if (!channel) {
      return res.status(404).json({ error: "Channel not found" });
    }

    // Verify current user is a member
    if (!channel.members.includes(req.user._id)) {
      return res.status(403).json({ error: "Not authorized to invite to this channel" });
    }

    // Verify user to invite exists
    const userToInvite = await User.findById(userId);
    if (!userToInvite) {
      return res.status(404).json({ error: "User not found" });
    }

    // Add if not already a member
    if (!channel.members.includes(userId)) {
      channel.members.push(userId);
      await channel.save();
    }

    await channel.populate("createdBy", "name email avatarUrl");
    await channel.populate("members", "name email avatarUrl");

    res.json({ channel });
  } catch (error) {
    console.error("Error inviting to channel:", error);
    res.status(500).json({ error: "Failed to invite user" });
  }
};

// Send a message
exports.sendMessage = async (req, res) => {
  try {
    const { channelId } = req.params;
    const { content } = req.body;

    if (!content || !content.trim()) {
      return res.status(400).json({ error: "Message content cannot be empty" });
    }

    const channel = await PRChannel.findById(channelId);
    if (!channel) {
      return res.status(404).json({ error: "Channel not found" });
    }

    // Verify current user is a member
    if (!channel.members.includes(req.user._id)) {
      return res.status(403).json({ error: "Not authorized to send messages in this channel" });
    }

    const message = new PRMessage({
      channel: channelId,
      sender: req.user._id,
      content,
    });

    await message.save();
    
    await message.populate("sender", "name email avatarUrl");

    res.status(201).json({ message });
  } catch (error) {
    console.error("Error sending message:", error);
    res.status(500).json({ error: "Failed to send message" });
  }
};

// Get messages for a channel
exports.getMessages = async (req, res) => {
  try {
    const { channelId } = req.params;

    const channel = await PRChannel.findById(channelId);
    if (!channel) {
      return res.status(404).json({ error: "Channel not found" });
    }

    // Verify current user is a member
    if (!channel.members.includes(req.user._id)) {
      return res.status(403).json({ error: "Not authorized to view messages in this channel" });
    }

    const messages = await PRMessage.find({ channel: channelId })
      .populate("sender", "name email avatarUrl")
      .sort({ createdAt: 1 }); // Oldest to newest for chat timeline

    res.json({ messages });
  } catch (error) {
    console.error("Error fetching messages:", error);
    res.status(500).json({ error: "Failed to fetch messages" });
  }
};
