import { useSrcDiffHighlight } from "../../../srcdiff/highlightContext";
import { HighlightSelector } from "../../srcdiff-tree/HighlightSelector";
import { getSelectionSpans } from "../../../srcdiff/selection";
import { buildSelectedNodeLinks } from "./selectedNodeLinks";
import { MoveDetails } from "./MoveDetails";
import { NodeInfoPanel, type NodeInfoPanelItem } from "./NodeInfoPanel";

export function HighlightedNodeInfo() {
  const {
    highlightedNodes,
    highlightMode,
    highlightAllMoves,
    highlightAllInserts,
    highlightAllDeletes,
    clearHighlights,
    unhighlightNode,
  } = useSrcDiffHighlight();

  const items: NodeInfoPanelItem[] = highlightedNodes.map((highlightedNode) => {
    const spans = getSelectionSpans(highlightedNode.node);
    const moveNodes = highlightedNode.node.move_id
      ? highlightedNodes.filter(
          (candidate) => candidate.node.move_id === highlightedNode.node.move_id,
        )
      : [];

    return {
      key: `${highlightedNode.fileIndex}-${highlightedNode.node.id}`,
      label: highlightedNode.node.label,
      filename: highlightedNode.filename,
      path: highlightedNode.node.path,
      moveId: highlightedNode.node.move_id,
      xmlSpanText: spans.xmlSpan
        ? `${spans.xmlSpan.start_line}:${spans.xmlSpan.start_col} → ${spans.xmlSpan.end_line}:${spans.xmlSpan.end_col}`
        : "missing",
      links: buildSelectedNodeLinks(spans, highlightedNode.fileIndex),
      details: highlightedNode.node.move_id ? (
        <MoveDetails
          moveId={highlightedNode.node.move_id}
          selectedNodeId={highlightedNode.node.id}
          nodes={moveNodes}
          variant="embedded"
        />
      ) : undefined,
      actions: (
        <button
          type="button"
          onClick={() => unhighlightNode(highlightedNode.node.id)}
          className="rounded-xl border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-medium text-slate-200 transition hover:-translate-y-0.5 hover:bg-white/10"
        >
          Unhighlight
        </button>
      ),
    };
  });

  return (
    <NodeInfoPanel
      title="Highlighted Nodes"
      emptyMessage="No nodes are highlighted right now."
      items={items}
      actions={
        <HighlightSelector
          highlightMode={highlightMode}
          onHighlightAllMoves={highlightAllMoves}
          onHighlightAllInserts={highlightAllInserts}
          onHighlightAllDeletes={highlightAllDeletes}
          onClearHighlights={clearHighlights}
        />
      }
    />
  );
}
