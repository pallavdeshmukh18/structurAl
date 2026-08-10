const mongoose = require("mongoose");

const repositorySnapshotSchema = new mongoose.Schema(
  {
    repositoryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Repository",
      required: true,
      index: true,
    },
    commit: {
      sha: {
        type: String,
        required: true,
        trim: true,
      },
      branch: {
        type: String,
        default: null,
      },
      message: {
        type: String,
        default: null,
      },
      author: {
        type: String,
        default: null,
      },
    },
    status: {
      type: String,
      enum: ["pending", "indexing", "completed", "failed"],
      default: "pending",
    },
    stats: {
      files: {
        type: Number,
        default: 0,
      },
      lines: {
        type: Number,
        default: 0,
      },
      functions: {
        type: Number,
        default: 0,
      },
      classes: {
        type: Number,
        default: 0,
      },
      routes: {
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

repositorySnapshotSchema.index({ repositoryId: 1, "commit.sha": 1 }, { unique: true });
repositorySnapshotSchema.index({ repositoryId: 1, createdAt: -1 });

const RepositorySnapshot = mongoose.model("RepositorySnapshot", repositorySnapshotSchema);

module.exports = RepositorySnapshot;
