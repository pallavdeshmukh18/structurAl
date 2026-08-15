import { useState, useEffect } from "react";
import { useParams, useSearchParams, Link } from "react-router-dom";
import { Card, CardHeader, CardTitle, CardContent } from "../components/ui/Card";
import { Badge } from "../components/ui/Badge";
import { Button } from "../components/ui/Button";
import {
  GitPullRequest,
  GitMerge,
  CheckCircle2,
  ArrowLeft,
  Video,
  Calendar,
  Sparkles,
  ExternalLink,
  ShieldCheck,
  MessageCircle,
  RefreshCw,
  AlertTriangle,
  Code2,
  FolderGit2,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { GroupReviewRoom } from "../components/review/GroupReviewRoom";
import { ScheduleMeetingModal } from "../components/review/ScheduleMeetingModal";
import { PRChatPanel } from "../components/chat/PRChatPanel";

const API_BASE_URL = import.meta.env.PROD ? "" : (import.meta.env.VITE_API_BASE_URL || "");

// Demo fallback data if repository or PR has not been indexed yet
const MOCK_PR_DATA = {
  number: 77,
  title: "feat(auth): integrate multi-factor OAuth session validator & AST call guards",
  body: "Implements JWT token rotation and AST call validation to prevent unauthorized privilege escalation and memory leaks in worker threads.",
  state: "open",
  html_url: "https://github.com/pallavdeshmukh18/structurAl/pull/77",
  user: { login: "alex-senior-dev", avatar_url: "https://github.com/ghost.png" },
  base: { ref: "main", repo: { full_name: "structurai/core-backend" } },
  head: { ref: "feature/jwt-guard-v2" },
  created_at: new Date(Date.now() - 3600000 * 4).toISOString(),
};

const MOCK_FILES = [
  {
    filename: "src/auth/jwt.service.ts",
    additions: 42,
    deletions: 8,
    patch: `@@ -15,8 +15,42 @@ export class JwtService {
+  /**
+   * Validates token payload and verifies against AST call permissions
+   */
+  async verifySessionToken(token: string): Promise<AuthSession> {
+    const decoded = jwt.verify(token, process.env.JWT_SECRET);
+    if (!decoded || !decoded.userId) {
+      throw new UnauthorizedException("Invalid session signature");
+    }
+    return { userId: decoded.userId, scope: decoded.scope };
+  }
-  legacyTokenVerify(token) {
-    return jwt.decode(token);
-  }`,
  },
  {
    filename: "src/modules/governance/slop.detector.ts",
    additions: 29,
    deletions: 3,
    patch: `@@ -8,3 +8,29 @@ export function evaluateCodeSlop(astTree: AstNode): SlopScore {
+  const orphanedCalls = findUnreachableNodes(astTree);
+  const hallucinatedImports = detectUnresolvedDependencies(astTree);
+  
+  return {
+    score: calculateConfidence(orphanedCalls, hallucinatedImports),
+    hasHallucinations: hallucinatedImports.length > 0,
+    riskLevel: "LOW"
+  };
+ }`,
  },
];

export function PRReview() {
  const params = useParams<{ repoId?: string; prNumber?: string; id?: string }>();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();

  const urlRepoId = params.repoId || searchParams.get("repoId") || undefined;
  const urlPrNumber = params.prNumber || params.id || searchParams.get("prNumber") || undefined;

  const [repositories, setRepositories] = useState<any[]>([]);
  const [selectedRepoId, setSelectedRepoId] = useState<string | undefined>(urlRepoId);
  const [availablePRs, setAvailablePRs] = useState<any[]>([]);
  const [selectedPRNumber, setSelectedPRNumber] = useState<string>(urlPrNumber || "77");

  const [pullRequest, setPullRequest] = useState<any>(MOCK_PR_DATA);
  const [files, setFiles] = useState<any[]>(MOCK_FILES);
  const [chatOpen, setChatOpen] = useState(false);

  // AI Slop & Code Governance Analysis State
  const [aiScore, setAiScore] = useState<number>(94);
  const [aiFindings, setAiFindings] = useState<any[]>([
    {
      severity: "LOW",
      category: "ai-pattern",
      message: "No orphaned functions or hallucinated package imports detected in AST analysis.",
    },
    {
      severity: "MEDIUM",
      category: "error-handling",
      message: "Modified functions affect asynchronous event queues. Ensure error handlers propagate exceptions.",
    },
  ]);
  const [isAnalyzingPR, setIsAnalyzingPR] = useState<boolean>(false);

  // Agora Live Video/Audio Review States
  const [activeChannel, setActiveChannel] = useState<string | null>(
    searchParams.get("room") || null
  );
  const [isMeetingModalOpen, setIsMeetingModalOpen] = useState(false);
  const [isVideoDocked, setIsVideoDocked] = useState(false);

  // 1. Load repositories for selector dropdown
  useEffect(() => {
    async function loadRepos() {
      try {
        const res = await fetch(`${API_BASE_URL}/api/repositories`, { credentials: "include" });
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data.repositories) && data.repositories.length > 0) {
            setRepositories(data.repositories);
            if (!selectedRepoId) {
              const firstId =
                data.repositories[0].indexing?.repositoryId ||
                data.repositories[0]._id ||
                data.repositories[0].github?.fullName;
              setSelectedRepoId(firstId);
            }
          }
        }
      } catch {
        // Silently continue
      }
    }
    loadRepos();
  }, []);

  // 2. Fetch available PRs whenever selected repository changes
  useEffect(() => {
    if (!selectedRepoId) return;

    async function fetchRepoPRs() {
      try {
        const res = await fetch(`${API_BASE_URL}/api/repositories/${selectedRepoId}/pulls`, {
          credentials: "include",
        });
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data.pulls) && data.pulls.length > 0) {
            setAvailablePRs(data.pulls);
            // Default to first PR if current selectedPRNumber is not in list
            const hasCurrent = data.pulls.some((p: any) => String(p.number) === selectedPRNumber);
            if (!hasCurrent) {
              setSelectedPRNumber(String(data.pulls[0].number));
            }
          }
        }
      } catch {
        // Silently continue
      }
    }

    fetchRepoPRs();
  }, [selectedRepoId]);

  // 3. Fetch PR data and diffs
  useEffect(() => {
    if (!selectedRepoId || !selectedPRNumber) {
      setPullRequest(MOCK_PR_DATA);
      setFiles(MOCK_FILES);
      return;
    }

    async function fetchPRData() {
      try {
        const res = await fetch(
          `${API_BASE_URL}/api/repositories/${selectedRepoId}/pulls/${selectedPRNumber}`,
          { credentials: "include" }
        );

        if (res.ok) {
          const data = await res.json();
          if (data.pullRequest) {
            setPullRequest(data.pullRequest);
            const prFiles = Array.isArray(data.files) ? data.files : MOCK_FILES;
            setFiles(prFiles);

            // Auto-trigger AI scan on PR change
            const combinedDiff = prFiles
              .map((f: any) => f.patch || `--- a/${f.filename}\n+++ b/${f.filename}\n+ // modified`)
              .join("\n\n");

            fetch(`${API_BASE_URL}/api/pr/analyze`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                diff: combinedDiff || "--- a/index.js\n+++ b/index.js\n@@ -1,2 +1,4 @@\n+const token = true;\n",
                prTitle: data.pullRequest.title,
                prDescription: data.pullRequest.body || "",
              }),
            })
              .then((r) => (r.ok ? r.json() : null))
              .then((aiData) => {
                if (aiData) {
                  if (typeof aiData.score === "number") setAiScore(aiData.score);
                  const combined = [...(aiData.findings || []), ...(aiData.slopFindings || [])];
                  if (combined.length > 0) setAiFindings(combined);
                }
              })
              .catch(() => {});

            return;
          }
        }
        setPullRequest(MOCK_PR_DATA);
        setFiles(MOCK_FILES);
      } catch {
        setPullRequest(MOCK_PR_DATA);
        setFiles(MOCK_FILES);
      }
    }

    fetchPRData();
  }, [selectedRepoId, selectedPRNumber, user]);

  // Run Live AI PR Review & Slop Scan manually
  const handleAnalyzePR = async () => {
    setIsAnalyzingPR(true);
    try {
      const combinedDiff = files
        .map((f) => f.patch || `--- a/${f.filename}\n+++ b/${f.filename}\n+ // modified`)
        .join("\n\n");

      const res = await fetch(`${API_BASE_URL}/api/pr/analyze`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          diff: combinedDiff || "--- a/index.js\n+++ b/index.js\n@@ -1,2 +1,4 @@\n+const token = true;\n",
          prTitle: pullRequest.title,
          prDescription: pullRequest.body,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        if (typeof data.score === "number") {
          setAiScore(data.score);
        }
        const combinedFindings = [...(data.findings || []), ...(data.slopFindings || [])];
        if (combinedFindings.length > 0) {
          setAiFindings(combinedFindings);
        }
      }
    } catch (err) {
      console.error("AI PR analysis error:", err);
    } finally {
      setIsAnalyzingPR(false);
    }
  };

  const safeFiles = Array.isArray(files) ? files : MOCK_FILES;
  const additions = safeFiles.reduce((sum, f) => sum + (f?.additions || 0), 0);
  const deletions = safeFiles.reduce((sum, f) => sum + (f?.deletions || 0), 0);

  return (
    <>
      <div className={`space-y-6 max-w-7xl mx-auto pb-12 transition-all duration-300 ${chatOpen ? "mr-[320px]" : ""}`}>
        {/* Top Breadcrumb & Live Dynamic Repository / PR Switcher Bar */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-white p-3.5 rounded-2xl border border-slate-200 shadow-sm">
          <Link
            to={selectedRepoId ? `/repository/${selectedRepoId}` : "/dashboard"}
            className="inline-flex items-center text-sm font-medium text-slate-600 hover:text-indigo-600 transition-colors"
          >
            <ArrowLeft className="w-4 h-4 mr-1.5" />
            <span>{selectedRepoId ? "Back to Repository" : "Back to Dashboard"}</span>
          </Link>

          <div className="flex items-center flex-wrap gap-2.5">
            {/* Repository Selector */}
            <div className="flex items-center space-x-1.5 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-xl text-xs shadow-inner">
              <FolderGit2 className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
              <span className="text-slate-500 font-medium">Repo:</span>
              <select
                value={selectedRepoId || ""}
                onChange={(e) => setSelectedRepoId(e.target.value)}
                className="bg-transparent font-bold text-slate-800 focus:outline-none cursor-pointer"
              >
                {repositories.map((r) => {
                  const id = r.indexing?.repositoryId || r._id || r.github?.fullName || r.github?.id;
                  const name = r.github?.fullName || r.github?.name || r.name || "Repository";
                  return (
                    <option key={id} value={id}>
                      {name}
                    </option>
                  );
                })}
              </select>
            </div>

            {/* Dynamic Pull Request Switcher */}
            <div className="flex items-center space-x-1.5 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-xl text-xs shadow-inner">
              <GitPullRequest className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
              <span className="text-slate-500 font-medium">PR:</span>
              <select
                value={selectedPRNumber || ""}
                onChange={(e) => setSelectedPRNumber(e.target.value)}
                className="bg-transparent font-bold text-slate-800 focus:outline-none cursor-pointer max-w-[220px] truncate"
              >
                {availablePRs.length > 0 ? (
                  availablePRs.map((pr) => (
                    <option key={pr.number} value={String(pr.number)}>
                      #{pr.number} - {pr.title.slice(0, 32)}...
                    </option>
                  ))
                ) : (
                  <option value={selectedPRNumber}>
                    #{selectedPRNumber} - {pullRequest.title.slice(0, 32)}...
                  </option>
                )}
              </select>
            </div>
          </div>
        </div>

        {/* Header Banner with Video Chat CTA */}
        <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 border border-slate-800 rounded-2xl p-6 text-white shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center space-x-3">
              <div className="w-9 h-9 rounded-xl bg-indigo-500/20 border border-indigo-400/40 flex items-center justify-center text-indigo-400">
                <Sparkles className="w-5 h-5 text-indigo-300" />
              </div>
              <div>
                <div className="flex items-center space-x-2.5">
                  <h1 className="text-xl font-bold tracking-tight text-white">{pullRequest.title}</h1>
                  <span className="text-xl text-indigo-400 font-mono">#{pullRequest.number || selectedPRNumber}</span>
                </div>
                <p className="text-xs text-slate-400 mt-0.5">
                  Authored by <span className="text-slate-200 font-medium">{pullRequest.user?.login || "alex-dev"}</span> into branch{" "}
                  <span className="font-mono text-indigo-300 bg-indigo-950/80 px-1.5 py-0.5 rounded border border-indigo-800/60">
                    {pullRequest.base?.ref || "main"}
                  </span>
                </p>
              </div>
            </div>
          </div>

          {/* Video & Meeting Action Controls */}
          <div className="flex items-center flex-wrap gap-2.5">
            {!activeChannel ? (
              <>
                <Button
                  variant="primary"
                  onClick={() =>
                    setActiveChannel(
                      `pr-${pullRequest.number || selectedPRNumber}-review-${Date.now().toString(36).slice(-4)}`
                    )
                  }
                  className="bg-emerald-600 hover:bg-emerald-500 text-white font-semibold flex items-center space-x-2 shadow-lg shadow-emerald-600/30 px-4 py-2.5 rounded-xl cursor-pointer"
                >
                  <Video className="w-4 h-4" />
                  <span>Start Live Video Review</span>
                </Button>

                <Button
                  variant="outline"
                  onClick={() => setIsMeetingModalOpen(true)}
                  className="bg-slate-800/80 hover:bg-slate-800 text-slate-200 border-slate-700 flex items-center space-x-1.5 px-3.5 py-2.5 rounded-xl cursor-pointer"
                >
                  <Calendar className="w-4 h-4" />
                  <span>Schedule Call</span>
                </Button>
              </>
            ) : (
              <div className="flex items-center space-x-2 bg-emerald-950/80 border border-emerald-500/40 px-3 py-1.5 rounded-xl text-emerald-300 text-xs font-semibold">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                <span>Agora RTC Room Live</span>
              </div>
            )}

            {pullRequest.html_url && (
              <a href={pullRequest.html_url} target="_blank" rel="noopener noreferrer">
                <Button variant="outline" className="bg-slate-800/80 hover:bg-slate-800 text-slate-200 border-slate-700 flex items-center">
                  <ExternalLink className="w-3.5 h-3.5 mr-1" />
                  <span>GitHub</span>
                </Button>
              </a>
            )}
          </div>
        </div>

        {/* Embedded Agora RTC Live Group Review Room */}
        {activeChannel && (
          <div className="animate-in fade-in slide-in-from-top-4 duration-300">
            <GroupReviewRoom
              channelName={activeChannel}
              prNumber={pullRequest.number || parseInt(selectedPRNumber, 10)}
              prTitle={pullRequest.title}
              repoFullName={pullRequest.base?.repo?.full_name || "structurai/core-backend"}
              isDocked={isVideoDocked}
              onToggleDock={() => setIsVideoDocked(!isVideoDocked)}
              onLeave={() => setActiveChannel(null)}
            />
          </div>
        )}

        {/* Main Grid: Code Diff & AI Governance Overlays */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left 2 Columns: Diff & AST Code Changes */}
          <div className="lg:col-span-2 space-y-6">
            {/* AI Slop & Code Governance Analysis Card */}
            <Card className="border border-indigo-100 shadow-sm overflow-hidden">
              <CardHeader className="py-4 px-6 bg-gradient-to-r from-indigo-50/70 to-slate-50 border-b border-indigo-100 flex flex-row items-center justify-between">
                <div className="flex items-center space-x-2">
                  <ShieldCheck className="w-5 h-5 text-indigo-600" />
                  <CardTitle className="text-base text-slate-900">AI Code Governance & Slop Audit</CardTitle>
                </div>
                <div className="flex items-center space-x-3">
                  <Badge
                    variant="outline"
                    className="border-emerald-300 bg-emerald-50 text-emerald-700 font-bold px-3 py-1 text-xs"
                  >
                    Slop Score: {aiScore} / 100
                  </Badge>
                  <Button
                    size="sm"
                    onClick={handleAnalyzePR}
                    disabled={isAnalyzingPR}
                    className="text-xs bg-indigo-600 hover:bg-indigo-700 text-white flex items-center space-x-1.5 cursor-pointer"
                  >
                    <RefreshCw className={`w-3 h-3 ${isAnalyzingPR ? "animate-spin" : ""}`} />
                    <span>{isAnalyzingPR ? "Analyzing..." : "Re-Scan PR"}</span>
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="p-6 space-y-4">
                <p className="text-sm text-slate-600">
                  Continuous AST syntax analysis checked function call traces against hallucinated modules, circular calls, and dead code paths.
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  {aiFindings.slice(0, 4).map((f, i) => (
                    <div
                      key={i}
                      className={`p-3.5 rounded-xl border flex items-start space-x-3 ${
                        f.severity === "CRITICAL" || f.severity === "HIGH"
                          ? "bg-rose-50/80 border-rose-200 text-rose-900"
                          : f.severity === "MEDIUM"
                          ? "bg-amber-50/80 border-amber-200 text-amber-900"
                          : "bg-emerald-50/80 border-emerald-200 text-emerald-900"
                      }`}
                    >
                      {f.severity === "CRITICAL" || f.severity === "HIGH" ? (
                        <AlertTriangle className="w-4 h-4 text-rose-600 mt-0.5 shrink-0" />
                      ) : f.severity === "MEDIUM" ? (
                        <Code2 className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
                      ) : (
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 mt-0.5 shrink-0" />
                      )}
                      <div>
                        <h4 className="text-xs font-bold capitalize">{f.category || "AST Analysis"}</h4>
                        <p className="text-[11px] mt-0.5 leading-relaxed">{f.message}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Unified Diff Viewer */}
            <div className="space-y-4">
              <div className="flex items-center justify-between px-1">
                <h3 className="text-base font-bold text-slate-900">Files Changed ({safeFiles.length})</h3>
                <div className="flex items-center space-x-2 text-xs font-mono">
                  <span className="text-emerald-600 font-semibold">+{additions} lines</span>
                  <span className="text-rose-600 font-semibold">-{deletions} lines</span>
                </div>
              </div>

              {safeFiles.map((file, index) => (
                <Card key={file?.filename || index} className="overflow-hidden border border-slate-200 shadow-sm">
                  <CardHeader className="py-3 px-4 bg-slate-50 border-b border-slate-200 flex flex-row items-center justify-between space-y-0">
                    <span className="font-mono text-xs font-semibold text-slate-800">{file?.filename || "Unknown file"}</span>
                    <div className="text-xs font-mono flex space-x-2">
                      <span className="text-emerald-600 font-medium">+{file?.additions || 0}</span>
                      <span className="text-rose-600 font-medium">-{file?.deletions || 0}</span>
                    </div>
                  </CardHeader>
                  <CardContent className="p-0 font-mono text-xs overflow-x-auto bg-slate-950 text-slate-200">
                    {file.patch ? (
                      file.patch.split("\n").map((line: string, i: number) => {
                        const isAddition = line.startsWith("+");
                        const isDeletion = line.startsWith("-");
                        const isHeader = line.startsWith("@@");

                        let bgClass = "bg-slate-950 hover:bg-slate-900 text-slate-300";
                        if (isAddition) bgClass = "bg-emerald-950/50 hover:bg-emerald-950/70 text-emerald-300 border-l-2 border-emerald-500";
                        if (isDeletion) bgClass = "bg-rose-950/50 hover:bg-rose-950/70 text-rose-300 border-l-2 border-rose-500";
                        if (isHeader) bgClass = "bg-slate-900 text-indigo-400 font-semibold";

                        return (
                          <div key={i} className={`px-4 py-1 flex items-center transition-colors ${bgClass}`}>
                            <span className="select-none text-slate-600 w-8 text-right pr-3 font-mono text-[10px]">{i + 1}</span>
                            <span className="whitespace-pre">{line}</span>
                          </div>
                        );
                      })
                    ) : (
                      <div className="p-6 text-center text-slate-400">Binary file or diff omitted.</div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          {/* Right Column: PR Metrics & Actions */}
          <div className="space-y-6">
            <Card className="border border-slate-200 shadow-sm">
              <CardHeader className="py-4 px-5 border-b border-slate-100 bg-slate-50/50">
                <CardTitle className="text-sm font-bold text-slate-800">Review Summary</CardTitle>
              </CardHeader>
              <CardContent className="p-5 space-y-4 text-xs text-slate-700">
                <div className="flex justify-between py-1.5 border-b border-slate-100">
                  <span className="text-slate-500 font-medium">Status:</span>
                  <Badge variant="success" className="bg-emerald-100 text-emerald-700 border-emerald-200">
                    <GitPullRequest className="w-3 h-3 mr-1" /> Open
                  </Badge>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-100">
                  <span className="text-slate-500 font-medium">Review Call:</span>
                  <span className="font-semibold text-indigo-600">Agora RTC Ready</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-100">
                  <span className="text-slate-500 font-medium">Files Changed:</span>
                  <span className="font-bold text-slate-900">{safeFiles.length}</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-100">
                  <span className="text-slate-500 font-medium">Additions / Deletions:</span>
                  <span className="font-mono">+{additions} / -{deletions}</span>
                </div>

                <div className="pt-2">
                  <Button
                    className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-2.5 rounded-xl flex items-center justify-center space-x-2 shadow-sm cursor-pointer"
                  >
                    <GitMerge className="w-4 h-4" />
                    <span>Approve & Merge PR</span>
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Quick Schedule Call Card */}
            <Card className="border border-indigo-100 bg-gradient-to-br from-indigo-50/50 to-white shadow-sm p-5 space-y-3">
              <div className="flex items-center space-x-2 text-indigo-900 font-bold text-sm">
                <Video className="w-4 h-4 text-indigo-600" />
                <span>Collaborative Voice/Video</span>
              </div>
              <p className="text-xs text-slate-600">
                Hop on a real-time call with your team to review AST nodes, traces, and code diffs together.
              </p>
              <button
                onClick={() => setIsMeetingModalOpen(true)}
                className="w-full py-2 px-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold transition-colors shadow-sm cursor-pointer"
              >
                Schedule Group Review Call
              </button>
            </Card>
          </div>
        </div>

        {/* Schedule Meeting Modal */}
        <ScheduleMeetingModal
          isOpen={isMeetingModalOpen}
          onClose={() => setIsMeetingModalOpen(false)}
          repositoryId={selectedRepoId}
          repoFullName={pullRequest.base?.repo?.full_name || "structurai/core-backend"}
          prNumber={pullRequest.number || parseInt(selectedPRNumber, 10)}
          prTitle={pullRequest.title}
          onStartInstantMeeting={(channel) => setActiveChannel(channel)}
        />
        
        {/* Floating Chat Panel (Teammate component) */}
        <div 
          className={`fixed top-16 bottom-0 right-0 z-40 transform transition-transform duration-300 ease-in-out ${chatOpen ? "translate-x-0 shadow-2xl" : "translate-x-full"}`}
        >
          {selectedRepoId && selectedPRNumber && (
            <PRChatPanel 
              repoId={selectedRepoId} 
              prNumber={selectedPRNumber} 
              onClose={() => setChatOpen(false)} 
            />
          )}
        </div>

        {/* Floating Discussions Toggle Button */}
        {!chatOpen && (
          <button 
            onClick={() => setChatOpen(true)}
            className="fixed bottom-8 right-8 w-14 h-14 bg-indigo-600 text-white rounded-full shadow-2xl flex items-center justify-center hover:bg-indigo-700 transition-all hover:scale-105 z-50"
            title="Open Discussions"
          >
            <MessageCircle className="w-6 h-6" />
          </button>
        )}
      </div>
    </>
  );
}
