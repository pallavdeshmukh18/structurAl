const mongoose = require("mongoose");

const spanEventSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    timestamp: {
      type: Date,
      default: Date.now,
    },
    attributes: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
  },
  {
    _id: false,
  }
);

const spanSchema = new mongoose.Schema(
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
      trim: true,
    },
    spanId: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    parentSpanId: {
      type: String,
      default: null,
      trim: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    serviceName: {
      type: String,
      required: true,
      trim: true,
    },
    kind: {
      type: String,
      enum: ["SERVER", "CLIENT", "INTERNAL", "PRODUCER", "CONSUMER"],
      default: "INTERNAL",
    },
    status: {
      type: String,
      enum: ["OK", "ERROR", "UNSET"],
      default: "UNSET",
      required: true,
    },
    startTime: {
      type: Date,
      required: true,
    },
    endTime: {
      type: Date,
      default: null,
    },
    durationMs: {
      type: Number,
      default: null,
    },
    attributes: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    events: {
      type: [spanEventSchema],
      default: [],
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
      startLine: {
        type: Number,
        default: null,
      },
      endLine: {
        type: Number,
        default: null,
      },
    },
  },
  {
    timestamps: true,
  }
);

spanSchema.index({ traceId: 1 });
spanSchema.index({ traceId: 1, parentSpanId: 1 });
spanSchema.index({ repositoryId: 1, serviceName: 1, startTime: -1 });

const Span = mongoose.model("Span", spanSchema);

module.exports = Span;
