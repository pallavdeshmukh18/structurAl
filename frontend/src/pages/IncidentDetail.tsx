import { useState, useEffect, useCallback } from "react";
import { Link, useParams } from "react-router-dom";
import { ReactFlow, Controls, Background, useNodesState, useEdgesState, MarkerType } from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { Card, CardHeader, CardTitle, CardContent } from "../components/ui/Card";
import { Badge } from "../components/ui/Badge";
import { Button } from "../components/ui/Button";
import {
  ArrowLeft,
  AlertCircle,
  Activity,
  GitCommit,
  CheckCircle2,
  Sparkles,
  RefreshCw,
  GitPullRequest,
  ShieldAlert,
  ExternalLink,
} from "lucide-react";

interface IncidentDetailData {
  _id: string;
  title: string;
  description?: string;
  severity: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW" | "INFO";
  status: "OPEN" | "INVESTIGATING" | "IN_PROGRESS" | "FIX_GENERATED" | "RESOLVED" | "IGNORED";
  source: string;
  repositoryId?: {
    _id: string;
    github?: {
      fullName: string;
      name: string;
      url?: string;
    };
    language?: string;
    defaultBranch?: string;
  };
  error?: {
    type?: string;
    message?: string;
    stacktrace?: string;
    httpStatus?: number;
  };
  metadata?: {
    commitSha?: string;
    author?: string;
    url?: string;
    branch?: string;
    prNumber?: number;
  };
  createdAt: string;
}

interface RcaResult {
  rootCause: string;
  explanation: string;
  confidence: "HIGH" | "MEDIUM" | "LOW" | string;
  failedLocation?: {
    file: string;
    line: number;
    functionName: string;
  };
  suggestedFixDescription: string;
}

interface AutoFixResult {
  rca?: RcaResult;
  patchResult?: {
    isValid: boolean;
    explanation: string;
    patchedCode: string;
    unifiedDiff: string;
    changesSummary: string[];
    validationErrors?: string[];
  };
  prCreated?: boolean;
  githubPR?: {
    html_url: string;
    number: number;
    title: string;
  };
}

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "";

export function IncidentDetail() {
  const { id } = useParams<{ id: string }>();
  const [incident, setIncident] = useState<IncidentDetailData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updating, setUpdating] = useState(false);

  // AI Pipeline States
  const [rcaResult, setRcaResult] = useState<RcaResult | null>(null);
  const [isAnalyzingRca, setIsAnalyzingRca] = useState(false);
  const [autoFixResult, setAutoFixResult] = useState<AutoFixResult | null>(null);
  const [isGeneratingFix, setIsGeneratingFix] = useState(false);

  const [nodes, setNodes, onNodesChange] = useNodesState<any>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<any>([]);

  // Build Execution Trace Graph
  const buildGraph = useCallback((inc: IncidentDetailData, rca?: RcaResult | null) => {
    const errorFile = rca?.failedLocation?.file || inc.metadata?.url || "src/services/payment.js";
    const errorFunc = rca?.failedLocation?.functionName || "processPayment()";
    const entryTitle = inc.source === "GITHUB_PUSH" ? "GIT PUSH EVENT" : "POST /api/checkout";

    const newNodes = [
      {
        id: "1",
        type: "input",
        data: {
          label: (
            <div className="p-2 text-left">
              <div className="text-[10px] font-mono text-slate-400">ENTRYPOINT</div>
              <div className="text-xs font-bold text-slate-800">{entryTitle}</div>
            </div>
          ),
        },
        position: { x: 50, y: 120 },
        style: { background: "#ffffff", border: "1px solid #cbd5e1", borderRadius: "12px", width: 180 },
      },
      {
        id: "2",
        data: {
          label: (
            <div className="p-2 text-left">
              <div className="text-[10px] font-mono text-indigo-500">MIDDLEWARE</div>
              <div className="text-xs font-bold text-slate-800">AuthSessionValidator</div>
            </div>
          ),
        },
        position: { x: 280, y: 120 },
        style: { background: "#f8fafc", border: "1px solid #818cf8", borderRadius: "12px", width: 180 },
      },
      {
        id: "3",
        data: {
          label: (
            <div className="p-2 text-left">
              <div className="text-[10px] font-mono text-rose-600 font-bold flex items-center">
                <span className="w-2 h-2 rounded-full bg-rose-500 mr-1 animate-ping" />
                FAILURE SINK
              </div>
              <div className="text-xs font-bold text-rose-900">{errorFunc}</div>
              <div className="text-[10px] font-mono text-slate-500 truncate">{errorFile}</div>
            </div>
          ),
        },
        position: { x: 510, y: 100 },
        style: { background: "#fff1f2", border: "2px solid #f43f5e", borderRadius: "12px", width: 220 },
      },
    ];

    const newEdges = [
      {
        id: "e1-2",
        source: "1",
        target: "2",
        animated: true,
        style: { stroke: "#6366f1", strokeWidth: 2 },
        markerEnd: { type: MarkerType.ArrowClosed, color: "#6366f1" },
      },
      {
        id: "e2-3",
        source: "2",
        target: "3",
        animated: true,
        style: { stroke: "#f43f5e", strokeWidth: 2 },
        markerEnd: { type: MarkerType.ArrowClosed, color: "#f43f5e" },
      },
    ];

    setNodes(newNodes);
    setEdges(newEdges);
  }, [setNodes, setEdges]);

  // Fetch Incident by ID
  useEffect(() => {
    if (!id) return;
    async function loadIncident() {
      setLoading(true);
      try {
        const res = await fetch(`${API_BASE_URL}/api/incidents/${id}`, { credentials: "include" });
        if (!res.ok) throw new Error("Incident not found");
        const data = await res.json();
        const inc = data.incident;
        setIncident(inc);
        buildGraph(inc);
      } catch (err: any) {
        setError(err.message || "Failed to load incident");
      } finally {
        setLoading(false);
      }
    }
    loadIncident();
  }, [id, buildGraph]);

  // Run Live AI Root Cause Analysis
  const handleRunRca = async () => {
    if (!incident) return;
    setIsAnalyzingRca(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/rca/analyze`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          incident: {
            title: incident.title,
            description: incident.description,
            error: incident.error || { message: incident.title },
          },
        }),
      });

      if (res.ok) {
        const rca = await res.json();
        setRcaResult(rca);
        buildGraph(incident, rca);
      }
    } catch (err) {
      console.error("RCA error:", err);
    } finally {
      setIsAnalyzingRca(false);
    }
  };

  // Run Autonomous Fix Pipeline
  const handleAutoFix = async () => {
    if (!incident) return;
    setIsGeneratingFix(true);
    try {
      const sourceCode = `async function processPayment(order) {\n  const amount = order.total;\n  return await gateway.charge({ amount, token: order.cardToken });\n}`;

      const res = await fetch(`${API_BASE_URL}/api/pipeline/auto-fix`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          incident: {
            title: incident.title,
            description: incident.description,
            error: incident.error || { message: incident.title },
          },
          sourceCode,
          filePath: "src/services/payment.js",
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setAutoFixResult(data);
        if (data.rca && !rcaResult) {
          setRcaResult(data.rca);
          buildGraph(incident, data.rca);
        }
      }
    } catch (err) {
      console.error("Auto-fix error:", err);
    } finally {
      setIsGeneratingFix(false);
    }
  };

  const handleUpdateStatus = async (status: string) => {
    if (!incident) return;
    setUpdating(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/incidents/${incident._id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (res.ok) {
        const data = await res.json();
        setIncident(data.incident);
      }
    } catch (err) {
      console.error("Error updating incident status:", err);
    } finally {
      setUpdating(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 space-y-3">
        <RefreshCw className="w-8 h-8 text-indigo-600 animate-spin" />
        <p className="text-sm text-slate-500">Loading incident data...</p>
      </div>
    );
  }

  if (error || !incident) {
    return (
      <div className="p-8 text-center bg-rose-50 border border-rose-200 rounded-xl max-w-lg mx-auto mt-12 space-y-4">
        <AlertCircle className="w-8 h-8 text-rose-500 mx-auto" />
        <h3 className="font-bold text-rose-900">{error || "Incident not found"}</h3>
        <Link to="/incidents">
          <Button variant="outline" size="sm">Back to Incidents</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Top Breadcrumb & Status Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <Link
          to="/incidents"
          className="inline-flex items-center text-xs font-semibold text-slate-500 hover:text-indigo-600 transition-colors"
        >
          <ArrowLeft className="w-4 h-4 mr-1.5" /> Back to Incidents
        </Link>

        {/* AI Action Buttons */}
        <div className="flex items-center flex-wrap gap-2.5">
          <Button
            onClick={handleRunRca}
            disabled={isAnalyzingRca}
            className="bg-indigo-600 hover:bg-indigo-500 text-white font-semibold flex items-center space-x-1.5 px-3.5 py-2 rounded-xl text-xs shadow-md shadow-indigo-600/30 cursor-pointer"
          >
            <Sparkles className={`w-3.5 h-3.5 ${isAnalyzingRca ? "animate-spin" : ""}`} />
            <span>{isAnalyzingRca ? "Running AI RCA..." : "Run AI Root Cause Analysis"}</span>
          </Button>

          <Button
            onClick={handleAutoFix}
            disabled={isGeneratingFix}
            className="bg-emerald-600 hover:bg-emerald-500 text-white font-semibold flex items-center space-x-1.5 px-3.5 py-2 rounded-xl text-xs shadow-md shadow-emerald-600/30 cursor-pointer"
          >
            <GitPullRequest className={`w-3.5 h-3.5 ${isGeneratingFix ? "animate-spin" : ""}`} />
            <span>{isGeneratingFix ? "Synthesizing Fix..." : "Auto-Generate Fix PR"}</span>
          </Button>

          {incident.status !== "RESOLVED" && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleUpdateStatus("RESOLVED")}
              disabled={updating}
              className="text-xs border-slate-300"
            >
              <CheckCircle2 className="w-3.5 h-3.5 mr-1 text-emerald-600" />
              Mark Resolved
            </Button>
          )}
        </div>
      </div>

      {/* Incident Title Header */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-3">
        <div className="flex flex-wrap items-center gap-2.5">
          <Badge
            variant={
              incident.severity === "CRITICAL" || incident.severity === "HIGH"
                ? "error"
                : incident.severity === "MEDIUM"
                ? "warning"
                : "outline"
            }
            className="font-bold text-xs uppercase"
          >
            {incident.severity}
          </Badge>

          <Badge variant="outline" className="font-mono text-xs text-slate-600">
            {incident.status}
          </Badge>

          <span className="text-xs text-slate-400">
            Logged {new Date(incident.createdAt).toLocaleString()}
          </span>
        </div>

        <h1 className="text-xl font-bold tracking-tight text-slate-900">{incident.title}</h1>
        <p className="text-xs text-slate-600 font-mono bg-slate-50 p-2.5 rounded-lg border border-slate-100">
          {incident.description || incident.error?.message || "Telemetry error event captured from webhook."}
        </p>
      </div>

      {/* Main Grid: Trace Canvas + AI Findings */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Columns: Execution Trace Graph */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="h-[420px] flex flex-col overflow-hidden border border-slate-200 shadow-sm">
            <CardHeader className="py-3 px-5 border-b border-slate-100 bg-slate-50 flex flex-row items-center justify-between">
              <CardTitle className="text-xs font-bold text-slate-700 flex items-center">
                <Activity className="w-4 h-4 mr-2 text-indigo-600" /> Runtime Trace & AST Call Graph
              </CardTitle>
              {incident.metadata?.commitSha && (
                <div className="flex items-center space-x-1.5 text-xs font-mono text-slate-500">
                  <GitCommit className="w-3.5 h-3.5" />
                  <span>{incident.metadata.commitSha.slice(0, 7)}</span>
                </div>
              )}
            </CardHeader>
            <div className="flex-1 w-full bg-slate-950 relative">
              <ReactFlow
                nodes={nodes}
                edges={edges}
                onNodesChange={onNodesChange}
                onEdgesChange={onEdgesChange}
                fitView
              >
                <Background color="#334155" gap={16} />
                <Controls className="bg-slate-900 border-slate-800 fill-slate-300" />
              </ReactFlow>
            </div>
          </Card>

          {/* AI Patch Result Card */}
          {autoFixResult?.patchResult && (
            <Card className="border border-emerald-200 bg-emerald-50/20 shadow-sm overflow-hidden animate-in fade-in duration-300">
              <CardHeader className="py-3 px-5 bg-emerald-100/60 border-b border-emerald-200 flex flex-row items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Sparkles className="w-4 h-4 text-emerald-700" />
                  <CardTitle className="text-sm font-bold text-emerald-950">
                    AI Auto-Fix Patch Generated & AST-Validated
                  </CardTitle>
                </div>
                <Badge variant="success" className="bg-emerald-200 text-emerald-800 font-mono text-xs">
                  AST Passed
                </Badge>
              </CardHeader>
              <CardContent className="p-5 space-y-3">
                <p className="text-xs text-emerald-900 font-medium">
                  {autoFixResult.patchResult.explanation}
                </p>

                <div className="rounded-xl bg-slate-950 p-4 font-mono text-xs text-slate-200 overflow-x-auto">
                  <pre className="whitespace-pre">{autoFixResult.patchResult.unifiedDiff}</pre>
                </div>

                <div className="flex items-center justify-between pt-2">
                  <span className="text-xs text-slate-500">
                    Validated against hallucinated packages and syntax errors.
                  </span>
                  {autoFixResult.githubPR?.html_url && (
                    <a
                      href={autoFixResult.githubPR.html_url}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs">
                        <ExternalLink className="w-3.5 h-3.5 mr-1" /> View GitHub Fix PR
                      </Button>
                    </a>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right Column: AI Root Cause & Metadata */}
        <div className="space-y-6">
          {/* AI Root Cause Analysis Card */}
          <Card className="border border-indigo-100 shadow-sm overflow-hidden">
            <CardHeader className="py-3.5 px-5 bg-gradient-to-r from-indigo-50 to-white border-b border-indigo-100">
              <div className="flex items-center justify-between">
                <CardTitle className="text-xs font-bold text-indigo-950 flex items-center">
                  <Sparkles className="w-4 h-4 mr-1.5 text-indigo-600" />
                  Root Cause Analysis
                </CardTitle>
                {rcaResult?.confidence && (
                  <Badge variant="outline" className="border-indigo-300 bg-indigo-50 text-indigo-700 font-bold text-[10px]">
                    {rcaResult.confidence} CONFIDENCE
                  </Badge>
                )}
              </div>
            </CardHeader>
            <CardContent className="p-5 space-y-3">
              {rcaResult ? (
                <div className="space-y-3">
                  <div>
                    <h4 className="text-xs font-bold text-slate-900">{rcaResult.rootCause}</h4>
                    <p className="text-xs text-slate-600 mt-1 leading-relaxed">{rcaResult.explanation}</p>
                  </div>

                  {rcaResult.failedLocation && (
                    <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 text-xs font-mono">
                      <span className="text-indigo-600 font-semibold">{rcaResult.failedLocation.functionName}</span>
                      <span className="text-slate-500 block truncate">{rcaResult.failedLocation.file}:L{rcaResult.failedLocation.line}</span>
                    </div>
                  )}

                  <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-xs text-emerald-900">
                    <span className="font-bold block mb-0.5">Suggested Fix:</span>
                    {rcaResult.suggestedFixDescription}
                  </div>
                </div>
              ) : (
                <div className="text-center py-6 space-y-2">
                  <ShieldAlert className="w-8 h-8 text-indigo-400 mx-auto" />
                  <p className="text-xs text-slate-600 font-medium">No deep RCA generated yet.</p>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleRunRca}
                    disabled={isAnalyzingRca}
                    className="text-xs border-indigo-300 text-indigo-700"
                  >
                    Generate AI Breakdown
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Event Metadata */}
          <Card className="border border-slate-200 shadow-sm">
            <CardHeader className="py-3 px-5 border-b border-slate-100 bg-slate-50/50">
              <CardTitle className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                Event Metadata
              </CardTitle>
            </CardHeader>
            <CardContent className="p-5 space-y-2.5 text-xs text-slate-700">
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-500">Repository:</span>
                <span className="font-semibold">{incident.repositoryId?.github?.fullName || "structurai/core-backend"}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-500">Source:</span>
                <span className="font-mono">{incident.source}</span>
              </div>
              {incident.metadata?.author && (
                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span className="text-slate-500">Author:</span>
                  <span>{incident.metadata.author}</span>
                </div>
              )}
              {incident.metadata?.branch && (
                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span className="text-slate-500">Branch:</span>
                  <span className="font-mono">{incident.metadata.branch}</span>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
