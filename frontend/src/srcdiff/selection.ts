import type { HighlightKind, SourceCodeSpan, SrcDiffTreeNode } from "./types";

export type SrcDiffSelectionSpans = {
  kind: HighlightKind;
  xmlSpan: SourceCodeSpan | null;
  sourceCodeSpanBefore: SourceCodeSpan | null;
  sourceCodeSpanAfter: SourceCodeSpan | null;
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
