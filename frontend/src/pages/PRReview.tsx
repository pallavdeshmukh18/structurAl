import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { Card, CardHeader, CardTitle, CardContent } from "../components/ui/Card";
import { Badge } from "../components/ui/Badge";
import { Button } from "../components/ui/Button";
import { GitPullRequest, GitMerge, MessageSquare, AlertTriangle, CheckCircle2, ArrowLeft, Loader2 } from "lucide-react";
import { useAuth } from "../context/AuthContext";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:5001";

export function PRReview() {
  const { repoId, prNumber } = useParams<{ repoId: string; prNumber: string }>();
  const { user } = useAuth();

  const [pullRequest, setPullRequest] = useState<any>(null);
  const [files, setFiles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!repoId || !prNumber || !user) return;

    async function fetchPRData() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`${API_BASE_URL}/api/repositories/${repoId}/pulls/${prNumber}`, {
          credentials: "include"
        });
        
        if (!res.ok) {
          throw new Error("Failed to fetch pull request details");
        }
        
        const data = await res.json();
        
        // Ensure pullRequest is present
        if (!data.pullRequest) {
          throw new Error("Pull request data is missing from the server response.");
        }
        
        setPullRequest(data.pullRequest);
        
        // Safely set files to an array
        const safeFiles = Array.isArray(data.files) ? data.files : [];
        setFiles(safeFiles);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    fetchPRData();
  }, [repoId, prNumber, user]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 space-y-4">
        <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
        <p className="text-slate-500">Loading Pull Request data from GitHub...</p>
      </div>
    );
  }

  if (error || !pullRequest) {
    return (
      <div className="bg-rose-50 border border-rose-200 p-6 rounded-xl flex flex-col items-center space-y-4 text-center max-w-2xl mx-auto mt-12">
        <AlertTriangle className="w-8 h-8 text-rose-500" />
        <div>
          <h3 className="font-semibold text-rose-800">Failed to load Pull Request</h3>
          <p className="text-rose-600 text-sm">{error || "Pull request not found"}</p>
        </div>
        <Link to={`/repository/${repoId}`}>
          <Button variant="outline">Back to Repository</Button>
        </Link>
      </div>
    );
  }

  // Safely compute additions and deletions
  const safeFiles = Array.isArray(files) ? files : [];
  const additions = safeFiles.reduce((sum, f) => sum + (f?.additions || 0), 0);
  const deletions = safeFiles.reduce((sum, f) => sum + (f?.deletions || 0), 0);

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <Link to={`/repository/${repoId}`} className="inline-flex items-center text-sm font-medium text-slate-500 hover:text-indigo-600 transition-colors">
        <ArrowLeft className="w-4 h-4 mr-1" /> Back to Repository
      </Link>

      <div className="flex flex-col space-y-4 md:flex-row md:items-start md:justify-between md:space-y-0">
        <div>
          <div className="flex items-center space-x-3 mb-2">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">{pullRequest.title}</h1>
            <span className="text-2xl text-slate-400 font-light">#{pullRequest.number}</span>
          </div>
          <div className="flex items-center space-x-3 text-sm">
            {pullRequest.state === "open" ? (
              <Badge variant="success" className="bg-emerald-100 text-emerald-700 border-emerald-200">
                <GitPullRequest className="w-3 h-3 mr-1" /> Open
              </Badge>
            ) : pullRequest.merged_at ? (
              <Badge className="bg-purple-100 text-purple-700 border-purple-200">
                <GitMerge className="w-3 h-3 mr-1" /> Merged
              </Badge>
            ) : (
              <Badge variant="error" className="bg-rose-100 text-rose-700 border-rose-200">
                Closed
              </Badge>
            )}
            
            <span className="text-slate-600">
              <span className="font-medium text-slate-900">{pullRequest.user?.login}</span> wants to merge into{" "}
              <span className="font-mono bg-slate-100 px-1 py-0.5 rounded">{pullRequest.base?.ref}</span> from{" "}
              <span className="font-mono bg-slate-100 px-1 py-0.5 rounded">{pullRequest.head?.ref}</span>
            </span>
          </div>
        </div>
        <div className="flex space-x-3">
          <a href={pullRequest.html_url} target="_blank" rel="noopener noreferrer">
            <Button variant="outline" className="text-slate-700">View on GitHub</Button>
          </a>
          <Button variant="primary" className="bg-emerald-600 hover:bg-emerald-700" disabled={pullRequest.state !== "open"}>
            <GitMerge className="w-4 h-4 mr-2" /> Merge Pull Request
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 space-y-6">
          
          {/* AI Review Mock */}
          <Card>
            <CardHeader className="py-4 border-b border-slate-100 bg-slate-50/50">
              <CardTitle className="text-base flex items-center">
                <MessageSquare className="w-4 h-4 mr-2 text-indigo-500" />
                StructurAI Review Summary
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4 space-y-4">
              <p className="text-sm text-slate-600 italic">
                (AI Code Review pipeline is currently disabled. Displaying placeholder findings.)
              </p>
              <div className="space-y-3">
                <div className="flex p-3 rounded-lg bg-rose-50 border border-rose-100">
                  <AlertTriangle className="w-5 h-5 text-rose-500 mt-0.5 mr-3 flex-shrink-0" />
                  <div>
                    <h4 className="text-sm font-medium text-rose-900">Potential Regression</h4>
                    <p className="text-xs text-rose-700 mt-1">Make sure you have tested these changes thoroughly. This modifies a critical path.</p>
                  </div>
                </div>
                <div className="flex p-3 rounded-lg bg-emerald-50 border border-emerald-100">
                  <CheckCircle2 className="w-5 h-5 text-emerald-500 mt-0.5 mr-3 flex-shrink-0" />
                  <div>
                    <h4 className="text-sm font-medium text-emerald-900">Good Code Structure</h4>
                    <p className="text-xs text-emerald-700 mt-1">The changes are well-encapsulated and easy to read.</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Actual Diff Viewer */}
          {safeFiles.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center text-slate-500">
                <p>No code changes found in this pull request.</p>
              </CardContent>
            </Card>
          ) : (
            safeFiles.map((file, index) => (
              <Card key={file?.filename || index}>
                <CardHeader className="py-3 px-4 bg-slate-50 border-b border-slate-200 flex flex-row items-center justify-between space-y-0">
                  <span className="font-medium text-sm text-slate-900">{file?.filename || "Unknown file"}</span>
                  <div className="text-xs text-slate-500 flex space-x-3">
                    <span className="text-emerald-600">+{file?.additions || 0} additions</span>
                    <span className="text-rose-600">-{file?.deletions || 0} deletions</span>
                  </div>
                </CardHeader>
              <CardContent className="p-0 font-mono text-xs overflow-x-auto">
                <div className="bg-white min-w-full">
                  {file.patch ? (
                    file.patch.split('\n').map((line: string, i: number) => {
                      const isAddition = line.startsWith('+');
                      const isDeletion = line.startsWith('-');
                      const isHeader = line.startsWith('@@');
                      
                      let bgClass = "hover:bg-slate-50";
                      let textClass = "text-slate-700";
                      
                      if (isAddition) {
                        bgClass = "bg-emerald-50/50 hover:bg-emerald-50 text-emerald-900";
                        textClass = "text-emerald-900";
                      } else if (isDeletion) {
                        bgClass = "bg-rose-50/50 hover:bg-rose-50 text-rose-900";
                        textClass = "text-rose-900";
                      } else if (isHeader) {
                        bgClass = "bg-slate-100/50 text-slate-500";
                        textClass = "text-slate-500";
                      }

                      return (
                        <div key={i} className={`flex ${bgClass}`}>
                          <div className={`py-1 px-4 whitespace-pre ${textClass}`}>
                            {line}
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="p-4 text-center text-slate-500 italic">Binary file or diff too large to display.</div>
                  )}
                </div>
              </CardContent>
            </Card>
            ))
          )}
        </div>

        <div className="md:col-span-1 space-y-6">
          <Card>
            <CardHeader className="py-4 border-b border-slate-100">
              <CardTitle className="text-base">StructurAI Metrics</CardTitle>
            </CardHeader>
            <CardContent className="pt-4 space-y-4">
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-slate-600">Files Changed</span>
                  <span className="font-medium text-slate-900">{safeFiles.length}</span>
                </div>
              </div>
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-slate-600">Additions</span>
                  <span className="font-medium text-emerald-600">+{additions}</span>
                </div>
              </div>
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-slate-600">Deletions</span>
                  <span className="font-medium text-rose-600">-{deletions}</span>
                </div>
              </div>
              <div className="pt-2">
                <Badge variant="outline" className="w-full justify-center py-1.5 border-emerald-200 bg-emerald-50 text-emerald-700">
                  <CheckCircle2 className="w-3 h-3 mr-1" /> Safe to Merge
                </Badge>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
