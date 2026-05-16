import type { SrcMoveResults } from "../../../types";
import { useSrcDiffHighlight } from "../../../srcdiff/highlightContext";
import { HighlightSelector } from "../../srcdiff-tree/HighlightSelector";
import type { MoveNodeEntry } from "./moveInfo";
import { HighlightedNodeCard } from "./HighlightNodeCard";

type HighlightedNodeInfoProps = {
  moveResults: SrcMoveResults;
  moveNodesById: Map<string, MoveNodeEntry[]>;
};

export function HighlightedNodeInfo({
  moveResults,
  moveNodesById,
}: HighlightedNodeInfoProps) {
  const {
    highlightedNodes,
    highlightMode,
    highlightAllMoves,
    highlightAllInserts,
    highlightAllDeletes,
    clearHighlights,
    unhighlightNode,
  } = useSrcDiffHighlight();

  return (
    <section className="rounded-[18px] border border-white/10 bg-slate-950/70 p-4 shadow-[0_18px_50px_rgba(0,0,0,0.26)]">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <HighlightSelector
          highlightMode={highlightMode}
          onHighlightAllMoves={highlightAllMoves}
          onHighlightAllInserts={highlightAllInserts}
          onHighlightAllDeletes={highlightAllDeletes}
          onClearHighlights={clearHighlights}
        />
      </div>

      {highlightedNodes.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-white/10 bg-white/[0.03] px-3 py-4 text-sm text-slate-400">
          No nodes are highlighted right now.
        </p>
      ) : (
        <div className="space-y-3">
          {highlightedNodes.map((entry) => (
            <HighlightedNodeCard
              key={`${entry.fileIndex}-${entry.node.id}`}
              entry={entry}
              moveResults={moveResults}
              moveNodesById={moveNodesById}
              onUnhighlight={unhighlightNode}
            />
          ))}
        </div>
      )}
    </section>
  );
}
