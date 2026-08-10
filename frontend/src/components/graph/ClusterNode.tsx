import React, { memo } from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import { FolderGit2, Code, Layers, ArrowRight } from "lucide-react";

export interface ClusterNodeData {
  clusterName: string;
  fileCount: number;
  symbolCount: number;
  incomingCount: number;
  outgoingCount: number;
  onSelectCluster?: (clusterName: string) => void;
}

export const ClusterNode: React.FC<NodeProps> = memo(({ data, selected }) => {
  const clusterData = data as unknown as ClusterNodeData;
  const {
    clusterName,
    fileCount,
    symbolCount,
    incomingCount,
    outgoingCount,
    onSelectCluster,
  } = clusterData;

  const displayName = clusterName || "Core Module";

  return (
    <div
      className={`relative w-[310px] rounded-2xl border bg-white p-5 shadow-sm transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 ${
        selected
          ? "ring-2 ring-emerald-500 border-emerald-500 shadow-md"
          : "border-slate-200/90"
      }`}
    >
      <Handle
        type="target"
        position={Position.Top}
        className="!bg-emerald-500 !w-3.5 !h-3.5 !border-2 !border-white"
      />

      {/* Top Accent Line */}
      <div className="absolute top-0 left-6 right-6 h-[3px] rounded-full bg-emerald-500" />

      <div className="space-y-3.5">
        {/* Header */}
        <div className="flex items-center space-x-3">
          <div className="p-2.5 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-100 shrink-0">
            <FolderGit2 className="w-5 h-5" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-[10px] font-bold tracking-wider uppercase text-emerald-600">
              Architectural Area
            </div>
            <div className="font-bold text-base text-slate-900 truncate font-mono" title={displayName}>
              {displayName}
            </div>
          </div>
        </div>

        {/* Metrics Grid */}
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100 flex items-center space-x-2">
            <FolderGit2 className="w-3.5 h-3.5 text-slate-400" />
            <span className="text-slate-600 font-medium">
              <strong className="text-slate-900 font-bold">{fileCount}</strong> {fileCount === 1 ? "file" : "files"}
            </span>
          </div>

          <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100 flex items-center space-x-2">
            <Code className="w-3.5 h-3.5 text-indigo-500" />
            <span className="text-slate-600 font-medium">
              <strong className="text-slate-900 font-bold">{symbolCount}</strong> symbols
            </span>
          </div>
        </div>

        {/* Relations & Action */}
        <div className="flex items-center justify-between text-xs text-slate-500 pt-2 border-t border-slate-100">
          <div className="flex items-center space-x-1.5 font-medium">
            <Layers className="w-3.5 h-3.5 text-slate-400" />
            <span>
              <strong className="text-slate-800">{outgoingCount}</strong> out · <strong className="text-slate-800">{incomingCount}</strong> in
            </span>
          </div>

          {onSelectCluster && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onSelectCluster(clusterName);
              }}
              className="text-xs font-semibold text-emerald-600 hover:text-emerald-700 flex items-center hover:underline cursor-pointer"
            >
              <span>Explore Area</span>
              <ArrowRight className="w-3.5 h-3.5 ml-1" />
            </button>
          )}
        </div>
      </div>

      <Handle
        type="source"
        position={Position.Bottom}
        className="!bg-emerald-500 !w-3.5 !h-3.5 !border-2 !border-white"
      />
    </div>
  );
});

ClusterNode.displayName = "ClusterNode";
