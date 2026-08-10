const mongoose = require("mongoose");

const reviewFindingSchema = new mongoose.Schema(
  {
    reviewId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Review",
      required: true,
      index: true,
    },
    pullRequestId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "PullRequest",
      required: true,
      index: true,
    },
    repositoryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Repository",
      required: true,
      index: true,
    },
    severity: {
      type: String,
      enum: ["CRITICAL", "HIGH", "MEDIUM", "LOW", "INFO"],
      default: "MEDIUM",
      required: true,
    },
    category: {
      type: String,
      enum: [
        "BUG",
        "SECURITY",
        "COMPLEXITY",
        "DUPLICATION",
        "DEAD_CODE",
        "ERROR_HANDLING",
        "AI_SLOP",
        "PERFORMANCE",
        "MAINTAINABILITY",
      ],
      required: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      required: true,
      trim: true,
    },
    location: {
      filePath: {
        type: String,
        required: true,
        trim: true,
      },
      startLine: {
        type: Number,
        required: true,
      },
      endLine: {
        type: Number,
        required: true,
      },
      startColumn: {
        type: Number,
        default: null,
      },
      endColumn: {
        type: Number,
        default: null,
      },
    },
    codeSnippet: {
      type: String,
      default: null,
    },
    suggestion: {
      type: String,
      default: null,
    },
    confidence: {
      type: Number,
      default: null,
    },
    status: {
      type: String,
      enum: ["OPEN", "ACCEPTED", "DISMISSED", "FIXED"],
      default: "OPEN",
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

reviewFindingSchema.index({ reviewId: 1, severity: 1 });
reviewFindingSchema.index({ pullRequestId: 1, status: 1 });
reviewFindingSchema.index({ repositoryId: 1, category: 1 });

const ReviewFinding = mongoose.model("ReviewFinding", reviewFindingSchema);

module.exports = ReviewFinding;
