import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  Users,
  Plus,
  FolderGit2,
  ArrowRight,
  Search,
  Check,
  RefreshCw,
  X,
  Lock,
  Globe,
  AlertCircle,
} from "lucide-react";
import { Button } from "../components/ui/Button";
import { Badge } from "../components/ui/Badge";
import { Card } from "../components/ui/Card";
import { useAuth } from "../context/AuthContext";

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
        avatarUrl?: string;
      };
    };
  };
  role: "owner" | "collaborator";
  joinedAt: string;
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
  updatedAt: string;
  lastActivityAt?: string;
}

export function ProjectList() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // New Project Modal State
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [createStep, setCreateStep] = useState<number>(1);

  // Form Fields
  const [projectName, setProjectName] = useState<string>("");
  const [projectDesc, setProjectDesc] = useState<string>("");
  const [visibility, setVisibility] = useState<"private" | "public">("private");
  const [selectedRepoId, setSelectedRepoId] = useState<string>("");
  
  // Available user repos for step 2
  const [userRepos, setUserRepos] = useState<any[]>([]);
  const [loadingRepos, setLoadingRepos] = useState<boolean>(false);

  // Invites state for step 3
  const [inviteQuery, setInviteQuery] = useState<string>("");
  const [searchLoading, setSearchLoading] = useState<boolean>(false);
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [invitedUsers, setInvitedUsers] = useState<any[]>([]);
  const [inviteError, setInviteError] = useState<string | null>(null);

  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Fetch User Projects
  const fetchProjects = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE_URL}/api/projects`, {
        method: "GET",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
      });

      if (res.ok) {
        const data = await res.json();
        setProjects(data.projects || []);
      } else {
        const errData = await res.json().catch(() => ({}));
        setError(errData.error || "Failed to load collaborative projects");
      }
    } catch (err) {
      console.error("Error fetching projects:", err);
      setError("Network error while loading projects");
    } finally {
      setLoading(false);
    }
  };

  // Fetch Accessible User Repositories for Step 2
  const fetchUserRepos = async () => {
    setLoadingRepos(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/repositories`, {
        method: "GET",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
      });
      if (res.ok) {
        const data = await res.json();
        setUserRepos(data.repositories || []);
      }
    } catch (err) {
      console.error("Error fetching user repos:", err);
    } finally {
      setLoadingRepos(false);
    }
  };

  useEffect(() => {
    fetchProjects();
  }, []);

  const openCreateModal = () => {
    setIsModalOpen(true);
    setCreateStep(1);
    setProjectName("");
    setProjectDesc("");
    setVisibility("private");
    setSelectedRepoId("");
    setInvitedUsers([]);
    fetchUserRepos();
  };

  // User search for invitations
  const handleSearchUser = async () => {
    if (!inviteQuery.trim()) return;
    setSearchLoading(true);
    setInviteError(null);
    try {
      const res = await fetch(`${API_BASE_URL}/api/users/search?q=${encodeURIComponent(inviteQuery.trim())}`, {
        credentials: "include",
      });
      if (res.ok) {
        const data = await res.json();
        setSearchResults(data.users || []);
        if ((data.users || []).length === 0) {
          setInviteError(`No user found matching "${inviteQuery}"`);
        }
      } else {
        setInviteError("Failed to search users");
      }
    } catch {
      setInviteError("Error connecting to user service");
    } finally {
      setSearchLoading(false);
    }
  };

  const addInvitedUser = (u: any) => {
    if (invitedUsers.some((item) => item._id === u._id)) return;
    setInvitedUsers([...invitedUsers, { ...u, role: "collaborator" }]);
    setInviteQuery("");
    setSearchResults([]);
  };

  const removeInvitedUser = (userId: string) => {
    setInvitedUsers(invitedUsers.filter((u) => u._id !== userId));
  };

  // Submit Create Project
  const handleCreateProject = async () => {
    if (!projectName.trim()) {
      alert("Project name is required.");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/projects`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          name: projectName.trim(),
          description: projectDesc.trim(),
          visibility,
          repositoryId: selectedRepoId || undefined,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        const newProject = data.project;

        // If collaborators were added in Step 3, invite them
        if (invitedUsers.length > 0 && newProject?._id) {
          for (const u of invitedUsers) {
            try {
              await fetch(`${API_BASE_URL}/api/projects/${newProject._id}/members`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify({
                  query: u.email || u.providers?.github?.username,
                  role: u.role || "collaborator",
                }),
              });
            } catch (err) {
              console.error("Error inviting collaborator:", err);
            }
          }
        }

        setIsModalOpen(false);
        navigate(`/projects/${newProject._id}`);
      } else {
        const errData = await res.json().catch(() => ({}));
        alert(errData.error || "Failed to create project");
      }
    } catch (err) {
      console.error("Error submitting new project:", err);
      alert("Network error creating project");
    } finally {
      setIsSubmitting(false);
    }
  };

  const selectedRepoObj = useMemo(() => {
    return userRepos.find((r) => r._id === selectedRepoId || r.indexing?.repositoryId === selectedRepoId);
  }, [userRepos, selectedRepoId]);

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-8">
      {/* 1. Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <div className="flex items-center space-x-2.5">
            <div className="p-2 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-100">
              <Users className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">
                Collaborative Projects
              </h1>
              <p className="text-slate-500 text-sm font-medium mt-0.5">
                Build, communicate, and ship together around your codebases.
              </p>
            </div>
          </div>
        </div>

        <Button
          onClick={openCreateModal}
          className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl px-5 py-2.5 shadow-sm transition-all flex items-center space-x-2 shrink-0 cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>New Project</span>
        </Button>
      </div>

      {/* 2. Projects Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4 animate-pulse"
            >
              <div className="h-6 bg-slate-100 rounded-lg w-2/3"></div>
              <div className="h-4 bg-slate-100 rounded-lg w-full"></div>
              <div className="h-4 bg-slate-100 rounded-lg w-1/2"></div>
              <div className="pt-4 border-t border-slate-100 flex justify-between items-center">
                <div className="h-8 bg-slate-100 rounded-full w-24"></div>
                <div className="h-8 bg-slate-100 rounded-xl w-28"></div>
              </div>
            </div>
          ))}
        </div>
      ) : error ? (
        <div className="bg-rose-50 border border-rose-200 text-rose-800 p-6 rounded-2xl text-center space-y-3">
          <AlertCircle className="w-8 h-8 text-rose-600 mx-auto" />
          <h3 className="text-base font-bold">{error}</h3>
          <Button variant="outline" size="sm" onClick={fetchProjects} className="bg-white rounded-xl">
            Retry
          </Button>
        </div>
      ) : projects.length === 0 ? (
        <Card className="border border-slate-200 shadow-sm rounded-2xl p-12 text-center bg-white space-y-5">
          <div className="w-16 h-16 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto border border-emerald-100">
            <Users className="w-8 h-8" />
          </div>
          <div className="max-w-md mx-auto space-y-2">
            <h3 className="text-lg font-bold text-slate-900">No collaborative projects yet</h3>
            <p className="text-slate-500 text-sm">
              Bring your engineering team together around your GitHub repositories with real-time Agora voice/video communication and AST architecture intelligence.
            </p>
          </div>
          <Button
            onClick={openCreateModal}
            className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl px-6 py-2.5 shadow-sm inline-flex items-center space-x-2 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Create Your First Project</span>
          </Button>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {projects.map((project) => {
            const ownerName =
              project.owner?.name ||
              project.owner?.providers?.github?.username ||
              project.owner?.email?.split("@")[0] ||
              "Owner";

            const memberCount = project.members?.length || 1;
            const extraMembers = memberCount > 1 ? memberCount - 1 : 0;

            const repoFullName =
              project.repository?.github?.fullName ||
              (project.repository?.github?.owner && project.repository?.github?.name
                ? `${project.repository.github.owner}/${project.repository.github.name}`
                : null);

            return (
              <div
                key={project._id}
                onClick={() => navigate(`/projects/${project._id}`)}
                className="bg-white rounded-2xl border border-slate-200/90 shadow-sm hover:shadow-md hover:border-emerald-300 transition-all p-6 flex flex-col justify-between group cursor-pointer"
              >
                <div className="space-y-4">
                  {/* Title & Visibility */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="space-y-1 min-w-0">
                      <h3 className="text-lg font-bold text-slate-900 truncate group-hover:text-emerald-700 transition-colors">
                        {project.name}
                      </h3>
                      <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed font-normal">
                        {project.description || "No description provided."}
                      </p>
                    </div>
                    <Badge
                      variant="outline"
                      className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 shrink-0 bg-slate-50 text-slate-600"
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
                  </div>

                  {/* Members & Collaborators */}
                  <div className="flex items-center space-x-2 text-xs text-slate-600 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                    <Users className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span className="font-semibold text-slate-800 truncate">
                      {ownerName}
                    </span>
                    {extraMembers > 0 && (
                      <span className="text-slate-500">
                        + {extraMembers} collaborator{extraMembers > 1 ? "s" : ""}
                      </span>
                    )}
                  </div>

                  {/* Connected Repository */}
                  {repoFullName ? (
                    <div className="flex items-center justify-between text-xs font-mono bg-indigo-50/50 p-2.5 rounded-xl border border-indigo-100 text-indigo-900">
                      <div className="flex items-center space-x-2 truncate">
                        <FolderGit2 className="w-4 h-4 text-indigo-600 shrink-0" />
                        <span className="truncate font-semibold">{repoFullName}</span>
                      </div>
                      <span className="text-[10px] font-sans font-bold bg-white text-indigo-700 px-1.5 py-0.5 rounded border border-indigo-200 shrink-0">
                        {project.repository?.indexing?.indexed ? "Indexed ✓" : "Connected"}
                      </span>
                    </div>
                  ) : (
                    <div className="text-xs text-slate-400 font-mono bg-slate-50 p-2.5 rounded-xl border border-dashed border-slate-200 flex items-center space-x-2">
                      <FolderGit2 className="w-4 h-4 text-slate-300 shrink-0" />
                      <span>No repository connected</span>
                    </div>
                  )}
                </div>

                {/* Footer Action */}
                <div className="pt-4 mt-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                  <div className="flex items-center space-x-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block animate-pulse"></span>
                    <span className="font-medium text-slate-600 capitalize">{project.status}</span>
                  </div>

                  <span className="font-bold text-emerald-700 flex items-center space-x-1 group-hover:translate-x-0.5 transition-transform">
                    <span>Open Project</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 3. Multi-Step New Project Creation Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-xl w-full overflow-hidden flex flex-col max-h-[90vh]">
            {/* Modal Header */}
            <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center space-x-3">
                <div className="p-2 rounded-xl bg-emerald-600 text-white shadow-sm">
                  <Users className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-slate-900">Create Collaborative Project</h2>
                  <p className="text-xs text-slate-500 font-medium">
                    Step {createStep} of 4: {
                      createStep === 1 ? "Project Basics" :
                      createStep === 2 ? "Connect GitHub Repository" :
                      createStep === 3 ? "Invite Team Members" : "Review & Launch"
                    }
                  </p>
                </div>
              </div>

              <button
                onClick={() => setIsModalOpen(false)}
                className="p-2 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Step Progress Pills */}
            <div className="px-6 pt-4 flex items-center space-x-2">
              {[1, 2, 3, 4].map((step) => (
                <div
                  key={step}
                  className={`h-1.5 flex-1 rounded-full transition-all ${
                    step <= createStep ? "bg-emerald-600" : "bg-slate-100"
                  }`}
                />
              ))}
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-5 overflow-y-auto flex-1 text-xs">
              {createStep === 1 && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-slate-700 font-bold mb-1.5">Project Name *</label>
                    <input
                      type="text"
                      placeholder="e.g. StructurAI Core"
                      value={projectName}
                      onChange={(e) => setProjectName(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 text-slate-900 font-medium"
                      autoFocus
                    />
                  </div>

                  <div>
                    <label className="block text-slate-700 font-bold mb-1.5">Description</label>
                    <textarea
                      placeholder="Building the next generation code intelligence platform..."
                      value={projectDesc}
                      onChange={(e) => setProjectDesc(e.target.value)}
                      rows={3}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 text-slate-900"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-700 font-bold mb-1.5">Visibility</label>
                    <div className="grid grid-cols-2 gap-3">
                      <button
                        type="button"
                        onClick={() => setVisibility("private")}
                        className={`p-3 rounded-xl border text-left flex items-start space-x-2.5 cursor-pointer transition-all ${
                          visibility === "private"
                            ? "bg-emerald-50/70 border-emerald-300 text-emerald-950 font-semibold"
                            : "bg-white border-slate-200 hover:bg-slate-50 text-slate-700"
                        }`}
                      >
                        <Lock className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                        <div>
                          <div className="font-bold text-xs">Private</div>
                          <div className="text-[10px] text-slate-500 font-normal">Only project members can access</div>
                        </div>
                      </button>

                      <button
                        type="button"
                        onClick={() => setVisibility("public")}
                        className={`p-3 rounded-xl border text-left flex items-start space-x-2.5 cursor-pointer transition-all ${
                          visibility === "public"
                            ? "bg-emerald-50/70 border-emerald-300 text-emerald-950 font-semibold"
                            : "bg-white border-slate-200 hover:bg-slate-50 text-slate-700"
                        }`}
                      >
                        <Globe className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                        <div>
                          <div className="font-bold text-xs">Public</div>
                          <div className="text-[10px] text-slate-500 font-normal">Visible to your organization</div>
                        </div>
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {createStep === 2 && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-slate-700 font-bold mb-1">Connect GitHub Repository</label>
                    <p className="text-slate-500 text-[11px] mb-3">
                      Only showing GitHub repositories accessible to your authenticated GitHub account.
                    </p>

                    {loadingRepos ? (
                      <div className="p-8 text-center text-slate-400 space-y-2">
                        <RefreshCw className="w-5 h-5 animate-spin mx-auto text-emerald-600" />
                        <p>Fetching accessible repositories...</p>
                      </div>
                    ) : userRepos.length === 0 ? (
                      <div className="p-6 bg-slate-50 border border-slate-200 rounded-2xl text-center space-y-2">
                        <FolderGit2 className="w-6 h-6 text-slate-400 mx-auto" />
                        <p className="font-semibold text-slate-700">No accessible GitHub repositories found</p>
                        <p className="text-[11px] text-slate-500">You can create the project now and connect a repository later.</p>
                      </div>
                    ) : (
                      <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                        {userRepos.map((repo) => {
                          const repoId = repo._id || repo.indexing?.repositoryId || repo.github?.fullName;
                          const isSelected = selectedRepoId === repoId;
                          const fullName = repo.github?.fullName || repo.fullName || repo.name;
                          const isIndexed = repo.indexing?.indexed ?? false;

                          return (
                            <div
                              key={repoId}
                              onClick={() => setSelectedRepoId(isSelected ? "" : repoId)}
                              className={`p-3 rounded-xl border transition-all cursor-pointer flex items-center justify-between ${
                                isSelected
                                  ? "bg-emerald-50 border-emerald-400 text-emerald-950 shadow-xs"
                                  : "bg-white border-slate-200 hover:bg-slate-50 text-slate-800"
                              }`}
                            >
                              <div className="flex items-center space-x-3 min-w-0">
                                <div className="p-2 rounded-lg bg-slate-100 text-slate-600 shrink-0">
                                  <FolderGit2 className="w-4 h-4 text-emerald-600" />
                                </div>
                                <div className="min-w-0">
                                  <div className="font-bold text-xs font-mono truncate">{fullName}</div>
                                  <div className="text-[10px] text-slate-500 font-sans">
                                    {repo.github?.defaultBranch || "main"} • {repo.visibility || "public"}
                                  </div>
                                </div>
                              </div>

                              <div className="flex items-center space-x-2 shrink-0">
                                {isIndexed ? (
                                  <Badge variant="success" className="text-[10px] bg-emerald-50 text-emerald-700 border-emerald-200">
                                    Indexed ✓
                                  </Badge>
                                ) : (
                                  <Badge variant="outline" className="text-[10px] text-slate-500">
                                    Not Indexed
                                  </Badge>
                                )}
                                {isSelected && <Check className="w-4 h-4 text-emerald-600" />}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {selectedRepoObj && !selectedRepoObj.indexing?.indexed && (
                    <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-900 text-[11px] flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                        <span>Repository hasn't been indexed yet. You can index it directly inside the project workspace.</span>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {createStep === 3 && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-slate-700 font-bold mb-1">Invite Collaborators</label>
                    <p className="text-slate-500 text-[11px] mb-3">
                      Search for users in your organization by email or GitHub username.
                    </p>

                    <div className="flex space-x-2">
                      <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                        <input
                          type="text"
                          placeholder="User email or GitHub username..."
                          value={inviteQuery}
                          onChange={(e) => setInviteQuery(e.target.value)}
                          onKeyDown={(e) => e.key === "Enter" && handleSearchUser()}
                          className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                        />
                      </div>
                      <Button
                        size="sm"
                        onClick={handleSearchUser}
                        disabled={searchLoading || !inviteQuery.trim()}
                        className="bg-slate-900 hover:bg-slate-800 text-white rounded-xl px-4 cursor-pointer"
                      >
                        {searchLoading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : "Search"}
                      </Button>
                    </div>

                    {inviteError && (
                      <p className="text-[11px] text-rose-500 font-medium mt-1.5">{inviteError}</p>
                    )}

                    {searchResults.length > 0 && (
                      <div className="mt-3 space-y-1 max-h-36 overflow-y-auto bg-slate-50 p-2 rounded-xl border border-slate-200">
                        {searchResults.map((u) => (
                          <div
                            key={u._id}
                            className="flex items-center justify-between p-2 bg-white rounded-lg border border-slate-200/80 text-xs"
                          >
                            <div className="flex items-center space-x-2 min-w-0">
                              <img
                                src={u.avatarUrl || u.providers?.github?.avatarUrl || "https://github.com/identicons/user.png"}
                                alt="avatar"
                                className="w-6 h-6 rounded-full border border-slate-200 shrink-0"
                              />
                              <div className="min-w-0">
                                <div className="font-bold text-slate-900 truncate">{u.name || u.email}</div>
                                <div className="text-[10px] text-slate-400 font-mono truncate">{u.email || u.providers?.github?.username}</div>
                              </div>
                            </div>
                            <Button
                              size="sm"
                              onClick={() => addInvitedUser(u)}
                              className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg px-2.5 py-1 text-[10px]"
                            >
                              + Add
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* List of Pending Invites */}
                  <div className="space-y-2">
                    <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                      Team Members ({invitedUsers.length + 1})
                    </label>

                    <div className="p-2.5 bg-emerald-50/60 border border-emerald-200 rounded-xl flex items-center justify-between text-xs">
                      <div className="flex items-center space-x-2">
                        <img
                          src={user?.avatarUrl || "https://github.com/identicons/user.png"}
                          alt="owner"
                          className="w-6 h-6 rounded-full border border-emerald-300"
                        />
                        <div>
                          <span className="font-bold text-emerald-950">{user?.name || user?.email}</span>
                          <span className="text-[10px] text-emerald-700 ml-1.5 font-mono">(You)</span>
                        </div>
                      </div>
                      <Badge className="bg-emerald-600 text-white text-[10px] px-2 py-0.5">Project Owner</Badge>
                    </div>

                    {invitedUsers.map((u) => (
                      <div
                        key={u._id}
                        className="p-2.5 bg-white border border-slate-200 rounded-xl flex items-center justify-between text-xs"
                      >
                        <div className="flex items-center space-x-2">
                          <img
                            src={u.avatarUrl || u.providers?.github?.avatarUrl || "https://github.com/identicons/user.png"}
                            alt="member"
                            className="w-6 h-6 rounded-full border border-slate-200"
                          />
                          <div>
                            <span className="font-bold text-slate-800">{u.name || u.email}</span>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Badge variant="outline" className="text-[10px] bg-slate-50 text-slate-600">
                            Collaborator
                          </Badge>
                          <button
                            onClick={() => removeInvitedUser(u._id)}
                            className="text-slate-400 hover:text-rose-600 p-1"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {createStep === 4 && (
                <div className="space-y-4">
                  <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="font-extrabold text-slate-900 text-sm">{projectName}</h4>
                      <Badge className="capitalize bg-emerald-100 text-emerald-800 border-emerald-200 text-[10px]">
                        {visibility}
                      </Badge>
                    </div>
                    {projectDesc && <p className="text-slate-600 text-xs">{projectDesc}</p>}

                    <div className="pt-3 border-t border-slate-200 space-y-2">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-slate-500 font-medium">GitHub Repository:</span>
                        <span className="font-mono font-bold text-slate-800">
                          {selectedRepoObj ? selectedRepoObj.github?.fullName || selectedRepoObj.name : "None connected"}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-slate-500 font-medium">Team Members:</span>
                        <span className="font-bold text-slate-800">{invitedUsers.length + 1} member(s)</span>
                      </div>
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-slate-500 font-medium">Agora RTC Space:</span>
                        <span className="text-emerald-600 font-mono font-bold">Enabled ✓</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer Controls */}
            <div className="p-6 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between">
              {createStep > 1 ? (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCreateStep(createStep - 1)}
                  className="rounded-xl cursor-pointer"
                >
                  Back
                </Button>
              ) : (
                <div />
              )}

              {createStep < 4 ? (
                <Button
                  size="sm"
                  onClick={() => {
                    if (createStep === 1 && !projectName.trim()) {
                      alert("Please enter a project name.");
                      return;
                    }
                    setCreateStep(createStep + 1);
                  }}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl px-5 cursor-pointer"
                >
                  Next Step
                </Button>
              ) : (
                <Button
                  size="sm"
                  onClick={handleCreateProject}
                  disabled={isSubmitting}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl px-6 shadow-sm cursor-pointer"
                >
                  {isSubmitting ? (
                    <div className="flex items-center space-x-2">
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Creating Workspace...</span>
                    </div>
                  ) : (
                    <span>Launch Project Workspace →</span>
                  )}
                </Button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
