import { useEffect, useMemo, useState } from "react";
import type { VisualizedFile } from "../../types";
import { UnitTree } from "./UnitTree";

type HighlightMode = "selection" | "all-moves" | "all-inserts" | "all-deletes";

type SrcDiffTreeProps = {
  files: VisualizedFile[];
  selectedFileIndex: number;
  selectedNodeId: string | null;
  highlightedNodeIds: Set<string>;
  highlightMode: HighlightMode;
  onSelectFileIndex: (index: number) => void;
  onSelectNode: (nodeId: string) => void;
  onHighlightAllMoves: () => void;
  onHighlightAllInserts: () => void;
  onHighlightAllDeletes: () => void;
  onClearHighlights: () => void;
};

export default function SrcDiffTree({
  files,
  selectedFileIndex,
  selectedNodeId,
  highlightedNodeIds,
  highlightMode,
  onSelectFileIndex,
  onSelectNode,
  onHighlightAllMoves,
  onHighlightAllInserts,
  onHighlightAllDeletes,
  onClearHighlights,
}: SrcDiffTreeProps) {
  const { allExpandableIds, initialExpandedIds } = useMemo(() => {
    const allIds = new Set<string>();
    const ids = new Set<string>();

    function collectExpandableIds(node: VisualizedFile["tree"]) {
      if (!node) {
        return;
      }

      if (node.children.length > 0) {
        allIds.add(node.id);
      }

      for (const child of node.children) {
        collectExpandableIds(child);
      }
    }

    for (const unit of files) {
      if (!unit.tree) continue;

      collectExpandableIds(unit.tree);
      ids.add(unit.tree.id);

      for (const child of unit.tree.children) {
        ids.add(child.id);
      }
    }

    return {
      allExpandableIds: allIds,
      initialExpandedIds: ids,
    };
  }, [files]);

  const [expandedIds, setExpandedIds] =
    useState<Set<string>>(initialExpandedIds);

  useEffect(() => {
    setExpandedIds(initialExpandedIds);
  }, [initialExpandedIds]);

  const areAllNodesExpanded = useMemo(() => {
    if (allExpandableIds.size === 0) {
      return false;
    }

    for (const nodeId of allExpandableIds) {
      if (!expandedIds.has(nodeId)) {
        return false;
      }
    }

    return true;
  }, [allExpandableIds, expandedIds]);

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

  function handleToggleAllNodes() {
    setExpandedIds(
      areAllNodesExpanded ? new Set<string>() : new Set(allExpandableIds),
    );
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
        <div className="flex flex-row gap-2">
          <div>
            <h2 className="text-xl font-semibold text-slate-50">
              srcdiff Units
            </h2>

            <p className="mt-1 text-sm leading-5 text-slate-300">
              Select a node to highlight it, select a moved node to highlight
              its move partners, or bulk-highlight all moves, inserts, or
              deletes.
            </p>
          </div>

          <div className="flex flex-row flex-wrap gap-2">
            <button
              type="button"
              onClick={handleToggleAllNodes}
              className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-medium text-slate-200 transition hover:-translate-y-0.5 hover:bg-white/10"
            >
              {areAllNodesExpanded ? "Retract all nodes" : "Expand all nodes"}
            </button>

            <div className="grid grid-cols-2">
              <BulkHighlightButton
                label="Highlight all moves"
                active={highlightMode === "all-moves"}
                tone="move"
                onClick={onHighlightAllMoves}
              />

              <BulkHighlightButton
                label="Highlight all inserts"
                active={highlightMode === "all-inserts"}
                tone="insert"
                onClick={onHighlightAllInserts}
              />

              <BulkHighlightButton
                label="Highlight all deletes"
                active={highlightMode === "all-deletes"}
                tone="delete"
                onClick={onHighlightAllDeletes}
              />

              <button
                type="button"
                onClick={onClearHighlights}
                className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-medium text-slate-200 transition hover:-translate-y-0.5 hover:bg-white/10"
              >
                Clear highlights
              </button>
            </div>
          </div>
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

type BulkHighlightButtonProps = {
  label: string;
  active: boolean;
  tone: "move" | "insert" | "delete";
  onClick: () => void;
};

function BulkHighlightButton({
  label,
  active,
  tone,
  onClick,
}: BulkHighlightButtonProps) {
  const toneClasses = getBulkHighlightButtonClasses(tone, active);

  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        "rounded-xl border px-3 py-2 text-xs font-medium transition hover:-translate-y-0.5",
        toneClasses,
      ].join(" ")}
    >
      {label}
    </button>
  );
}

function getBulkHighlightButtonClasses(
  tone: BulkHighlightButtonProps["tone"],
  active: boolean,
): string {
  if (tone === "move") {
    return active
      ? "border-amber-300/30 bg-amber-300/15 text-amber-100"
      : "border-amber-300/20 bg-amber-300/10 text-amber-100 hover:bg-amber-300/20";
  }

  if (tone === "insert") {
    return active
      ? "border-sky-300/30 bg-sky-300/15 text-sky-100"
      : "border-sky-300/20 bg-sky-300/10 text-sky-100 hover:bg-sky-300/20";
  }

  return active
    ? "border-red-300/30 bg-red-300/15 text-red-100"
    : "border-red-300/20 bg-red-300/10 text-red-100 hover:bg-red-300/20";
}
