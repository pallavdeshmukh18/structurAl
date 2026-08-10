const express = require("express");
const router = express.Router();

const {
  listUserRepositories,
  connectRepository,
  getRepositoryById,
  triggerRepositoryIndexing,
  getRepositorySnapshots,
  getRepositorySymbols,
  getRepositoryRelations,
} = require("./repository.controller");
const { isAuthenticated, optionalAuth } = require("../../middleware/auth");

router.get("/", isAuthenticated, listUserRepositories);
router.post("/", optionalAuth, connectRepository);
router.get("/:id", optionalAuth, getRepositoryById);
router.post("/:id/index", optionalAuth, triggerRepositoryIndexing);
router.get("/:id/snapshots", optionalAuth, getRepositorySnapshots);
router.get("/:id/symbols", optionalAuth, getRepositorySymbols);
router.get("/:id/relations", optionalAuth, getRepositoryRelations);

module.exports = router;
