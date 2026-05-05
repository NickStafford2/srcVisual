import type { VisualizedFile } from "../types";
import type { HighlightMode } from "./highlightContext";
import { getAllMoveEntries, type MoveIndex } from "./moveIndex";
import { getNodeHighlight, type SrcDiffHighlight } from "./selection";
import type { HighlightKind } from "./types";
import type { SrcDiffNodeEntry } from "./treeIndex";

type GetBaseHighlightedEntriesInput = {
  highlightMode: HighlightMode;
  selectedNodeEntry: SrcDiffNodeEntry | null;
  selectedMoveId: string | null;
  treeEntries: SrcDiffNodeEntry[];
  moveIndex: MoveIndex;
};

type GetHighlightedEntriesInput = GetBaseHighlightedEntriesInput & {
  suppressedNodeIds: Set<string>;
};

export function getHighlightedEntries({
  suppressedNodeIds,
  ...input
}: GetHighlightedEntriesInput): SrcDiffNodeEntry[] {
  const baseEntries = getBaseHighlightedEntries(input);

  if (suppressedNodeIds.size === 0) {
    return baseEntries;
  }

  return baseEntries.filter((entry) => !suppressedNodeIds.has(entry.node.id));
}

export function getFirstEntryForHighlightKind(
  kind: HighlightKind,
  treeEntries: SrcDiffNodeEntry[],
  moveIndex: MoveIndex,
): SrcDiffNodeEntry | null {
  if (kind === "move") {
    return getAllMoveEntries(moveIndex)[0] ?? null;
  }

  return treeEntries.find((entry) => entry.node.kind === kind) ?? null;
}

export function buildHighlightedNodeIds(
  entries: SrcDiffNodeEntry[],
): Set<string> {
  return new Set(entries.map((entry) => entry.node.id));
}

export function buildHighlightedSpans(
  entries: SrcDiffNodeEntry[],
): SrcDiffHighlight[] {
  return entries.map((entry) =>
    getNodeHighlight(entry.node, entry.fileIndex, entry.unitId, entry.filename),
  );
}

export function buildSourceHighlightedSpansByUnitId(
  files: VisualizedFile[],
  highlightedSpans: SrcDiffHighlight[],
): Map<number, SrcDiffHighlight[]> {
  const highlightsByUnitId = new Map<number, SrcDiffHighlight[]>();

  for (const highlight of highlightedSpans) {
    const matchingFile =
      files.find((file) => file.unit_id === highlight.unitId) ?? null;

    assertMatchingFilename(
      highlight.filename,
      matchingFile?.filename ?? null,
      `sourceHighlightedSpansByUnitId unit_id=${highlight.unitId}`,
    );

    const unitHighlights = highlightsByUnitId.get(highlight.unitId) ?? [];
    highlightsByUnitId.set(highlight.unitId, [...unitHighlights, highlight]);
  }

  return highlightsByUnitId;
}

function getBaseHighlightedEntries({
  highlightMode,
  selectedNodeEntry,
  selectedMoveId,
  treeEntries,
  moveIndex,
}: GetBaseHighlightedEntriesInput): SrcDiffNodeEntry[] {
  if (highlightMode === "all-moves") {
    return getAllMoveEntries(moveIndex);
  }

  if (highlightMode === "all-inserts") {
    return treeEntries.filter((entry) => entry.node.kind === "insert");
  }

  if (highlightMode === "all-deletes") {
    return treeEntries.filter((entry) => entry.node.kind === "delete");
  }

  if (!selectedNodeEntry) {
    return [];
  }

  if (selectedNodeEntry.node.kind === "move" && selectedMoveId) {
    return moveIndex.get(selectedMoveId) ?? [selectedNodeEntry];
  }

  return [selectedNodeEntry];
}

function assertMatchingFilename(
  expected: string,
  actual: string | null,
  context: string,
) {
  if (actual !== expected) {
    throw new Error(
      `Filename mismatch at ${context}: expected "${expected}", got "${actual}".`,
    );
  }
}
