import type { VisualizedFile } from "../../types";
import { TreeNodeRow } from "./TreeNodeRow";

type UnitTreeProps = {
  unit: VisualizedFile;
  unitIndex: number;
  highlightedNodeIds: Set<string>;
  expandedIds: Set<string>;
  onHighlightNode: (nodeId: string) => void;
  onHighlightMoveGroup: (nodeId: string) => void;
  onToggleNode: (nodeId: string) => void;
};

export function UnitTree({
  unit,
  unitIndex,
  highlightedNodeIds,
  expandedIds,
  onHighlightNode,
  onHighlightMoveGroup,
  onToggleNode,
}: UnitTreeProps) {
  return (
    <section className="flex flex-row px-1 py-1.5 transition">
      {unit.tree ? (
        <TreeNodeRow
          fileIndex={unitIndex}
          node={unit.tree}
          depth={0}
          expandedIds={expandedIds}
          highlightedNodeIds={highlightedNodeIds}
          onHighlightNode={onHighlightNode}
          onHighlightMoveGroup={onHighlightMoveGroup}
          onToggleNode={onToggleNode}
        />
      ) : (
        <div className="px-1 py-1.5 text-sm text-slate-400">
          No tree returned for this unit.
        </div>
      )}
    </section>
  );
}
