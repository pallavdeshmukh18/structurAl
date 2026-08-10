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
const { isAuthenticated } = require("../../middleware/auth");

router.get("/", isAuthenticated, listUserRepositories);
router.post("/", isAuthenticated, connectRepository);
router.get("/:id", isAuthenticated, getRepositoryById);
router.post("/:id/index", isAuthenticated, triggerRepositoryIndexing);
router.get("/:id/snapshots", isAuthenticated, getRepositorySnapshots);
router.get("/:id/symbols", isAuthenticated, getRepositorySymbols);
router.get("/:id/relations", isAuthenticated, getRepositoryRelations);

module.exports = router;
