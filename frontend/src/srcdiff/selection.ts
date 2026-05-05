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
    revision0Span: resolvePreferredSourceSpan(node, "revision_0_span"),
    revision1Span: resolvePreferredSourceSpan(node, "revision_1_span"),
  };
}

function resolvePreferredSourceSpan(
  node: SrcDiffTreeNode,
  key: "revision_0_span" | "revision_1_span",
): SourceCodeSpan | null {
  const directSpan =
    key === "revision_0_span"
      ? (node.revision_0_span ?? null)
      : (node.revision_1_span ?? null);

  if (node.kind !== "move") {
    return directSpan;
  }

  // srcMove marks the diff wrapper itself as the move region. A moved
  // diff:delete must only highlight revision 0, and a moved diff:insert
  // must only highlight revision 1.
  if (node.tag === "diff:delete" || node.tag === "diff:insert") {
    return directSpan;
  }

  const childSpans = node.children.flatMap((child) => {
    const span = resolvePreferredSourceSpan(child, key);
    return span ? [span] : [];
  });

  if (childSpans.length === 0) {
    return directSpan;
  }

  return mergeSpans(childSpans);
}

function mergeSpans(spans: SourceCodeSpan[]): SourceCodeSpan {
  const start = spans.reduce((best, span) =>
    compareSpanPoints(
      [span.start_line, span.start_col],
      [best.start_line, best.start_col],
    ) < 0
      ? span
      : best,
  );

  const end = spans.reduce((best, span) =>
    compareSpanPoints(
      [span.end_line, span.end_col],
      [best.end_line, best.end_col],
    ) > 0
      ? span
      : best,
  );

  return {
    start_line: start.start_line,
    start_col: start.start_col,
    end_line: end.end_line,
    end_col: end.end_col,
  };
}

function compareSpanPoints(
  left: [number, number],
  right: [number, number],
): number {
  if (left[0] !== right[0]) {
    return left[0] - right[0];
  }

  return left[1] - right[1];
}
