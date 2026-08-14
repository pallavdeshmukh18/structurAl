const express = require("express");
const router = express.Router();
const {
  listUserProjects,
  createProject,
  getProjectById,
  connectProjectRepository,
  addProjectMember,
  removeProjectMember,
  getProjectAgoraToken,
  createProjectInvitation,
  verifyProjectInvitation,
  acceptProjectInvitation,
  updateProjectVisibility,
  deleteProject,
} = require("./project.controller");
const { isAuthenticated } = require("../../middleware/auth");

router.get("/", isAuthenticated, listUserProjects);
router.post("/", isAuthenticated, createProject);

// Public / Unauthenticated token verification must be BEFORE :id dynamic route
router.get("/invitations/verify", verifyProjectInvitation);
router.post("/invitations/accept", isAuthenticated, acceptProjectInvitation);

router.get("/:id", isAuthenticated, getProjectById);
router.patch("/:id/visibility", isAuthenticated, updateProjectVisibility);
router.delete("/:id", isAuthenticated, deleteProject);
router.post("/:id/repository", isAuthenticated, connectProjectRepository);
router.post("/:id/members", isAuthenticated, addProjectMember);
router.post("/:id/invitations", isAuthenticated, createProjectInvitation);
router.delete("/:id/members/:memberUserId", isAuthenticated, removeProjectMember);
router.post("/:id/agora-token", isAuthenticated, getProjectAgoraToken);

module.exports = router;
