const mongoose = require("mongoose");

const repositorySchema = new mongoose.Schema(
  {
    ownerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    github: {
      id: {
        type: Number,
        required: true,
      },
      owner: {
        type: String,
        required: true,
        trim: true,
      },
      name: {
        type: String,
        required: true,
        trim: true,
      },
      fullName: {
        type: String,
        required: true,
        trim: true,
      },
      url: {
        type: String,
        default: null,
      },
      cloneUrl: {
        type: String,
        default: null,
      },
      defaultBranch: {
        type: String,
        default: "main",
      },
      installationId: {
        type: Number,
        default: null,
      },
    },
    language: {
      type: String,
      default: null,
    },
    visibility: {
      type: String,
      enum: ["public", "private", "internal"],
      default: "public",
    },
    indexing: {
      status: {
        type: String,
        enum: ["pending", "indexing", "ready", "failed"],
        default: "pending",
      },
      lastIndexedCommit: {
        type: String,
        default: null,
      },
      lastIndexedAt: {
        type: Date,
        default: null,
      },
      error: {
        type: String,
        default: null,
      },
    },
    settings: {
      tracingEnabled: {
        type: Boolean,
        default: true,
      },
      slopDetectionEnabled: {
        type: Boolean,
        default: true,
      },
      autoPatchEnabled: {
        type: Boolean,
        default: false,
      },
      thresholds: {
        complexity: {
          type: Number,
          default: 20,
        },
        latency: {
          type: Number,
          default: 1000,
        },
      },
    },
  },
  {
    timestamps: true,
  }
);

repositorySchema.index({ "github.id": 1 }, { unique: true });
repositorySchema.index({ "github.fullName": 1 }, { unique: true });

const Repository = mongoose.model("Repository", repositorySchema);

module.exports = Repository;
