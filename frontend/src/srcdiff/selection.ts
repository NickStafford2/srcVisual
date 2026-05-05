import type { HighlightKind, SourceCodeSpan, SrcDiffTreeNode } from "./types";

export type SrcDiffSelectionSpans = {
  kind: HighlightKind;
  xmlSpan: SourceCodeSpan | null;
  revision0Span: SourceCodeSpan | null;
  revision1Span: SourceCodeSpan | null;
};

export type SrcDiffHighlight = SrcDiffSelectionSpans & {
  nodeId: string;
  moveId: string | null;
  fileIndex: number;
  unitId: number;
  filename: string;
};

export function getSelectionSpans(
  selectedNode: SrcDiffTreeNode | null,
): SrcDiffSelectionSpans {
  return {
    kind: selectedNode?.kind ?? "plain",
    xmlSpan: selectedNode?.xml_span ?? null,
    revision0Span: selectedNode?.revision_0_span ?? null,
    revision1Span: selectedNode?.revision_1_span ?? null,
  };
}

export function getNodeHighlight(
  node: SrcDiffTreeNode,
  fileIndex: number,
  unitId: number,
  filename: string,
): SrcDiffHighlight {
  return {
    nodeId: node.id,
    moveId: node.move_id ?? null,
    fileIndex,
    unitId,
    filename,
    kind: node.kind,
    xmlSpan: node.xml_span ?? null,
    revision0Span: node.revision_0_span ?? null,
    revision1Span: node.revision_1_span ?? null,
  };
}
