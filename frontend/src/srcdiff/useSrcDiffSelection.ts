import { useEffect, useMemo, useState } from "react";
import type { VisualizeResponse, VisualizedFile } from "../types";
import type { BulkHighlightKind, HighlightMode } from "./highlightContext";
import {
  buildHighlightedNodeIds,
  buildHighlightedSpans,
  buildSourceHighlightedSpansByUnitId,
  getFirstEntryForHighlightKind,
  getHighlightedEntries,
} from "./highlights";
import { buildMoveIndex } from "./moveIndex";
import {
  type SrcDiffHighlight,
} from "./selection";
import { buildForestTreeIndex, type SrcDiffNodeEntry } from "./treeIndex";

export type SrcDiffSelectionState = {
  moveNodesById: Map<string, SrcDiffNodeEntry[]>;
  selectedMoveId: string | null;
  selectedFile: VisualizedFile | null;
  selectedFileIndex: number;
  selectedNodeId: string | null;
  highlightedNodes: SrcDiffNodeEntry[];
  highlightedNodeIds: Set<string>;
  highlightedSpans: SrcDiffHighlight[];
  sourceHighlightedSpansByUnitId: Map<number, SrcDiffHighlight[]>;
  highlightMode: HighlightMode;
  unhighlightNode: (nodeId: string) => void;
  setSelectedFileIndex: (index: number) => void;
  highlightNode: (nodeId: string) => void;
  highlightMoveGroup: (nodeId: string) => void;
  highlightAllMoves: () => void;
  highlightAllInserts: () => void;
  highlightAllDeletes: () => void;
  clearHighlights: () => void;
};

const EMPTY_HIGHLIGHT_MODE: HighlightMode = {
  move: false,
  insert: false,
  delete: false,
};

export function useSrcDiffSelection(
  data: VisualizeResponse | null,
): SrcDiffSelectionState {
  const [selectedFileIndex, setSelectedFileIndexState] = useState(0);
  const [selectedNodeId, setSelectedNodeIdState] = useState<string | null>(
    null,
  );
  const [selectedNodeHighlightScope, setSelectedNodeHighlightScope] = useState<
    "node" | "move-group"
  >("node");
  const [highlightMode, setHighlightMode] =
    useState<HighlightMode>(EMPTY_HIGHLIGHT_MODE);
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
  const selectedMoveId = selectedNode?.move_id ?? null;

  const highlightedNodes = useMemo(
    () =>
      getHighlightedEntries({
        highlightMode,
        selectedNodeEntry,
        selectedMoveId,
        selectedNodeHighlightScope,
        treeEntries,
        moveIndex,
        suppressedNodeIds: suppressedHighlightedNodeIds,
      }),
    [
      highlightMode,
      selectedNodeEntry,
      selectedMoveId,
      selectedNodeHighlightScope,
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
    setSelectedNodeHighlightScope("node");
    setHighlightMode(EMPTY_HIGHLIGHT_MODE);
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

  function setSelectedNodeState(
    nodeId: string,
    scope: "node" | "move-group",
  ) {
    setSuppressedHighlightedNodeIds(new Set());
    setSelectedNodeIdState(nodeId);
    setSelectedNodeHighlightScope(scope);

    const _entry = treeIndex.get(nodeId);

    if (_entry) {
      setSelectedFileIndexState(_entry.fileIndex);
    }
  }

  function highlightNode(nodeId: string) {
    setSelectedNodeState(nodeId, "node");
  }

  function highlightMoveGroup(nodeId: string) {
    setSelectedNodeState(nodeId, "move-group");
  }

  function highlightAllMoves() {
    toggleHighlightKind("move");
  }

  function highlightAllInserts() {
    toggleHighlightKind("insert");
  }

  function highlightAllDeletes() {
    toggleHighlightKind("delete");
  }

  function clearHighlights() {
    setHighlightMode(EMPTY_HIGHLIGHT_MODE);
    setSuppressedHighlightedNodeIds(new Set());
    setSelectedNodeIdState(null);
    setSelectedNodeHighlightScope("node");
  }

  function unhighlightNode(nodeId: string) {
    setSuppressedHighlightedNodeIds((current) => {
      const next = new Set(current);
      next.add(nodeId);
      return next;
    });
  }

  function toggleHighlightKind(kind: BulkHighlightKind) {
    setHighlightMode((current) => ({
      ...current,
      [kind]: !current[kind],
    }));
    setSuppressedHighlightedNodeIds(new Set());

    if (selectedNodeId) {
      return;
    }

    const _firstEntry = getFirstEntryForHighlightKind(
      kind,
      treeEntries,
      moveIndex,
    );

    if (_firstEntry) {
      setSelectedFileIndexState(_firstEntry.fileIndex);
    }
  }

  return {
    moveNodesById: moveIndex,
    selectedMoveId,
    selectedFile,
    selectedFileIndex,
    selectedNodeId,
    highlightedNodes,
    highlightedNodeIds,
    highlightedSpans,
    sourceHighlightedSpansByUnitId,
    highlightMode,
    unhighlightNode,
    setSelectedFileIndex,
    highlightNode,
    highlightMoveGroup,
    highlightAllMoves,
    highlightAllInserts,
    highlightAllDeletes,
    clearHighlights,
  };
}
