import { useState, useEffect, useMemo } from "react";
import { useParams, Link, useSearchParams, useNavigate } from "react-router-dom";
import { Card, CardHeader, CardContent } from "../components/ui/Card";
import { Badge } from "../components/ui/Badge";
import { Button } from "../components/ui/Button";
import {
  Folder,
  FolderOpen,
  FileCode,
  FileText,
  File,
  GitCommit,
  Search,
  GitBranch,
  AlertCircle,
  ChevronRight,
  ChevronDown,
  GitPullRequest,
  Network,
  Copy,
  Check,
  RefreshCw,
} from "lucide-react";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:5001";

interface RepoInfo {
  name: string;
  fullName: string;
  owner: string;
  defaultBranch: string;
  visibility: string;
}

interface GitTreeNode {
  path: string;
  mode: string;
  type: "blob" | "tree";
  sha: string;
  size?: number;
  url: string;
}

interface FileTreeStructure {
  name: string;
  path: string;
  type: "blob" | "tree";
  children: { [key: string]: FileTreeStructure };
}

function getFileIcon(filename: string, isActive: boolean) {
  const ext = filename.split(".").pop()?.toLowerCase();
  const iconClass = `w-4 h-4 mr-2 ${isActive ? "text-indigo-400" : "text-slate-400"}`;

  if (["ts", "tsx", "js", "jsx", "py", "go", "rs", "java", "cpp", "c", "rb", "php"].includes(ext || "")) {
    return <FileCode className={iconClass} />;
  }
  if (["md", "txt", "doc", "pdf"].includes(ext || "")) {
    return <FileText className={iconClass} />;
  }
  return <File className={iconClass} />;
}

function buildTree(nodes: GitTreeNode[], searchQuery: string = ""): FileTreeStructure {
  const root: FileTreeStructure = { name: "root", path: "", type: "tree", children: {} };

  // Filter if search query is present
  const filteredNodes = searchQuery.trim()
    ? nodes.filter(node => node.path.toLowerCase().includes(searchQuery.toLowerCase().trim()))
    : nodes;

  filteredNodes.forEach(node => {
    const parts = node.path.split("/");
    let current = root;

    parts.forEach((part, index) => {
      if (!current.children[part]) {
        current.children[part] = {
          name: part,
          path: parts.slice(0, index + 1).join("/"),
          type: index === parts.length - 1 ? node.type : "tree",
          children: {}
        };
      }
      current = current.children[part];
    });
  });

  return root;
}

function TreeNode({
  node,
  onSelectFile,
  activePath,
  defaultExpanded = false
}: {
  node: FileTreeStructure;
  onSelectFile: (path: string) => void;
  activePath: string | null;
  defaultExpanded?: boolean;
}) {
  const [expanded, setExpanded] = useState(defaultExpanded);

  // Auto-expand if activePath is inside this folder
  useEffect(() => {
    if (activePath && activePath.startsWith(node.path + "/")) {
      setExpanded(true);
    }
  }, [activePath, node.path]);

  const isFile = node.type === "blob";
  const isActive = activePath === node.path;

  if (node.name === "root") {
    return (
      <div className="space-y-0.5">
        {Object.values(node.children)
          .sort((a, b) => {
            if (a.type === "tree" && b.type === "blob") return -1;
            if (a.type === "blob" && b.type === "tree") return 1;
            return a.name.localeCompare(b.name);
          })
          .map(child => (
            <TreeNode
              key={child.path}
              node={child}
              onSelectFile={onSelectFile}
              activePath={activePath}
              defaultExpanded={defaultExpanded}
            />
          ))}
      </div>
    );
  }

  return (
    <div className="pl-3.5 select-none">
      <div
        className={`flex items-center py-1 px-2 rounded-md cursor-pointer text-xs font-medium transition-colors ${
          isActive
            ? "bg-indigo-50 text-indigo-700 font-semibold"
            : "hover:bg-slate-100 text-slate-700"
        }`}
        onClick={() => {
          if (isFile) {
            onSelectFile(node.path);
          } else {
            setExpanded(!expanded);
          }
        }}
      >
        {!isFile ? (
          <span className="w-3.5 h-3.5 mr-1 text-slate-400 flex items-center justify-center">
            {expanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
          </span>
        ) : (
          <span className="w-3.5 h-3.5 mr-1 inline-block" />
        )}

        {!isFile ? (
          expanded ? (
            <FolderOpen className="w-4 h-4 mr-1.5 text-indigo-500 shrink-0" />
          ) : (
            <Folder className="w-4 h-4 mr-1.5 text-slate-400 shrink-0" />
          )
        ) : (
          getFileIcon(node.name, isActive)
        )}

        <span className="truncate">{node.name}</span>
      </div>

      {!isFile && expanded && (
        <div className="border-l border-slate-200 ml-2">
          {Object.values(node.children)
            .sort((a, b) => {
              if (a.type === "tree" && b.type === "blob") return -1;
              if (a.type === "blob" && b.type === "tree") return 1;
              return a.name.localeCompare(b.name);
            })
            .map(child => (
              <TreeNode
                key={child.path}
                node={child}
                onSelectFile={onSelectFile}
                activePath={activePath}
                defaultExpanded={defaultExpanded}
              />
            ))}
        </div>
      )}
    </div>
  );
}

export function Repository() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const [activeTab, setActiveTab] = useState<"code" | "prs">(
    (searchParams.get("tab") as "code" | "prs") || "code"
  );

  const [searchQuery, setSearchQuery] = useState("");
  const [copied, setCopied] = useState(false);

  const validId = id && id !== "undefined" && id !== "null" ? id : null;
  const visualizerUrl = validId ? `/repository/${validId}/visualizer` : "/repository/visualizer";

  // Sync state to URL if changed by clicking buttons
  useEffect(() => {
    if (activeTab === "prs") {
      setSearchParams({ tab: "prs" });
    } else {
      setSearchParams({});
    }
  }, [activeTab, setSearchParams]);

  // Sync URL to state if URL changes (e.g. clicking sidebar links)
  useEffect(() => {
    const tab = searchParams.get("tab");
    if (tab === "prs" || tab === "code") {
      setActiveTab(tab);
    } else {
      setActiveTab("code");
    }
  }, [searchParams]);

  const [repoInfo, setRepoInfo] = useState<RepoInfo | null>(null);
  const [rawTree, setRawTree] = useState<GitTreeNode[]>([]);
  const [pullRequests, setPullRequests] = useState<any[]>([]);

  const [activeFile, setActiveFile] = useState<string | null>(null);
  const [fileContent, setFileContent] = useState<string>("");

  const [loading, setLoading] = useState(true);
  const [contentLoading, setContentLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Auto-discover repository if accessed without :id
  useEffect(() => {
    if (id && id !== "undefined" && id !== "null") return;

    async function fetchDefaultRepo() {
      try {
        const res = await fetch(`${API_BASE_URL}/api/repositories`, { credentials: "include" });
        if (res.ok) {
          const data = await res.json();
          const repos = data.repositories || [];
          const readyRepo =
            repos.find((r: any) => r.indexing?.status === "ready" && r.indexing?.repositoryId) ||
            repos.find((r: any) => r.indexing?.repositoryId) ||
            repos[0];

          if (readyRepo) {
            const targetId = readyRepo.indexing?.repositoryId || readyRepo.github?.fullName || readyRepo.github?.id;
            if (targetId) {
              navigate(`/repository/${targetId}`, { replace: true });
              return;
            }
          }
        }
      } catch (e) {
        console.warn("Failed to auto-load default repository:", e);
      }
      setLoading(false);
    }

    fetchDefaultRepo();
  }, [id, navigate]);

  const fetchRepoData = async () => {
    if (!id || id === "undefined" || id === "null") return;

    setLoading(true);
    setError(null);
    try {
      // 1. Fetch Repo Info
      const infoRes = await fetch(`${API_BASE_URL}/api/repositories/${id}`, {
        credentials: "include"
      });
      if (!infoRes.ok) throw new Error("Failed to fetch repository metadata");
      const infoData = await infoRes.json();
      setRepoInfo(infoData.repository.github);

      // 2. Fetch Tree
      const treeRes = await fetch(`${API_BASE_URL}/api/repositories/${id}/tree`, {
        credentials: "include"
      });
      if (!treeRes.ok) throw new Error("Failed to fetch repository file tree");
      const treeData = await treeRes.json();
      const nodes: GitTreeNode[] = Array.isArray(treeData.tree) ? treeData.tree : [];
      setRawTree(nodes);

      // Auto-select first meaningful file (README.md, package.json, or first blob)
      const preferredFile =
        nodes.find(n => n.type === "blob" && n.path.toLowerCase() === "readme.md") ||
        nodes.find(n => n.type === "blob" && n.path.toLowerCase().endsWith("package.json")) ||
        nodes.find(n => n.type === "blob");

      if (preferredFile) {
        handleSelectFile(preferredFile.path);
      }

      // 3. Fetch PRs
      const prRes = await fetch(`${API_BASE_URL}/api/repositories/${id}/pulls?state=open`, {
        credentials: "include"
      });
      if (prRes.ok) {
        const prData = await prRes.json();
        const pulls = Array.isArray(prData.pulls) ? prData.pulls : [];
        setPullRequests(pulls);
      }

    } catch (err: any) {
      setError(err.message || "Failed to load repository data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (id && id !== "undefined" && id !== "null") {
      fetchRepoData();
    }
  }, [id]);

  const handleSelectFile = async (path: string) => {
    setActiveFile(path);
    setContentLoading(true);
    setFileContent("");

    try {
      const res = await fetch(
        `${API_BASE_URL}/api/repositories/${id}/contents?path=${encodeURIComponent(path)}`,
        { credentials: "include" }
      );
      if (!res.ok) throw new Error("Failed to load file contents");

      const data = await res.json();
      let content = data.content || "";
      if (data.encoding === "base64" && typeof content === "string" && !content.includes("\n") && content.length > 0) {
        try {
          content = atob(content);
        } catch (e) {}
      }
      setFileContent(content);
    } catch (err: any) {
      setFileContent(`// Error loading file: ${path}\n// ${err.message}`);
    } finally {
      setContentLoading(false);
    }
  };

  const fileTree = useMemo(() => {
    return buildTree(rawTree, searchQuery);
  }, [rawTree, searchQuery]);

  const handleCopyCode = () => {
    if (!fileContent) return;
    navigator.clipboard.writeText(fileContent);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const lineCount = useMemo(() => {
    if (!fileContent) return 0;
    return fileContent.split("\n").length;
  }, [fileContent]);

  if (!id || id === "undefined" || id === "null") {
    return (
      <div className="flex flex-col items-center justify-center py-24 space-y-4">
        <Folder className="w-12 h-12 text-slate-300" />
        <h2 className="text-xl font-semibold text-slate-700">No Repository Selected</h2>
        <p className="text-slate-500">Please select a repository from the dashboard to inspect its live codebase.</p>
        <Link to="/dashboard">
          <Button>Go to Dashboard</Button>
        </Link>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 space-y-4">
        <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-slate-600 font-medium">Synchronizing repository tree and metadata...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-rose-50 border border-rose-200 p-8 rounded-2xl flex flex-col items-center space-y-4 text-center max-w-lg mx-auto mt-12 shadow-sm">
        <AlertCircle className="w-10 h-10 text-rose-500" />
        <div>
          <h3 className="text-lg font-bold text-rose-900">Connection Failed</h3>
          <p className="text-rose-600 text-sm mt-1">{error}</p>
        </div>
        <Button onClick={fetchRepoData} className="flex items-center space-x-2 bg-rose-600 hover:bg-rose-700 text-white">
          <RefreshCw className="w-4 h-4" />
          <span>Retry Connection</span>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-white p-6 rounded-2xl border border-slate-200 shadow-sm gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
            {repoInfo?.fullName || "Repository"}
            <Badge variant="outline" className="ml-2 capitalize text-xs">
              {repoInfo?.visibility || "Public"}
            </Badge>
          </h1>
          <p className="text-slate-500 text-sm mt-1">Live synchronized codebase and architecture viewer.</p>
        </div>

        <div className="flex items-center space-x-3">
          <Link
            to={visualizerUrl}
            className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium flex items-center space-x-2 shadow-sm transition-colors"
          >
            <Network className="w-4 h-4" />
            <span>Architecture Visualizer</span>
          </Link>

          <div className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-medium text-slate-700 flex items-center space-x-2">
            <GitBranch className="w-4 h-4 text-slate-400" />
            <span>{repoInfo?.defaultBranch || "main"}</span>
          </div>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="flex space-x-1 border-b border-slate-200">
        <button
          onClick={() => setActiveTab("code")}
          className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors cursor-pointer ${
            activeTab === "code"
              ? "border-indigo-600 text-indigo-600 font-semibold"
              : "border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300"
          }`}
        >
          <div className="flex items-center">
            <FileCode className="w-4 h-4 mr-2" /> Code Explorer
          </div>
        </button>
        <button
          onClick={() => setActiveTab("prs")}
          className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors flex items-center cursor-pointer ${
            activeTab === "prs"
              ? "border-indigo-600 text-indigo-600 font-semibold"
              : "border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300"
          }`}
        >
          <div className="flex items-center">
            <GitPullRequest className="w-4 h-4 mr-2" /> Pull Requests
            {pullRequests.length > 0 && (
              <span className="ml-2 bg-indigo-100 text-indigo-700 py-0.5 px-2 rounded-full text-xs font-semibold">
                {pullRequests.length}
              </span>
            )}
          </div>
        </button>
      </div>

      {/* Active Tab Content */}
      {activeTab === "code" ? (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* File Tree Sidebar */}
          <Card className="col-span-1 h-[700px] flex flex-col shadow-sm border-slate-200">
            <CardHeader className="py-3.5 px-3 border-b border-slate-100 bg-slate-50/70">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Find files..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-8 pr-4 py-1.5 bg-white border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-sm"
                />
              </div>
            </CardHeader>
            <CardContent className="p-2 flex-1 overflow-auto bg-white">
              {rawTree.length > 0 ? (
                <TreeNode
                  node={fileTree}
                  onSelectFile={handleSelectFile}
                  activePath={activeFile}
                  defaultExpanded={Boolean(searchQuery)}
                />
              ) : (
                <p className="text-xs text-slate-500 p-4 text-center">No files found.</p>
              )}
            </CardContent>
          </Card>

          {/* Code Viewer / Editor Screen */}
          <div className="col-span-1 lg:col-span-3 flex flex-col space-y-6">
            <Card className="h-[700px] flex flex-col overflow-hidden shadow-sm border-slate-200">
              <CardHeader className="py-2.5 px-4 bg-slate-900 border-b border-slate-800 flex flex-row items-center justify-between space-y-0 text-slate-200">
                <div className="flex items-center space-x-2 text-xs">
                  <span className="font-semibold text-white truncate max-w-[400px]">
                    {activeFile || "Select a file to view"}
                  </span>
                  {activeFile && (
                    <span className="text-slate-400 text-[11px] bg-slate-800 px-2 py-0.5 rounded">
                      {lineCount} lines
                    </span>
                  )}
                </div>

                {activeFile && (
                  <div className="flex items-center space-x-3">
                    <span className="hidden sm:flex items-center text-[11px] text-emerald-400 font-medium">
                      <GitCommit className="w-3 h-3 mr-1" /> Synchronized
                    </span>
                    <button
                      onClick={handleCopyCode}
                      className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded text-xs flex items-center space-x-1.5 transition-colors cursor-pointer"
                      title="Copy code"
                    >
                      {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copied ? "Copied" : "Copy"}</span>
                    </button>
                  </div>
                )}
              </CardHeader>

              <CardContent className="p-0 flex-1 bg-[#0d1117] overflow-auto">
                {contentLoading ? (
                  <div className="h-full flex items-center justify-center">
                    <div className="w-6 h-6 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin"></div>
                  </div>
                ) : activeFile ? (
                  <div className="flex font-mono text-[13px] leading-relaxed text-slate-200 min-h-full">
                    {/* Line Numbers Column */}
                    <div className="py-4 px-3 select-none text-right text-slate-600 bg-[#090d13] border-r border-slate-800/80 font-mono text-xs">
                      {fileContent.split("\n").map((_, i) => (
                        <div key={i} className="leading-relaxed">{i + 1}</div>
                      ))}
                    </div>
                    {/* Code Content */}
                    <pre className="py-4 px-5 overflow-x-auto flex-1 font-mono text-[13px] leading-relaxed text-slate-100">
                      <code>{fileContent}</code>
                    </pre>
                  </div>
                ) : (
                  <div className="h-full flex flex-col items-center justify-center text-slate-400 space-y-3">
                    <FileCode className="w-12 h-12 text-slate-600" />
                    <p className="text-sm">Select a file from the sidebar to inspect the source code.</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      ) : (
        /* Pull Requests Tab */
        <div className="space-y-4">
          <Card className="border-slate-200">
            <CardHeader className="py-4 border-b border-slate-100 bg-slate-50/50">
              <h2 className="text-lg font-semibold text-slate-900">Open Pull Requests</h2>
            </CardHeader>
            <CardContent className="p-0">
              {pullRequests.length === 0 ? (
                <div className="p-12 text-center text-slate-500">
                  <GitPullRequest className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                  <p className="font-medium">No open pull requests found for this repository.</p>
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {pullRequests.map((pr: any) => (
                    <div key={pr.id} className="p-4 hover:bg-slate-50 transition-colors flex justify-between items-center">
                      <div>
                        <Link
                          to={`/repository/${id}/pr/${pr.number}`}
                          className="text-base font-medium text-slate-900 hover:text-indigo-600 hover:underline"
                        >
                          {pr.title || `Pull Request #${pr.number}`}
                        </Link>
                        <div className="flex items-center text-xs text-slate-500 mt-1 space-x-2">
                          <span className="text-indigo-600 font-semibold">#{pr.number}</span>
                          <span>opened by {pr.user?.login || "author"}</span>
                          {pr.head?.ref && (
                            <span className="bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded text-[11px]">
                              {pr.head.ref} &rarr; {pr.base?.ref || "main"}
                            </span>
                          )}
                        </div>
                      </div>
                      <div>
                        <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 capitalize">
                          {pr.state || "Open"}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
