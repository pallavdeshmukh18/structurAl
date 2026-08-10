import { useState, useEffect } from "react";
import { useParams, Link, useSearchParams } from "react-router-dom";
import { Card, CardHeader, CardContent } from "../components/ui/Card";
import { Badge } from "../components/ui/Badge";
import { Button } from "../components/ui/Button";
import { Folder, FileCode, GitCommit, Search, GitBranch, AlertCircle, ChevronRight, ChevronDown, GitPullRequest } from "lucide-react";
import { useAuth } from "../context/AuthContext";

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

function buildTree(nodes: GitTreeNode[]): FileTreeStructure {
  const root: FileTreeStructure = { name: "root", path: "", type: "tree", children: {} };
  
  nodes.forEach(node => {
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
  activePath 
}: { 
  node: FileTreeStructure; 
  onSelectFile: (path: string) => void;
  activePath: string | null;
}) {
  const [expanded, setExpanded] = useState(false);
  
  const isFile = node.type === "blob";
  const isActive = activePath === node.path;
  
  if (node.name === "root") {
    return (
      <div className="space-y-1">
        {Object.values(node.children)
          .sort((a, b) => {
            // Folders first
            if (a.type === "tree" && b.type === "blob") return -1;
            if (a.type === "blob" && b.type === "tree") return 1;
            return a.name.localeCompare(b.name);
          })
          .map(child => (
          <TreeNode key={child.path} node={child} onSelectFile={onSelectFile} activePath={activePath} />
        ))}
      </div>
    );
  }

  return (
    <div className="pl-4">
      <div 
        className={`flex items-center p-1.5 rounded cursor-pointer transition-colors ${
          isActive ? "bg-indigo-50 text-indigo-700" : "hover:bg-slate-100 text-slate-700"
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
          <span className="w-4 h-4 mr-1 text-slate-400">
            {expanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
          </span>
        ) : (
          <span className="w-4 h-4 mr-1 inline-block" />
        )}
        
        {!isFile ? (
           <Folder className={`w-4 h-4 mr-2 ${expanded ? 'text-indigo-400' : 'text-slate-400'}`} fill="currentColor" />
        ) : (
           <FileCode className={`w-4 h-4 mr-2 ${isActive ? 'text-indigo-500' : 'text-slate-400'}`} />
        )}
        
        <span className={`font-medium text-sm truncate ${isActive ? 'font-semibold' : ''}`}>
          {node.name}
        </span>
      </div>
      
      {!isFile && expanded && (
        <div className="border-l border-slate-100 ml-2">
          {Object.values(node.children)
            .sort((a, b) => {
              if (a.type === "tree" && b.type === "blob") return -1;
              if (a.type === "blob" && b.type === "tree") return 1;
              return a.name.localeCompare(b.name);
            })
            .map(child => (
            <TreeNode key={child.path} node={child} onSelectFile={onSelectFile} activePath={activePath} />
          ))}
        </div>
      )}
    </div>
  );
}

export function Repository() {
  const { id } = useParams<{ id: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user } = useAuth();
  
  const [activeTab, setActiveTab] = useState<"code" | "prs">(
    (searchParams.get("tab") as "code" | "prs") || "code"
  );

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
  const [fileTree, setFileTree] = useState<FileTreeStructure | null>(null);
  const [pullRequests, setPullRequests] = useState<any[]>([]);
  
  const [activeFile, setActiveFile] = useState<string | null>(null);
  const [fileContent, setFileContent] = useState<string>("");
  
  const [loading, setLoading] = useState(!!id);
  const [contentLoading, setContentLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id || !user) return;
    
    async function fetchRepoData() {
      setLoading(true);
      setError(null);
      try {
        // Fetch Repo Info
        const infoRes = await fetch(`${API_BASE_URL}/api/repositories/${id}`, {
          credentials: "include"
        });
        if (!infoRes.ok) throw new Error("Failed to fetch repository metadata");
        const infoData = await infoRes.json();
        setRepoInfo(infoData.repository.github);
        
        // Fetch Tree
        const treeRes = await fetch(`${API_BASE_URL}/api/repositories/${id}/tree`, {
          credentials: "include"
        });
        if (!treeRes.ok) throw new Error("Failed to fetch repository file tree");
        const treeData = await treeRes.json();
        
        const structuredTree = buildTree(treeData.tree);
        setFileTree(structuredTree);
        
        
        // Fetch PRs
        const prRes = await fetch(`${API_BASE_URL}/api/repositories/${id}/pulls?state=open`, {
          credentials: "include"
        });
        if (prRes.ok) {
          const prData = await prRes.json();
          const pulls = Array.isArray(prData.pulls) ? prData.pulls : [];
          setPullRequests(pulls);
        }
        
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    
    fetchRepoData();
  }, [id, user]);
  
  const handleSelectFile = async (path: string) => {
    setActiveFile(path);
    setContentLoading(true);
    setFileContent("");
    
    try {
      const res = await fetch(`${API_BASE_URL}/api/repositories/${id}/contents?path=${encodeURIComponent(path)}`, {
        credentials: "include"
      });
      if (!res.ok) throw new Error("Failed to load file contents");
      
      const data = await res.json();
      setFileContent(data.content || "");
    } catch (err: any) {
      setFileContent(`// Error loading file:\n// ${err.message}`);
    } finally {
      setContentLoading(false);
    }
  };

  if (!id) {
    return (
      <div className="flex flex-col items-center justify-center py-24 space-y-4">
        <Folder className="w-12 h-12 text-slate-300" />
        <h2 className="text-xl font-semibold text-slate-700">No Repository Selected</h2>
        <p className="text-slate-500">Please select a repository from the dashboard to view its code and PRs.</p>
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
        <p className="text-slate-500">Connecting to GitHub...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-rose-50 border border-rose-200 p-6 rounded-xl flex flex-col items-center space-y-4 text-center">
        <AlertCircle className="w-8 h-8 text-rose-500" />
        <div>
          <h3 className="font-semibold text-rose-800">Connection Failed</h3>
          <p className="text-rose-600 text-sm">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
            {repoInfo?.fullName || "Repository"}
            <Badge variant="outline" className="ml-2 capitalize">{repoInfo?.visibility || "Public"}</Badge>
          </h1>
          <p className="text-slate-500 mt-1">Live synchronized codebase view.</p>
        </div>
        <div className="flex space-x-3">
          <div className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-sm font-medium text-slate-700 flex items-center space-x-2">
            <GitBranch className="w-4 h-4 text-slate-400" />
            <span>{repoInfo?.defaultBranch || "main"}</span>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex space-x-1 border-b border-slate-200">
        <button
          onClick={() => setActiveTab("code")}
          className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
            activeTab === "code" 
              ? "border-indigo-600 text-indigo-600" 
              : "border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300"
          }`}
        >
          <div className="flex items-center">
            <FileCode className="w-4 h-4 mr-2" /> Code
          </div>
        </button>
        <button
          onClick={() => setActiveTab("prs")}
          className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors flex items-center ${
            activeTab === "prs" 
              ? "border-indigo-600 text-indigo-600" 
              : "border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300"
          }`}
        >
          <div className="flex items-center">
            <GitPullRequest className="w-4 h-4 mr-2" /> Pull Requests
            {pullRequests.length > 0 && (
              <span className="ml-2 bg-indigo-100 text-indigo-700 py-0.5 px-2 rounded-full text-xs">
                {pullRequests.length}
              </span>
            )}
          </div>
        </button>
      </div>

      {activeTab === "code" ? (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* File Tree Sidebar */}
        <Card className="col-span-1 h-[650px] flex flex-col shadow-sm">
          <CardHeader className="py-4 border-b border-slate-100 bg-slate-50/50">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input 
                type="text" 
                placeholder="Find file..." 
                className="w-full pl-8 pr-4 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500 shadow-sm transition-shadow"
              />
            </div>
          </CardHeader>
          <CardContent className="p-2 flex-1 overflow-auto bg-white -ml-2">
            {fileTree ? (
              <TreeNode node={fileTree} onSelectFile={handleSelectFile} activePath={activeFile} />
            ) : (
              <p className="text-sm text-slate-500 p-4 text-center">No files found.</p>
            )}
          </CardContent>
        </Card>

        {/* Code Viewer / Main Content */}
        <div className="col-span-1 lg:col-span-3 flex flex-col space-y-6">
          <Card className="flex-1 flex flex-col overflow-hidden shadow-sm">
            <CardHeader className="py-3 px-4 bg-slate-50/80 border-b border-slate-200 flex flex-row items-center justify-between space-y-0 backdrop-blur-sm">
              <div className="flex items-center space-x-2 text-sm text-slate-600">
                <span className="font-semibold text-slate-900 truncate max-w-[400px]">
                  {activeFile || "Select a file to view"}
                </span>
              </div>
              {activeFile && (
                <div className="flex items-center text-xs text-slate-500 space-x-4">
                  <span className="flex items-center text-emerald-600 font-medium">
                    <GitCommit className="w-3 h-3 mr-1" /> Live from GitHub
                  </span>
                </div>
              )}
            </CardHeader>
            <CardContent className="p-0 flex-1 bg-[#1e2012] overflow-auto">
              {contentLoading ? (
                <div className="h-full flex items-center justify-center">
                   <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
                </div>
              ) : activeFile ? (
                <pre className="p-6 text-slate-300 font-mono text-[13px] leading-relaxed">
                  <code>{fileContent}</code>
                </pre>
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-slate-500 space-y-3">
                  <FileCode className="w-12 h-12 text-slate-400 opacity-50" />
                  <p>Select a file from the sidebar to inspect the source code.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
      ) : (
        <div className="space-y-4">
          <Card>
            <CardHeader className="py-4 border-b border-slate-100 bg-slate-50/50">
              <h2 className="text-lg font-semibold text-slate-900">Open Pull Requests</h2>
            </CardHeader>
            <CardContent className="p-0">
              {pullRequests.length === 0 ? (
                <div className="p-8 text-center text-slate-500">
                  <GitPullRequest className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                  <p>No open pull requests found for this repository.</p>
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {pullRequests.map((pr: any) => (
                    <div key={pr.id} className="p-4 hover:bg-slate-50 transition-colors flex justify-between items-center">
                      <div>
                        <Link to={`/repository/${id}/pr/${pr.number}`} className="text-base font-medium text-slate-900 hover:text-indigo-600 hover:underline">
                          {pr.title || `Pull Request #${pr.number}`}
                        </Link>
                        <div className="flex items-center text-xs text-slate-500 mt-1 space-x-2">
                          <span className="text-emerald-600 font-medium">#{pr.number}</span>
                          <span>opened by {pr.user?.login}</span>
                        </div>
                      </div>
                      <div>
                        <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200">Open</Badge>
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
