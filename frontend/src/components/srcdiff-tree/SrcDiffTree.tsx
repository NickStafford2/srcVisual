import { useEffect, useMemo, useState } from "react";
import type { VisualizedFile } from "../../types";
import { UnitTree } from "./UnitTree";

type SrcDiffTreeProps = {
  files: VisualizedFile[];
  selectedFileIndex: number;
  selectedNodeId: string | null;
  highlightedNodeIds: Set<string>;
  hasMoveHighlights: boolean;
  onSelectFileIndex: (index: number) => void;
  onSelectNode: (nodeId: string) => void;
  onHighlightAllMoves: () => void;
  onClearHighlights: () => void;
};

export default function SrcDiffTree({
  files,
  selectedFileIndex,
  selectedNodeId,
  highlightedNodeIds,
  hasMoveHighlights,
  onSelectFileIndex,
  onSelectNode,
  onHighlightAllMoves,
  onClearHighlights,
}: SrcDiffTreeProps) {
  const initialExpandedIds = useMemo(() => {
    const ids = new Set<string>();

    for (const unit of files) {
      if (!unit.tree) continue;

      ids.add(unit.tree.id);

      for (const child of unit.tree.children) {
        ids.add(child.id);
      }
    }

    return ids;
  }, [files]);

  const [expandedIds, setExpandedIds] =
    useState<Set<string>>(initialExpandedIds);

  useEffect(() => {
    setExpandedIds(initialExpandedIds);
  }, [initialExpandedIds]);

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
      <div className="flex flex-col gap-3 border-b border-white/10 px-5 py-4 md:flex-row md:items-start md:justify-between">
        <div>
          <h2 className="text-xl font-semibold text-slate-50">srcdiff Units</h2>

          <p className="mt-1 text-sm leading-5 text-slate-300">
            Units are shown in srcdiff order. Each unit has one root tree.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={onHighlightAllMoves}
            className={[
              "rounded-xl border px-3 py-2 text-xs font-medium transition hover:-translate-y-0.5",
              hasMoveHighlights
                ? "border-emerald-300/30 bg-emerald-300/15 text-emerald-100"
                : "border-emerald-300/20 bg-emerald-300/10 text-emerald-100 hover:bg-emerald-300/20",
            ].join(" ")}
          >
            Highlight all moves
          </button>

          <button
            type="button"
            onClick={onClearHighlights}
            className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-medium text-slate-200 transition hover:-translate-y-0.5 hover:bg-white/10"
          >
            Clear highlights
          </button>
        </div>
      </div>

      <div className="max-h-[48vh] overflow-auto font-mono text-sm">
        <div className="divide-y divide-white/10">
          {files.map((unit, unitIndex) => (
            <UnitTree
              key={`${unit.unit}-${unit.filename}`}
              unit={unit}
              unitIndex={unitIndex}
              isFocused={unitIndex === selectedFileIndex}
              selectedNodeId={selectedNodeId}
              highlightedNodeIds={highlightedNodeIds}
              expandedIds={expandedIds}
              onSelectUnitIndex={onSelectFileIndex}
              onSelectNode={onSelectNode}
              onToggleNode={handleToggleNode}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
