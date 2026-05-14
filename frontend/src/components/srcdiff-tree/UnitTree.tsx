import type { VisualizedFile } from "../../types";
import { TreeNodeRow } from "./TreeNodeRow";

type UnitTreeProps = {
  unit: VisualizedFile;
  unitIndex: number;
  isFocused: boolean;
  highlightedNodeIds: Set<string>;
  expandedIds: Set<string>;
  onSelectUnitIndex: (index: number) => void;
  onHighlightNode: (nodeId: string) => void;
  onHighlightMoveGroup: (nodeId: string) => void;
  onToggleNode: (nodeId: string) => void;
};

export function UnitTree({
  unit,
  unitIndex,
  isFocused,
  highlightedNodeIds,
  expandedIds,
  onSelectUnitIndex,
  onHighlightNode,
  onHighlightMoveGroup,
  onToggleNode,
}: UnitTreeProps) {
  return (
    <section
      className={[
        "flex flex-row px-3 py-2.5 transition",
        isFocused ? "bg-sky-300/[0.06]" : "",
      ].join(" ")}
    >
      <div className="px-1">
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
          <div className="px-3 py-2 text-sm text-slate-400">
            No tree returned for this unit.
          </div>
        )}
      </div>

      <button
        type="button"
        className="flex w-full cursor-pointer flex-row items-start justify-end gap-2 rounded-xl px-2.5 py-1.5 text-left transition hover:bg-white/5"
        onClick={() => onSelectUnitIndex(unitIndex)}
      >
        <span className="truncate text-sm text-slate-100">{unit.filename}</span>

        {unit.language ? (
          <span className="text-xs text-slate-500">{unit.language}</span>
        ) : null}

        <span className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[10px] tracking-wide text-slate-300 uppercase">
          unit {unit.unit_id}
        </span>
      </button>
    </section>
  );
}
