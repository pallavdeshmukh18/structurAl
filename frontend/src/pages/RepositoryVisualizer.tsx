import { useState, useEffect, useMemo, useCallback } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import {
  ReactFlow,
  Controls,
  Background,
  MiniMap,
  useNodesState,
  useEdgesState,
  type Node,
  type Edge,
  MarkerType,
  useReactFlow,
  ReactFlowProvider,
  BackgroundVariant,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";

import { Card, CardHeader, CardContent, CardTitle } from "../components/ui/Card";
import { Badge } from "../components/ui/Badge";
import { Button } from "../components/ui/Button";
import { SymbolNode } from "../components/graph/SymbolNode";
import { FileNode } from "../components/graph/FileNode";
import { ClusterNode } from "../components/graph/ClusterNode";
import {
  Folder,
  GitBranch,
  Search,
  RefreshCw,
  AlertCircle,
  Code,
  Layers,
  X,
  ArrowLeft,
  ArrowRight,
  ArrowRightLeft,
  Package,
  ChevronRight,
  FolderGit2,
  Compass,
  Sparkles,
  ChevronDown,
  Check,
  Play,
} from "lucide-react";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:5001";

// --- TypeScript Interfaces ---
export interface GraphSnapshot {
  id: string;
  commitSha: string | null;
  branch: string | null;
  status: string;
  completedAt: string | null;
}

export interface GraphStats {
  nodeCount: number;
  edgeCount: number;
  fileCount: number;
}

export interface GraphNodeLocation {
  startLine: number | null;
  startColumn: number | null;
  endLine: number | null;
  endColumn: number | null;
}

export interface GraphNodeMetadata {
  exported?: boolean;
  async?: boolean;
  visibility?: string | null;
  [key: string]: unknown;
}

export interface GraphNode {
  id: string;
  name: string;
  type: string;
  filePath: string;
  language: string | null;
  location: GraphNodeLocation;
  parentSymbolId: string | null;
  metadata: GraphNodeMetadata;
}

export interface GraphEdgeMetadata {
  filePath?: string | null;
  line?: number | null;
  [key: string]: unknown;
}

export interface GraphEdge {
  id: string;
  source: string;
  target: string;
  type: string;
  metadata: GraphEdgeMetadata;
}

export interface GraphResponse {
  repositoryId?: string;
  status?: string;
  message?: string;
  snapshot?: GraphSnapshot | null;
  stats?: GraphStats;
  nodes: GraphNode[];
  edges: GraphEdge[];
}

export interface RepositoryDetails {
  _id: string;
  github: {
    fullName: string;
    owner: string;
    name: string;
    defaultBranch: string;
    url?: string;
  };
  visibility: string;
}

export interface ArchArea {
  id: string;
  name: string;
  key: string;
  filePaths: string[];
  symbols: GraphNode[];
  layerIndex: number;
}

// --- Category Consolidation Helper (Consolidates files into 4-8 architectural areas) ---
const getCategoryInfo = (filePath: string): { key: string; name: string; layerIndex: number } => {
  const path = (filePath || "").toLowerCase();

  if (
    path.includes("frontend") ||
    path.includes("client") ||
    path.includes("ui") ||
    path.includes("view") ||
    path.includes("page")
  ) {
    return { key: "frontend", name: "Frontend / UI", layerIndex: 0 };
  }
  if (path.includes("route") || path.includes("api") || path.includes("endpoint")) {
    return { key: "api_routes", name: "API & Routes", layerIndex: 1 };
  }
  if (path.includes("controller") || path.includes("handler")) {
    return { key: "controllers", name: "Controllers", layerIndex: 1 };
  }
  if (
    path.includes("service") ||
    path.includes("manager") ||
    path.includes("logic") ||
    path.includes("parser") ||
    path.includes("ast")
  ) {
    return { key: "services", name: "Services & Logic", layerIndex: 2 };
  }
  if (
    path.includes("model") ||
    path.includes("schema") ||
    path.includes("db") ||
    path.includes("data") ||
    path.includes("entity")
  ) {
    return { key: "models_data", name: "Models & Data", layerIndex: 3 };
  }
  if (path.includes("middleware") || path.includes("auth") || path.includes("guard")) {
    return { key: "middleware", name: "Middleware & Auth", layerIndex: 2 };
  }
  if (
    path.includes("config") ||
    path.includes("util") ||
    path.includes("lib") ||
    path.includes("helper") ||
    path.includes("integration")
  ) {
    return { key: "utilities", name: "Utilities & Integrations", layerIndex: 4 };
  }

  // Fallback: directory based grouping
  const parts = filePath.split("/");
  if (parts.length > 1) {
    const dir = parts[0] === "src" || parts[0] === "backend" ? parts[1] || parts[0] : parts[0];
    const capitalized = dir.charAt(0).toUpperCase() + dir.slice(1);
    return { key: dir, name: capitalized, layerIndex: 2 };
  }

  return { key: "core", name: "Core Module", layerIndex: 2 };
};

// --- Deterministic Blueprint Grid Layout for Level 1 Areas ---
const calculateBlueprintLayout = (
  areas: ArchArea[],
  clusterEdgesAgg: Map<string, { source: string; target: string; count: number }>
): { nodes: Node[]; edges: Edge[] } => {
  const layerMap = new Map<number, ArchArea[]>();
  areas.forEach((area) => {
    if (!layerMap.has(area.layerIndex)) layerMap.set(area.layerIndex, []);
    layerMap.get(area.layerIndex)!.push(area);
  });

  const sortedLayers = Array.from(layerMap.keys()).sort((a, b) => a - b);

  const nodes: Node[] = [];
  const startY = 80;
  const rowHeight = 220;

  sortedLayers.forEach((layerIdx, row) => {
    const rowAreas = layerMap.get(layerIdx)!;
    const colCount = rowAreas.length;
    const colWidth = 360;
    const startX = 500 - ((colCount - 1) * colWidth) / 2;

    rowAreas.forEach((area, col) => {
      const x = startX + col * colWidth - 155;
      const y = startY + row * rowHeight;

      nodes.push({
        id: area.name,
        type: "clusterNode",
        position: { x, y },
        data: {
          clusterName: area.name,
          fileCount: area.filePaths.length,
          symbolCount: area.symbols.length,
          incomingCount: 0,
          outgoingCount: 0,
        },
      });
    });
  });

  const edges: Edge[] = [];
  clusterEdgesAgg.forEach((agg, key) => {
    edges.push({
      id: key,
      source: agg.source,
      target: agg.target,
      label: `${agg.count} dependencies`,
      type: "smoothstep",
      animated: true,
      style: { stroke: "#10b981", strokeWidth: Math.min(1.5 + agg.count * 0.3, 4) },
      labelStyle: { fill: "#047857", fontWeight: 700, fontSize: 11 },
      labelBgStyle: { fill: "#ecfdf5", color: "#047857", rx: 6, ry: 6 },
      markerEnd: {
        type: MarkerType.ArrowClosed,
        color: "#10b981",
        width: 14,
        height: 14,
      },
    });
  });

  return { nodes, edges };
};

// --- Structured Grid Layout for Level 2 Files & Level 3 Symbols ---
const calculateStructuredGridLayout = (
  nodesInput: Node[],
  edgesInput: Edge[],
  nodeWidth: number,
  nodeHeight: number
): { nodes: Node[]; edges: Edge[] } => {
  const count = nodesInput.length;
  if (count === 0) return { nodes: [], edges: [] };

  const cols = Math.min(4, Math.ceil(Math.sqrt(count)));
  const colWidth = nodeWidth + 60;
  const rowHeight = nodeHeight + 80;
  const startX = 500 - ((cols - 1) * colWidth) / 2;
  const startY = 100;

  const layoutedNodes = nodesInput.map((n, i) => {
    const row = Math.floor(i / cols);
    const col = i % cols;
    const x = startX + col * colWidth - nodeWidth / 2;
    const y = startY + row * rowHeight - nodeHeight / 2;

    return {
      ...n,
      position: { x, y },
    };
  });

  return { nodes: layoutedNodes, edges: edgesInput };
};

// --- Inner Graph Canvas Component ---
function GraphCanvas({
  nodes: inputNodes,
  edges: inputEdges,
  hoveredNodeId,
  selectedNodeId,
  onNodeClick,
  onPaneClick,
}: {
  nodes: Node[];
  edges: Edge[];
  hoveredNodeId: string | null;
  selectedNodeId: string | null;
  onNodeClick: (event: React.MouseEvent, node: Node) => void;
  onPaneClick: () => void;
}) {
  const nodeTypes = useMemo(
    () => ({
      clusterNode: ClusterNode,
      fileNode: FileNode,
      customSymbol: SymbolNode,
    }),
    []
  );

  const { fitView } = useReactFlow();

  const activeFocusId = hoveredNodeId || selectedNodeId;

  const connectedNodeIds = useMemo(() => {
    if (!activeFocusId) return null;
    const set = new Set<string>();
    set.add(activeFocusId);

    inputEdges.forEach((e) => {
      if (e.source === activeFocusId) set.add(e.target);
      if (e.target === activeFocusId) set.add(e.source);
    });

    return set;
  }, [activeFocusId, inputEdges]);

  const styledNodes = useMemo(() => {
    if (!connectedNodeIds) return inputNodes;

    return inputNodes.map((n) => {
      const isConnected = connectedNodeIds.has(n.id);
      return {
        ...n,
        style: {
          ...n.style,
          opacity: isConnected ? 1 : 0.15,
          transition: "opacity 0.2s ease-in-out",
        },
      };
    });
  }, [inputNodes, connectedNodeIds]);

  const styledEdges = useMemo(() => {
    if (!activeFocusId) return inputEdges;

    return inputEdges.map((e) => {
      const isConnected = e.source === activeFocusId || e.target === activeFocusId;
      return {
        ...e,
        animated: isConnected || e.animated,
        style: {
          ...e.style,
          strokeWidth: isConnected ? 2.5 : 1,
          opacity: isConnected ? 1 : 0.1,
          transition: "all 0.2s ease-in-out",
        },
      };
    });
  }, [inputEdges, activeFocusId]);

  const [nodes, setNodes, onNodesChange] = useNodesState(styledNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(styledEdges);

  useEffect(() => {
    setNodes(styledNodes);
    setEdges(styledEdges);
  }, [styledNodes, styledEdges, setNodes, setEdges]);

  // Clean fitView timing upon node set updates
  useEffect(() => {
    const timer = setTimeout(() => {
      fitView({ padding: 0.25, duration: 300 });
    }, 60);
    return () => clearTimeout(timer);
  }, [inputNodes, fitView]);

  return (
    <div className="relative w-full h-full bg-slate-50/70 rounded-2xl overflow-hidden border border-slate-200/90 shadow-inner">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        nodeTypes={nodeTypes}
        onNodeClick={onNodeClick}
        onPaneClick={onPaneClick}
        fitView
        colorMode="light"
        minZoom={0.1}
        maxZoom={2.5}
        defaultEdgeOptions={{ type: "smoothstep" }}
      >
        <Background color="#cbd5e1" gap={24} size={1.5} variant={BackgroundVariant.Dots} />
        <Controls className="!bg-white !border-slate-200 !text-slate-700 !shadow-md !rounded-xl" />
        <MiniMap
          nodeColor={(node) => {
            if (node.type === "clusterNode") return "#10b981";
            if (node.type === "fileNode") return "#06b6d4";
            const data = node.data as { symbolType?: string };
            const type = (data?.symbolType || "").toLowerCase();
            if (type === "function") return "#10b981";
            if (type === "class") return "#8b5cf6";
            if (type === "route") return "#f59e0b";
            return "#06b6d4";
          }}
          maskColor="rgba(248, 250, 252, 0.75)"
          className="!bg-white !border-slate-200 !shadow-md !rounded-xl"
        />
      </ReactFlow>
    </div>
  );
}

// --- Main Repository Visualizer Page ---
export function RepositoryVisualizer() {
  const { id: rawRepoIdParam } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const repoIdParam =
    rawRepoIdParam && rawRepoIdParam !== "undefined" && rawRepoIdParam !== "null"
      ? rawRepoIdParam
      : null;

  const [graphData, setGraphData] = useState<GraphResponse | null>(null);
  const [repoDetails, setRepoDetails] = useState<RepositoryDetails | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [errorType, setErrorType] = useState<"auth" | "not_found" | "no_snapshot" | "generic">("generic");

  // Single Source of Truth Navigation & Selection State
  const [viewLevel, setViewLevel] = useState<"level1" | "level2" | "level3">("level1");
  const [selectedClusterName, setSelectedClusterName] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [selectedSymbol, setSelectedSymbol] = useState<GraphNode | null>(null);
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);
  const [isInspectorDismissed, setIsInspectorDismissed] = useState<boolean>(false);

  // Filters
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [symbolTypeFilter, setSymbolTypeFilter] = useState<string>("all");
  const [relationTypeFilter, setRelationTypeFilter] = useState<string>("all");

  // Repository Selector state
  const [userRepos, setUserRepos] = useState<any[]>([]);
  const [isRepoSelectorOpen, setIsRepoSelectorOpen] = useState<boolean>(false);
  const [repoSearchQuery, setRepoSearchQuery] = useState<string>("");

  const fetchUserRepos = useCallback(async () => {
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
      console.error("Error fetching user repos for selector:", err);
    }
  }, []);

  useEffect(() => {
    fetchUserRepos();
  }, [fetchUserRepos]);

  const filteredUserRepos = useMemo(() => {
    if (!repoSearchQuery.trim()) return userRepos;
    const q = repoSearchQuery.toLowerCase().trim();
    return userRepos.filter((r) => {
      const name = (r.name || r.github?.name || "").toLowerCase();
      const owner = (r.owner || r.github?.owner || "").toLowerCase();
      const fullName = (r.fullName || r.github?.fullName || "").toLowerCase();
      return name.includes(q) || owner.includes(q) || fullName.includes(q);
    });
  }, [userRepos, repoSearchQuery]);

  const handleSwitchRepo = (repo: any) => {
    setIsRepoSelectorOpen(false);
    setRepoSearchQuery("");
    const targetId = repo.indexing?.repositoryId || repo._id || repo.github?.fullName;
    if (targetId) {
      navigate(`/repository/${targetId}/visualizer`);
    }
  };

  const [isTriggeringIndex, setIsTriggeringIndex] = useState<boolean>(false);

  const handleTriggerIndex = async () => {
    const targetId = repoDetails?._id || repoIdParam;
    if (!targetId) return;
    setIsTriggeringIndex(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE_URL}/api/repositories/${targetId}/index`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
      });

      if (res.ok) {
        // Poll for completion every 3 seconds
        const pollInterval = setInterval(async () => {
          try {
            const graphRes = await fetch(`${API_BASE_URL}/api/repositories/${targetId}/graph`, {
              credentials: "include",
            });
            if (graphRes.ok) {
              const data: GraphResponse = await graphRes.json();
              if (data.nodes && data.nodes.length > 0) {
                setGraphData(data);
                setError(null);
                setIsTriggeringIndex(false);
                clearInterval(pollInterval);
              }
            }
          } catch {
            // Ignore polling errors
          }
        }, 3000);
      } else {
        setIsTriggeringIndex(false);
      }
    } catch (err) {
      console.error("Failed to trigger indexing:", err);
      setIsTriggeringIndex(false);
    }
  };

  const fetchGraphAndRepo = useCallback(async (targetRepoId: string) => {
    if (!targetRepoId || targetRepoId === "undefined" || targetRepoId === "null") {
      setLoading(false);
      setErrorType("not_found");
      setError("Invalid repository ID.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      fetch(`${API_BASE_URL}/api/repositories/${targetRepoId}`, {
        method: "GET",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
      })
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => {
          if (data && data.repository) {
            setRepoDetails(data.repository);
          }
        })
        .catch(() => {});

      const graphRes = await fetch(`${API_BASE_URL}/api/repositories/${targetRepoId}/graph`, {
        method: "GET",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
      });

      if (graphRes.ok) {
        const data: GraphResponse = await graphRes.json();
        if (data.status === "not_indexed" || !data.nodes || data.nodes.length === 0) {
          setErrorType("no_snapshot");
          setError("Repository has not been indexed yet. Trigger indexing to parse AST symbols.");
        } else {
          setGraphData(data);
          setError(null);
        }
      } else {
        const errData = await graphRes.json().catch(() => ({}));
        if (graphRes.status === 401) {
          setErrorType("auth");
          setError("Authentication required. Please sign in to access repository graph.");
        } else if (graphRes.status === 404) {
          if (errData.error && errData.error.includes("snapshot")) {
            setErrorType("no_snapshot");
            setError("No completed indexing snapshot found for this repository.");
          } else {
            setErrorType("not_found");
            setError("Repository not found or access denied.");
          }
        } else {
          setErrorType("generic");
          setError(errData.error || "Failed to load repository graph.");
        }
      }
    } catch (err) {
      console.error("Error fetching repository graph:", err);
      setErrorType("generic");
      setError("Network error. Unable to connect to backend server.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (repoIdParam) {
      fetchGraphAndRepo(repoIdParam);
    } else {
      setLoading(true);
      setError(null);

      fetch(`${API_BASE_URL}/api/repositories`, {
        method: "GET",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
      })
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => {
          if (data && Array.isArray(data.repositories) && data.repositories.length > 0) {
            const indexedRepo = data.repositories.find(
              (r: any) => r.indexing?.indexed && (r.indexing?.repositoryId || r._id)
            );
            const firstRepo = indexedRepo || data.repositories[0];
            const targetId = firstRepo.indexing?.repositoryId || firstRepo._id;

            if (targetId && targetId !== "undefined" && targetId !== "null") {
              navigate(`/repository/${targetId}/visualizer`, { replace: true });
              return;
            }
          }

          setLoading(false);
          setErrorType("not_found");
          setError("No indexed repository selected. Please select an indexed repository from the Dashboard to open the Visualizer.");
        })
        .catch((err) => {
          console.error("Error retrieving user repositories:", err);
          setLoading(false);
          setErrorType("generic");
          setError("Unable to retrieve user repositories. Please select a repository from the Dashboard.");
        });
    }
  }, [repoIdParam, fetchGraphAndRepo, navigate]);

  // Aggregate Metrics
  const typeCounts = useMemo(() => {
    if (!graphData || !graphData.nodes) return { functions: 0, classes: 0, routes: 0, imports: 0 };
    let functions = 0, classes = 0, routes = 0, imports = 0;
    graphData.nodes.forEach((n) => {
      const type = (n.type || "").toLowerCase();
      if (type === "function" || type === "method") functions++;
      else if (type === "class" || type === "interface") classes++;
      else if (type === "route") routes++;
      else if (type === "import") imports++;
    });
    return { functions, classes, routes, imports };
  }, [graphData]);

  // Consolidate Architecture Areas (4 to 8 Areas)
  const archAreas = useMemo(() => {
    if (!graphData || !graphData.nodes) return [];

    const areaMap = new Map<string, ArchArea>();

    graphData.nodes.forEach((n) => {
      const cat = getCategoryInfo(n.filePath);
      if (!areaMap.has(cat.key)) {
        areaMap.set(cat.key, {
          id: cat.key,
          name: cat.name,
          key: cat.key,
          filePaths: [],
          symbols: [],
          layerIndex: cat.layerIndex,
        });
      }
      const area = areaMap.get(cat.key)!;
      if (!area.filePaths.includes(n.filePath)) {
        area.filePaths.push(n.filePath);
      }
      area.symbols.push(n);
    });

    return Array.from(areaMap.values());
  }, [graphData]);

  // --- Centralized Single-Source-Of-Truth Navigation Functions ---
  const goToArchitecture = useCallback(() => {
    setViewLevel("level1");
    setSelectedClusterName(null);
    setSelectedFile(null);
    setSelectedSymbol(null);
    setHoveredNodeId(null);
    setIsInspectorDismissed(false);
  }, []);

  const goToModule = useCallback((clusterName: string) => {
    setViewLevel("level2");
    setSelectedClusterName(clusterName);
    setSelectedFile(null);
    setSelectedSymbol(null);
    setHoveredNodeId(null);
    setIsInspectorDismissed(false);
  }, []);

  const goToSymbol = useCallback((filePath: string, symbol: GraphNode | null = null) => {
    setViewLevel("level3");
    setSelectedFile(filePath);
    setSelectedSymbol(symbol);
    setHoveredNodeId(null);
    setIsInspectorDismissed(false);
  }, []);

  const closeInspector = useCallback(() => {
    setIsInspectorDismissed(true);
  }, []);

  // --- Level 1 Graph Generation ---
  const level1GraphData = useMemo(() => {
    if (!graphData || !graphData.nodes || archAreas.length === 0)
      return { nodes: [], edges: [] };

    const symbolIdToAreaNameMap = new Map<string, string>();
    archAreas.forEach((area) => {
      area.symbols.forEach((s) => symbolIdToAreaNameMap.set(s.id, area.name));
    });

    const areaIncomingCount = new Map<string, number>();
    const areaOutgoingCount = new Map<string, number>();
    const areaEdgesAgg = new Map<string, { source: string; target: string; count: number }>();

    graphData.edges.forEach((e) => {
      const srcArea = symbolIdToAreaNameMap.get(e.source);
      const tgtArea = symbolIdToAreaNameMap.get(e.target);

      if (srcArea) {
        areaOutgoingCount.set(srcArea, (areaOutgoingCount.get(srcArea) || 0) + 1);
      }
      if (tgtArea) {
        areaIncomingCount.set(tgtArea, (areaIncomingCount.get(tgtArea) || 0) + 1);
      }

      if (srcArea && tgtArea && srcArea !== tgtArea) {
        const edgeKey = `${srcArea}==>${tgtArea}`;
        if (!areaEdgesAgg.has(edgeKey)) {
          areaEdgesAgg.set(edgeKey, { source: srcArea, target: tgtArea, count: 0 });
        }
        areaEdgesAgg.get(edgeKey)!.count++;
      }
    });

    const areasWithCounts = archAreas.map((area) => ({
      ...area,
      incomingCount: areaIncomingCount.get(area.name) || 0,
      outgoingCount: areaOutgoingCount.get(area.name) || 0,
    }));

    const filteredAreas = searchQuery
      ? areasWithCounts.filter(
          (a) =>
            a.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            a.filePaths.some((f) => f.toLowerCase().includes(searchQuery.toLowerCase())) ||
            a.symbols.some((s) => s.name.toLowerCase().includes(searchQuery.toLowerCase()))
        )
      : areasWithCounts;

    return calculateBlueprintLayout(filteredAreas, areaEdgesAgg);
  }, [graphData, archAreas, searchQuery]);

  // --- Level 2 Graph Generation ---
  const level2GraphData = useMemo(() => {
    if (!graphData || !graphData.nodes) return { nodes: [], edges: [] };

    let scopedNodes = graphData.nodes;
    if (selectedClusterName) {
      const targetArea = archAreas.find((a) => a.name === selectedClusterName);
      if (targetArea) {
        const fileSet = new Set(targetArea.filePaths);
        scopedNodes = graphData.nodes.filter((n) => fileSet.has(n.filePath));
      }
    }

    const fileSymbolMap = new Map<string, GraphNode[]>();
    const symbolIdToFileMap = new Map<string, string>();

    scopedNodes.forEach((n) => {
      const path = n.filePath || "Other";
      if (!fileSymbolMap.has(path)) {
        fileSymbolMap.set(path, []);
      }
      fileSymbolMap.get(path)!.push(n);
      symbolIdToFileMap.set(n.id, path);
    });

    const fileRelationCounts = new Map<string, number>();
    const fileEdgeAggs = new Map<string, { source: string; target: string; count: number }>();

    graphData.edges.forEach((e) => {
      const srcFile = symbolIdToFileMap.get(e.source);
      const tgtFile = symbolIdToFileMap.get(e.target);

      if (srcFile) {
        fileRelationCounts.set(srcFile, (fileRelationCounts.get(srcFile) || 0) + 1);
      }
      if (tgtFile && tgtFile !== srcFile) {
        fileRelationCounts.set(tgtFile, (fileRelationCounts.get(tgtFile) || 0) + 1);
      }

      if (srcFile && tgtFile && srcFile !== tgtFile) {
        const edgeKey = `${srcFile}->${tgtFile}`;
        if (!fileEdgeAggs.has(edgeKey)) {
          fileEdgeAggs.set(edgeKey, { source: srcFile, target: tgtFile, count: 0 });
        }
        fileEdgeAggs.get(edgeKey)!.count++;
      }
    });

    const fileNodes: Node[] = [];
    fileSymbolMap.forEach((symbols, filePath) => {
      if (
        searchQuery &&
        !filePath.toLowerCase().includes(searchQuery.toLowerCase()) &&
        !symbols.some((s) => s.name.toLowerCase().includes(searchQuery.toLowerCase()))
      ) {
        return;
      }

      fileNodes.push({
        id: filePath,
        type: "fileNode",
        position: { x: 0, y: 0 },
        data: {
          filePath,
          symbolCount: symbols.length,
          relationCount: fileRelationCounts.get(filePath) || 0,
          language: symbols[0]?.language || null,
          onDrillDown: (f: string) => goToSymbol(f, null),
        },
      });
    });

    const fileEdges: Edge[] = [];
    fileEdgeAggs.forEach((agg, key) => {
      fileEdges.push({
        id: key,
        source: agg.source,
        target: agg.target,
        label: `${agg.count} rels`,
        type: "smoothstep",
        animated: true,
        style: { stroke: "#06b6d4", strokeWidth: Math.min(1.5 + agg.count * 0.3, 4) },
        labelStyle: { fill: "#0e7490", fontWeight: 600, fontSize: 10 },
        labelBgStyle: { fill: "#cff4fc", color: "#0e7490", rx: 4, ry: 4 },
        markerEnd: {
          type: MarkerType.ArrowClosed,
          color: "#06b6d4",
          width: 14,
          height: 14,
        },
      });
    });

    return calculateStructuredGridLayout(fileNodes, fileEdges, 260, 110);
  }, [graphData, selectedClusterName, archAreas, searchQuery, goToSymbol]);

  // --- Level 3 Graph Generation ---
  const level3GraphData = useMemo(() => {
    if (!graphData || !graphData.nodes) return { nodes: [], edges: [] };

    let relevantNodes = graphData.nodes;
    let relevantEdges = graphData.edges;

    if (selectedFile) {
      const fileSymbolIds = new Set(
        graphData.nodes.filter((n) => n.filePath === selectedFile).map((n) => n.id)
      );

      const connectedSymbolIds = new Set<string>(fileSymbolIds);
      graphData.edges.forEach((e) => {
        if (fileSymbolIds.has(e.source)) connectedSymbolIds.add(e.target);
        if (fileSymbolIds.has(e.target)) connectedSymbolIds.add(e.source);
      });

      relevantNodes = graphData.nodes.filter((n) => connectedSymbolIds.has(n.id));
      relevantEdges = graphData.edges.filter(
        (e) => connectedSymbolIds.has(e.source) && connectedSymbolIds.has(e.target)
      );
    }

    if (symbolTypeFilter !== "all") {
      relevantNodes = relevantNodes.filter((n) => {
        const type = (n.type || "").toLowerCase();
        if (symbolTypeFilter === "function") return type === "function" || type === "method";
        if (symbolTypeFilter === "class") return type === "class" || type === "interface";
        if (symbolTypeFilter === "route") return type === "route";
        if (symbolTypeFilter === "import") return type === "import";
        return true;
      });
    }

    if (relationTypeFilter !== "all") {
      relevantEdges = relevantEdges.filter(
        (e) => (e.type || "").toLowerCase() === relationTypeFilter.toLowerCase()
      );
    }

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      relevantNodes = relevantNodes.filter(
        (n) =>
          n.name.toLowerCase().includes(query) ||
          n.filePath.toLowerCase().includes(query) ||
          n.type.toLowerCase().includes(query)
      );
    }

    const symbolNodeIdSet = new Set(relevantNodes.map((n) => n.id));
    const validEdges = relevantEdges.filter(
      (e) => symbolNodeIdSet.has(e.source) && symbolNodeIdSet.has(e.target)
    );

    const symbolNodes: Node[] = relevantNodes.map((n) => ({
      id: n.id,
      type: "customSymbol",
      position: { x: 0, y: 0 },
      data: {
        name: n.name,
        symbolType: n.type,
        filePath: n.filePath,
        language: n.language,
        location: n.location,
        parentSymbolId: n.parentSymbolId,
        metadata: n.metadata,
      },
    }));

    const getEdgeColor = (relationType: string) => {
      const typeUpper = (relationType || "").toUpperCase();
      switch (typeUpper) {
        case "CALLS":
          return "#10b981";
        case "IMPORTS":
          return "#06b6d4";
        case "EXTENDS":
          return "#8b5cf6";
        case "IMPLEMENTS":
          return "#6366f1";
        case "ROUTES_TO":
          return "#f59e0b";
        default:
          return "#64748b";
      }
    };

    const symbolEdges: Edge[] = validEdges.map((e) => {
      const color = getEdgeColor(e.type);
      return {
        id: e.id,
        source: e.source,
        target: e.target,
        label: e.type,
        type: "smoothstep",
        animated: e.type === "CALLS" || e.type === "ROUTES_TO",
        style: { stroke: color, strokeWidth: 1.5 },
        labelStyle: { fill: "#334155", fontWeight: 600, fontSize: 10 },
        labelBgStyle: { fill: "#f1f5f9", color: "#334155", rx: 4, ry: 4 },
        markerEnd: {
          type: MarkerType.ArrowClosed,
          color,
          width: 14,
          height: 14,
        },
      };
    });

    return calculateStructuredGridLayout(symbolNodes, symbolEdges, 220, 74);
  }, [graphData, selectedFile, symbolTypeFilter, relationTypeFilter, searchQuery]);

  const activeGraph =
    viewLevel === "level1"
      ? level1GraphData
      : viewLevel === "level2"
      ? level2GraphData
      : level3GraphData;

  const onNodeClick = useCallback(
    (_event: React.MouseEvent, node: Node) => {
      if (node.type === "clusterNode") {
        goToModule(node.id);
      } else if (node.type === "fileNode") {
        goToSymbol(node.id, null);
      } else {
        const rawNode = graphData?.nodes.find((n) => n.id === node.id);
        if (rawNode) {
          setSelectedSymbol(rawNode);
          setIsInspectorDismissed(false);
        }
      }
    },
    [graphData, goToModule, goToSymbol]
  );

  const onPaneClick = useCallback(() => {
    if (selectedSymbol) {
      setSelectedSymbol(null);
    }
  }, [selectedSymbol]);

  // ESC Key listener to close detail inspector drawer
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        closeInspector();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [closeInspector]);

  // Selected Area details for Inspector
  const selectedAreaDetails = useMemo(() => {
    if (!selectedClusterName || archAreas.length === 0) return null;
    return archAreas.find((a) => a.name === selectedClusterName) || null;
  }, [selectedClusterName, archAreas]);

  // Selected File details for Inspector
  const selectedFileDetails = useMemo(() => {
    if (!selectedFile || !graphData) return null;
    const fileSymbols = graphData.nodes.filter((n) => n.filePath === selectedFile);
    const fileSymbolIds = new Set(fileSymbols.map((s) => s.id));

    let incomingCount = 0;
    let outgoingCount = 0;
    graphData.edges.forEach((e) => {
      if (fileSymbolIds.has(e.target) && !fileSymbolIds.has(e.source)) incomingCount++;
      if (fileSymbolIds.has(e.source) && !fileSymbolIds.has(e.target)) outgoingCount++;
    });

    return {
      filePath: selectedFile,
      symbols: fileSymbols,
      incomingCount,
      outgoingCount,
    };
  }, [selectedFile, graphData]);

  // Derived boolean: is Inspector active & visible?
  const hasInspectorContent = Boolean(selectedSymbol || selectedFileDetails || selectedAreaDetails);
  const isInspectorVisible = !isInspectorDismissed && hasInspectorContent;

  // Global Keyboard Listener for Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (isInspectorVisible) {
          closeInspector();
        } else if (viewLevel === "level3") {
          if (selectedClusterName) {
            goToModule(selectedClusterName);
          } else {
            goToArchitecture();
          }
        } else if (viewLevel === "level2") {
          goToArchitecture();
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isInspectorVisible, viewLevel, selectedClusterName, closeInspector, goToModule, goToArchitecture]);

  // Symbol Incoming & Outgoing relations calculation for selected symbol detail drawer
  const symbolRelationsTrace = useMemo(() => {
    if (!selectedSymbol || !graphData) return { incoming: [], outgoing: [] };

    const incoming: { relation: GraphEdge; otherSymbol: GraphNode }[] = [];
    const outgoing: { relation: GraphEdge; otherSymbol: GraphNode }[] = [];

    const symbolMap = new Map<string, GraphNode>();
    graphData.nodes.forEach((n) => symbolMap.set(n.id, n));

    graphData.edges.forEach((e) => {
      if (e.target === selectedSymbol.id) {
        const src = symbolMap.get(e.source);
        if (src) incoming.push({ relation: e, otherSymbol: src });
      }
      if (e.source === selectedSymbol.id) {
        const tgt = symbolMap.get(e.target);
        if (tgt) outgoing.push({ relation: e, otherSymbol: tgt });
      }
    });

    return { incoming, outgoing };
  }, [selectedSymbol, graphData]);

  const repoDisplayName =
    repoDetails?.github?.name ||
    (repoDetails?.github?.fullName ? repoDetails.github.fullName.split("/").pop() : null) ||
    (graphData?.repositoryId ? `Repository (${graphData.repositoryId.slice(0, 8)})` : "Repository Visualizer");

  const repoFullName =
    repoDetails?.github?.fullName ||
    (repoDetails?.github?.owner && repoDetails?.github?.name
      ? `${repoDetails.github.owner}/${repoDetails.github.name}`
      : null);

  const branchName = graphData?.snapshot?.branch || repoDetails?.github?.defaultBranch || "main";
  const commitShaShort = graphData?.snapshot?.commitSha
    ? graphData.snapshot.commitSha.slice(0, 7)
    : null;

  return (
    <div className="space-y-4">
      {/* 1. Header & Repository Selector Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200 shadow-sm relative z-30">
        <div className="flex items-center space-x-3 min-w-0">
          <Link
            to={repoIdParam ? `/repository/${repoIdParam}` : "/dashboard"}
            className="p-2.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 transition-colors flex items-center text-xs font-semibold shrink-0 cursor-pointer"
            title="Return to Repository Overview"
          >
            <ArrowLeft className="w-4 h-4 mr-1.5" />
            Overview
          </Link>

          {/* Interactive Repository Selector Dropdown */}
          <div className="relative flex-1 min-w-0">
            <button
              onClick={() => setIsRepoSelectorOpen(!isRepoSelectorOpen)}
              className="flex items-center space-x-2.5 px-3.5 py-2 rounded-xl border border-slate-200/90 bg-slate-50/80 hover:bg-slate-100/90 hover:border-indigo-300 text-slate-900 transition-all cursor-pointer group max-w-full text-left"
            >
              <div className="p-1.5 rounded-lg bg-indigo-50 text-indigo-600 shrink-0">
                <FolderGit2 className="w-4 h-4" />
              </div>
              
              <div className="flex flex-col min-w-0 flex-1 pr-1">
                <div className="flex items-center space-x-1.5 truncate">
                  <span className="font-bold text-slate-900 text-sm truncate">
                    {repoDisplayName}
                  </span>
                  <ChevronDown className="w-3.5 h-3.5 text-slate-400 group-hover:text-slate-700 transition-transform shrink-0" />
                </div>
                <span className="text-[11px] text-slate-500 font-mono truncate">
                  {repoFullName || "Select a repository to switch..."}
                </span>
              </div>

              <div className="hidden sm:flex items-center space-x-1 shrink-0 ml-1">
                <Badge variant="outline" className="text-[10px] px-1.5 py-0 capitalize bg-white">
                  {repoDetails?.visibility || "public"}
                </Badge>
                <Badge variant="outline" className="text-[10px] px-1.5 py-0 font-mono text-indigo-600 bg-indigo-50/60 border-indigo-200">
                  <GitBranch className="w-2.5 h-2.5 mr-0.5 inline-block" />
                  {branchName}
                </Badge>
              </div>
            </button>

            {/* Repositories Popover Dropdown */}
            {isRepoSelectorOpen && (
              <div className="absolute left-0 top-full mt-2 w-80 sm:w-96 bg-white rounded-2xl border border-slate-200/90 shadow-2xl z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
                <div className="p-3 border-b border-slate-100 bg-slate-50/50">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Search repositories..."
                      value={repoSearchQuery}
                      onChange={(e) => setRepoSearchQuery(e.target.value)}
                      className="w-full pl-9 pr-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                      autoFocus
                    />
                  </div>
                </div>

                <div className="max-h-72 overflow-y-auto p-1.5 space-y-1">
                  {filteredUserRepos.length === 0 ? (
                    <div className="p-4 text-center text-slate-400 text-xs">
                      No matching repositories found.
                    </div>
                  ) : (
                    filteredUserRepos.map((repo) => {
                      const isCurrent =
                        repo._id === repoIdParam ||
                        repo.indexing?.repositoryId === repoIdParam ||
                        repo.github?.fullName === repoFullName;
                      const isIndexed = repo.indexing?.indexed ?? false;
                      const fullName = repo.github?.fullName || repo.fullName || repo.name;
                      const defaultBranch = repo.github?.defaultBranch || "main";
                      const isPrivate = repo.github?.private ?? repo.visibility === "private";

                      return (
                        <button
                          key={repo._id || repo.github?.id}
                          onClick={() => handleSwitchRepo(repo)}
                          className={`w-full flex items-start justify-between p-2.5 rounded-xl text-left transition-colors cursor-pointer ${
                            isCurrent
                              ? "bg-indigo-50/80 border border-indigo-200/80"
                              : "hover:bg-slate-50 border border-transparent"
                          }`}
                        >
                          <div className="flex items-start space-x-2.5 min-w-0 pr-2">
                            <div className="p-1.5 rounded-lg bg-slate-100 text-slate-600 shrink-0 mt-0.5">
                              <FolderGit2 className="w-3.5 h-3.5 text-indigo-600" />
                            </div>
                            <div className="flex flex-col min-w-0">
                              <div className="flex items-center space-x-1.5">
                                <span className="text-xs font-bold text-slate-900 truncate">
                                  {repo.name || repo.github?.name}
                                </span>
                                {isCurrent && <Check className="w-3.5 h-3.5 text-indigo-600 shrink-0" />}
                              </div>
                              <span className="text-[11px] text-slate-500 font-mono truncate">{fullName}</span>
                              <div className="flex items-center space-x-2 text-[10px] text-slate-400 mt-1">
                                <span>{defaultBranch}</span>
                                <span>•</span>
                                <span>{isPrivate ? "Private" : "Public"}</span>
                              </div>
                            </div>
                          </div>

                          <div className="shrink-0">
                            {isIndexed ? (
                              <Badge variant="success" className="text-[10px] px-1.5 py-0 bg-emerald-50 text-emerald-700 border-emerald-200">
                                Indexed
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="text-[10px] px-1.5 py-0 text-slate-500">
                                Not Indexed
                              </Badge>
                            )}
                          </div>
                        </button>
                      );
                    })
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Level Navigation & Controls */}
        <div className="flex items-center space-x-3">
          <div className="flex items-center bg-slate-100/80 p-1 rounded-xl border border-slate-200 text-xs font-mono">
            <button
              onClick={goToArchitecture}
              className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
                viewLevel === "level1"
                  ? "bg-white text-emerald-700 shadow-sm font-bold"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Blueprint Overview
            </button>

            {viewLevel === "level2" && selectedClusterName && (
              <>
                <ChevronRight className="w-3.5 h-3.5 text-slate-400 mx-0.5" />
                <span className="px-3 py-1.5 bg-white text-indigo-700 font-bold rounded-lg shadow-sm">
                  {selectedClusterName}
                </span>
                <button
                  onClick={goToArchitecture}
                  className="ml-2 px-2 py-1 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg text-[10px] font-sans font-semibold transition-colors cursor-pointer"
                >
                  ← Back to Blueprint
                </button>
              </>
            )}
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={() => repoIdParam && fetchGraphAndRepo(repoIdParam)}
            disabled={loading}
            className="rounded-xl flex items-center gap-1.5 text-xs"
            title="Refresh Graph & Snapshot Data"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            <span className="hidden sm:inline">Refresh</span>
          </Button>
        </div>
      </div>

      {/* Context Subheader Bar */}
      {graphData && (
        <div className="px-4 py-2 rounded-xl bg-slate-100/70 border border-slate-200/60 text-xs text-slate-600 flex items-center justify-between font-mono">
          <div className="flex items-center space-x-2">
            <Sparkles className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
            <span>
              Architecture Blueprint · <strong>{graphData.stats?.nodeCount ?? graphData.nodes?.length ?? 0}</strong> symbols · <strong>{graphData.stats?.edgeCount ?? graphData.edges?.length ?? 0}</strong> relations · <strong>{graphData.stats?.fileCount ?? 0}</strong> files
            </span>
          </div>
          <div className="hidden sm:block text-[11px] text-slate-400">
            Press <kbd className="px-1.5 py-0.5 bg-white rounded border border-slate-200 text-slate-600 font-bold">ESC</kbd> to close inspector
          </div>
        </div>
      )}

      {/* 2. Top Architecture Summary Bar */}
      {graphData && (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
          <div className="bg-white p-3 rounded-2xl border border-slate-200 flex items-center space-x-3 shadow-sm">
            <div className="p-2.5 rounded-xl bg-emerald-50 text-emerald-600">
              <Code className="w-4 h-4" />
            </div>
            <div>
              <div className="text-[11px] text-slate-500 font-medium">Symbols</div>
              <div className="text-base font-bold text-slate-900">{graphData.stats?.nodeCount ?? graphData.nodes?.length ?? 0}</div>
            </div>
          </div>

          <div className="bg-white p-3 rounded-2xl border border-slate-200 flex items-center space-x-3 shadow-sm">
            <div className="p-2.5 rounded-xl bg-indigo-50 text-indigo-600">
              <Layers className="w-4 h-4" />
            </div>
            <div>
              <div className="text-[11px] text-slate-500 font-medium">Relations</div>
              <div className="text-base font-bold text-slate-900">{graphData.stats?.edgeCount ?? graphData.edges?.length ?? 0}</div>
            </div>
          </div>

          <div className="bg-white p-3 rounded-2xl border border-slate-200 flex items-center space-x-3 shadow-sm">
            <div className="p-2.5 rounded-xl bg-purple-50 text-purple-600">
              <Folder className="w-4 h-4" />
            </div>
            <div>
              <div className="text-[11px] text-slate-500 font-medium">Files</div>
              <div className="text-base font-bold text-slate-900">{graphData.stats?.fileCount ?? 0}</div>
            </div>
          </div>

          <div className="bg-white p-3 rounded-2xl border border-slate-200 flex items-center space-x-3 shadow-sm">
            <div className="p-2.5 rounded-xl bg-amber-50 text-amber-600">
              <ArrowRightLeft className="w-4 h-4" />
            </div>
            <div>
              <div className="text-[11px] text-slate-500 font-medium">Functions / Routes</div>
              <div className="text-xs font-bold text-slate-900 mt-0.5">
                {typeCounts.functions} Funcs • {typeCounts.routes} Routes
              </div>
            </div>
          </div>

          <div className="bg-white p-3 rounded-2xl border border-slate-200 flex items-center space-x-3 shadow-sm">
            <div className="p-2.5 rounded-xl bg-cyan-50 text-cyan-600">
              <Package className="w-4 h-4" />
            </div>
            <div>
              <div className="text-[11px] text-slate-500 font-medium">Classes & Imports</div>
              <div className="text-xs font-bold text-slate-900 mt-0.5">
                {typeCounts.classes} Classes • {typeCounts.imports} Imports
              </div>
            </div>
          </div>

          <div className="bg-white p-3 rounded-2xl border border-slate-200 flex items-center space-x-3 shadow-sm">
            <div className="p-2.5 rounded-xl bg-slate-100 text-slate-600">
              <GitBranch className="w-4 h-4" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-xs text-slate-500 font-medium truncate">
                {branchName} {commitShaShort ? `(${commitShaShort})` : ""}
              </div>
              <div className="text-xs font-bold text-emerald-600">
                {graphData.snapshot?.status === "completed" ? "Indexed" : (graphData.snapshot?.status || "Indexed")}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 3. Main Blueprint Canvas & Sidebar */}
      <div className="grid grid-cols-4 gap-6">
        {/* Left Sidebar: Architecture Areas & Relation Types */}
        <Card className="col-span-1 h-[680px] flex flex-col bg-white border-slate-200 shadow-sm rounded-2xl">
          <CardHeader className="py-3 px-4 border-b border-slate-100 space-y-3">
            <CardTitle className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center justify-between">
              <span>Architecture Navigator</span>
              <Compass className="w-4 h-4 text-emerald-600" />
            </CardTitle>

            {/* Search Input */}
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
              <input
                type="text"
                placeholder="Search area, file, symbol..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500 text-slate-800 font-mono"
              />
            </div>

            {/* Symbol Type Filter Pills */}
            <div className="space-y-1.5 pt-1">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                Symbol Type
              </label>
              <div className="flex flex-wrap gap-1">
                {["all", "function", "class", "route", "import"].map((type) => (
                  <button
                    key={type}
                    onClick={() => setSymbolTypeFilter(type)}
                    className={`text-[10px] font-medium px-2 py-0.5 rounded-lg capitalize transition-colors ${
                      symbolTypeFilter === type
                        ? "bg-emerald-600 text-white font-semibold shadow-sm"
                        : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                    }`}
                  >
                    {type}
                  </button>
                ))}
              </div>
            </div>

            {/* Relation Type Filter Pills */}
            <div className="space-y-1.5 pt-1">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                Relation Types
              </label>
              <div className="flex flex-wrap gap-1">
                {["all", "CALLS", "IMPORTS", "USES", "ROUTES_TO"].map((rel) => (
                  <button
                    key={rel}
                    onClick={() => setRelationTypeFilter(rel)}
                    className={`text-[10px] font-medium px-2 py-0.5 rounded-lg capitalize transition-colors ${
                      relationTypeFilter === rel
                        ? "bg-emerald-600 text-white font-semibold shadow-sm"
                        : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                    }`}
                  >
                    {rel}
                  </button>
                ))}
              </div>
            </div>
          </CardHeader>

          {/* Architecture Areas List in Sidebar */}
          <CardContent className="p-2 flex-1 overflow-auto text-xs text-slate-600 space-y-2">
            <div className="px-2 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center justify-between">
              <span>Architecture Areas</span>
              <span>{archAreas.length}</span>
            </div>

            {loading ? (
              <div className="p-4 text-center text-slate-400 space-y-2">
                <RefreshCw className="w-5 h-5 animate-spin mx-auto text-emerald-500" />
                <p>Loading blueprint...</p>
              </div>
            ) : archAreas.length === 0 ? (
              <div className="p-4 text-center text-slate-400">
                <p>No architectural areas derived.</p>
              </div>
            ) : (
              archAreas.map((area) => {
                const isSelected = selectedClusterName === area.name;

                return (
                  <div
                    key={area.id}
                    onClick={() => goToModule(area.name)}
                    onMouseEnter={() => setHoveredNodeId(area.name)}
                    onMouseLeave={() => setHoveredNodeId(null)}
                    className={`p-2.5 rounded-xl border transition-all cursor-pointer ${
                      isSelected
                        ? "bg-emerald-50 border-emerald-300 text-emerald-900 font-semibold shadow-sm"
                        : "bg-white border-slate-200/80 hover:bg-slate-50 text-slate-700"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-1.5 truncate">
                        <FolderGit2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                        <span className="truncate font-mono text-[11px] font-bold" title={area.name}>
                          {area.name}
                        </span>
                      </div>
                      <span className="text-[10px] px-1.5 py-0.2 bg-slate-100 text-slate-600 rounded-md shrink-0">
                        {area.filePaths.length} files
                      </span>
                    </div>
                    <div className="text-[10px] text-slate-400 truncate mt-0.5 font-mono">
                      {area.symbols.length} total symbols
                    </div>
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>

        {/* Right Area: Architecture Blueprint Canvas & Non-Blocking Inspector */}
        <div className="col-span-3 flex flex-col space-y-4">
          <Card className="h-[680px] flex flex-col overflow-hidden relative border border-slate-200 shadow-sm rounded-2xl">
            {/* Active Mode Overlay Badge */}
            <div className="absolute top-3 left-3 z-10 bg-white/95 backdrop-blur px-3.5 py-1.5 rounded-xl border border-slate-200/90 shadow-md text-xs flex items-center space-x-2 pointer-events-auto">
              <span className="font-bold text-slate-800">
                {viewLevel === "level1"
                  ? "Level 1: Architectural Blueprint (Repository View)"
                  : viewLevel === "level2"
                  ? `Level 2: Module View (${selectedClusterName || "Files"})`
                  : `Level 3: Symbol View (${selectedFile?.split("/").pop() || "Symbols"})`}
              </span>

              {viewLevel !== "level1" && (
                <button
                  onClick={goToArchitecture}
                  className="text-[10px] text-slate-400 hover:text-slate-600 underline ml-2 cursor-pointer font-medium"
                >
                  Back to Blueprint
                </button>
              )}
            </div>

            {/* Visualizer Canvas */}
            {loading ? (
              <div className="w-full h-full flex flex-col items-center justify-center bg-slate-50 text-slate-600 space-y-3">
                <RefreshCw className="w-8 h-8 animate-spin text-emerald-500" />
                <p className="text-sm font-medium">Generating repository architecture blueprint...</p>
              </div>
            ) : error ? (
              <div className="w-full h-full flex flex-col items-center justify-center bg-slate-50 text-slate-700 p-8 text-center space-y-4">
                <div className={`p-3 rounded-full ${errorType === "no_snapshot" ? "bg-indigo-50 border border-indigo-100 text-indigo-500" : "bg-rose-50 border border-rose-100 text-rose-500"}`}>
                  {errorType === "no_snapshot" ? <Sparkles className="w-8 h-8 text-indigo-600 animate-pulse" /> : <AlertCircle className="w-8 h-8" />}
                </div>
                <div className="max-w-md">
                  <h3 className="text-base font-extrabold text-slate-900 mb-1">
                    {errorType === "no_snapshot"
                      ? "This repository hasn't been indexed yet."
                      : errorType === "not_found" && !repoIdParam
                      ? "No Repositories Found"
                      : "Unable to Load Visualizer"}
                  </h3>
                  <p className="text-xs text-slate-500">
                    {errorType === "no_snapshot"
                      ? "Index the repository to generate its architecture map and symbol dependency graph."
                      : error}
                  </p>
                </div>
                {errorType === "no_snapshot" ? (
                  <div className="flex flex-col items-center space-y-3">
                    <button
                      onClick={handleTriggerIndex}
                      disabled={isTriggeringIndex}
                      className="flex items-center space-x-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold shadow-sm transition-all disabled:opacity-50 cursor-pointer"
                    >
                      {isTriggeringIndex ? (
                        <>
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          <span>Parsing AST & Indexing Symbols...</span>
                        </>
                      ) : (
                        <>
                          <Play className="w-3.5 h-3.5 fill-current" />
                          <span>Index Repository</span>
                        </>
                      )}
                    </button>
                    {isTriggeringIndex && (
                      <p className="text-[11px] text-slate-400 font-mono animate-pulse">
                        Scanning repository files, extracting AST symbols & building dependency graph...
                      </p>
                    )}
                  </div>
                ) : errorType === "not_found" && !repoIdParam ? (
                  <Link
                    to="/dashboard"
                    className="text-xs bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-xl font-medium transition-colors shadow-sm"
                  >
                    Go to Dashboard
                  </Link>
                ) : null}
              </div>
            ) : activeGraph.nodes.length === 0 ? (
              <div className="w-full h-full flex flex-col items-center justify-center bg-slate-50 text-slate-600 p-8 text-center space-y-3">
                <Code className="w-10 h-10 text-slate-400" />
                <h3 className="text-base font-semibold text-slate-900">No Matching Blueprint Nodes</h3>
                <p className="text-xs text-slate-500 max-w-sm">
                  Try adjusting search query or symbol type filters to display nodes.
                </p>
              </div>
            ) : (
              <ReactFlowProvider>
                <GraphCanvas
                  nodes={activeGraph.nodes}
                  edges={activeGraph.edges}
                  hoveredNodeId={hoveredNodeId}
                  selectedNodeId={
                    isInspectorVisible
                      ? selectedSymbol?.id || selectedFile || selectedClusterName
                      : null
                  }
                  onNodeClick={onNodeClick}
                  onPaneClick={onPaneClick}
                />
              </ReactFlowProvider>
            )}

            {/* Non-Blocking Floating Right Inspector Panel */}
            {isInspectorVisible && (
              <div className="absolute right-4 top-4 bottom-4 w-84 z-20 pointer-events-none flex justify-end">
                <div className="w-full bg-white/95 backdrop-blur border border-slate-200/90 rounded-2xl shadow-2xl p-4 overflow-auto pointer-events-auto flex flex-col space-y-4">
                  <div className="flex items-start justify-between border-b border-slate-100 pb-3">
                    <div>
                      <span className="text-[10px] uppercase font-bold tracking-wider text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-100">
                        {selectedSymbol
                          ? selectedSymbol.type
                          : selectedFileDetails
                          ? "File Module"
                          : "Architectural Area"}
                      </span>
                      <h3 className="text-base font-bold text-slate-900 mt-1 font-mono break-all">
                        {selectedSymbol
                          ? selectedSymbol.name
                          : selectedFileDetails
                          ? selectedFileDetails.filePath.split("/").pop()
                          : selectedAreaDetails?.name}
                      </h3>
                    </div>
                    <button
                      onClick={closeInspector}
                      className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 cursor-pointer"
                      title="Close Inspector (Esc)"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Inspector Content for Area */}
                  {selectedAreaDetails && !selectedSymbol && !selectedFileDetails && (
                    <div className="space-y-3 text-xs">
                      <div className="grid grid-cols-2 gap-2">
                        <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                          <span className="text-slate-400 block text-[10px]">Files</span>
                          <span className="font-mono font-bold text-slate-800 text-sm">
                            {selectedAreaDetails.filePaths.length}
                          </span>
                        </div>
                        <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                          <span className="text-slate-400 block text-[10px]">Symbols</span>
                          <span className="font-mono font-bold text-slate-800 text-sm">
                            {selectedAreaDetails.symbols.length}
                          </span>
                        </div>
                      </div>

                      <div>
                        <label className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">
                          Contained Files
                        </label>
                        <div className="space-y-1 mt-1 max-h-48 overflow-auto">
                          {selectedAreaDetails.filePaths.map((f) => (
                            <div
                              key={f}
                              onClick={() => goToSymbol(f, null)}
                              className="p-1.5 bg-slate-50 border border-slate-200 rounded-lg font-mono text-[11px] hover:bg-slate-100 cursor-pointer flex items-center justify-between"
                            >
                              <span className="truncate text-slate-700 font-semibold">{f}</span>
                              <ArrowRight className="w-3 h-3 text-emerald-600 shrink-0 ml-1" />
                            </div>
                          ))}
                        </div>
                      </div>

                      <Button
                        size="sm"
                        onClick={() => goToModule(selectedAreaDetails.name)}
                        className="w-full bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl"
                      >
                        Explore Files in Area
                      </Button>
                    </div>
                  )}

                  {/* Inspector Content for File */}
                  {selectedFileDetails && !selectedSymbol && (
                    <div className="space-y-3 text-xs">
                      <div>
                        <label className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">
                          File Location
                        </label>
                        <div className="font-mono text-slate-700 bg-slate-50 p-2 rounded-xl border border-slate-200 mt-1 break-all text-[11px]">
                          {selectedFileDetails.filePath}
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                          <span className="text-slate-400 block text-[10px]">Symbols</span>
                          <span className="font-mono font-bold text-slate-800 text-sm">
                            {selectedFileDetails.symbols.length}
                          </span>
                        </div>
                        <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                          <span className="text-slate-400 block text-[10px]">Relations</span>
                          <span className="font-mono font-bold text-slate-800 text-sm">
                            {selectedFileDetails.incomingCount + selectedFileDetails.outgoingCount}
                          </span>
                        </div>
                      </div>

                      <div>
                        <label className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">
                          Contained Symbols
                        </label>
                        <div className="space-y-1 mt-1 max-h-48 overflow-auto">
                          {selectedFileDetails.symbols.map((sym) => (
                            <div
                              key={sym.id}
                              onClick={() => {
                                setSelectedSymbol(sym);
                                setIsInspectorDismissed(false);
                              }}
                              className="p-1.5 bg-slate-50 border border-slate-200 rounded-lg font-mono text-[11px] hover:bg-slate-100 cursor-pointer flex items-center justify-between"
                            >
                              <span className="truncate text-slate-800 font-semibold">{sym.name}</span>
                              <span className="text-[9px] px-1.5 py-0.2 bg-slate-200 text-slate-700 rounded font-sans font-bold capitalize">
                                {sym.type}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Inspector Content for Symbol */}
                  {selectedSymbol && (
                    <div className="space-y-3 text-xs">
                      <div>
                        <label className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">
                          File Path
                        </label>
                        <div className="font-mono text-slate-700 bg-slate-50 p-2 rounded-xl border border-slate-200 mt-1 break-all text-[11px]">
                          {selectedSymbol.filePath}
                        </div>
                      </div>

                      {selectedSymbol.location && (
                        <div className="grid grid-cols-2 gap-2">
                          <div className="bg-slate-50 p-2 rounded-xl border border-slate-200">
                            <span className="text-slate-400 block text-[10px]">Start Line</span>
                            <span className="font-mono font-bold text-slate-800">
                              {selectedSymbol.location.startLine ?? "N/A"}
                            </span>
                          </div>
                          <div className="bg-slate-50 p-2 rounded-xl border border-slate-200">
                            <span className="text-slate-400 block text-[10px]">End Line</span>
                            <span className="font-mono font-bold text-slate-800">
                              {selectedSymbol.location.endLine ?? "N/A"}
                            </span>
                          </div>
                        </div>
                      )}

                      <div>
                        <label className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">
                          Attributes
                        </label>
                        <div className="flex flex-wrap gap-1.5 mt-1">
                          <span className="px-2 py-0.5 bg-slate-100 border border-slate-200 rounded-md text-slate-700 font-medium">
                            Exported: {selectedSymbol.metadata?.exported ? "Yes" : "No"}
                          </span>
                          <span className="px-2 py-0.5 bg-slate-100 border border-slate-200 rounded-md text-slate-700 font-medium">
                            Async: {selectedSymbol.metadata?.async ? "Yes" : "No"}
                          </span>
                        </div>
                      </div>

                      {/* Relationships Trace */}
                      <div className="space-y-2 pt-2 border-t border-slate-100">
                        <label className="text-[10px] font-bold uppercase text-slate-400 tracking-wider block">
                          Relationships Trace
                        </label>

                        {symbolRelationsTrace.outgoing.length > 0 && (
                          <div className="space-y-1">
                            <div className="text-[10px] font-semibold text-emerald-600">
                              Calls / Outgoing ({symbolRelationsTrace.outgoing.length}):
                            </div>
                            <div className="space-y-1 max-h-28 overflow-auto">
                              {symbolRelationsTrace.outgoing.map(({ relation, otherSymbol }) => (
                                <div
                                  key={relation.id}
                                  onClick={() => {
                                    setSelectedSymbol(otherSymbol);
                                    setIsInspectorDismissed(false);
                                  }}
                                  className="p-1.5 bg-slate-50 border border-slate-200 rounded-lg font-mono text-[11px] hover:bg-slate-100 cursor-pointer flex items-center justify-between"
                                >
                                  <span className="font-semibold text-slate-800 truncate">
                                    {otherSymbol.name}
                                  </span>
                                  <span className="text-[9px] px-1.5 py-0.2 bg-emerald-100 text-emerald-800 rounded font-sans font-bold">
                                    {relation.type}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {symbolRelationsTrace.incoming.length > 0 && (
                          <div className="space-y-1 pt-1">
                            <div className="text-[10px] font-semibold text-indigo-600">
                              Called By / Incoming ({symbolRelationsTrace.incoming.length}):
                            </div>
                            <div className="space-y-1 max-h-28 overflow-auto">
                              {symbolRelationsTrace.incoming.map(({ relation, otherSymbol }) => (
                                <div
                                  key={relation.id}
                                  onClick={() => {
                                    setSelectedSymbol(otherSymbol);
                                    setIsInspectorDismissed(false);
                                  }}
                                  className="p-1.5 bg-slate-50 border border-slate-200 rounded-lg font-mono text-[11px] hover:bg-slate-100 cursor-pointer flex items-center justify-between"
                                >
                                  <span className="font-semibold text-slate-800 truncate">
                                    {otherSymbol.name}
                                  </span>
                                  <span className="text-[9px] px-1.5 py-0.2 bg-indigo-100 text-indigo-800 rounded font-sans font-bold">
                                    {relation.type}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {symbolRelationsTrace.incoming.length === 0 &&
                          symbolRelationsTrace.outgoing.length === 0 && (
                            <p className="text-slate-400 text-[11px]">No direct symbol relations found.</p>
                          )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
