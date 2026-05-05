import { useEffect, useMemo, useState } from "react";
import type { VisualizeResponse, VisualizedFile } from "../types";
import type { HighlightMode } from "./highlightContext";
import {
  buildHighlightedNodeIds,
  buildHighlightedSpans,
  buildSourceHighlightedSpansByUnitId,
  getFirstEntryForHighlightKind,
  getHighlightedEntries,
} from "./highlights";
import { buildMoveIndex } from "./moveIndex";
import {
  getSelectionSpans,
  type SrcDiffHighlight,
  type SrcDiffSelectionSpans,
} from "./selection";
import type { HighlightKind, SrcDiffTreeNode } from "./types";
import { buildForestTreeIndex, type SrcDiffNodeEntry } from "./treeIndex";

export type SrcDiffSelectionState = {
  moveNodesById: Map<string, SrcDiffNodeEntry[]>;
  selectedMoveId: string | null;
  selectedFile: VisualizedFile | null;
  selectedFileIndex: number;
  selectedNode: SrcDiffTreeNode | null;
  selectedNodeId: string | null;
  selectedNodeFileIndex: number | null;
  selectedSpans: SrcDiffSelectionSpans;
  highlightedNodes: SrcDiffNodeEntry[];
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
    () => Array.from(treeIndex.values()),
    [treeIndex],
  );

  const moveIndex = useMemo(
    () => buildMoveIndex(data?.move_results, treeIndex, files),
    [data?.move_results, treeIndex, files],
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

  const highlightedNodes = useMemo(
    () =>
      getHighlightedEntries({
        highlightMode,
        selectedNodeEntry,
        selectedMoveId,
        treeEntries,
        moveIndex,
        suppressedNodeIds: suppressedHighlightedNodeIds,
      }),
    [
      highlightMode,
      selectedNodeEntry,
      selectedMoveId,
      treeEntries,
      moveIndex,
      suppressedHighlightedNodeIds,
    ],
  );

  const highlightedNodeIds = useMemo(
    () => buildHighlightedNodeIds(highlightedNodes),
    [highlightedNodes],
  );

  const highlightedSpans = useMemo(
    () => buildHighlightedSpans(highlightedNodes),
    [highlightedNodes],
  );

  const sourceHighlightedSpansByUnitId = useMemo(
    () => buildSourceHighlightedSpansByUnitId(files, highlightedSpans),
    [files, highlightedSpans],
  );

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

  function highlightAllByKind(kind: HighlightKind, mode: HighlightMode) {
    setHighlightMode(mode);
    setSuppressedHighlightedNodeIds(new Set());

    const firstEntry = getFirstEntryForHighlightKind(
      kind,
      treeEntries,
      moveIndex,
    );

    if (!firstEntry) {
      setSelectedNodeIdState(null);
      return;
    }

    setSelectedNodeIdState(firstEntry.node.id);
    setSelectedFileIndexState(firstEntry.fileIndex);
  }

  return {
    moveNodesById: moveIndex,
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
