import type { VisualizedFile } from "../types";
import type { HighlightMode } from "./highlightContext";
import {
  dedupeNodeEntries,
  getAllMoveEntries,
  type MoveIndex,
} from "./moveIndex";
import { getNodeHighlight, type SrcDiffHighlight } from "./selection";
import type { SrcDiffNodeEntry } from "./treeIndex";

type GetBaseHighlightedEntriesInput = {
  highlightMode: HighlightMode;
  manualHighlightEntry: SrcDiffNodeEntry | null;
  manualHighlightMoveId: string | null;
  manualHighlightScope: "node" | "move-group";
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
  manualHighlightEntry,
  manualHighlightMoveId,
  manualHighlightScope,
  treeEntries,
  moveIndex,
}: GetBaseHighlightedEntriesInput): SrcDiffNodeEntry[] {
  const _entries: SrcDiffNodeEntry[] = [];

  if (manualHighlightEntry) {
    if (manualHighlightScope === "move-group" && manualHighlightMoveId) {
      _entries.push(
        ...(moveIndex.get(manualHighlightMoveId) ?? [manualHighlightEntry]),
      );
    } else {
      _entries.push(manualHighlightEntry);
    }
  }

  if (highlightMode.move) {
    _entries.push(...getAllMoveEntries(moveIndex));
  }

  if (highlightMode.insert) {
    _entries.push(...treeEntries.filter((_entry) => _entry.node.kind === "insert"));
  }

  if (highlightMode.delete) {
    _entries.push(...treeEntries.filter((_entry) => _entry.node.kind === "delete"));
  }

  return dedupeNodeEntries(_entries);
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
