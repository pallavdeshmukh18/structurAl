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
const { isAuthenticated, optionalAuth } = require("../../middleware/auth");

router.get("/", isAuthenticated, listUserRepositories);
router.post("/", isAuthenticated, connectRepository);
router.post("/connect", isAuthenticated, connectRepository);
router.post("/add", isAuthenticated, addRepositoryByUrl);
router.delete("/:id", isAuthenticated, deleteRepository);
router.get("/:id", isAuthenticated, getRepositoryById);
router.get("/:id/status", optionalAuth || isAuthenticated, getRepositoryStatus);
router.post("/:id/index", isAuthenticated, triggerRepositoryIndexing);
router.get("/:id/snapshots", isAuthenticated, getRepositorySnapshots);
router.get("/:id/symbols", optionalAuth || isAuthenticated, getRepositorySymbols);
router.get("/:id/relations", optionalAuth || isAuthenticated, getRepositoryRelations);
router.get("/:id/graph", isAuthenticated, getRepositoryGraph);
router.get("/:id/tree", optionalAuth || isAuthenticated, getRepositoryTree);
router.get("/:id/contents", optionalAuth || isAuthenticated, getRepositoryFileContent);
router.get("/:id/pulls", isAuthenticated, getRepositoryPullRequests);
router.get("/:id/pulls/:number", isAuthenticated, getRepositoryPullRequestDetails);

// Support owner/repo pattern routes (e.g. /api/repositories/pallavdeshmukh18/structurAl/graph)
router.get("/:owner/:repo/graph", isAuthenticated, (req, res, next) => {
  req.params.id = `${req.params.owner}/${req.params.repo}`;
  return getRepositoryGraph(req, res, next);
});
router.get("/:owner/:repo/tree", optionalAuth || isAuthenticated, (req, res, next) => {
  req.params.id = `${req.params.owner}/${req.params.repo}`;
  return getRepositoryTree(req, res, next);
});
router.get("/:owner/:repo/contents", optionalAuth || isAuthenticated, (req, res, next) => {
  req.params.id = `${req.params.owner}/${req.params.repo}`;
  return getRepositoryFileContent(req, res, next);
});
router.get("/:owner/:repo/symbols", optionalAuth || isAuthenticated, (req, res, next) => {
  req.params.id = `${req.params.owner}/${req.params.repo}`;
  return getRepositorySymbols(req, res, next);
});
router.get("/:owner/:repo/relations", optionalAuth || isAuthenticated, (req, res, next) => {
  req.params.id = `${req.params.owner}/${req.params.repo}`;
  return getRepositoryRelations(req, res, next);
});
router.get("/:owner/:repo/status", optionalAuth || isAuthenticated, (req, res, next) => {
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
