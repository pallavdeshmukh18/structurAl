const mongoose = require("mongoose");

const codeRelationSchema = new mongoose.Schema(
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
    sourceSymbolId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "CodeSymbol",
      required: true,
      index: true,
    },
    targetSymbolId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "CodeSymbol",
      required: true,
      index: true,
    },
    relationType: {
      type: String,
      enum: ["CALLS", "IMPORTS", "EXTENDS", "IMPLEMENTS", "USES", "ROUTES_TO"],
      required: true,
    },
    metadata: {
      filePath: {
        type: String,
        default: null,
      },
      line: {
        type: Number,
        default: null,
      },
    },
  },
  {
    timestamps: true,
  }
);

codeRelationSchema.index({ repositoryId: 1, snapshotId: 1 });

const CodeRelation = mongoose.model("CodeRelation", codeRelationSchema);

module.exports = CodeRelation;
