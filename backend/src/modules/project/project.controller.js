const mongoose = require("mongoose");
const crypto = require("crypto");
const { RtcTokenBuilder, RtcRole } = require("agora-access-token");
const Project = require("../../models/Project");
const ProjectInvitation = require("../../models/ProjectInvitation");
const Repository = require("../../models/Repository");
const User = require("../../models/User");
const { sendProjectInvitationEmail } = require("../../utils/mailer");

/**
 * Helper to authorize project access for authenticated session user
 */
const findAuthorizedProject = async (req, projectIdParam) => {
  if (!req.user || !req.user._id) {
    return { project: null, status: 401, error: "Unauthorized" };
  }

  if (!mongoose.Types.ObjectId.isValid(projectIdParam)) {
    return { project: null, status: 404, error: "Project not found" };
  }

  const project = await Project.findById(projectIdParam)
    .populate("owner", "name email avatarUrl providers")
    .populate("members.user", "name email avatarUrl providers")
    .populate("repository");

  if (!project) {
    return { project: null, status: 404, error: "Project not found" };
  }

  const userIdStr = req.user._id.toString();
  const isOwner = project.owner && project.owner._id.toString() === userIdStr;
  const isMember = project.members.some(
    (m) => m.user && m.user._id.toString() === userIdStr
  );

  if (!isOwner && !isMember) {
    // Return 404 to avoid leaking project existence to unauthorized users
    return { project: null, status: 404, error: "Project not found" };
  }

  const memberObj = project.members.find(
    (m) => m.user && m.user._id.toString() === userIdStr
  );
  const userRole = isOwner ? "owner" : memberObj?.role || "collaborator";

  return { project, isOwner, userRole, status: 200, error: null };
};

/**
 * List projects accessible to authenticated user
 * GET /api/projects
 */
const listUserProjects = async (req, res) => {
  try {
    if (!req.user || !req.user._id) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const userId = req.user._id;

    const projects = await Project.find({
      $or: [
        { owner: userId },
        { "members.user": userId },
        { visibility: "public" },
      ],
    })
      .populate("owner", "name email avatarUrl providers")
      .populate("members.user", "name email avatarUrl providers")
      .populate("repository")
      .sort({ updatedAt: -1 });

    return res.json({ projects });
  } catch (error) {
    console.error("[ProjectController] Error listing projects:", error.message);
    return res.status(500).json({ error: "Failed to list projects" });
  }
};

/**
 * Create a new Collaborative Project
 * POST /api/projects
 */
const createProject = async (req, res) => {
  try {
    if (!req.user || !req.user._id) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const userId = req.user._id;
    const { name, description, visibility = "private", repositoryId } = req.body || {};

    if (!name || !name.trim()) {
      return res.status(400).json({ error: "Project name is required" });
    }

    let repoObjectId = null;
    if (repositoryId) {
      const authorizedRepo = await Repository.findOne({
        _id: repositoryId,
        ownerId: userId,
      });
      if (authorizedRepo) {
        repoObjectId = authorizedRepo._id;
      }
    }

    const channelSlug = name
      .toLowerCase()
      .replace(/[^a-z0-9]/g, "-")
      .replace(/-+/g, "-");
    const agoraChannelName = `project-${channelSlug}-${Date.now().toString(36)}`;

    const project = await Project.create({
      name: name.trim(),
      description: (description || "").trim(),
      owner: userId,
      visibility: visibility === "public" ? "public" : "private",
      status: "active",
      repository: repoObjectId,
      agoraChannelName,
      members: [
        {
          user: userId,
          role: "owner",
          joinedAt: new Date(),
        },
      ],
      activities: [
        {
          user: userId,
          userName: req.user.name || req.user.email,
          action: "Project Created",
          details: `Created project "${name.trim()}"`,
          createdAt: new Date(),
        },
      ],
      lastActivityAt: new Date(),
    });

    const populatedProject = await Project.findById(project._id)
      .populate("owner", "name email avatarUrl providers")
      .populate("members.user", "name email avatarUrl providers")
      .populate("repository");

    console.log(`[ProjectController] Created project "${project.name}" (${project._id}) for user ${userId}`);

    return res.status(201).json({
      message: "Project created successfully",
      project: populatedProject,
    });
  } catch (error) {
    console.error("[ProjectController] Error creating project:", error.message);
    return res.status(500).json({ error: error.message || "Failed to create project" });
  }
};

/**
 * Get project details
 * GET /api/projects/:id
 */
const getProjectById = async (req, res) => {
  try {
    const { project, isOwner, userRole, status, error } = await findAuthorizedProject(
      req,
      req.params.id
    );
    if (status !== 200) {
      return res.status(status).json({ error });
    }

    return res.json({ project, isOwner, userRole });
  } catch (error) {
    console.error("[ProjectController] Error fetching project details:", error.message);
    return res.status(500).json({ error: "Failed to fetch project details" });
  }
};

/**
 * Connect/Update repository for a project
 * POST /api/projects/:id/repository
 */
const connectProjectRepository = async (req, res) => {
  try {
    const { project, isOwner, status, error } = await findAuthorizedProject(
      req,
      req.params.id
    );
    if (status !== 200) {
      return res.status(status).json({ error });
    }

    if (!isOwner) {
      return res.status(403).json({ error: "Only the project owner can manage project repository." });
    }

    const { repositoryId } = req.body || {};
    if (!repositoryId) {
      return res.status(400).json({ error: "Repository ID is required" });
    }

    const repo = await Repository.findOne({
      _id: repositoryId,
      ownerId: req.user._id,
    });

    if (!repo) {
      return res.status(404).json({ error: "Repository not found or access denied." });
    }

    project.repository = repo._id;
    project.lastActivityAt = new Date();
    project.activities.push({
      user: req.user._id,
      userName: req.user.name || req.user.email,
      action: "Connected Repository",
      details: `Connected GitHub repository "${repo.github?.fullName || repo.fullName}"`,
      createdAt: new Date(),
    });

    await project.save();

    const updated = await Project.findById(project._id)
      .populate("owner", "name email avatarUrl providers")
      .populate("members.user", "name email avatarUrl providers")
      .populate("repository");

    return res.json({ message: "Repository connected to project", project: updated });
  } catch (error) {
    console.error("[ProjectController] Error connecting project repository:", error.message);
    return res.status(500).json({ error: "Failed to connect repository to project" });
  }
};

/**
 * Add a collaborator to a project
 * POST /api/projects/:id/members
 */
const addProjectMember = async (req, res) => {
  try {
    const { project, isOwner, status, error } = await findAuthorizedProject(
      req,
      req.params.id
    );
    if (status !== 200) {
      return res.status(status).json({ error });
    }

    if (!isOwner) {
      return res.status(403).json({ error: "Only the project owner can invite collaborators." });
    }

    const { query, role = "collaborator" } = req.body || {};
    if (!query || !query.trim()) {
      return res.status(400).json({ error: "Email or GitHub username is required" });
    }

    const targetUser = await User.findOne({
      $or: [
        { email: { $regex: new RegExp(`^${query.trim()}$`, "i") } },
        { "providers.github.username": { $regex: new RegExp(`^${query.trim()}$`, "i") } },
      ],
    });

    if (!targetUser) {
      return res.status(404).json({
        error: `User "${query}" not found in StructurAI. Please make sure they have signed up or signed in with GitHub.`,
      });
    }

    const alreadyMember = project.members.some(
      (m) => m.user && m.user._id.toString() === targetUser._id.toString()
    );

    if (alreadyMember) {
      return res.status(409).json({ error: `${targetUser.name || query} is already a member of this project.` });
    }

    project.members.push({
      user: targetUser._id,
      role: role === "owner" ? "owner" : "collaborator",
      joinedAt: new Date(),
    });

    project.lastActivityAt = new Date();
    project.activities.push({
      user: req.user._id,
      userName: req.user.name || req.user.email,
      action: "Collaborator Joined",
      details: `Added ${targetUser.name || targetUser.email} as ${role}`,
      createdAt: new Date(),
    });

    await project.save();

    const updated = await Project.findById(project._id)
      .populate("owner", "name email avatarUrl providers")
      .populate("members.user", "name email avatarUrl providers")
      .populate("repository");

    return res.json({ message: "Collaborator added successfully", project: updated });
  } catch (error) {
    console.error("[ProjectController] Error adding project member:", error.message);
    return res.status(500).json({ error: "Failed to add member to project" });
  }
};

/**
 * Remove a collaborator from project
 * DELETE /api/projects/:id/members/:memberUserId
 */
const removeProjectMember = async (req, res) => {
  try {
    const { project, isOwner, status, error } = await findAuthorizedProject(
      req,
      req.params.id
    );
    if (status !== 200) {
      return res.status(status).json({ error });
    }

    const { memberUserId } = req.params;

    // Only owner or member removing themselves can perform removal
    if (!isOwner && memberUserId !== req.user._id.toString()) {
      return res.status(403).json({ error: "Permission denied." });
    }

    // Owner cannot be removed
    if (project.owner._id.toString() === memberUserId) {
      return res.status(400).json({ error: "Project owner cannot be removed." });
    }

    project.members = project.members.filter(
      (m) => m.user && m.user._id.toString() !== memberUserId
    );

    project.lastActivityAt = new Date();
    project.activities.push({
      user: req.user._id,
      userName: req.user.name || req.user.email,
      action: "Collaborator Left",
      details: `Removed member from project`,
      createdAt: new Date(),
    });

    await project.save();

    const updated = await Project.findById(project._id)
      .populate("owner", "name email avatarUrl providers")
      .populate("members.user", "name email avatarUrl providers")
      .populate("repository");

    return res.json({ message: "Member removed from project", project: updated });
  } catch (error) {
    console.error("[ProjectController] Error removing project member:", error.message);
    return res.status(500).json({ error: "Failed to remove member from project" });
  }
};

/**
 * Generate Agora RTC Token for Project Communication Space
 * POST /api/projects/:id/agora-token
 */
const getProjectAgoraToken = async (req, res) => {
  try {
    const { project, status, error } = await findAuthorizedProject(
      req,
      req.params.id
    );
    if (status !== 200) {
      return res.status(status).json({ error });
    }

    const channelName = project.agoraChannelName || `project-${project._id}`;
    const isProduction = process.env.NODE_ENV === "production";
    const appId = process.env.AGORA_APP_ID;
    const appCertificate = process.env.AGORA_APP_CERTIFICATE;

    if (isProduction && (!appId || !appCertificate || appId === "demo_app_id_structurai")) {
      console.error("[ProjectController PROD ERROR] Missing valid AGORA_APP_ID or AGORA_APP_CERTIFICATE in production");
      return res.status(500).json({
        error: "Agora RTC production credentials (AGORA_APP_ID, AGORA_APP_CERTIFICATE) are required.",
      });
    }

    const effectiveAppId = appId || "demo_app_id_structurai";
    const effectiveCert = appCertificate || "";

    let token = "";
    if (effectiveAppId && effectiveCert && effectiveAppId !== "demo_app_id_structurai") {
      token = RtcTokenBuilder.buildTokenWithUid(
        effectiveAppId,
        effectiveCert,
        channelName,
        0,
        RtcRole.PUBLISHER,
        Math.floor(Date.now() / 1000) + 3600
      );
    } else {
      token = `DEV_MOCK_TOKEN_${channelName}_${Date.now()}`;
    }

    return res.json({
      token,
      appId: effectiveAppId,
      channelName,
      projectId: project._id.toString(),
    });
  } catch (error) {
    console.error("[ProjectController] Error generating project Agora token:", error.message);
    return res.status(500).json({ error: "Failed to generate project communication token" });
  }
};

/**
 * Create Collaborator Invitation and Send Email
 * POST /api/projects/:id/invitations
 */
const createProjectInvitation = async (req, res) => {
  try {
    const { project, status, error } = await findAuthorizedProject(
      req,
      req.params.id
    );
    if (status !== 200) {
      return res.status(status).json({ error });
    }

    const { emailOrUsername } = req.body || {};
    if (!emailOrUsername || !emailOrUsername.trim()) {
      return res.status(400).json({ error: "Email or GitHub username is required" });
    }

    const cleanInput = emailOrUsername.trim();
    const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanInput);

    // 1. Resolve existing user from database (if available)
    const escapedInput = cleanInput.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const existingUser = await User.findOne({
      $or: [
        { email: { $regex: new RegExp(`^${escapedInput}$`, "i") } },
        { "providers.github.username": { $regex: new RegExp(`^${escapedInput}$`, "i") } },
      ],
    });

    // 2. Prevent adding if already a project member
    if (existingUser) {
      const isAlreadyMember = project.members.some(
        (m) => m.user && m.user.toString() === existingUser._id.toString()
      );
      if (isAlreadyMember) {
        return res.status(400).json({ error: `User "${cleanInput}" is already a member of this project.` });
      }
    }

    // 3. Prevent duplicate active pending invitation
    const existingInvite = await ProjectInvitation.findOne({
      project: project._id,
      status: "pending",
      expiresAt: { $gt: new Date() },
      $or: [
        { inviteeEmail: cleanInput.toLowerCase() },
        { inviteeGithubUsername: cleanInput },
        ...(existingUser?.email ? [{ inviteeEmail: existingUser.email.toLowerCase() }] : []),
      ],
    });

    if (existingInvite) {
      return res.status(400).json({ error: `An invitation has already been sent to "${cleanInput}".` });
    }

    // 4. Determine destination email for email dispatch
    const targetEmail = isEmail
      ? cleanInput.toLowerCase()
      : existingUser?.email
      ? existingUser.email.toLowerCase()
      : null;

    // 5. Generate secure invitation token
    const token = crypto.randomBytes(32).toString("hex");

    const invitation = await ProjectInvitation.create({
      project: project._id,
      inviter: req.user._id,
      inviteeEmail: isEmail ? cleanInput.toLowerCase() : (existingUser?.email || ""),
      inviteeGithubUsername: !isEmail ? cleanInput : (existingUser?.providers?.github?.username || ""),
      token,
      status: "pending",
    });

    const appBaseUrl = process.env.APP_BASE_URL || process.env.FRONTEND_URL || "http://localhost:5173";
    const inviteLink = `${appBaseUrl}/projects/join?token=${token}`;

    let mailResult = { success: false, error: "" };
    if (targetEmail) {
      mailResult = await sendProjectInvitationEmail({
        toEmail: targetEmail,
        inviterName: req.user.name || req.user.email,
        projectName: project.name,
        projectDescription: project.description,
        repositoryFullName: project.repository?.full_name || project.repository?.name || "",
        visibility: project.visibility || "private",
        inviteLink,
      });

      invitation.emailSent = mailResult.success;
      invitation.emailError = mailResult.error || "";
      await invitation.save();
    }

    project.lastActivityAt = new Date();
    project.activities.push({
      user: req.user._id,
      userName: req.user.name || req.user.email,
      action: "Invitation Sent",
      details: `Sent invitation to ${cleanInput}`,
      createdAt: new Date(),
    });
    await project.save();

    let userMessage = "";
    if (mailResult.success) {
      userMessage = `Invitation email sent successfully to ${targetEmail}!`;
    } else if (targetEmail) {
      userMessage = `Invitation created for ${cleanInput}. Email could not be sent directly (${mailResult.error || "SMTP not configured"}), but you can share the link below.`;
    } else {
      userMessage = `Invitation created for GitHub user @${cleanInput}. Share the invitation link below to invite them.`;
    }

    return res.json({
      message: userMessage,
      invitation,
      inviteLink,
      emailSent: invitation.emailSent,
      targetEmail,
    });
  } catch (error) {
    console.error("[ProjectController] Error creating project invitation:", error.message);
    return res.status(500).json({ error: "Failed to create collaborator invitation" });
  }
};

/**
 * Verify Invitation Token Validity
 * GET /api/projects/invitations/verify?token=...
 */
const verifyProjectInvitation = async (req, res) => {
  try {
    const { token } = req.query;
    if (!token) {
      return res.status(400).json({ error: "Invitation token is required" });
    }

    const invitation = await ProjectInvitation.findOne({ token })
      .populate("project", "name description visibility agoraChannelName")
      .populate("inviter", "name email avatarUrl");

    if (!invitation || !invitation.isValid()) {
      return res.status(404).json({ error: "Invitation link is invalid, expired, or has already been used." });
    }

    return res.json({
      valid: true,
      invitation: {
        id: invitation._id,
        inviteeEmail: invitation.inviteeEmail,
        inviteeGithubUsername: invitation.inviteeGithubUsername,
        expiresAt: invitation.expiresAt,
      },
      project: invitation.project,
      inviter: invitation.inviter,
    });
  } catch (error) {
    console.error("[ProjectController] Error verifying invitation token:", error.message);
    return res.status(500).json({ error: "Failed to verify invitation link" });
  }
};

/**
 * Accept Invitation Token & Join Project
 * POST /api/projects/invitations/accept
 */
const acceptProjectInvitation = async (req, res) => {
  try {
    if (!req.user || !req.user._id) {
      return res.status(401).json({ error: "Authentication required to accept invitation." });
    }

    const { token } = req.body || {};
    if (!token) {
      return res.status(400).json({ error: "Invitation token is required" });
    }

    const invitation = await ProjectInvitation.findOne({ token });
    if (!invitation || !invitation.isValid()) {
      return res.status(400).json({ error: "Invitation token is invalid or expired." });
    }

    const project = await Project.findById(invitation.project);
    if (!project) {
      return res.status(404).json({ error: "Associated project no longer exists." });
    }

    const userIdStr = req.user._id.toString();
    const isAlreadyMember = project.members.some(
      (m) => m.user && m.user.toString() === userIdStr
    );

    if (!isAlreadyMember) {
      project.members.push({
        user: req.user._id,
        role: invitation.role || "collaborator",
        joinedAt: new Date(),
      });
    }

    invitation.status = "accepted";
    await invitation.save();

    project.lastActivityAt = new Date();
    project.activities.push({
      user: req.user._id,
      userName: req.user.name || req.user.email,
      action: "Collaborator Joined",
      details: `${req.user.name || req.user.email} joined project via invitation link`,
      createdAt: new Date(),
    });
    await project.save();

    const updated = await Project.findById(project._id)
      .populate("owner", "name email avatarUrl providers")
      .populate("members.user", "name email avatarUrl providers")
      .populate("repository");

    return res.json({
      message: `Successfully joined ${project.name}!`,
      project: updated,
      projectId: project._id.toString(),
    });
  } catch (error) {
    console.error("[ProjectController] Error accepting project invitation:", error.message);
    return res.status(500).json({ error: "Failed to accept invitation" });
  }
};

/**
 * Update project visibility (Private / Public)
 * PATCH /api/projects/:id/visibility
 */
const updateProjectVisibility = async (req, res) => {
  try {
    const { project, isOwner, status, error } = await findAuthorizedProject(req, req.params.id);
    if (status !== 200) {
      return res.status(status).json({ error });
    }

    if (!isOwner) {
      return res.status(403).json({ error: "Only project owner can change project visibility" });
    }

    const { visibility } = req.body || {};
    if (visibility !== "public" && visibility !== "private") {
      return res.status(400).json({ error: "Visibility must be 'public' or 'private'" });
    }

    project.visibility = visibility;
    project.activities.push({
      user: req.user._id,
      userName: req.user.name || req.user.email,
      action: "Changed visibility",
      details: `Changed project visibility to ${visibility}`,
      createdAt: new Date(),
    });
    project.lastActivityAt = new Date();

    await project.save();

    const updated = await Project.findById(project._id)
      .populate("owner", "name email avatarUrl providers")
      .populate("members.user", "name email avatarUrl providers")
      .populate("repository");

    return res.json({
      message: `Project visibility updated to ${visibility}`,
      project: updated,
    });
  } catch (error) {
    console.error("[ProjectController] Error updating project visibility:", error.message);
    return res.status(500).json({ error: "Failed to update project visibility" });
  }
};

/**
 * Delete Collaborative Project
 * DELETE /api/projects/:id
 */
const deleteProject = async (req, res) => {
  try {
    const { project, isOwner, status, error } = await findAuthorizedProject(req, req.params.id);
    if (status !== 200) {
      return res.status(status).json({ error });
    }

    if (!isOwner) {
      return res.status(403).json({ error: "Only project owner can delete this project" });
    }

    // Clean up project-owned invitations
    await ProjectInvitation.deleteMany({ project: project._id });

    // Delete the project document
    await Project.deleteOne({ _id: project._id });

    // NOTE: Connected Repository document & GitHub repo are intentionally left untouched.

    return res.json({
      success: true,
      message: `Project "${project.name}" deleted successfully`,
    });
  } catch (error) {
    console.error("[ProjectController] Error deleting project:", error.message);
    return res.status(500).json({ error: "Failed to delete project" });
  }
};

module.exports = {
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
};
