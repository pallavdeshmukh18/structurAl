const mongoose = require("mongoose");

const traceSchema = new mongoose.Schema(
  {
    repositoryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Repository",
      required: true,
      index: true,
    },
    traceId: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    serviceName: {
      type: String,
      required: true,
      trim: true,
    },
    environment: {
      type: String,
      default: "production",
      trim: true,
    },
    operation: {
      name: {
        type: String,
        required: true,
        trim: true,
      },
      type: {
        type: String,
        default: null,
        trim: true,
      },
    },
    rootSpanId: {
      type: String,
      default: null,
      trim: true,
    },
    status: {
      type: String,
      enum: ["OK", "ERROR", "UNSET"],
      default: "UNSET",
      required: true,
    },
    http: {
      method: {
        type: String,
        default: null,
      },
      route: {
        type: String,
        default: null,
      },
      statusCode: {
        type: Number,
        default: null,
      },
    },
    durationMs: {
      type: Number,
      default: null,
    },
    startedAt: {
      type: Date,
      required: true,
    },
    endedAt: {
      type: Date,
      default: null,
    },
    spanCount: {
      type: Number,
      default: 0,
    },
    errorCount: {
      type: Number,
      default: 0,
    },
    incidentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Incident",
      default: null,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

traceSchema.index({ repositoryId: 1, startedAt: -1 });
traceSchema.index({ repositoryId: 1, status: 1 });

const Trace = mongoose.model("Trace", traceSchema);

module.exports = Trace;
