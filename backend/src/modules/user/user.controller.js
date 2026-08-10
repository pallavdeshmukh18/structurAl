const User = require("../../models/User");

// Search users by exact email or GitHub username
exports.searchUsers = async (req, res) => {
  try {
    const { q } = req.query;

    if (!q || typeof q !== "string") {
      return res.status(400).json({ error: "Missing search query" });
    }

    // Exact match on email or GitHub username (case insensitive)
    const users = await User.find({
      $or: [
        { email: { $regex: new RegExp(`^${q}$`, "i") } },
        { "providers.github.username": { $regex: new RegExp(`^${q}$`, "i") } },
      ],
    }).select("name email avatarUrl providers.github.username");

    res.json({ users });
  } catch (error) {
    console.error("Error searching users:", error);
    res.status(500).json({ error: "Failed to search users" });
  }
};
