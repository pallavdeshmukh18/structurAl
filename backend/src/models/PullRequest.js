const mongoose = require("mongoose");

const pullRequestSchema = new mongoose.Schema(
  {
    repositoryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Repository",
      required: true,
      index: true,
    },
    github: {
      id: {
        type: Number,
        required: true,
      },
      number: {
        type: Number,
        required: true,
      },
      url: {
        type: String,
        default: null,
      },
      baseBranch: {
        type: String,
        default: null,
      },
      headBranch: {
        type: String,
        default: null,
      },
      baseSha: {
        type: String,
        default: null,
      },
      headSha: {
        type: String,
        default: null,
      },
      author: {
        id: {
          type: Number,
          default: null,
        },
        username: {
          type: String,
          default: null,
        },
      },
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      default: null,
    },
    status: {
      type: String,
      enum: ["OPEN", "CLOSED", "MERGED"],
      default: "OPEN",
      required: true,
    },
    changedFiles: {
      type: Number,
      default: 0,
    },
    additions: {
      type: Number,
      default: 0,
    },
    deletions: {
      type: Number,
      default: 0,
    },
    analysisStatus: {
      type: String,
      enum: ["PENDING", "ANALYZING", "COMPLETED", "FAILED"],
      default: "PENDING",
      required: true,
    },
    latestReviewId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Review",
      default: null,
    },
    mergedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

pullRequestSchema.index({ repositoryId: 1, "github.number": 1 }, { unique: true });
pullRequestSchema.index({ repositoryId: 1, status: 1 });
pullRequestSchema.index({ "github.id": 1 }, { unique: true });

const PullRequest = mongoose.model("PullRequest", pullRequestSchema);

module.exports = PullRequest;
