import { useEffect, useMemo, useState } from "react";
import type {
  SrcMoveRecord,
  VisualizeResponse,
  VisualizedFile,
} from "../types";
import type { HighlightMode } from "./highlightContext";
import type { HighlightKind, SrcDiffTreeNode } from "./types";
import {
  getNodeHighlight,
  getSelectionSpans,
  type SrcDiffHighlight,
  type SrcDiffSelectionSpans,
} from "./selection";
import {
  buildForestTreeIndex,
  type TreeIndex,
  type TreeIndexEntry,
} from "./treeIndex";

export type SrcDiffSelectionState = {
  moveNodesById: Map<
    string,
    {
      node: SrcDiffTreeNode;
      fileIndex: number;
      filename: string | null;
    }[]
  >;
  selectedMoveId: string | null;
  selectedFile: VisualizedFile | null;
  selectedFileIndex: number;
  selectedNode: SrcDiffTreeNode | null;
  selectedNodeId: string | null;
  selectedNodeFileIndex: number | null;
  selectedSpans: SrcDiffSelectionSpans;
  highlightedNodes: {
    node: SrcDiffTreeNode;
    fileIndex: number;
    filename: string | null;
  }[];
  highlightedNodeIds: Set<string>;
  highlightedSpans: SrcDiffHighlight[];
  sourceHighlightedSpansByUnitId: Map<number, SrcDiffHighlight[]>;
  highlightMode: HighlightMode;
  unhighlightNode: (nodeId: string) => void;
  setSelectedFileIndex: (index: number) => void;
  setSelectedNodeId: (nodeId: string) => void;
  highlightAllMoves: () => void;
  highlightAllInserts: () => void;
  highlightAllDeletes: () => void;
  clearHighlights: () => void;
};

export function useSrcDiffSelection(
  data: VisualizeResponse | null,
): SrcDiffSelectionState {
  const [selectedFileIndex, setSelectedFileIndexState] = useState(0);
  const [selectedNodeId, setSelectedNodeIdState] = useState<string | null>(
    null,
  );
  const [highlightMode, setHighlightMode] =
    useState<HighlightMode>("selection");
  const [suppressedHighlightedNodeIds, setSuppressedHighlightedNodeIds] =
    useState<Set<string>>(new Set());

  const files = data?.files ?? [];
  const selectedFile = files[selectedFileIndex] ?? null;
  const treeIndex = useMemo(() => buildForestTreeIndex(files), [files]);
  const treeEntries = useMemo(
    () => Array.from(treeIndex.entries()),
    [treeIndex],
  );

  const selectedNodeEntry = selectedNodeId
    ? (treeIndex.get(selectedNodeId) ?? null)
    : null;
  const selectedNode = selectedNodeEntry?.node ?? null;
  const selectedNodeFileIndex = selectedNodeEntry?.fileIndex ?? null;
  const selectedMoveId = selectedNode?.move_id ?? null;
  const selectedSpans = useMemo(
    () => getSelectionSpans(selectedNode),
    [selectedNode],
  );

  const moveEntriesById = useMemo(
    () =>
      buildMoveEntriesById(data?.move_results.moves ?? [], treeIndex, files),
    [data?.move_results.moves, files, treeIndex],
  );

  const moveNodesById = useMemo(() => {
    const next = new Map<
      string,
      {
        node: SrcDiffTreeNode;
        fileIndex: number;
        filename: string | null;
      }[]
    >();

    for (const [moveId, entries] of moveEntriesById) {
      next.set(
        moveId,
        entries.map((entry) => ({
          node: entry.node,
          fileIndex: entry.fileIndex,
          filename: entry.filename,
        })),
      );
    }

    return next;
  }, [moveEntriesById]);

  const baseHighlightedEntries = useMemo(() => {
    if (highlightMode === "all-moves") {
      return dedupeEntries(
        Array.from(moveEntriesById.values()).flatMap((entries) => entries),
      );
    }

    if (highlightMode === "all-inserts") {
      return treeEntries
        .filter(([, entry]) => entry.node.kind === "insert")
        .map(([, entry]) => entry);
    }

    if (highlightMode === "all-deletes") {
      return treeEntries
        .filter(([, entry]) => entry.node.kind === "delete")
        .map(([, entry]) => entry);
    }

    if (!selectedNodeEntry || !selectedNodeId) {
      return [];
    }

    if (selectedNodeEntry.node.kind === "move" && selectedMoveId) {
      return moveEntriesById.get(selectedMoveId) ?? [selectedNodeEntry];
    }

    return [selectedNodeEntry];
  }, [
    highlightMode,
    moveEntriesById,
    selectedMoveId,
    selectedNodeEntry,
    selectedNodeId,
    treeEntries,
  ]);

  const highlightedEntries = useMemo(() => {
    if (suppressedHighlightedNodeIds.size === 0) {
      return baseHighlightedEntries;
    }

    return baseHighlightedEntries.filter(
      (entry) => !suppressedHighlightedNodeIds.has(entry.node.id),
    );
  }, [baseHighlightedEntries, suppressedHighlightedNodeIds]);

  const highlightedNodeIds = useMemo(
    () => new Set(highlightedEntries.map((entry) => entry.node.id)),
    [highlightedEntries],
  );

  const highlightedNodes = useMemo(
    () =>
      highlightedEntries.map((entry) => ({
        node: entry.node,
        fileIndex: entry.fileIndex,
        filename: entry.filename,
      })),
    [highlightedEntries],
  );

  const highlightedSpans = useMemo(
    () => highlightedEntries.map(buildTreeEntryHighlight),
    [highlightedEntries],
  );

  const sourceHighlightedSpansByUnitId = useMemo(() => {
    const next = new Map<number, SrcDiffHighlight[]>();

    for (const highlight of highlightedSpans) {
      const matchingFile =
        files.find((file) => file.unit_id === highlight.unitId) ?? null;

      assertMatchingFilename(
        highlight.filename,
        matchingFile?.filename ?? null,
        `sourceHighlightedSpansByUnitId unit_id=${highlight.unitId}`,
      );

      const fileHighlights = next.get(highlight.unitId) ?? [];
      fileHighlights.push(highlight);
      next.set(highlight.unitId, fileHighlights);
    }

    return next;
  }, [files, highlightedSpans]);

  useEffect(() => {
    setSelectedFileIndexState(0);
    setSelectedNodeIdState(null);
    setHighlightMode("selection");
    setSuppressedHighlightedNodeIds(new Set());
  }, [data]);

  useEffect(() => {
    if (!data) return;

    if (selectedFileIndex >= data.files.length) {
      setSelectedFileIndexState(0);
    }
  }, [data, selectedFileIndex]);

  useEffect(() => {
    if (!selectedNodeId) return;

    if (!treeIndex.has(selectedNodeId)) {
      setSelectedNodeIdState(null);
    }
  }, [selectedNodeId, treeIndex]);

  function setSelectedFileIndex(index: number) {
    setSelectedFileIndexState(index);
  }

  function setSelectedNodeId(nodeId: string) {
    setHighlightMode("selection");
    setSuppressedHighlightedNodeIds(new Set());
    setSelectedNodeIdState(nodeId);

    const entry = treeIndex.get(nodeId);
    if (entry) {
      setSelectedFileIndexState(entry.fileIndex);
    }
  }

  function highlightAllMoves() {
    highlightAllByKind("move", "all-moves");
  }

  function highlightAllInserts() {
    highlightAllByKind("insert", "all-inserts");
  }

  function highlightAllDeletes() {
    highlightAllByKind("delete", "all-deletes");
  }

  function highlightAllByKind(kind: HighlightKind, mode: HighlightMode) {
    setHighlightMode(mode);
    setSuppressedHighlightedNodeIds(new Set());

    const firstMatchingEntry =
      kind === "move"
        ? dedupeEntries(
            Array.from(moveEntriesById.values()).flatMap((entries) => entries),
          )[0]
        : treeEntries.find(([, entry]) => entry.node.kind === kind)?.[1];

    if (!firstMatchingEntry) {
      setSelectedNodeIdState(null);
      return;
    }

    setSelectedNodeIdState(firstMatchingEntry.node.id);
    setSelectedFileIndexState(firstMatchingEntry.fileIndex);
  }

  function clearHighlights() {
    setHighlightMode("selection");
    setSuppressedHighlightedNodeIds(new Set());
    setSelectedNodeIdState(null);
  }

  function unhighlightNode(nodeId: string) {
    setSuppressedHighlightedNodeIds((current) => {
      const next = new Set(current);
      next.add(nodeId);
      return next;
    });
  }

  return {
    moveNodesById,
    selectedMoveId,
    selectedFile,
    selectedFileIndex,
    selectedNode,
    selectedNodeId,
    selectedNodeFileIndex,
    selectedSpans,
    highlightedNodes,
    highlightedNodeIds,
    highlightedSpans,
    sourceHighlightedSpansByUnitId,
    highlightMode,
    unhighlightNode,
    setSelectedFileIndex,
    setSelectedNodeId,
    highlightAllMoves,
    highlightAllInserts,
    highlightAllDeletes,
    clearHighlights,
  };
}

function buildMoveEntriesById(
  moves: SrcMoveRecord[],
  treeIndex: TreeIndex,
  files: VisualizedFile[],
): Map<string, TreeIndexEntry[]> {
  const next = new Map<string, TreeIndexEntry[]>();

  for (const move of moves) {
    if (!move.move_id) {
      continue;
    }

    const nodeIds = dedupeNodeIds([
      ...(move.from_node_ids ?? move.from_xpaths),
      ...(move.to_node_ids ?? move.to_xpaths),
    ]).map((nodeId) => normalizeNodeId(nodeId, files));

    next.set(
      move.move_id,
      dedupeEntries(
        nodeIds.map((nodeId) => {
          const entry = treeIndex.get(nodeId) ?? null;
          if (!entry) {
            throw new Error(`Missing tree entry for move node_id=${nodeId}.`);
          }
          return entry;
        }),
      ),
    );
  }

  return next;
}

function buildTreeEntryHighlight(entry: TreeIndexEntry): SrcDiffHighlight {
  return getNodeHighlight(
    entry.node,
    entry.fileIndex,
    entry.unitId,
    entry.filename,
  );
}

function dedupeEntries(entries: TreeIndexEntry[]): TreeIndexEntry[] {
  const seen = new Set<string>();

  return entries.filter((entry) => {
    if (seen.has(entry.node.id)) {
      return false;
    }

    seen.add(entry.node.id);
    return true;
  });
}

function dedupeNodeIds(nodeIds: string[]): string[] {
  return Array.from(new Set(nodeIds));
}

function normalizeNodeId(nodeId: string, files: VisualizedFile[]): string {
  const match = nodeId.match(/^\/src:unit\[@filename=(['"])(.*?)\1\](\/.*)?$/);

  if (!match) {
    return nodeId;
  }

  const filename = match[2];
  const rest = match[3] ?? "";
  const file =
    files.find((candidate) => candidate.filename === filename) ?? null;

  if (!file) {
    throw new Error(`Unable to normalize node_id for filename="${filename}".`);
  }

  return `/src:unit[${file.unit_id}]${rest}`;
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
