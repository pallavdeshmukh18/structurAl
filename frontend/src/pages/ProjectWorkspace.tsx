import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import {
  Users,
  FolderGit2,
  GitBranch,
  Network,
  Activity as ActivityIcon,
  MessageSquare,
  Lock,
  Globe,
  Share2,
  UserPlus,
  ArrowLeft,
  Sparkles,
  RefreshCw,
  AlertCircle,
  ExternalLink,
  Check,
  CheckCircle2,
  Copy,
  X,
  Radio,
  Trash2,
  MoreVertical,
  Loader2,
} from "lucide-react";
import { Button } from "../components/ui/Button";
import { Badge } from "../components/ui/Badge";
import { Card } from "../components/ui/Card";
import { RepositoryVisualizer } from "./RepositoryVisualizer";
import { GroupReviewRoom } from "../components/review/GroupReviewRoom";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:5001";

interface ProjectMember {
  user: {
    _id: string;
    name?: string;
    email?: string;
    avatarUrl?: string;
    providers?: {
      github?: {
        username?: string;
      };
    };
  };
  role: "owner" | "collaborator";
  joinedAt: string;
}

interface ProjectActivity {
  user?: string;
  userName?: string;
  action: string;
  details?: string;
  createdAt: string;
}

interface Project {
  _id: string;
  name: string;
  description: string;
  owner: {
    _id: string;
    name?: string;
    email?: string;
    avatarUrl?: string;
    providers?: {
      github?: {
        username?: string;
      };
    };
  };
  members: ProjectMember[];
  repository?: {
    _id: string;
    github?: {
      fullName?: string;
      name?: string;
      owner?: string;
      defaultBranch?: string;
      private?: boolean;
    };
    language?: string;
    indexing?: {
      indexed?: boolean;
      status?: string;
    };
  };
  visibility: "public" | "private";
  status: "active" | "archived";
  agoraChannelName: string;
  activities?: ProjectActivity[];
  updatedAt: string;
  lastActivityAt?: string;
}

export function ProjectWorkspace() {
  const { projectId, tab: activeTabParam } = useParams<{ projectId: string; tab?: string }>();

  const [project, setProject] = useState<Project | null>(null);
  const [isOwner, setIsOwner] = useState<boolean>(false);

  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Invite Modal State
  const [isInviteModalOpen, setIsInviteModalOpen] = useState<boolean>(false);
  const [inviteQuery, setInviteQuery] = useState<string>("");
  const [inviteLoading, setInviteLoading] = useState<boolean>(false);
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [inviteResult, setInviteResult] = useState<{
    message: string;
    inviteLink?: string;
    emailSent?: boolean;
  } | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);

  // Settings & Deletion States
  const [isSettingsMenuOpen, setIsSettingsMenuOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [confirmDeleteName, setConfirmDeleteName] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [isChangingVisibility, setIsChangingVisibility] = useState(false);

  // Toggle Visibility Handler
  const handleToggleVisibility = async (newVisibility: "public" | "private") => {
    if (!project || project.visibility === newVisibility) {
      setIsSettingsMenuOpen(false);
      return;
    }
    setIsChangingVisibility(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/projects/${project._id}/visibility`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ visibility: newVisibility }),
        credentials: "include",
      });

      if (res.ok) {
        const data = await res.json();
        setProject(data.project);
      } else {
        const errData = await res.json().catch(() => ({}));
        alert(errData.error || "Failed to update project visibility");
      }
    } catch (err) {
      console.error("Error toggling visibility:", err);
      alert("Network error updating visibility");
    } finally {
      setIsChangingVisibility(false);
      setIsSettingsMenuOpen(false);
    }
  };

  // Delete Project Handler
  const handleExecuteDelete = async () => {
    if (!project) return;
    setIsDeleting(true);
    setDeleteError(null);
    try {
      const res = await fetch(`${API_BASE_URL}/api/projects/${project._id}`, {
        method: "DELETE",
        credentials: "include",
      });

      if (res.ok) {
        window.location.href = "/projects";
      } else {
        const errData = await res.json().catch(() => ({}));
        setDeleteError(errData.error || "Failed to delete project");
      }
    } catch (err) {
      console.error("Error deleting project:", err);
      setDeleteError("Network error deleting project");
    } finally {
      setIsDeleting(false);
    }
  };

  const activeTab = activeTabParam || "overview";

  const fetchProject = async () => {
    if (!projectId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE_URL}/api/projects/${projectId}`, {
        credentials: "include",
      });

      if (res.ok) {
        const data = await res.json();
        setProject(data.project);
        setIsOwner(data.isOwner);
      } else {
        const errData = await res.json().catch(() => ({}));
        setError(errData.error || "Project not found or access denied.");
      }
    } catch (err) {
      console.error("Error fetching project workspace:", err);
      setError("Network error fetching project workspace");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProject();
  }, [projectId]);

  // Invite Member Handler
  const handleInviteMember = async () => {
    if (!inviteQuery.trim() || !projectId) return;
    setInviteLoading(true);
    setInviteError(null);
    setInviteResult(null);

    try {
      const res = await fetch(`${API_BASE_URL}/api/projects/${projectId}/invitations`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ emailOrUsername: inviteQuery.trim() }),
      });

      if (res.ok) {
        const data = await res.json();
        setInviteResult({
          message: data.message,
          inviteLink: data.inviteLink,
          emailSent: data.emailSent,
        });
        setInviteQuery("");
        fetchProject();
      } else {
        const errData = await res.json().catch(() => ({}));
        setInviteError(errData.error || "Failed to create collaborator invitation.");
      }
    } catch {
      setInviteError("Error sending collaborator invitation");
    } finally {
      setInviteLoading(false);
    }
  };

  // Remove Member Handler
  const handleRemoveMember = async (memberUserId: string) => {
    if (!projectId || !confirm("Are you sure you want to remove this collaborator?")) return;
    try {
      const res = await fetch(`${API_BASE_URL}/api/projects/${projectId}/members/${memberUserId}`, {
        method: "DELETE",
        credentials: "include",
      });

      if (res.ok) {
        const data = await res.json();
        setProject(data.project);
      } else {
        const errData = await res.json().catch(() => ({}));
        alert(errData.error || "Failed to remove collaborator");
      }
    } catch (err) {
      console.error("Error removing member:", err);
    }
  };

  const repoFullName =
    project?.repository?.github?.fullName ||
    (project?.repository?.github?.owner && project?.repository?.github?.name
      ? `${project.repository.github.owner}/${project.repository.github.name}`
      : null);

  const defaultBranch = project?.repository?.github?.defaultBranch || "main";

  if (loading) {
    return (
      <div className="p-8 max-w-7xl mx-auto space-y-6">
        <div className="h-32 bg-white rounded-2xl border border-slate-200 shadow-sm animate-pulse p-6"></div>
        <div className="h-96 bg-white rounded-2xl border border-slate-200 shadow-sm animate-pulse"></div>
      </div>
    );
  }

  if (error || !project) {
    return (
      <div className="p-12 max-w-2xl mx-auto my-12 text-center bg-white rounded-3xl border border-slate-200 shadow-sm space-y-4">
        <div className="w-16 h-16 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto border border-rose-100">
          <AlertCircle className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-bold text-slate-900">{error || "Project unavailable"}</h2>
        <p className="text-xs text-slate-500 max-w-md mx-auto">
          This project may not exist or you do not have permission to view it. Collaborative projects are restricted strictly to invited team members.
        </p>
        <Link
          to="/projects"
          className="inline-flex items-center space-x-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl px-5 py-2.5 text-xs transition-colors shadow-sm"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Collaborative Projects</span>
        </Link>
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-6">
      {/* 1. Project Header Card */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200/90 shadow-sm space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start space-x-4">
            <Link
              to="/projects"
              className="p-2.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 transition-colors shrink-0 cursor-pointer mt-0.5"
              title="Back to Projects"
            >
              <ArrowLeft className="w-4 h-4" />
            </Link>

            <div className="space-y-1">
              <div className="flex items-center space-x-3 flex-wrap">
                <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">
                  {project.name}
                </h1>
                <Badge
                  variant="outline"
                  className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 bg-slate-50 text-slate-600"
                >
                  {project.visibility === "private" ? (
                    <span className="flex items-center gap-1">
                      <Lock className="w-2.5 h-2.5" /> Private
                    </span>
                  ) : (
                    <span className="flex items-center gap-1">
                      <Globe className="w-2.5 h-2.5" /> Public
                    </span>
                  )}
                </Badge>

                {repoFullName && (
                  <Badge variant="outline" className="text-xs font-mono text-indigo-700 bg-indigo-50 border-indigo-200">
                    <FolderGit2 className="w-3 h-3 mr-1 inline-block text-indigo-600" />
                    {repoFullName}
                  </Badge>
                )}
              </div>

              <p className="text-slate-500 text-xs font-medium max-w-2xl">
                {project.description || "No project description available."}
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-3 shrink-0">
            {isOwner && (
              <Button
                onClick={() => setIsInviteModalOpen(true)}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl text-xs px-4 py-2 shadow-xs transition-all flex items-center space-x-1.5 cursor-pointer"
              >
                <UserPlus className="w-3.5 h-3.5" />
                <span>Invite Collaborators</span>
              </Button>
            )}

            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                navigator.clipboard.writeText(window.location.href);
                alert("Project URL copied to clipboard!");
              }}
              className="rounded-xl text-xs flex items-center space-x-1.5 cursor-pointer"
            >
              <Share2 className="w-3.5 h-3.5 text-slate-500" />
              <span>Share</span>
            </Button>

            {isOwner && (
              <div className="relative">
                <button
                  onClick={() => setIsSettingsMenuOpen(!isSettingsMenuOpen)}
                  className="p-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 transition-colors cursor-pointer"
                  title="Project settings"
                >
                  <MoreVertical className="w-4 h-4" />
                </button>

                {isSettingsMenuOpen && (
                  <div
                    onClick={(e) => e.stopPropagation()}
                    className="absolute right-0 mt-1 w-52 bg-white rounded-2xl border border-slate-200 shadow-xl py-2 z-30 text-xs font-sans text-slate-800 space-y-1"
                  >
                    <div className="px-3 py-1 text-[10px] uppercase font-bold tracking-wider text-slate-400">
                      Project Settings
                    </div>

                    <div className="border-t border-slate-100 my-1"></div>

                    {/* Visibility Toggle */}
                    <div className="px-3 py-1 space-y-1">
                      <div className="text-[11px] font-semibold text-slate-600">
                        Visibility
                      </div>
                      <div className="grid grid-cols-2 gap-1 bg-slate-50 p-1 rounded-xl border border-slate-100">
                        <button
                          disabled={isChangingVisibility}
                          onClick={() => handleToggleVisibility("private")}
                          className={`flex items-center justify-center space-x-1 py-1 rounded-lg text-[11px] font-medium transition-all ${
                            project.visibility === "private"
                              ? "bg-white text-slate-900 shadow-xs border border-slate-200 font-bold"
                              : "text-slate-500 hover:text-slate-800"
                          }`}
                        >
                          <Lock className="w-3 h-3" />
                          <span>Private</span>
                        </button>
                        <button
                          disabled={isChangingVisibility}
                          onClick={() => handleToggleVisibility("public")}
                          className={`flex items-center justify-center space-x-1 py-1 rounded-lg text-[11px] font-medium transition-all ${
                            project.visibility === "public"
                              ? "bg-white text-emerald-800 shadow-xs border border-slate-200 font-bold"
                              : "text-slate-500 hover:text-slate-800"
                          }`}
                        >
                          <Globe className="w-3 h-3" />
                          <span>Public</span>
                        </button>
                      </div>
                    </div>

                    <div className="border-t border-slate-100 my-1"></div>

                    {/* Delete Option */}
                    <button
                      onClick={() => {
                        setIsSettingsMenuOpen(false);
                        setIsDeleteModalOpen(true);
                        setConfirmDeleteName("");
                      }}
                      className="w-full text-left px-3 py-1.5 text-rose-600 hover:bg-rose-50 font-semibold flex items-center space-x-2 transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Delete Project</span>
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center space-x-1 border-t border-slate-100 pt-4 overflow-x-auto">
          {[
            { id: "overview", label: "Overview", icon: Sparkles },
            { id: "repository", label: "Repository", icon: FolderGit2 },
            { id: "architecture", label: "Architecture", icon: Network },
            { id: "activity", label: "Activity", icon: ActivityIcon },
            { id: "communication", label: "Communication", icon: MessageSquare },
          ].map((tabItem) => {
            const IconComp = tabItem.icon;
            const isActive = activeTab === tabItem.id;
            return (
              <Link
                key={tabItem.id}
                to={tabItem.id === "overview" ? `/projects/${projectId}` : `/projects/${projectId}/${tabItem.id}`}
                className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                  isActive
                    ? "bg-slate-900 text-white shadow-xs"
                    : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                }`}
              >
                <IconComp className={`w-3.5 h-3.5 ${isActive ? "text-emerald-400" : "text-slate-400"}`} />
                <span>{tabItem.label}</span>
                {tabItem.id === "communication" && (
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse ml-1" />
                )}
              </Link>
            );
          })}
        </div>
      </div>

      {/* 2. Tab Contents */}

      {/* TAB 1: OVERVIEW */}
      {activeTab === "overview" && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Project Health Card */}
            <Card className="lg:col-span-2 border border-slate-200 shadow-sm rounded-2xl p-6 bg-white space-y-6">
              <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                <div className="flex items-center space-x-2.5">
                  <div className="p-2 rounded-xl bg-emerald-50 text-emerald-600">
                    <Sparkles className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900 text-sm">PROJECT HEALTH & METRICS</h3>
                    <p className="text-[11px] text-slate-400 font-medium">Real-time status of codebase intelligence and team activity</p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {/* Repo Health */}
                <div className="p-4 bg-slate-50 border border-slate-200/80 rounded-2xl space-y-2">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Repository Status</span>
                  {repoFullName ? (
                    <div>
                      <div className="font-mono font-bold text-slate-900 text-xs truncate">{repoFullName}</div>
                      <div className="text-[11px] text-emerald-700 font-semibold mt-1 flex items-center gap-1">
                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Indexed & Connected</span>
                      </div>
                    </div>
                  ) : (
                    <div className="text-xs text-slate-400 italic">No repo connected</div>
                  )}
                </div>

                {/* Architecture Health */}
                <div className="p-4 bg-slate-50 border border-slate-200/80 rounded-2xl space-y-2">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Architecture Map</span>
                  <div>
                    <div className="font-mono font-bold text-slate-900 text-sm">
                      {project.repository ? "AST Blueprint Active" : "Pending Connection"}
                    </div>
                    <div className="text-[11px] text-slate-500 mt-1">
                      {project.repository ? "Symbol dependency graph ready" : "Connect repo to parse AST"}
                    </div>
                  </div>
                </div>

                {/* Collaboration Space */}
                <div className="p-4 bg-slate-50 border border-slate-200/80 rounded-2xl space-y-2">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Agora RTC Room</span>
                  <div>
                    <div className="font-bold text-emerald-700 text-xs flex items-center gap-1.5">
                      <Radio className="w-3.5 h-3.5 text-emerald-600 animate-pulse" />
                      <span>Voice & Video Ready</span>
                    </div>
                    <div className="text-[11px] text-slate-500 mt-1">{project.members?.length || 1} team members</div>
                  </div>
                </div>
              </div>

              {/* Quick Actions Bar */}
              <div className="pt-4 border-t border-slate-100 flex flex-wrap items-center gap-3">
                {project.repository?._id ? (
                  <>
                    <Link
                      to={`/projects/${projectId}/architecture`}
                      className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center space-x-1.5"
                    >
                      <Network className="w-3.5 h-3.5" />
                      <span>Explore Architecture</span>
                    </Link>

                    <Link
                      to={`/repository/${project.repository._id}`}
                      className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold transition-all flex items-center space-x-1.5"
                    >
                      <FolderGit2 className="w-3.5 h-3.5 text-slate-600" />
                      <span>Open Repository</span>
                    </Link>
                  </>
                ) : (
                  <p className="text-xs text-slate-500 italic">Connect a repository to enable architecture visualizer.</p>
                )}

                <Link
                  to={`/projects/${projectId}/communication`}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center space-x-1.5 ml-auto"
                >
                  <MessageSquare className="w-3.5 h-3.5" />
                  <span>Join Agora Space</span>
                </Link>
              </div>
            </Card>

            {/* Team Members List */}
            <Card className="border border-slate-200 shadow-sm rounded-2xl p-6 bg-white space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center space-x-2">
                  <Users className="w-4 h-4 text-emerald-600" />
                  <h3 className="font-bold text-slate-900 text-xs uppercase tracking-wider">
                    Team Members ({project.members?.length || 1})
                  </h3>
                </div>
                {isOwner && (
                  <button
                    onClick={() => setIsInviteModalOpen(true)}
                    className="text-xs text-emerald-700 hover:text-emerald-800 font-bold"
                  >
                    + Invite
                  </button>
                )}
              </div>

              <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
                {project.members?.map((m) => {
                  const mUser = m.user;
                  if (!mUser) return null;
                  const name = mUser.name || mUser.providers?.github?.username || mUser.email?.split("@")[0] || "User";
                  const avatar = mUser.avatarUrl || "https://github.com/identicons/user.png";
                  const isCurrentOwner = m.role === "owner";

                  return (
                    <div
                      key={mUser._id}
                      className="p-2.5 rounded-xl border border-slate-100 hover:bg-slate-50 transition-colors flex items-center justify-between text-xs"
                    >
                      <div className="flex items-center space-x-2.5 min-w-0 pr-2">
                        <img src={avatar} alt="avatar" className="w-7 h-7 rounded-full border border-slate-200 shrink-0" />
                        <div className="min-w-0">
                          <div className="font-bold text-slate-900 truncate">{name}</div>
                          <div className="text-[10px] text-slate-400 font-mono truncate">{mUser.email}</div>
                        </div>
                      </div>

                      <div className="flex items-center space-x-2 shrink-0">
                        <Badge
                          variant={isCurrentOwner ? "success" : "outline"}
                          className={`text-[10px] px-2 py-0.5 capitalize ${
                            isCurrentOwner ? "bg-emerald-50 text-emerald-700 border-emerald-200 font-bold" : "bg-slate-50 text-slate-600"
                          }`}
                        >
                          {m.role}
                        </Badge>

                        {isOwner && !isCurrentOwner && (
                          <button
                            onClick={() => handleRemoveMember(mUser._id)}
                            className="text-slate-300 hover:text-rose-600 p-1"
                            title="Remove member"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </Card>
          </div>
        </div>
      )}

      {/* TAB 2: REPOSITORY */}
      {activeTab === "repository" && (
        <Card className="border border-slate-200 shadow-sm rounded-2xl p-6 bg-white space-y-6">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div>
              <h3 className="text-lg font-bold text-slate-900">Connected GitHub Repository</h3>
              <p className="text-xs text-slate-500">Repository details and codebase metadata</p>
            </div>
            {project.repository?._id && (
              <Link
                to={`/repository/${project.repository._id}`}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center space-x-1.5"
              >
                <span>View Full Repository</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </Link>
            )}
          </div>

          {project.repository ? (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Repository Name</span>
                  <span className="font-mono font-bold text-slate-900 text-sm mt-1 block">{repoFullName}</span>
                </div>
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Default Branch</span>
                  <span className="font-mono font-bold text-indigo-700 text-sm mt-1 block flex items-center gap-1">
                    <GitBranch className="w-3.5 h-3.5 text-indigo-600" /> {defaultBranch}
                  </span>
                </div>
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Indexing Status</span>
                  <span className="font-bold text-emerald-700 text-sm mt-1 block">
                    {project.repository.indexing?.indexed ? "AST Indexed ✓" : "Pending Indexing"}
                  </span>
                </div>
              </div>
            </div>
          ) : (
            <div className="p-8 text-center text-slate-400 space-y-3 bg-slate-50 border border-dashed border-slate-200 rounded-2xl">
              <FolderGit2 className="w-8 h-8 text-slate-300 mx-auto" />
              <h4 className="font-bold text-slate-700">No repository connected yet</h4>
              <p className="text-xs max-w-sm mx-auto">Connect a GitHub repository to unlock architecture blueprint exploration and symbol relations.</p>
            </div>
          )}
        </Card>
      )}

      {/* TAB 3: ARCHITECTURE (Embedded Repository Visualizer) */}
      {activeTab === "architecture" && (
        <div className="space-y-4">
          {project.repository?._id ? (
            <RepositoryVisualizer />
          ) : (
            <Card className="border border-slate-200 shadow-sm rounded-2xl p-12 text-center bg-white space-y-4">
              <Network className="w-10 h-10 text-slate-300 mx-auto" />
              <h3 className="text-lg font-bold text-slate-900">Architecture Blueprint Unavailable</h3>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                No repository is currently connected to this project. Connect a GitHub repository to visualize AST symbols, modules, and dependencies.
              </p>
            </Card>
          )}
        </div>
      )}

      {/* TAB 4: ACTIVITY */}
      {activeTab === "activity" && (
        <Card className="border border-slate-200 shadow-sm rounded-2xl p-6 bg-white space-y-6">
          <div className="border-b border-slate-100 pb-4">
            <h3 className="text-lg font-bold text-slate-900">Project Activity Timeline</h3>
            <p className="text-xs text-slate-500">Real-time audit log of team actions and codebase updates</p>
          </div>

          <div className="space-y-4">
            {(!project.activities || project.activities.length === 0) ? (
              <div className="p-6 text-center text-slate-400 text-xs">No activity logged yet.</div>
            ) : (
              project.activities.slice().reverse().map((act, index) => (
                <div key={index} className="flex items-start space-x-3 text-xs">
                  <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 mt-1.5 shrink-0" />
                  <div className="flex-1 bg-slate-50 p-3 rounded-xl border border-slate-200/70 space-y-0.5">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-900">{act.action}</span>
                      <span className="text-[10px] text-slate-400 font-mono">
                        {new Date(act.createdAt).toLocaleString()}
                      </span>
                    </div>
                    <p className="text-slate-600">{act.details}</p>
                    <span className="text-[10px] text-slate-400 font-mono block">By {act.userName || "System"}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </Card>
      )}

      {/* TAB 5: COMMUNICATION (AGORA RTC + CHAT INTEGRATION) */}
      {activeTab === "communication" && (
        <div className="space-y-6">
          <Card className="border border-slate-200 shadow-sm rounded-2xl p-4 bg-slate-900 text-white flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="p-2 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                <Radio className="w-5 h-5 animate-pulse" />
              </div>
              <div>
                <h3 className="font-bold text-sm text-white">Project Agora Communication Space</h3>
                <p className="text-xs text-slate-400 font-mono">Channel: #{project.agoraChannelName || "general"}</p>
              </div>
            </div>

            <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-500/40 text-xs font-mono">
              Agora RTC Active
            </Badge>
          </Card>

          {/* Reused GroupReviewRoom Agora Component */}
          <GroupReviewRoom
            channelName={project.agoraChannelName || `project-${project._id}`}
            prTitle={`Project Workspace: ${project.name}`}
            repoFullName={repoFullName || undefined}
          />
        </div>
      )}

      {/* Invite Member Modal */}
      {isInviteModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-md w-full p-6 space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-slate-900 text-base">Invite Collaborator</h3>
              <button
                onClick={() => {
                  setIsInviteModalOpen(false);
                  setInviteResult(null);
                  setInviteError(null);
                }}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {inviteResult ? (
              <div className="space-y-4 text-xs">
                <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-2xl text-emerald-800 space-y-1">
                  <p className="font-bold text-sm flex items-center">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 mr-1.5 shrink-0" />
                    Invitation Created
                  </p>
                  <p className="text-emerald-700 leading-relaxed text-xs">{inviteResult.message}</p>
                </div>

                {inviteResult.inviteLink && (
                  <div className="space-y-1.5">
                    <label className="block font-bold text-slate-700">Shareable Invitation Link</label>
                    <div className="flex items-center space-x-2">
                      <input
                        type="text"
                        readOnly
                        value={inviteResult.inviteLink}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 font-mono text-[11px]"
                      />
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(inviteResult.inviteLink!);
                          setCopiedLink(true);
                          setTimeout(() => setCopiedLink(false), 2000);
                        }}
                        className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl font-bold flex items-center space-x-1 shrink-0 cursor-pointer"
                      >
                        {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                        <span>{copiedLink ? "Copied" : "Copy"}</span>
                      </button>
                    </div>
                  </div>
                )}

                <div className="flex items-center justify-end space-x-2 pt-2">
                  <Button
                    size="sm"
                    onClick={() => {
                      setInviteResult(null);
                      setInviteError(null);
                    }}
                    variant="outline"
                    className="rounded-xl"
                  >
                    Invite Another
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => {
                      setIsInviteModalOpen(false);
                      setInviteResult(null);
                      setInviteError(null);
                    }}
                    className="bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl px-5"
                  >
                    Done
                  </Button>
                </div>
              </div>
            ) : (
              <>
                <div className="space-y-3 text-xs">
                  <label className="block font-bold text-slate-700">Email or GitHub Username</label>
                  <input
                    type="text"
                    placeholder="e.g. engineer@structur.ai or username"
                    value={inviteQuery}
                    onChange={(e) => setInviteQuery(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 text-slate-900"
                    autoFocus
                  />
                  {inviteError && (
                    <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 font-medium text-xs flex items-center space-x-1.5">
                      <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
                      <span>{inviteError}</span>
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-end space-x-2 pt-2">
                  <Button variant="outline" size="sm" onClick={() => setIsInviteModalOpen(false)} className="rounded-xl">
                    Cancel
                  </Button>
                  <Button
                    size="sm"
                    onClick={handleInviteMember}
                    disabled={inviteLoading || !inviteQuery.trim()}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl px-5"
                  >
                    {inviteLoading ? (
                      <span className="flex items-center space-x-1.5">
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        <span>Sending...</span>
                      </span>
                    ) : (
                      "Send Invitation"
                    )}
                  </Button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Delete Project Confirmation Modal */}
      {isDeleteModalOpen && project && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-md w-full p-6 space-y-6 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-start space-x-4">
              <div className="p-3 rounded-2xl bg-rose-50 text-rose-600 border border-rose-100 shrink-0">
                <Trash2 className="w-6 h-6" />
              </div>
              <div className="space-y-1 min-w-0 flex-1">
                <h3 className="text-lg font-bold text-slate-900">
                  Delete {project.name}?
                </h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  This will permanently remove the project and its collaboration data. This action cannot be undone.
                </p>
              </div>
            </div>

            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/80 space-y-2">
              <p className="text-xs font-semibold text-slate-700">
                To confirm deletion, type <span className="font-mono bg-white px-1.5 py-0.5 rounded border border-slate-200 text-slate-900 font-bold">{project.name}</span> in the box below:
              </p>
              <input
                type="text"
                value={confirmDeleteName}
                onChange={(e) => setConfirmDeleteName(e.target.value)}
                placeholder={`Type ${project.name}`}
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-rose-500 font-mono"
              />
            </div>

            {deleteError && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl flex items-center space-x-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                <span>{deleteError}</span>
              </div>
            )}

            <div className="flex items-center justify-end space-x-3 pt-2">
              <Button
                variant="outline"
                size="sm"
                disabled={isDeleting}
                onClick={() => {
                  setIsDeleteModalOpen(false);
                  setConfirmDeleteName("");
                  setDeleteError(null);
                }}
                className="rounded-xl text-xs cursor-pointer"
              >
                Cancel
              </Button>

              <Button
                size="sm"
                disabled={confirmDeleteName !== project.name || isDeleting}
                onClick={handleExecuteDelete}
                className="bg-rose-600 hover:bg-rose-700 text-white font-semibold rounded-xl text-xs shadow-xs cursor-pointer"
              >
                {isDeleting ? (
                  <span className="flex items-center space-x-1.5">
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Deleting...</span>
                  </span>
                ) : (
                  <span>Delete Project</span>
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
