import { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import { Badge } from "../components/ui/Badge";
import {
  Search,
  ShieldAlert,
  Clock,
  ArrowRight,
  RefreshCw,
  GitCommit,
  AlertTriangle,
  Radio,
} from "lucide-react";

interface IncidentItem {
  _id: string;
  title: string;
  description?: string;
  severity: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW" | "INFO";
  status: "OPEN" | "INVESTIGATING" | "IN_PROGRESS" | "FIX_GENERATED" | "RESOLVED" | "IGNORED";
  source: "GITHUB_PUSH" | "GITHUB_PR" | "GITHUB_PING" | "OTEL_TRACE" | "MANUAL";
  repositoryId?: {
    _id: string;
    github?: {
      fullName: string;
      name: string;
      owner: string;
    };
    language?: string;
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

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:5001";

export function IncidentList() {
  const [incidents, setIncidents] = useState<IncidentItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [selectedSeverity, setSelectedSeverity] = useState<string>("ALL");
  const [selectedStatus, setSelectedStatus] = useState<string>("ALL");
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const fetchIncidents = useCallback(async (showLoading = false) => {
    if (showLoading) setLoading(true);
    setIsRefreshing(true);
    try {
      const params = new URLSearchParams();
      if (searchTerm.trim()) params.append("search", searchTerm.trim());
      if (selectedSeverity !== "ALL") params.append("severity", selectedSeverity);
      if (selectedStatus !== "ALL") params.append("status", selectedStatus);
      params.append("limit", "50");

      const res = await fetch(`${API_BASE_URL}/api/incidents?${params.toString()}`, {
        headers: { "Content-Type": "application/json" },
        credentials: "include",
      });

      if (res.ok) {
        const data = await res.json();
        setIncidents(data.incidents || []);
        setError(null);
      } else {
        const errData = await res.json().catch(() => ({}));
        setError(errData.error || "Failed to load live incidents.");
      }
    } catch (err) {
      console.error("Error fetching incidents:", err);
      setError("Unable to reach backend service.");
    } finally {
      if (showLoading) setLoading(false);
      setIsRefreshing(false);
    }
  }, [searchTerm, selectedSeverity, selectedStatus]);

  // Initial fetch and dependency update
  useEffect(() => {
    fetchIncidents(true);
  }, [fetchIncidents]);

  // Real-time short polling every 4 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      fetchIncidents(false);
    }, 4000);

    return () => clearInterval(interval);
  }, [fetchIncidents]);

  const handleUpdateStatus = async (id: string, newStatus: string) => {
    setUpdatingId(id);
    try {
      const res = await fetch(`${API_BASE_URL}/api/incidents/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ status: newStatus }),
      });

      if (res.ok) {
        await fetchIncidents(false);
      }
    } catch (err) {
      console.error("Error updating incident status:", err);
    } finally {
      setUpdatingId(null);
    }
  };

  const getSeverityBadge = (severity: string) => {
    switch (severity) {
      case "CRITICAL":
      case "HIGH":
        return <Badge variant="error" className="uppercase">{severity}</Badge>;
      case "MEDIUM":
        return <Badge variant="warning" className="uppercase">{severity}</Badge>;
      case "LOW":
        return <Badge variant="secondary" className="uppercase">{severity}</Badge>;
      default:
        return <Badge variant="outline" className="uppercase">{severity || "INFO"}</Badge>;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "RESOLVED":
        return <Badge variant="success">Resolved</Badge>;
      case "INVESTIGATING":
      case "IN_PROGRESS":
        return <Badge variant="warning">Investigating</Badge>;
      case "FIX_GENERATED":
        return <Badge variant="default">Fix Ready</Badge>;
      default:
        return <Badge variant="error">Open</Badge>;
    }
  };

  const formatTimeAgo = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins} min${diffMins > 1 ? "s" : ""} ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? "s" : ""} ago`;
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays} day${diffDays > 1 ? "s" : ""} ago`;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <div className="flex items-center space-x-3">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">Live Incidents</h1>
            <div className="flex items-center space-x-1.5 px-2.5 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-xs font-semibold text-emerald-700">
              <Radio className="w-3 h-3 text-emerald-500 animate-pulse" />
              <span>Live Webhook Sync</span>
            </div>
          </div>
          <p className="text-slate-500 mt-1">
            Real-time feed of runtime anomalies, threats, and GitHub PR / Push events.
          </p>
        </div>

        <button
          onClick={() => fetchIncidents(true)}
          disabled={isRefreshing}
          className="flex items-center space-x-2 px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors shadow-sm"
        >
          <RefreshCw className={`w-4 h-4 ${isRefreshing ? "animate-spin text-indigo-600" : "text-slate-500"}`} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Filter & Search Bar */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="relative md:col-span-2">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search incidents, commits, authors, or keywords..."
            className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-sm"
          />
        </div>

        <div>
          <select
            value={selectedSeverity}
            onChange={(e) => setSelectedSeverity(e.target.value)}
            className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-sm"
          >
            <option value="ALL">All Severities</option>
            <option value="CRITICAL">Critical</option>
            <option value="HIGH">High</option>
            <option value="MEDIUM">Medium</option>
            <option value="LOW">Low</option>
            <option value="INFO">Info</option>
          </select>
        </div>

        <div>
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-sm"
          >
            <option value="ALL">All Statuses</option>
            <option value="OPEN">Open</option>
            <option value="INVESTIGATING">Investigating</option>
            <option value="RESOLVED">Resolved</option>
          </select>
        </div>
      </div>

      {/* Error state */}
      {error && (
        <div className="p-4 rounded-lg bg-rose-50 border border-rose-200 text-sm text-rose-700 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <AlertTriangle className="w-5 h-5 text-rose-500" />
            <span>{error}</span>
          </div>
          <button onClick={() => fetchIncidents(true)} className="underline text-xs font-semibold">Retry</button>
        </div>
      )}

      {/* Incidents Table */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
        {loading ? (
          <div className="p-12 text-center text-slate-500 flex flex-col items-center justify-center space-y-3">
            <RefreshCw className="w-6 h-6 animate-spin text-indigo-600" />
            <p className="text-sm font-medium">Loading live incidents...</p>
          </div>
        ) : incidents.length === 0 ? (
          <div className="p-12 text-center text-slate-500 flex flex-col items-center justify-center space-y-2">
            <ShieldAlert className="w-10 h-10 text-slate-300" />
            <p className="text-base font-semibold text-slate-700">No Incidents Found</p>
            <p className="text-sm text-slate-500 max-w-sm">
              Push code or open Pull Requests on your connected GitHub repositories to see automated threat evaluations and live incident feeds here.
            </p>
          </div>
        ) : (
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Incident & Threat
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Repository / Service
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Status
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Source / Time
                </th>
                <th scope="col" className="px-6 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Action
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-slate-200">
              {incidents.map((incident) => {
                const isCriticalOrHigh = incident.severity === "CRITICAL" || incident.severity === "HIGH";
                const isMedium = incident.severity === "MEDIUM";

                return (
                  <tr key={incident._id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-start">
                        <ShieldAlert
                          className={`w-5 h-5 mr-3 mt-0.5 flex-shrink-0 ${
                            isCriticalOrHigh
                              ? "text-rose-500"
                              : isMedium
                              ? "text-amber-500"
                              : "text-indigo-500"
                          }`}
                        />
                        <div>
                          <div className="flex items-center space-x-2">
                            <span className="font-mono text-xs text-slate-500 font-semibold">
                              INC-{incident._id.slice(-4).toUpperCase()}
                            </span>
                            {getSeverityBadge(incident.severity)}
                          </div>
                          <Link
                            to={`/incidents/${incident._id}`}
                            className="text-sm font-semibold text-slate-900 hover:text-indigo-600 transition-colors mt-1 block"
                          >
                            {incident.title}
                          </Link>
                          {incident.metadata?.commitSha && (
                            <div className="flex items-center space-x-2 text-xs text-slate-500 mt-1 font-mono">
                              <GitCommit className="w-3 h-3 text-slate-400" />
                              <span>{incident.metadata.commitSha.slice(0, 7)}</span>
                              {incident.metadata.author && (
                                <span className="font-sans text-slate-600">by {incident.metadata.author}</span>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>

                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-slate-800">
                        {incident.repositoryId?.github?.name || incident.repositoryId?.github?.fullName || "General System"}
                      </div>
                      {incident.repositoryId?.language && (
                        <span className="text-xs text-slate-500 font-mono">
                          {incident.repositoryId.language}
                        </span>
                      )}
                    </td>

                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center space-x-2">
                        {getStatusBadge(incident.status)}
                        {incident.status === "OPEN" && (
                          <button
                            onClick={() => handleUpdateStatus(incident._id, "INVESTIGATING")}
                            disabled={updatingId === incident._id}
                            className="text-xs text-indigo-600 hover:underline font-medium ml-1"
                          >
                            Investigate
                          </button>
                        )}
                        {incident.status === "INVESTIGATING" && (
                          <button
                            onClick={() => handleUpdateStatus(incident._id, "RESOLVED")}
                            disabled={updatingId === incident._id}
                            className="text-xs text-emerald-600 hover:underline font-medium ml-1"
                          >
                            Resolve
                          </button>
                        )}
                      </div>
                    </td>

                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                      <div className="flex items-center space-x-1.5">
                        <Clock className="w-3.5 h-3.5 text-slate-400" />
                        <span>{formatTimeAgo(incident.createdAt)}</span>
                      </div>
                      <div className="text-xs text-slate-400 font-mono mt-0.5">
                        {incident.source.replace("GITHUB_", "")}
                      </div>
                    </td>

                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <Link
                        to={`/incidents/${incident._id}`}
                        className="inline-flex items-center text-indigo-600 hover:text-indigo-900 font-semibold text-xs bg-indigo-50 hover:bg-indigo-100 px-2.5 py-1.5 rounded-md transition-colors"
                      >
                        <span>Details</span>
                        <ArrowRight className="w-3.5 h-3.5 ml-1" />
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
