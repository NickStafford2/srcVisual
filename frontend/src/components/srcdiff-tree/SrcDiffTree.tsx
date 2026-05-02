import { useEffect, useMemo, useState } from "react";
import type { VisualizedFile } from "../../types";
import { TreeNodeRow } from "./TreeNodeRow";

type SrcDiffTreeProps = {
  files: VisualizedFile[];
  selectedFileIndex: number;
  selectedNodeId: string | null;
  onSelectFileIndex: (index: number) => void;
  onSelectNode: (nodeId: string) => void;
};

export default function SrcDiffTree({
  files,
  selectedFileIndex,
  selectedNodeId,
  onSelectFileIndex,
  onSelectNode,
}: SrcDiffTreeProps) {
  const initialExpanded = useMemo(() => {
    const ids = new Set<string>();

    for (const file of files) {
      if (!file.tree) continue;

      ids.add(file.tree.id);

      for (const child of file.tree.children) {
        ids.add(child.id);
      }
    }

    return ids;
  }, [files]);

  const [expandedIds, setExpandedIds] = useState<Set<string>>(initialExpanded);

  useEffect(() => {
    setExpandedIds(initialExpanded);
  }, [initialExpanded]);

  function handleToggleNode(nodeId: string) {
    setExpandedIds((current) => {
      const next = new Set(current);

      if (next.has(nodeId)) {
        next.delete(nodeId);
      } else {
        next.add(nodeId);
      }

      return next;
    });
  }

  if (files.length === 0) {
    return (
      <div className="rounded-[20px] border border-white/10 bg-slate-950/65 px-5 py-5 text-sm text-slate-400 shadow-[0_16px_48px_rgba(0,0,0,0.24)] backdrop-blur-xl">
        Upload or paste a srcdiff file to build the tree view.
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-[20px] border border-white/10 bg-slate-950/65 shadow-[0_16px_48px_rgba(0,0,0,0.24)] backdrop-blur-xl">
      <div className="border-b border-white/10 px-5 py-4">
        <h2 className="text-xl font-semibold text-slate-50">srcDiff Units</h2>

        <p className="mt-1 text-sm leading-5 text-slate-300">
          Units are shown in srcdiff order. Each unit has one root tree.
        </p>
      </div>

      <div className="max-h-[48vh] overflow-auto font-mono text-sm">
        <div className="divide-y divide-white/10">
          {files.map((file, index) => (
            <UnitTree
              key={`${file.unit}-${file.filename}`}
              file={file}
              fileIndex={index}
              isFocused={index === selectedFileIndex}
              selectedNodeId={selectedNodeId}
              expandedIds={expandedIds}
              onSelectFileIndex={onSelectFileIndex}
              onSelectNode={onSelectNode}
              onToggleNode={handleToggleNode}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

type UnitTreeProps = {
  file: VisualizedFile;
  fileIndex: number;
  isFocused: boolean;
  selectedNodeId: string | null;
  expandedIds: Set<string>;
  onSelectFileIndex: (index: number) => void;
  onSelectNode: (nodeId: string) => void;
  onToggleNode: (nodeId: string) => void;
};

function UnitTree({
  file,
  fileIndex,
  isFocused,
  selectedNodeId,
  expandedIds,
  onSelectFileIndex,
  onSelectNode,
  onToggleNode,
}: UnitTreeProps) {
  return (
    <section
      className={[
        "px-3 py-2.5 transition",
        isFocused ? "bg-sky-300/[0.06]" : "",
      ].join(" ")}
    >
      <button
        type="button"
        className="mb-1.5 flex w-full cursor-pointer items-center gap-2 rounded-xl px-2.5 py-1.5 text-left transition hover:bg-white/5"
        onClick={() => onSelectFileIndex(fileIndex)}
      >
        <span className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[10px] tracking-wide text-slate-300 uppercase">
          unit {file.unit}
        </span>

        <span className="min-w-0 flex-1 truncate text-sm text-slate-100">
          {file.filename}
        </span>

        {file.language ? (
          <span className="text-xs text-slate-500">{file.language}</span>
        ) : null}

        {isFocused ? (
          <span className="rounded-full border border-sky-300/20 bg-sky-300/10 px-2 py-0.5 text-[10px] tracking-wide text-sky-100 uppercase">
            focused
          </span>
        ) : null}
      </button>

      <div className="px-1">
        {file.tree ? (
          <TreeNodeRow
            node={file.tree}
            depth={0}
            expandedIds={expandedIds}
            selectedNodeId={selectedNodeId}
            onSelectNode={onSelectNode}
            onToggleNode={onToggleNode}
          />
        ) : (
          <div className="px-3 py-2 text-sm text-slate-400">
            No tree returned for this unit.
          </div>
        )}
      </div>
    </section>
  );
}
