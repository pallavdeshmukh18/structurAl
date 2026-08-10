const mongoose = require("mongoose");

const incidentSchema = new mongoose.Schema(
  {
    repositoryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Repository",
      required: true,
      index: true,
    },
    traceId: {
      type: String,
      default: null,
      trim: true,
    },
    failedSpanId: {
      type: String,
      default: null,
      trim: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    severity: {
      type: String,
      enum: ["CRITICAL", "HIGH", "MEDIUM", "LOW"],
      default: "MEDIUM",
      required: true,
    },
    status: {
      type: String,
      enum: ["OPEN", "INVESTIGATING", "FIX_GENERATED", "RESOLVED", "IGNORED"],
      default: "OPEN",
      required: true,
    },
    error: {
      type: {
        type: String,
        default: null,
      },
      message: {
        type: String,
        default: null,
      },
      stacktrace: {
        type: String,
        default: null,
      },
      httpStatus: {
        type: Number,
        default: null,
      },
    },
    sourceLocation: {
      filePath: {
        type: String,
        default: null,
      },
      symbolId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "CodeSymbol",
        default: null,
      },
      line: {
        type: Number,
        default: null,
      },
    },
    rootCause: {
      summary: {
        type: String,
        default: null,
      },
      explanation: {
        type: String,
        default: null,
      },
      confidence: {
        type: Number,
        default: null,
      },
      identifiedBy: {
        type: String,
        default: null,
      },
    },
    suggestedFix: {
      summary: {
        type: String,
        default: null,
      },
      patchId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Patch",
        default: null,
      },
    },
    occurrenceCount: {
      type: Number,
      default: 1,
    },
    firstSeenAt: {
      type: Date,
      default: Date.now,
    },
    lastSeenAt: {
      type: Date,
      default: Date.now,
    },
    resolvedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

incidentSchema.index({ repositoryId: 1, status: 1 });
incidentSchema.index({ repositoryId: 1, severity: 1 });
incidentSchema.index({ repositoryId: 1, createdAt: -1 });
incidentSchema.index({ traceId: 1 });

const Incident = mongoose.model("Incident", incidentSchema);

module.exports = Incident;
