import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../components/ui/Card";
import { Badge } from "../components/ui/Badge";
import { Button } from "../components/ui/Button";
import {
  Activity,
  ShieldAlert,
  GitPullRequest,
  ArrowUpRight,
  ArrowDownRight,
  Clock,
  ExternalLink,
  GitBranch,
  FolderGit2,
  Lock,
  Globe,
  RefreshCw,
  AlertCircle,
  Network,
  CheckCircle2,
  Play
} from "lucide-react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { useAuth } from "../context/AuthContext";

export interface DashboardRepository {
  _id?: string;
  id?: number | string;
  github?: {
    id: number | string;
    owner: string;
    name: string;
    fullName: string;
    url?: string;
    cloneUrl?: string;
    defaultBranch: string;
    private?: boolean;
    language?: string | null;
  };
  name?: string;
  fullName?: string;
  owner?: string;
  url?: string;
  cloneUrl?: string;
  defaultBranch?: string;
  language?: string | null;
  visibility?: "public" | "private" | string;
  indexing?: {
    indexed: boolean;
    status: "not_indexed" | "pending" | "indexing" | "ready" | "failed" | string;
    stage?: string | null;
    repositoryId: string | null;
    lastIndexedAt?: string | null;
    error?: string | null;
  };
}

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:5001";

const mockActivityData = [
  { name: "Mon", incidents: 4, PRs: 12 },
  { name: "Tue", incidents: 3, PRs: 18 },
  { name: "Wed", incidents: 7, PRs: 15 },
  { name: "Thu", incidents: 2, PRs: 22 },
  { name: "Fri", incidents: 1, PRs: 20 },
  { name: "Sat", incidents: 0, PRs: 5 },
  { name: "Sun", incidents: 1, PRs: 8 },
];

export function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [repositories, setRepositories] = useState<DashboardRepository[]>([]);
  const [loadingRepos, setLoadingRepos] = useState<boolean>(true);
  const [repoError, setRepoError] = useState<string | null>(null);
  const [actionLoadingId, setActionLoadingId] = useState<string | number | null>(null);

  const fetchRepositories = async () => {
    setLoadingRepos(true);
    setRepoError(null);
    try {
      const response = await fetch(`${API_BASE_URL}/api/repositories`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
      });

      if (response.ok) {
        const data = await response.json();
        setRepositories(data.repositories || []);
      } else {
        const errData = await response.json().catch(() => ({}));
        setRepoError(errData.error || "Failed to fetch repositories from GitHub.");
      }
    } catch (err) {
      console.error("Error fetching repositories:", err);
      setRepoError("Network error. Unable to reach backend server.");
    } finally {
      setLoadingRepos(false);
    }
  };

  const fetchRepositoriesQuietly = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/repositories`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
      });

      if (response.ok) {
        const data = await response.json();
        setRepositories(data.repositories || []);
      }
    } catch (err) {
      console.error("Error silently updating repositories:", err);
    }
  };

  useEffect(() => {
    if (user) {
      fetchRepositories();
    }
  }, [user]);

  // Polling for in-progress indexing jobs
  useEffect(() => {
    const hasActiveIndexing = repositories.some((r) => {
      const st = (r.indexing?.status || "").toLowerCase();
      return st === "indexing" || st === "pending";
    });

    if (!hasActiveIndexing) return;

    const timer = setInterval(() => {
      fetchRepositoriesQuietly();
    }, 2000);

    return () => clearInterval(timer);
  }, [repositories]);

  const handleIndexRepository = async (repo: DashboardRepository) => {
    const ownerStr =
      typeof repo.github?.owner === "string"
        ? repo.github.owner
        : (repo.github?.owner as any)?.login || (repo.owner as any)?.login || repo.owner;
    const nameStr =
      typeof repo.github?.name === "string"
        ? repo.github.name
        : repo.name;
    const cardId = repo.github?.id || repo.id || repo._id;

    if (!ownerStr || !nameStr) {
      console.error("[UI Indexing Error] Missing owner or name string:", { ownerStr, nameStr, repo });
      return;
    }

    console.log(`[UI Indexing] Initiating index request for "${ownerStr}/${nameStr}" (cardId: ${cardId})`);
    setActionLoadingId(cardId || null);

    // Immediately set state to indexing locally for instant feedback
    setRepositories((prev) =>
      prev.map((r) => {
        const matchedId = r.github?.id || r.id || r._id;
        if (matchedId === cardId) {
          return {
            ...r,
            indexing: {
              indexed: true,
              status: "indexing",
              repositoryId: r.indexing?.repositoryId || null,
              lastIndexedAt: null,
            },
          };
        }
        return r;
      })
    );

    try {
      const connectUrl = `${API_BASE_URL}/api/repositories/connect`;
      console.log(`[UI Indexing] Sending POST to ${connectUrl} with payload:`, { owner: ownerStr, name: nameStr });

      const response = await fetch(connectUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({ owner: ownerStr, name: nameStr }),
      });

      console.log(`[UI Indexing] Received response HTTP ${response.status}`);

      if (response.ok) {
        const data = await response.json();
        console.log(`[UI Indexing] Success response payload:`, data);
        const mongoRepo = data.repository;
        const mongoId = mongoRepo?._id;

        setRepositories((prev) =>
          prev.map((r) => {
            const matchedId = r.github?.id || r.id || r._id;
            if (matchedId === cardId) {
              return {
                ...r,
                indexing: {
                  indexed: true,
                  status: mongoRepo?.indexing?.status || "indexing",
                  repositoryId: mongoId || null,
                  lastIndexedAt: mongoRepo?.indexing?.lastIndexedAt || null,
                  error: mongoRepo?.indexing?.error || null,
                },
              };
            }
            return r;
          })
        );
      } else {
        const errData = await response.json().catch(() => ({}));
        console.error(`[UI Indexing Error] HTTP ${response.status} Error details:`, errData);
        setRepositories((prev) =>
          prev.map((r) => {
            const matchedId = r.github?.id || r.id || r._id;
            if (matchedId === cardId) {
              return {
                ...r,
                indexing: {
                  indexed: false,
                  status: "failed",
                  repositoryId: r.indexing?.repositoryId || null,
                  error: errData.error || `HTTP ${response.status} Failed to connect repository`,
                },
              };
            }
            return r;
          })
        );
      }
    } catch (err) {
      console.error("[UI Indexing Exception] Exception during fetch:", err);
    } finally {
      setActionLoadingId(null);
    }
  };

  return (
    <div className="space-y-8">
      {/* Header with Authenticated GitHub Identity */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Welcome back, {user?.name || "Developer"}
          </h1>
          <p className="text-slate-500 mt-1">
            Overview of your connected repositories, codebase health, and trace incidents.
          </p>
        </div>
        {user && (
          <div className="flex items-center space-x-3 bg-slate-50 p-2.5 rounded-xl border border-slate-200">
            <img
              src={user.avatarUrl || "https://github.com/ghost.png"}
              alt={user.name}
              className="w-10 h-10 rounded-full border border-slate-300 object-cover"
            />
            <div className="flex flex-col text-left">
              <span className="text-sm font-semibold text-slate-900">{user.name}</span>
              {user.providers?.github?.username && (
                <span className="text-xs font-medium text-indigo-600">
                  @{user.providers.github.username}
                </span>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Stats Row */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {[
          { title: "Connected Repositories", value: loadingRepos ? "..." : String(repositories.length), icon: FolderGit2, trend: "GitHub Live Sync", trendType: "up", color: "text-indigo-600" },
          { title: "Code Health Score", value: "92/100", icon: Activity, trend: "+1.2% this week", trendType: "up", color: "text-emerald-600" },
          { title: "Pending PR Reviews", value: "8", icon: GitPullRequest, trend: "-3 from yesterday", trendType: "down", color: "text-indigo-600" },
          { title: "Active Incidents", value: "3", icon: ShieldAlert, trend: "+2 from yesterday", trendType: "up", color: "text-rose-600" },
        ].map((stat, i) => (
          <Card key={i}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between space-y-0 pb-2">
                <p className="text-sm font-medium text-slate-600">{stat.title}</p>
                <stat.icon className={`w-4 h-4 text-slate-400`} />
              </div>
              <div className="flex flex-col">
                <span className="text-3xl font-bold text-slate-900">{stat.value}</span>
                <div className="flex items-center mt-2 text-xs text-slate-500">
                  {stat.trendType === "up" ? (
                    <ArrowUpRight className={`w-3 h-3 mr-1 ${stat.title === "Active Incidents" ? "text-rose-500" : "text-emerald-500"}`} />
                  ) : (
                    <ArrowDownRight className={`w-3 h-3 mr-1 ${stat.title === "AI Slop Detected" ? "text-emerald-500" : "text-slate-500"}`} />
                  )}
                  {stat.trend}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Repositories Section */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-xl flex items-center gap-2">
              <FolderGit2 className="w-5 h-5 text-indigo-600" />
              GitHub Repositories
            </CardTitle>
            <CardDescription>
              All accessible repositories from your authenticated GitHub account.
            </CardDescription>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={fetchRepositories}
            disabled={loadingRepos}
            className="flex items-center gap-2 text-xs"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loadingRepos ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </CardHeader>

        <CardContent>
          {loadingRepos ? (
            /* Loading State */
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 py-6">
              {[1, 2, 3].map((n) => (
                <div key={n} className="p-5 rounded-xl border border-slate-200 bg-slate-50/50 space-y-3 animate-pulse">
                  <div className="h-4 bg-slate-200 rounded w-3/4" />
                  <div className="h-3 bg-slate-200 rounded w-1/2" />
                  <div className="flex gap-2 pt-2">
                    <div className="h-5 bg-slate-200 rounded w-16" />
                    <div className="h-5 bg-slate-200 rounded w-16" />
                  </div>
                </div>
              ))}
            </div>
          ) : repoError ? (
            /* Error State */
            <div className="p-6 rounded-xl border border-rose-200 bg-rose-50 text-center space-y-3">
              <AlertCircle className="w-8 h-8 text-rose-500 mx-auto" />
              <p className="text-sm font-medium text-rose-800">{repoError}</p>
              <Button variant="outline" size="sm" onClick={fetchRepositories} className="bg-white text-xs">
                Try Again
              </Button>
            </div>
          ) : repositories.length === 0 ? (
            /* Empty State */
            <div className="py-12 text-center space-y-3">
              <FolderGit2 className="w-12 h-12 text-slate-300 mx-auto" />
              <h3 className="text-base font-semibold text-slate-800">No Repositories Found</h3>
              <p className="text-sm text-slate-500 max-w-sm mx-auto">
                No repositories were returned from your GitHub account. Ensure your OAuth permissions allow access.
              </p>
            </div>
          ) : (
            /* Repositories Grid */
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {repositories.map((repo) => {
                const cardId = repo.github?.id || repo.id || repo._id || "";
                const repoName = repo.github?.name || repo.name || "Repository";
                const repoFullName = repo.github?.fullName || repo.fullName || repoName;
                const repoVisibility = repo.visibility || (repo.github?.private ? "private" : "public");
                const repoLanguage = repo.language || repo.github?.language;
                const repoBranch = repo.github?.defaultBranch || repo.defaultBranch || "main";
                const repoUrl = repo.github?.url || repo.url || "#";

                const mongoRepoId = repo.indexing?.repositoryId || repo._id;
                const st = (repo.indexing?.status || "").toLowerCase();
                const isIndexing = st === "indexing" || st === "pending" || actionLoadingId === cardId;
                const isIndexed = (st === "ready" || st === "indexed") && Boolean(mongoRepoId);
                const isFailed = st === "failed";

                return (
                  <div
                    key={cardId}
                    className="p-5 rounded-xl border border-slate-200 bg-white hover:border-indigo-300 hover:shadow-md transition-all flex flex-col justify-between"
                  >
                    <div className="space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <h3 className="text-base font-bold text-slate-900 truncate pr-1" title={repoName}>
                          {repoName}
                        </h3>
                        <div className="flex items-center gap-1.5 shrink-0">
                          {isIndexing ? (
                            <span className="flex items-center gap-1 text-[11px] text-indigo-700 font-semibold bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded-md capitalize">
                              <RefreshCw className="w-3 h-3 text-indigo-600 animate-spin" />
                              {repo.indexing?.stage && repo.indexing.stage !== "idle"
                                ? repo.indexing.stage.replace(/_/g, " ")
                                : "Indexing..."}
                            </span>
                          ) : isIndexed ? (
                            <span className="flex items-center gap-1 text-[11px] text-emerald-700 font-semibold bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md">
                              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                              Indexed
                            </span>
                          ) : isFailed ? (
                            <span
                              className="flex items-center gap-1 text-[11px] text-rose-700 font-semibold bg-rose-50 border border-rose-200 px-2 py-0.5 rounded-md cursor-help"
                              title={repo.indexing?.error || "Indexing failed"}
                            >
                              <AlertCircle className="w-3 h-3 text-rose-600" />
                              Index Failed
                            </span>
                          ) : (
                            <span className="flex items-center gap-1 text-[11px] text-amber-700 font-medium bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-md">
                              Not Indexed
                            </span>
                          )}
                          <span className="flex items-center gap-1 text-xs text-slate-500 font-medium bg-slate-100 px-2 py-0.5 rounded-md capitalize">
                            {repoVisibility === "private" ? (
                              <Lock className="w-3 h-3 text-amber-600" />
                            ) : (
                              <Globe className="w-3 h-3 text-emerald-600" />
                            )}
                            {repoVisibility}
                          </span>
                        </div>
                      </div>

                      <p className="text-xs text-slate-500 truncate font-mono" title={repoFullName}>
                        {repoFullName}
                      </p>

                      <div className="flex flex-wrap items-center gap-2 pt-2">
                        {repoLanguage && (
                          <Badge variant="outline" className="bg-indigo-50/50 text-indigo-700 text-[11px]">
                            {repoLanguage}
                          </Badge>
                        )}
                        <span className="flex items-center text-[11px] text-slate-500 bg-slate-50 px-2 py-0.5 rounded border border-slate-200">
                          <GitBranch className="w-3 h-3 mr-1 text-slate-400" />
                          {repoBranch}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-5 mt-4 border-t border-slate-100 gap-2">
                      <a
                        href={repoUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs font-medium text-slate-500 hover:text-indigo-600 flex items-center gap-1 shrink-0"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        GitHub
                      </a>

                      <div className="flex items-center gap-1.5">
                        {isIndexing ? (
                          <Button
                            size="sm"
                            disabled
                            className="text-xs h-8 px-3 bg-indigo-500 text-white flex items-center gap-1.5 opacity-85 cursor-not-allowed"
                          >
                            <RefreshCw className="w-3 h-3 animate-spin" />
                            <span>Indexing...</span>
                          </Button>
                        ) : isIndexed && mongoRepoId ? (
                          <>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => navigate(`/repository/${mongoRepoId}/visualizer`)}
                              className="text-xs h-8 px-2.5 flex items-center gap-1"
                              title="Open Repository Visualizer"
                            >
                              <Network className="w-3.5 h-3.5 text-indigo-600" />
                              <span className="hidden sm:inline">Visualizer</span>
                            </Button>

                            <Button
                              size="sm"
                              onClick={() => navigate(`/repository/${mongoRepoId}`)}
                              className="text-xs h-8 px-3"
                            >
                              Inspect
                            </Button>
                          </>
                        ) : isFailed ? (
                          <Button
                            size="sm"
                            onClick={() => handleIndexRepository(repo)}
                            className="text-xs h-8 px-3.5 bg-rose-600 hover:bg-rose-700 text-white flex items-center gap-1.5"
                          >
                            <RefreshCw className="w-3 h-3" />
                            <span>Retry</span>
                          </Button>
                        ) : (
                          <Button
                            size="sm"
                            onClick={() => handleIndexRepository(repo)}
                            className="text-xs h-8 px-3.5 bg-indigo-600 hover:bg-indigo-700 text-white flex items-center gap-1.5"
                          >
                            <Play className="w-3 h-3 fill-current" />
                            <span>Index</span>
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Analytics Chart & Incidents Row */}
      <div className="grid gap-6 md:grid-cols-7">
        {/* Chart */}
        <Card className="md:col-span-4">
          <CardHeader>
            <CardTitle>Activity Overview</CardTitle>
            <CardDescription>Incidents and PR activity over the last 7 days</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={mockActivityData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorIncidents" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#f43f5e" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="colorPRs" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#4f46e5" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} dy={10} />
                  <YAxis axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} />
                  <Tooltip 
                    contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  />
                  <Area type="monotone" dataKey="PRs" stroke="#4f46e5" strokeWidth={2} fillOpacity={1} fill="url(#colorPRs)" />
                  <Area type="monotone" dataKey="incidents" stroke="#f43f5e" strokeWidth={2} fillOpacity={1} fill="url(#colorIncidents)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Recent Incidents */}
        <Card className="md:col-span-3">
          <CardHeader>
            <CardTitle>Recent Incidents</CardTitle>
            <CardDescription>Latest runtime execution failures</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[
                { id: "INC-1042", msg: "NullReferenceException in PaymentProcessor", time: "10 mins ago", severity: "error" },
                { id: "INC-1041", msg: "Database Timeout in UserAuth Service", time: "2 hours ago", severity: "error" },
                { id: "INC-1040", msg: "High Memory Usage Warning", time: "5 hours ago", severity: "warning" },
                { id: "INC-1039", msg: "API Rate Limit Exceeded", time: "1 day ago", severity: "warning" },
              ].map((inc, i) => (
                <div key={i} className="flex items-center justify-between p-3 rounded-lg border border-slate-100 hover:bg-slate-50 transition-colors">
                  <div className="flex items-center space-x-3">
                    <div className={`w-2 h-2 rounded-full ${inc.severity === 'error' ? 'bg-rose-500' : 'bg-amber-500'}`}></div>
                    <div>
                      <Link to="/incidents/1" className="text-sm font-medium text-slate-900 hover:text-indigo-600 hover:underline">
                        {inc.id}
                      </Link>
                      <p className="text-xs text-slate-500 truncate max-w-[200px]">{inc.msg}</p>
                    </div>
                  </div>
                  <div className="flex items-center text-xs text-slate-400">
                    <Clock className="w-3 h-3 mr-1" />
                    {inc.time}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
