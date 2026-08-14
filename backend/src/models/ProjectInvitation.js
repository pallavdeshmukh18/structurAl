const mongoose = require("mongoose");
const crypto = require("crypto");

const projectInvitationSchema = new mongoose.Schema(
  {
    project: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Project",
      required: true,
      index: true,
    },
    inviter: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    inviteeEmail: {
      type: String,
      trim: true,
      lowercase: true,
      default: "",
    },
    inviteeGithubUsername: {
      type: String,
      trim: true,
      default: "",
    },
    token: {
      type: String,
      required: true,
      unique: true,
      index: true,
      default: () => crypto.randomBytes(32).toString("hex"),
    },
    role: {
      type: String,
      enum: ["collaborator"],
      default: "collaborator",
    },
    status: {
      type: String,
      enum: ["pending", "accepted", "expired", "revoked"],
      default: "pending",
      index: true,
    },
    expiresAt: {
      type: Date,
      default: () => new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days valid
    },
    emailSent: {
      type: Boolean,
      default: false,
    },
    emailError: {
      type: String,
      default: "",
    },
  },
  {
    timestamps: true,
  }
);

// Helper method to check if invitation is still valid
projectInvitationSchema.methods.isValid = function () {
  return this.status === "pending" && this.expiresAt > new Date();
};

module.exports = mongoose.model("ProjectInvitation", projectInvitationSchema);
