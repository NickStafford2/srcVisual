import { useEffect, useMemo, useState } from "react";
import type { VisualizedFile } from "../../types";
import { useSrcDiffHighlight } from "../../srcdiff/highlightContext";
import { UnitTree } from "./UnitTree";

type SrcDiffTreeProps = {
  files: VisualizedFile[];
  sidebarCollapsed: boolean;
  onToggleSidebar: () => void;
  onHighlightNode: (nodeId: string) => void;
  onHighlightMoveGroup: (nodeId: string) => void;
};

export default function SrcDiffTree({
  files,
  sidebarCollapsed,
  onToggleSidebar,
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

  const highlightedCount = highlightedNodeIds.size;

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
      data-sidebar-collapsed={sidebarCollapsed ? "true" : "false"}
      className={[
        "h-full overflow-hidden rounded-[24px] border border-white/10 bg-slate-950/75 shadow-[0_20px_60px_rgba(0,0,0,0.32)] backdrop-blur-xl",
        sidebarCollapsed ? "xl:min-h-[36rem]" : "",
      ].join(" ")}
      aria-label="srcDiff Tree"
    >
      <div className="relative overflow-hidden border-b border-white/10">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(103,232,249,0.14),transparent_40%),radial-gradient(circle_at_bottom_right,rgba(251,191,36,0.12),transparent_36%)]" />
        <div
          className={[
            "relative flex flex-col gap-4",
            sidebarCollapsed ? "px-3 py-4" : "px-5 py-4",
          ].join(" ")}
        >
          <div
            className={[
              "flex gap-3",
              sidebarCollapsed
                ? "items-start justify-between xl:flex-col"
                : "items-start justify-between",
            ].join(" ")}
          >
            <div className="min-w-0">
              <div className="flex items-center gap-2 text-[11px] font-medium tracking-[0.28em] text-slate-400 uppercase">
                <span className="h-2 w-2 rounded-full bg-cyan-300 shadow-[0_0_16px_rgba(103,232,249,0.85)]" />
                {sidebarCollapsed ? "Tree" : "Navigator"}
              </div>

              <h2
                className={[
                  "mt-3 font-semibold text-slate-50",
                  sidebarCollapsed ? "text-lg" : "text-2xl",
                ].join(" ")}
              >
                srcDiff Tree
              </h2>

              <p
                className={[
                  "mt-1 text-sm leading-5 text-slate-300",
                  sidebarCollapsed ? "xl:hidden" : "",
                ].join(" ")}
              >
                Use node actions to highlight one node or an entire move group,
                or use the bulk highlight controls for moves, inserts, and
                deletes.
              </p>
            </div>

            <button
              type="button"
              onClick={onToggleSidebar}
              aria-expanded={!sidebarCollapsed}
              aria-controls="srcdiff-tree-content"
              className={[
                "inline-flex shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-black/20 px-3 py-2 text-xs font-medium text-slate-100 transition hover:-translate-y-0.5 hover:bg-white/10",
                sidebarCollapsed ? "xl:w-full" : "",
              ].join(" ")}
            >
              {sidebarCollapsed ? "Open tree" : "Collapse tree"}
            </button>
          </div>

          <div
            className={[
              "grid gap-2 text-xs text-slate-300",
              sidebarCollapsed ? "grid-cols-1" : "grid-cols-2",
            ].join(" ")}
          >
            <div className="rounded-2xl border border-white/10 bg-black/20 px-3 py-2.5">
              <div className="text-[11px] tracking-[0.2em] text-slate-500 uppercase">
                Files
              </div>
              <div className="mt-1 text-lg font-semibold text-slate-100">
                {files.length}
              </div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-black/20 px-3 py-2.5">
              <div className="text-[11px] tracking-[0.2em] text-slate-500 uppercase">
                Highlighted
              </div>
              <div className="mt-1 text-lg font-semibold text-slate-100">
                {highlightedCount}
              </div>
            </div>
          </div>

          <div
            className={[
              "flex flex-wrap gap-2",
              sidebarCollapsed ? "xl:hidden" : "",
            ].join(" ")}
          >
            <button
              type="button"
              onClick={handleToggleAllNodes}
              className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-medium text-slate-200 transition hover:-translate-y-0.5 hover:bg-white/10"
            >
              {areAllNodesExpanded ? "Retract all nodes" : "Expand all nodes"}
            </button>
          </div>
        </div>
      </div>

      {sidebarCollapsed ? (
        <div className="flex h-full flex-col justify-end gap-3 p-3 text-xs text-slate-400">
          <div className="rounded-2xl border border-dashed border-white/10 bg-white/[0.03] px-3 py-4 leading-5">
            Left rail stays small.
            <br />
            Open it when you need node-level work.
          </div>
        </div>
      ) : null}

      <div
        id="srcdiff-tree-content"
        className={[
          "font-mono text-sm transition-all duration-300",
          sidebarCollapsed
            ? "max-h-0 overflow-hidden opacity-0"
            : "max-h-[60vh] overflow-auto opacity-100",
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
    </section>
  );
}
