const express = require("express");
const router = express.Router();

const {
  listUserRepositories,
  connectRepository,
  addRepositoryByUrl,
  deleteRepository,
  getRepositoryById,
  getRepositoryStatus,
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
const { isAuthenticated } = require("../../middleware/auth");

router.get("/", isAuthenticated, listUserRepositories);
router.post("/", isAuthenticated, connectRepository);
router.post("/connect", isAuthenticated, connectRepository);
router.post("/add", isAuthenticated, addRepositoryByUrl);
router.delete("/:id", isAuthenticated, deleteRepository);
router.get("/:id", isAuthenticated, getRepositoryById);
router.get("/:id/status", isAuthenticated, getRepositoryStatus);
router.post("/:id/index", isAuthenticated, triggerRepositoryIndexing);
router.get("/:id/snapshots", isAuthenticated, getRepositorySnapshots);
router.get("/:id/symbols", isAuthenticated, getRepositorySymbols);
router.get("/:id/relations", isAuthenticated, getRepositoryRelations);
router.get("/:id/graph", isAuthenticated, getRepositoryGraph);
router.get("/:id/tree", isAuthenticated, getRepositoryTree);
router.get("/:id/contents", isAuthenticated, getRepositoryFileContent);
router.get("/:id/pulls", isAuthenticated, getRepositoryPullRequests);
router.get("/:id/pulls/:number", isAuthenticated, getRepositoryPullRequestDetails);

// Support owner/repo pattern routes (e.g. /api/repositories/pallavdeshmukh18/structurAl/graph)
router.get("/:owner/:repo/graph", isAuthenticated, (req, res, next) => {
  req.params.id = `${req.params.owner}/${req.params.repo}`;
  return getRepositoryGraph(req, res, next);
});
router.get("/:owner/:repo/status", isAuthenticated, (req, res, next) => {
  req.params.id = `${req.params.owner}/${req.params.repo}`;
  return getRepositoryStatus(req, res, next);
});
router.post("/:owner/:repo/index", isAuthenticated, (req, res, next) => {
  req.params.id = `${req.params.owner}/${req.params.repo}`;
  return triggerRepositoryIndexing(req, res, next);
});
router.get("/:owner/:repo/pulls", isAuthenticated, (req, res, next) => {
  req.params.id = `${req.params.owner}/${req.params.repo}`;
  return getRepositoryPullRequests(req, res, next);
});
router.get("/:owner/:repo/pulls/:number", isAuthenticated, (req, res, next) => {
  req.params.id = `${req.params.owner}/${req.params.repo}`;
  return getRepositoryPullRequestDetails(req, res, next);
});
router.delete("/:owner/:repo", isAuthenticated, (req, res, next) => {
  req.params.id = `${req.params.owner}/${req.params.repo}`;
  return deleteRepository(req, res, next);
});
router.get("/:owner/:repo", isAuthenticated, (req, res, next) => {
  req.params.id = `${req.params.owner}/${req.params.repo}`;
  return getRepositoryById(req, res, next);
});

module.exports = router;
