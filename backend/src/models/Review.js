const mongoose = require("mongoose");

const reviewSchema = new mongoose.Schema(
  {
    repositoryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Repository",
      required: true,
      index: true,
    },
    pullRequestId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "PullRequest",
      required: true,
      index: true,
    },
    commitSha: {
      type: String,
      required: true,
      trim: true,
    },
    type: {
      type: String,
      enum: ["AI_REVIEW", "SLOP_SCAN", "SECURITY_SCAN", "FULL_ANALYSIS"],
      default: "FULL_ANALYSIS",
      required: true,
    },
    status: {
      type: String,
      enum: ["PENDING", "RUNNING", "COMPLETED", "FAILED"],
      default: "PENDING",
      required: true,
    },
    scores: {
      overall: {
        type: Number,
        default: null,
      },
      codeHealth: {
        type: Number,
        default: null,
      },
      complexity: {
        type: Number,
        default: null,
      },
      maintainability: {
        type: Number,
        default: null,
      },
      errorHandling: {
        type: Number,
        default: null,
      },
      duplication: {
        type: Number,
        default: null,
      },
      aiSlop: {
        type: Number,
        default: null,
      },
    },
    summary: {
      type: String,
      default: null,
    },
    model: {
      provider: {
        type: String,
        default: null,
      },
      name: {
        type: String,
        default: null,
      },
      version: {
        type: String,
        default: null,
      },
    },
    statistics: {
      filesScanned: {
        type: Number,
        default: 0,
      },
      linesScanned: {
        type: Number,
        default: 0,
      },
      findings: {
        type: Number,
        default: 0,
      },
    },
    startedAt: {
      type: Date,
      default: null,
    },
    completedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

reviewSchema.index({ pullRequestId: 1, createdAt: -1 });
reviewSchema.index({ repositoryId: 1, createdAt: -1 });

const Review = mongoose.model("Review", reviewSchema);

module.exports = Review;
