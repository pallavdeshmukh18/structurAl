const mongoose = require("mongoose");

const gitHubCredentialSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
      index: true,
    },
    accessTokenEncrypted: {
      type: String,
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

const GitHubCredential = mongoose.model("GitHubCredential", gitHubCredentialSchema);

module.exports = GitHubCredential;
