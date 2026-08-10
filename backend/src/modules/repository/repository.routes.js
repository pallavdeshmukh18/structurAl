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
  getRepositoryTree,
  getRepositoryFileContent,
  getRepositoryPullRequests,
  getRepositoryPullRequestDetails,
  getRepositoryGraph,
} = require("./repository.controller");
const { isAuthenticated, optionalAuth } = require("../../middleware/auth");

router.get("/", isAuthenticated, listUserRepositories);
router.post("/", optionalAuth, connectRepository);
router.get("/:id", optionalAuth, getRepositoryById);
router.post("/:id/index", optionalAuth, triggerRepositoryIndexing);
router.get("/:id/snapshots", optionalAuth, getRepositorySnapshots);
router.get("/:id/symbols", optionalAuth, getRepositorySymbols);
router.get("/:id/relations", optionalAuth, getRepositoryRelations);
router.get("/:id/graph", isAuthenticated, getRepositoryGraph);
router.get("/:id/tree", isAuthenticated, getRepositoryTree);
router.get("/:id/contents", isAuthenticated, getRepositoryFileContent);
router.get("/:id/pulls", isAuthenticated, getRepositoryPullRequests);
router.get("/:id/pulls/:number", isAuthenticated, getRepositoryPullRequestDetails);

module.exports = router;
