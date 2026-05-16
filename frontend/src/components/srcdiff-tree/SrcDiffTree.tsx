import { useEffect, useMemo, useState } from "react";
import type { VisualizedFile } from "../../types";
import { useSrcDiffHighlight } from "../../srcdiff/highlightContext";
import { UnitTree } from "./UnitTree";

type SrcDiffTreeProps = {
  files: VisualizedFile[];
  hasData: boolean;
  onHighlightNode: (nodeId: string) => void;
  onHighlightMoveGroup: (nodeId: string) => void;
};

export default function SrcDiffTree({
  files,
  hasData,
  onHighlightNode,
  onHighlightMoveGroup,
}: SrcDiffTreeProps) {
  const { highlightedNodeIds } = useSrcDiffHighlight();

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

  const _highlightedCount = highlightedNodeIds.size;
  const _isTreeEmpty = files.length === 0;

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

  return (
    <section
      data-sidebar-state={hasData ? "expanded" : "compact"}
      className={[
        "overflow-hidden rounded-[24px] border border-white/10 bg-slate-950/75 shadow-[0_20px_60px_rgba(0,0,0,0.32)] backdrop-blur-xl transition-all duration-300",
        hasData ? "min-h-[36rem]" : "min-h-[20rem]",
      ].join(" ")}
      aria-label="srcDiff Tree"
    >
      <div className="relative overflow-hidden border-b border-white/10 px-4 py-4">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(103,232,249,0.14),transparent_40%),radial-gradient(circle_at_bottom_right,rgba(251,191,36,0.12),transparent_36%)]" />
        <div className="relative">
          <p className="text-[11px] font-medium tracking-[0.28em] text-slate-500 uppercase">
            Navigator
          </p>

          <div className="grid gap-2 text-xs text-slate-300 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
            <div className="rounded-2xl border border-white/10 bg-black/20 px-3 py-2.5">
              <div className="text-[11px] tracking-[0.2em] text-slate-500 uppercase">
                Files
              </div>
              <div className="text-lg font-semibold text-slate-100">
                {files.length}
              </div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-black/20 px-3 py-2.5">
              <div className="text-[11px] tracking-[0.2em] text-slate-500 uppercase">
                Highlighted
              </div>
              <div className="text-lg font-semibold text-slate-100">
                {_highlightedCount}
              </div>
            </div>
          </div>

          {hasData ? (
            <div className="mt-4 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={handleToggleAllNodes}
                className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-medium text-slate-200 transition hover:-translate-y-0.5 hover:bg-white/10"
              >
                {areAllNodesExpanded ? "Retract all nodes" : "Expand all nodes"}
              </button>
            </div>
          ) : (
            <p className="mt-4 text-sm leading-6 text-slate-300">
              Waiting for input. This rail expands automatically when a result
              arrives.
            </p>
          )}
        </div>
      </div>

      <div
        id="srcdiff-tree-content"
        className={[
          "font-mono text-sm transition-all duration-300",
          hasData
            ? "max-h-[60vh] overflow-auto opacity-100"
            : "max-h-0 overflow-hidden opacity-0",
        ].join(" ")}
      >
        <div className="divide-y divide-white/10">
          {files.map((unit, unitIndex) => (
            <UnitTree
              key={`${unit.unit_id}-${unit.filename}`}
              unit={unit}
              unitIndex={unitIndex}
              highlightedNodeIds={highlightedNodeIds}
              expandedIds={expandedIds}
              onHighlightNode={onHighlightNode}
              onHighlightMoveGroup={onHighlightMoveGroup}
              onToggleNode={handleToggleNode}
            />
          ))}
        </div>
      </div>

      {_isTreeEmpty ? (
        <div className="flex items-center justify-center px-4 py-6 text-center text-sm text-slate-400">
          No tree data loaded yet.
        </div>
      ) : null}
    </section>
  );
}
