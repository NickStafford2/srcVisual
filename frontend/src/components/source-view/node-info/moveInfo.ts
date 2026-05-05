import { getSelectionSpans } from "../../../srcdiff/selection";
import type { SrcDiffNodeEntry } from "../../../srcdiff/treeIndex";
import type { SrcDiffTreeNode } from "../../../srcdiff/types";
import type { SrcMoveRecord, SrcMoveResults } from "../../../types";

export type MoveNodeEntry = SrcDiffNodeEntry;

export type MoveInfo = {
  moveId: string;
  record: SrcMoveRecord | null;
  nodes: MoveNodeEntry[];
  files: string[];
  fromXpaths: string[];
  toXpaths: string[];
  fromRawTexts: string[];
  toRawTexts: string[];
};

export function buildMoveInfo(
  moveId: string,
  moveResults: SrcMoveResults,
  nodes: MoveNodeEntry[],
): MoveInfo {
  const record =
    moveResults.moves.find((candidate) => candidate.move_id === moveId) ?? null;

  const files = Array.from(
    new Set([
      ...extractFilenamesFromXpaths(record?.from_xpaths ?? []),
      ...extractFilenamesFromXpaths(record?.to_xpaths ?? []),
      ...nodes.map((node) => node.filename),
    ]),
  );

  return {
    moveId,
    record,
    nodes,
    files,
    fromXpaths: record?.from_xpaths ?? [],
    toXpaths: record?.to_xpaths ?? [],
    fromRawTexts: record?.from_raw_texts ?? [],
    toRawTexts: record?.to_raw_texts ?? [],
  };
}

export function buildMoveIds(
  moveResults: SrcMoveResults,
  moveNodesById: Map<string, MoveNodeEntry[]>,
): string[] {
  return Array.from(
    new Set([
      ...moveResults.moves.flatMap((move) =>
        move.move_id ? [move.move_id] : [],
      ),
      ...moveNodesById.keys(),
    ]),
  );
}

export function formatNodeSpanText(node: SrcDiffTreeNode) {
  const spans = getSelectionSpans(node);

  const rev0 = spans.revision0Span
    ? `${spans.revision0Span.start_line}:${spans.revision0Span.start_col}-${spans.revision0Span.end_line}:${spans.revision0Span.end_col}`
    : "missing";

  const rev1 = spans.revision1Span
    ? `${spans.revision1Span.start_line}:${spans.revision1Span.start_col}-${spans.revision1Span.end_line}:${spans.revision1Span.end_col}`
    : "missing";

  return { rev0, rev1 };
}

export function summarizeTextList(values: string[]): string {
  if (values.length === 0) {
    return "missing";
  }

  if (values.length === 1) {
    return values[0];
  }

  return `${values[0]} (+${values.length - 1} more)`;
}

function extractFilenamesFromXpaths(xpaths: string[]): string[] {
  const files: string[] = [];
  const seen = new Set<string>();
  const needle = "[@filename='";

  for (const xpath of xpaths) {
    const start = xpath.indexOf(needle);

    if (start === -1) {
      continue;
    }

    const fileStart = start + needle.length;
    const fileEnd = xpath.indexOf("']", fileStart);

    if (fileEnd === -1) {
      continue;
    }

    const filename = xpath.slice(fileStart, fileEnd);

    if (seen.has(filename)) {
      continue;
    }

    seen.add(filename);
    files.push(filename);
  }

  return files;
}
