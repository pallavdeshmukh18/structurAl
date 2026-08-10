const express = require("express");
const router = express.Router();

const {
  listUserRepositories,
  connectRepository,
  getRepositoryById,
} = require("./repository.controller");
const { isAuthenticated } = require("../../middleware/auth");

router.get("/", isAuthenticated, listUserRepositories);
router.post("/", isAuthenticated, connectRepository);
router.get("/:id", isAuthenticated, getRepositoryById);

module.exports = router;
