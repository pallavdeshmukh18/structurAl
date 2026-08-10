import { useState, useEffect, useCallback } from "react";
import { Link, useParams } from "react-router-dom";
import { ReactFlow, Controls, Background, useNodesState, useEdgesState, MarkerType } from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { Card, CardHeader, CardTitle, CardContent } from "../components/ui/Card";
import { Badge } from "../components/ui/Badge";
import {
  ArrowLeft,
  AlertCircle,
  Code,
  Server,
  Cpu,
  Activity,
  GitCommit,
  CheckCircle2,
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
  sourceLocation?: {
    filePath?: string;
    line?: number;
  };
  rootCause?: {
    summary?: string;
    explanation?: string;
    confidence?: number;
  };
  suggestedFix?: {
    summary?: string;
  };
  metadata?: {
    commitSha?: string;
    author?: string;
    url?: string;
    branch?: string;
    prNumber?: number;
  };
  createdAt: string;
  resolvedAt?: string;
}

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:5001";

const initialNodes = [
  {
    id: "1",
    position: { x: 50, y: 50 },
    data: { label: "API Gateway", icon: Server },
    type: "default",
    style: { background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: "8px", padding: "10px" },
  },
  {
    id: "2",
    position: { x: 50, y: 150 },
    data: { label: "Order Service", icon: Cpu },
    type: "default",
    style: { background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: "8px", padding: "10px" },
  },
  {
    id: "3",
    position: { x: -100, y: 250 },
    data: { label: "Inventory Check", icon: Code },
    type: "default",
    style: { background: "#ffffff", border: "1px solid #10b981", borderRadius: "8px", padding: "10px" },
  },
  {
    id: "4",
    position: { x: 200, y: 250 },
    data: { label: "Payment Processor", icon: Code },
    type: "default",
    style: { background: "#fef2f2", border: "2px solid #ef4444", borderRadius: "8px", padding: "10px", color: "#7f1d1d", fontWeight: "bold" },
  },
];

const initialEdges = [
  { id: "e1-2", source: "1", target: "2", animated: true, style: { stroke: "#94a3b8" }, markerEnd: { type: MarkerType.ArrowClosed, color: "#94a3b8" } },
  { id: "e2-3", source: "2", target: "3", animated: true, style: { stroke: "#10b981" }, markerEnd: { type: MarkerType.ArrowClosed, color: "#10b981" } },
  { id: "e2-4", source: "2", target: "4", animated: true, style: { stroke: "#ef4444", strokeWidth: 2 }, markerEnd: { type: MarkerType.ArrowClosed, color: "#ef4444" } },
];

export function IncidentDetail() {
  const { id } = useParams<{ id: string }>();
  const [incident, setIncident] = useState<IncidentDetailData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [updating, setUpdating] = useState<boolean>(false);

  const [nodes, _setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, _setEdges, onEdgesChange] = useEdgesState(initialEdges);

  const fetchIncident = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/incidents/${id}`, {
        credentials: "include",
      });
      if (res.ok) {
        const data = await res.json();
        setIncident(data.incident);
      }
    } catch (err) {
      console.error("Error fetching incident detail:", err);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchIncident();
  }, [fetchIncident]);

  const handleUpdateStatus = async (newStatus: string) => {
    if (!id) return;
    setUpdating(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/incidents/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) {
        await fetchIncident();
      }
    } catch (err) {
      console.error("Error updating incident status:", err);
    } finally {
      setUpdating(false);
    }
  };

  const getSeverityBadge = (severity?: string) => {
    switch (severity) {
      case "CRITICAL":
      case "HIGH":
        return <Badge variant="error" className="uppercase">{severity} Severity</Badge>;
      case "MEDIUM":
        return <Badge variant="warning" className="uppercase">{severity} Severity</Badge>;
      case "LOW":
        return <Badge variant="secondary" className="uppercase">{severity} Severity</Badge>;
      default:
        return <Badge variant="outline" className="uppercase">{severity || "INFO"}</Badge>;
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)]">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-4">
          <Link to="/incidents" className="p-2 rounded-lg hover:bg-slate-200 transition-colors bg-white border border-slate-200">
            <ArrowLeft className="w-5 h-5 text-slate-600" />
          </Link>
          <div>
            <div className="flex items-center space-x-3">
              <h1 className="text-2xl font-bold text-slate-900">
                {incident ? `INC-${incident._id.slice(-4).toUpperCase()}` : "Incident Detail"}
              </h1>
              {getSeverityBadge(incident?.severity)}
              {incident?.status === "RESOLVED" && <Badge variant="success">Resolved</Badge>}
              {incident?.status === "INVESTIGATING" && <Badge variant="warning">Investigating</Badge>}
            </div>
            <p className="text-slate-600 text-sm mt-0.5">
              {incident?.title || (loading ? "Loading incident details..." : "Incident details")}
            </p>
          </div>
        </div>

        <div className="flex space-x-3">
          {incident && incident.status !== "RESOLVED" && (
            <button
              onClick={() => handleUpdateStatus("RESOLVED")}
              disabled={updating}
              className="px-4 py-2 bg-emerald-600 text-white rounded-lg font-medium text-sm flex items-center space-x-2 hover:bg-emerald-700 transition-colors shadow-sm"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Mark as Resolved</span>
            </button>
          )}
          {incident && incident.status === "OPEN" && (
            <button
              onClick={() => handleUpdateStatus("INVESTIGATING")}
              disabled={updating}
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg font-medium text-sm flex items-center space-x-2 hover:bg-indigo-700 transition-colors shadow-sm"
            >
              <Activity className="w-4 h-4" />
              <span>Start Investigation</span>
            </button>
          )}
        </div>
      </div>

      <div className="flex-1 grid grid-cols-3 gap-6 overflow-hidden">
        {/* Graph View */}
        <Card className="col-span-2 flex flex-col overflow-hidden">
          <CardHeader className="py-4 border-b border-slate-100 flex flex-row items-center justify-between">
            <CardTitle className="text-sm text-slate-700 flex items-center">
              <Activity className="w-4 h-4 mr-2 text-indigo-600" /> Runtime Trace Execution Flow
            </CardTitle>
            {incident?.metadata?.commitSha && (
              <div className="flex items-center space-x-2 text-xs font-mono text-slate-500">
                <GitCommit className="w-3.5 h-3.5" />
                <span>{incident.metadata.commitSha.slice(0, 7)}</span>
              </div>
            )}
          </CardHeader>
          <div className="flex-1 w-full bg-slate-50/50 relative">
            <ReactFlow
              nodes={nodes}
              edges={edges}
              onNodesChange={onNodesChange}
              onEdgesChange={onEdgesChange}
              fitView
            >
              <Background color="#cbd5e1" gap={16} />
              <Controls className="bg-white border-slate-200 fill-slate-600" />
            </ReactFlow>
          </div>
        </Card>

        {/* Details Panel */}
        <div className="col-span-1 flex flex-col space-y-6 overflow-y-auto pr-1">
          {/* Metadata Card */}
          <Card>
            <CardHeader className="py-3 px-4 border-b border-slate-100 bg-slate-50/50">
              <CardTitle className="text-xs font-semibold text-slate-600 uppercase tracking-wider">
                Event Metadata
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 space-y-2 text-xs text-slate-700 font-medium">
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-500">Repository:</span>
                <span className="font-semibold">{incident?.repositoryId?.github?.fullName || "N/A"}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-500">Source:</span>
                <span className="font-mono">{incident?.source || "GITHUB_PUSH"}</span>
              </div>
              {incident?.metadata?.author && (
                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span className="text-slate-500">Committer/Author:</span>
                  <span>{incident.metadata.author}</span>
                </div>
              )}
              {incident?.metadata?.branch && (
                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span className="text-slate-500">Branch:</span>
                  <span className="font-mono">{incident.metadata.branch}</span>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Root Cause / Threat Evaluation Card */}
          <Card>
            <CardHeader className="py-4 border-b border-slate-100 bg-rose-50/50">
              <CardTitle className="text-rose-700 flex items-center text-sm">
                <AlertCircle className="w-4 h-4 mr-2" /> Threat & Root Cause Analysis
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4 space-y-3">
              <p className="text-sm text-slate-700">
                {incident?.error?.message ||
                  incident?.description ||
                  "Threat analysis identified error/hotfix keywords within this change event."}
              </p>
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                <p className="text-xs text-amber-800 font-semibold">Automated Assessment:</p>
                <p className="text-xs text-amber-700 mt-1">
                  Severity evaluated as <strong className="uppercase">{incident?.severity || "MEDIUM"}</strong> based on pattern matching against critical failure indicators.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Raw Description / Commit */}
          {incident?.description && (
            <Card className="flex-1 flex flex-col">
              <CardHeader className="py-3 px-4 border-b border-slate-100 bg-slate-50">
                <CardTitle className="text-xs font-semibold text-slate-600 uppercase tracking-wider">
                  Raw Description / Commit Body
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 bg-slate-900 rounded-b-xl overflow-hidden font-mono text-xs text-slate-300">
                <pre className="whitespace-pre-wrap">{incident.description}</pre>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
