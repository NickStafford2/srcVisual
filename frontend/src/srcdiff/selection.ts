import type { HighlightKind, SourceCodeSpan, SrcDiffTreeNode } from "./types";

export type SrcDiffSelectionSpans = {
  kind: HighlightKind;
  xmlSpan: SourceCodeSpan | null;
  beforeSpan: SourceCodeSpan | null;
  afterSpan: SourceCodeSpan | null;
};

export function getSelectionSpans(
  selectedNode: SrcDiffTreeNode | null,
): SrcDiffSelectionSpans {
  return {
    kind: selectedNode?.kind ?? "plain",
    xmlSpan: selectedNode?.xml_span ?? null,
    beforeSpan: selectedNode?.before_span ?? null,
    afterSpan: selectedNode?.after_span ?? null,
  };
}
