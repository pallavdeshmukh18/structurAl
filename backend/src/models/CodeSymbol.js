const mongoose = require("mongoose");

const codeSymbolSchema = new mongoose.Schema(
  {
    repositoryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Repository",
      required: true,
      index: true,
    },
    snapshotId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "RepositorySnapshot",
      required: true,
      index: true,
    },
    filePath: {
      type: String,
      required: true,
      trim: true,
    },
    symbol: {
      name: {
        type: String,
        required: true,
        trim: true,
      },
      type: {
        type: String,
        required: true,
        trim: true,
      },
      language: {
        type: String,
        default: null,
      },
    },
    location: {
      startLine: {
        type: Number,
        required: true,
      },
      startColumn: {
        type: Number,
        default: null,
      },
      endLine: {
        type: Number,
        required: true,
      },
      endColumn: {
        type: Number,
        default: null,
      },
    },
    signature: {
      type: String,
      default: null,
    },
    parentSymbolId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "CodeSymbol",
      default: null,
    },
    metadata: {
      exported: {
        type: Boolean,
        default: false,
      },
      async: {
        type: Boolean,
        default: false,
      },
      visibility: {
        type: String,
        default: null,
      },
    },
    codeHash: {
      type: String,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

codeSymbolSchema.index({ repositoryId: 1, snapshotId: 1 });
codeSymbolSchema.index({ repositoryId: 1, filePath: 1 });
codeSymbolSchema.index({ repositoryId: 1, "symbol.name": 1 });

const CodeSymbol = mongoose.model("CodeSymbol", codeSymbolSchema);

module.exports = CodeSymbol;
