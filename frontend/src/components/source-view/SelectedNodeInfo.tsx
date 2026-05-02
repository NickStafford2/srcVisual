import type { SrcDiffSelectionSpans } from "../../srcdiff/selection";
import type { SrcDiffTreeNode } from "../../srcdiff/types";
import { buildSelectedNodeLinks } from "./selectedNodeLinks";
import { NodeInfoPanel, type NodeInfoPanelItem } from "./NodeInfoPanel";

type SelectedNodeInfoProps = {
  selectedNode: SrcDiffTreeNode | null;
  selectedFilename: string | null;
  selectedNodeFileIndex: number | null;
  selectedSpans: SrcDiffSelectionSpans;
};

export function SelectedNodeInfo({
  selectedNode,
  selectedFilename,
  selectedNodeFileIndex,
  selectedSpans,
}: SelectedNodeInfoProps) {
  const items: NodeInfoPanelItem[] =
    selectedNode && selectedNodeFileIndex !== null
      ? [
          {
            key: selectedNode.id,
            label: selectedNode.label,
            filename: selectedFilename,
            path: selectedNode.path,
            moveId: selectedNode.move_id,
            xmlSpanText: selectedSpans.xmlSpan
              ? `${selectedSpans.xmlSpan.start_line}:${selectedSpans.xmlSpan.start_col} → ${selectedSpans.xmlSpan.end_line}:${selectedSpans.xmlSpan.end_col}`
              : "missing",
            links: buildSelectedNodeLinks(selectedSpans, selectedNodeFileIndex),
          },
        ]
      : [];

  return (
    <NodeInfoPanel
      title="Selected Nodes"
      emptyMessage="Select a node to inspect it here."
      items={items}
    />
  );
}
