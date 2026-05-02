import { useSrcDiffHighlight } from "../../srcdiff/highlightContext";
import { getSelectionSpans } from "../../srcdiff/selection";
import { buildSelectedNodeLinks } from "./selectedNodeLinks";
import { NodeInfoPanel, type NodeInfoPanelItem } from "./NodeInfoPanel";

export function HighlightedNodeInfo() {
  const { highlightedNodes } = useSrcDiffHighlight();

  const items: NodeInfoPanelItem[] = highlightedNodes.map((highlightedNode) => {
    const spans = getSelectionSpans(highlightedNode.node);

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
    };
  });

  return (
    <NodeInfoPanel
      title="Highlighted Nodes"
      emptyMessage="No nodes are highlighted right now."
      items={items}
    />
  );
}
