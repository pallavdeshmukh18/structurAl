const express = require("express");
const router = express.Router();

const {
  listUserRepositories,
  connectRepository,
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
const { isAuthenticated, optionalAuth } = require("../../middleware/auth");

router.get("/", optionalAuth, listUserRepositories);
router.post("/", optionalAuth, connectRepository);
router.post("/connect", optionalAuth, connectRepository);
router.get("/:id", optionalAuth, getRepositoryById);
router.get("/:id/status", optionalAuth, getRepositoryStatus);
router.post("/:id/index", optionalAuth, triggerRepositoryIndexing);
router.get("/:id/snapshots", optionalAuth, getRepositorySnapshots);
router.get("/:id/symbols", optionalAuth, getRepositorySymbols);
router.get("/:id/relations", optionalAuth, getRepositoryRelations);
router.get("/:id/graph", optionalAuth, getRepositoryGraph);
router.get("/:id/tree", optionalAuth, getRepositoryTree);
router.get("/:id/contents", optionalAuth, getRepositoryFileContent);
router.get("/:id/pulls", optionalAuth, getRepositoryPullRequests);
router.get("/:id/pulls/:number", optionalAuth, getRepositoryPullRequestDetails);

// Support owner/repo pattern routes (e.g. /api/repositories/pallavdeshmukh18/structurAl/graph)
router.get("/:owner/:repo/graph", optionalAuth, (req, res, next) => {
  req.params.id = `${req.params.owner}/${req.params.repo}`;
  return getRepositoryGraph(req, res, next);
});
router.get("/:owner/:repo/tree", optionalAuth, (req, res, next) => {
  req.params.id = `${req.params.owner}/${req.params.repo}`;
  return getRepositoryTree(req, res, next);
});
router.get("/:owner/:repo/contents", optionalAuth, (req, res, next) => {
  req.params.id = `${req.params.owner}/${req.params.repo}`;
  return getRepositoryFileContent(req, res, next);
});
router.get("/:owner/:repo/symbols", optionalAuth, (req, res, next) => {
  req.params.id = `${req.params.owner}/${req.params.repo}`;
  return getRepositorySymbols(req, res, next);
});
router.get("/:owner/:repo/relations", optionalAuth, (req, res, next) => {
  req.params.id = `${req.params.owner}/${req.params.repo}`;
  return getRepositoryRelations(req, res, next);
});
router.get("/:owner/:repo/status", optionalAuth, (req, res, next) => {
  req.params.id = `${req.params.owner}/${req.params.repo}`;
  return getRepositoryStatus(req, res, next);
});
router.post("/:owner/:repo/index", optionalAuth, (req, res, next) => {
  req.params.id = `${req.params.owner}/${req.params.repo}`;
  return triggerRepositoryIndexing(req, res, next);
});
router.get("/:owner/:repo/pulls", optionalAuth, (req, res, next) => {
  req.params.id = `${req.params.owner}/${req.params.repo}`;
  return getRepositoryPullRequests(req, res, next);
});
router.get("/:owner/:repo/pulls/:number", optionalAuth, (req, res, next) => {
  req.params.id = `${req.params.owner}/${req.params.repo}`;
  return getRepositoryPullRequestDetails(req, res, next);
});
router.get("/:owner/:repo", optionalAuth, (req, res, next) => {
  req.params.id = `${req.params.owner}/${req.params.repo}`;
  return getRepositoryById(req, res, next);
});

module.exports = router;
