import React, { memo } from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import { FileCode, Layers, ArrowRight, Code } from "lucide-react";

export interface FileNodeData {
  filePath: string;
  symbolCount: number;
  relationCount: number;
  language: string | null;
  onDrillDown?: (filePath: string) => void;
}

export const FileNode: React.FC<NodeProps> = memo(({ data, selected }) => {
  const fileData = data as unknown as FileNodeData;
  const { filePath, symbolCount, relationCount, language, onDrillDown } = fileData;

  const fileName = filePath ? filePath.split("/").pop() || filePath : "";
  const folderPath =
    filePath && filePath.includes("/")
      ? filePath.substring(0, filePath.lastIndexOf("/"))
      : "";

  return (
    <div
      className={`relative w-[260px] rounded-xl border bg-white p-3 shadow-sm transition-all duration-150 hover:shadow-md ${
        selected
          ? "ring-2 ring-emerald-500 border-emerald-500 shadow-lg"
          : "border-slate-200"
      }`}
    >
      <Handle
        type="target"
        position={Position.Top}
        className="!bg-emerald-500 !w-3 !h-3 !border-2 !border-white"
      />

      {/* Top accent bar */}
      <div className="absolute top-0 left-4 right-4 h-[3px] rounded-full bg-emerald-500" />

      <div className="space-y-2">
        {/* Header */}
        <div className="flex items-start space-x-2.5">
          <div className="p-2 rounded-lg bg-emerald-50 text-emerald-600 border border-emerald-100 shrink-0">
            <FileCode className="w-4 h-4" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="font-semibold text-xs text-slate-900 truncate font-mono" title={fileName}>
              {fileName}
            </div>
            <div className="text-[10px] text-slate-400 font-mono truncate" title={folderPath}>
              {folderPath ? `${folderPath}/` : "./"}
            </div>
          </div>
        </div>

        {/* Metrics Row */}
        <div className="grid grid-cols-2 gap-1.5 pt-1 border-t border-slate-100 text-[11px]">
          <div className="flex items-center space-x-1.5 text-slate-600 bg-slate-50 px-2 py-1 rounded border border-slate-100">
            <Code className="w-3 h-3 text-indigo-500" />
            <span>
              <strong className="font-semibold text-slate-900">{symbolCount}</strong> symbols
            </span>
          </div>
          <div className="flex items-center space-x-1.5 text-slate-600 bg-slate-50 px-2 py-1 rounded border border-slate-100">
            <Layers className="w-3 h-3 text-emerald-500" />
            <span>
              <strong className="font-semibold text-slate-900">{relationCount}</strong> rels
            </span>
          </div>
        </div>

        {/* Footer / Action */}
        <div className="flex items-center justify-between pt-1">
          {language ? (
            <span className="text-[9px] font-mono uppercase px-1.5 py-0.5 bg-slate-100 text-slate-600 rounded">
              {language}
            </span>
          ) : (
            <span />
          )}

          {onDrillDown && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDrillDown(filePath);
              }}
              className="text-[10px] font-semibold text-emerald-600 hover:text-emerald-700 flex items-center hover:underline cursor-pointer"
            >
              <span>Explore Symbols</span>
              <ArrowRight className="w-3 h-3 ml-0.5" />
            </button>
          )}
        </div>
      </div>

      <Handle
        type="source"
        position={Position.Bottom}
        className="!bg-emerald-500 !w-3 !h-3 !border-2 !border-white"
      />
    </div>
  );
});

FileNode.displayName = "FileNode";
