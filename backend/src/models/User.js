const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    avatarUrl: {
      type: String,
      default: null,
    },
    providers: {
      github: {
        id: {
          type: String,
        },
        username: {
          type: String,
        },
      },
      google: {
        id: {
          type: String,
        },
      },
    },
    role: {
      type: String,
      enum: ["user", "admin"],
      default: "user",
    },
    lastLoginAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

userSchema.index({ "providers.github.id": 1 }, { unique: true, sparse: true });
userSchema.index({ "providers.google.id": 1 }, { unique: true, sparse: true });

const User = mongoose.model("User", userSchema);

module.exports = User;
