const express = require("express");
const router = express.Router();

const {
  redirectToGitHub,
  handleGitHubCallback,
  getCurrentUser,
  logout,
} = require("./auth.controller");
const { isAuthenticated } = require("../../middleware/auth");

router.get("/github", redirectToGitHub);
router.get("/github/callback", handleGitHubCallback);
router.get("/me", isAuthenticated, getCurrentUser);
router.post("/logout", logout);

module.exports = router;
