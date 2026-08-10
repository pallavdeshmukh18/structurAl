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
} = require("./repository.controller");
const { isAuthenticated } = require("../../middleware/auth");

router.get("/", isAuthenticated, listUserRepositories);
router.post("/", isAuthenticated, connectRepository);
router.get("/:id", isAuthenticated, getRepositoryById);
router.post("/:id/index", isAuthenticated, triggerRepositoryIndexing);
router.get("/:id/snapshots", isAuthenticated, getRepositorySnapshots);
router.get("/:id/symbols", isAuthenticated, getRepositorySymbols);
router.get("/:id/relations", isAuthenticated, getRepositoryRelations);
router.get("/:id/tree", isAuthenticated, getRepositoryTree);
router.get("/:id/contents", isAuthenticated, getRepositoryFileContent);
router.get("/:id/pulls", isAuthenticated, getRepositoryPullRequests);
router.get("/:id/pulls/:number", isAuthenticated, getRepositoryPullRequestDetails);

module.exports = router;
