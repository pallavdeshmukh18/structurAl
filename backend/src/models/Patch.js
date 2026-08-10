const mongoose = require("mongoose");

const patchSchema = new mongoose.Schema(
  {
    repositoryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Repository",
      required: true,
      index: true,
    },
    incidentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Incident",
      default: null,
      index: true,
    },
    pullRequestId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "PullRequest",
      default: null,
      index: true,
    },
    type: {
      type: String,
      enum: ["INCIDENT_FIX", "SLOP_FIX", "REVIEW_FIX"],
      required: true,
    },
    status: {
      type: String,
      enum: ["GENERATED", "VALIDATING", "VALIDATED", "FAILED", "APPLIED", "REJECTED"],
      default: "GENERATED",
      required: true,
      index: true,
    },
    sourceCommitSha: {
      type: String,
      default: null,
      trim: true,
    },
    changes: {
      filesChanged: {
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
    },
    diff: {
      type: String,
      required: true,
    },
    explanation: {
      type: String,
      default: null,
    },
    validation: {
      status: {
        type: String,
        enum: ["NOT_RUN", "RUNNING", "PASSED", "FAILED"],
        default: "NOT_RUN",
      },
      testsRun: {
        type: Number,
        default: 0,
      },
      testsPassed: {
        type: Number,
        default: 0,
      },
      testsFailed: {
        type: Number,
        default: 0,
      },
      output: {
        type: String,
        default: null,
      },
    },
    github: {
      pullRequestNumber: {
        type: Number,
        default: null,
      },
      pullRequestUrl: {
        type: String,
        default: null,
      },
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
  },
  {
    timestamps: true,
  }
);

patchSchema.index({ repositoryId: 1, createdAt: -1 });

const Patch = mongoose.model("Patch", patchSchema);

module.exports = Patch;
