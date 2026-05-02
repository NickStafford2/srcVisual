import type { HighlightKind, SourceCodeSpan, SrcDiffTreeNode } from "./types";

export type SrcDiffSelectionSpans = {
  kind: HighlightKind;
  xmlSpan: SourceCodeSpan | null;
  sourceCodeSpanBefore: SourceCodeSpan | null;
  sourceCodeSpanAfter: SourceCodeSpan | null;
};

export type SrcDiffHighlight = SrcDiffSelectionSpans & {
  nodeId: string;
  fileIndex: number;
};

export function getSelectionSpans(
  selectedNode: SrcDiffTreeNode | null,
): SrcDiffSelectionSpans {
  return {
    kind: selectedNode?.kind ?? "plain",
    xmlSpan: selectedNode?.xml_span ?? null,
    sourceCodeSpanBefore: selectedNode?.before_span ?? null,
    sourceCodeSpanAfter: selectedNode?.after_span ?? null,
  };
}

export function getNodeHighlight(
  node: SrcDiffTreeNode,
  fileIndex: number,
): SrcDiffHighlight {
  return {
    nodeId: node.id,
    fileIndex,
    kind: node.kind,
    xmlSpan: node.xml_span ?? null,
    sourceCodeSpanBefore: node.before_span ?? null,
    sourceCodeSpanAfter: node.after_span ?? null,
  };
}
