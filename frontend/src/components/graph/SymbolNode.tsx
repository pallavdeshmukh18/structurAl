import React, { memo } from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import { Code2, Box, ArrowRightLeft, Package, Cpu } from "lucide-react";

export interface SymbolNodeData {
  name: string;
  symbolType: string;
  filePath: string;
  language: string | null;
  location?: {
    startLine: number | null;
    startColumn: number | null;
    endLine: number | null;
    endColumn: number | null;
  };
  metadata?: {
    exported?: boolean;
    async?: boolean;
    visibility?: string | null;
  };
}

export const SymbolNode: React.FC<NodeProps> = memo(({ data, selected }) => {
  const symbolData = data as unknown as SymbolNodeData;
  const { name, symbolType, filePath, metadata } = symbolData;

  const getTypeStyle = (type: string) => {
    const lower = (type || "").toLowerCase();
    if (lower === "function" || lower === "method") {
      return {
        bg: "bg-emerald-50 text-emerald-600 border-emerald-100",
        badge: "bg-emerald-100 text-emerald-800",
        icon: Code2,
        accent: "bg-emerald-500",
      };
    }
    if (lower === "class" || lower === "interface") {
      return {
        bg: "bg-purple-50 text-purple-600 border-purple-100",
        badge: "bg-purple-100 text-purple-800",
        icon: Box,
        accent: "bg-purple-500",
      };
    }
    if (lower === "route") {
      return {
        bg: "bg-amber-50 text-amber-600 border-amber-100",
        badge: "bg-amber-100 text-amber-800",
        icon: ArrowRightLeft,
        accent: "bg-amber-500",
      };
    }
    if (lower === "import") {
      return {
        bg: "bg-cyan-50 text-cyan-600 border-cyan-100",
        badge: "bg-cyan-100 text-cyan-800",
        icon: Package,
        accent: "bg-cyan-500",
      };
    }
    return {
      bg: "bg-slate-50 text-slate-600 border-slate-100",
      badge: "bg-slate-100 text-slate-700",
      icon: Cpu,
      accent: "bg-slate-400",
    };
  };

  const style = getTypeStyle(symbolType);
  const Icon = style.icon;

  const fileName = filePath ? filePath.split("/").pop() || filePath : "";
  const folderPath =
    filePath && filePath.includes("/")
      ? filePath.substring(0, filePath.lastIndexOf("/"))
      : "";

  return (
    <div
      className={`relative w-[220px] rounded-lg border bg-white p-2.5 shadow-sm transition-all duration-150 hover:shadow-md ${
        selected ? "ring-2 ring-emerald-500 border-emerald-500 shadow-md" : "border-slate-200"
      }`}
    >
      <Handle
        type="target"
        position={Position.Top}
        className="!bg-slate-400 !w-2.5 !h-2.5 !border-2 !border-white"
      />

      <div className={`absolute top-0 left-3 right-3 h-[2px] rounded-full ${style.accent}`} />

      <div className="flex items-start space-x-2">
        <div className={`p-1.5 rounded-md ${style.bg} shrink-0 mt-0.5 border`}>
          <Icon className="w-3.5 h-3.5" />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-1">
            <span className="font-semibold text-xs text-slate-900 truncate" title={name}>
              {name}
            </span>
            <span
              className={`text-[10px] px-1.5 py-0.5 rounded font-mono font-medium shrink-0 ${style.badge}`}
            >
              {symbolType}
            </span>
          </div>

          <div className="mt-1 text-[11px] text-slate-500 truncate font-mono" title={filePath}>
            <span className="text-slate-400">{folderPath ? `${folderPath}/` : ""}</span>
            <span className="font-medium text-slate-700">{fileName}</span>
          </div>

          {(metadata?.exported || metadata?.async) && (
            <div className="mt-1.5 flex items-center gap-1">
              {metadata?.exported && (
                <span className="text-[9px] px-1 py-0.2 bg-emerald-50 text-emerald-600 border border-emerald-200 rounded">
                  export
                </span>
              )}
              {metadata?.async && (
                <span className="text-[9px] px-1 py-0.2 bg-purple-50 text-purple-600 border border-purple-200 rounded">
                  async
                </span>
              )}
            </div>
          )}
        </div>
      </div>

      <Handle
        type="source"
        position={Position.Bottom}
        className="!bg-slate-400 !w-2.5 !h-2.5 !border-2 !border-white"
      />
    </div>
  );
});

SymbolNode.displayName = "SymbolNode";
