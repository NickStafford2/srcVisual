import type { HighlightKind, SourceSpan, SrcDiffTreeNode } from "./types";

export type SrcDiffSelectionSpans = {
  kind: HighlightKind;
  xmlSpan: SourceSpan | null;
  beforeSpan: SourceSpan | null;
  afterSpan: SourceSpan | null;
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
