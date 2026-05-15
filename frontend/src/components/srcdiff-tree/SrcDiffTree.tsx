import { useEffect, useMemo, useState } from "react";
import type { VisualizedFile } from "../../types";
import { useSrcDiffHighlight } from "../../srcdiff/highlightContext";
import { UnitTree } from "./UnitTree";

type SrcDiffTreeProps = {
  files: VisualizedFile[];
  onHighlightNode: (nodeId: string) => void;
  onHighlightMoveGroup: (nodeId: string) => void;
};

export default function SrcDiffTree({
  files,
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
      aria-label="SrcDiff Tree"
      className="overflow-hidden rounded-[20px] border border-white/10 bg-slate-950/65 shadow-[0_16px_48px_rgba(0,0,0,0.24)] backdrop-blur-xl"
    >
      <div className="flex flex-col gap-3 border-b border-white/10 px-5 py-4 md:flex-row md:items-start md:justify-between">
        <div className="flex w-full flex-row justify-between gap-2">
          <div>
            <h2 className="text-2xl font-semibold text-slate-50">
              SrcDiff Tree
            </h2>

            <p className="mt-1 text-sm leading-5 text-slate-300">
              Use node actions to highlight one node or an entire move group, or
              use the bulk highlight controls for moves, inserts, and deletes.
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
          </div>
        </div>
      </div>

      <div className="max-h-[48vh] overflow-auto font-mono text-sm">
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
