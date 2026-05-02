import { useEffect, useMemo, useState } from "react";
import type { VisualizeResponse, VisualizedFile } from "../types";
import type { HighlightMode } from "./highlightContext";
import type { HighlightKind, SrcDiffTreeNode } from "./types";
import {
  getNodeHighlight,
  getSelectionSpans,
  type SrcDiffHighlight,
  type SrcDiffSelectionSpans,
} from "./selection";
import { buildForestTreeIndex } from "./treeIndex";

export type SrcDiffSelectionState = {
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
  highlightMode: HighlightMode;
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

  const selectedSpans = useMemo(
    () => getSelectionSpans(selectedNode),
    [selectedNode],
  );

  const highlightedEntries = useMemo(() => {
    if (highlightMode === "all-moves") {
      return treeEntries.filter(([, entry]) => entry.node.kind === "move");
    }

    if (highlightMode === "all-inserts") {
      return treeEntries.filter(([, entry]) => entry.node.kind === "insert");
    }

    if (highlightMode === "all-deletes") {
      return treeEntries.filter(([, entry]) => entry.node.kind === "delete");
    }

    if (!selectedNodeId || !selectedNodeEntry) {
      return [];
    }

    const selectedMoveId = selectedNodeEntry.node.move_id;

    if (selectedNodeEntry.node.kind === "move" && selectedMoveId) {
      return treeEntries.filter(
        ([, entry]) =>
          entry.node.kind === "move" && entry.node.move_id === selectedMoveId,
      );
    }

    return [[selectedNodeId, selectedNodeEntry]] as typeof treeEntries;
  }, [highlightMode, selectedNodeId, selectedNodeEntry, treeEntries]);

  const highlightedNodeIds = useMemo(() => {
    return new Set(highlightedEntries.map(([nodeId]) => nodeId));
  }, [highlightedEntries]);

  const highlightedNodes = useMemo(() => {
    return highlightedEntries.map(([, entry]) => ({
      node: entry.node,
      fileIndex: entry.fileIndex,
      filename: files[entry.fileIndex]?.filename ?? null,
    }));
  }, [files, highlightedEntries]);

  const highlightedSpans = useMemo<SrcDiffHighlight[]>(() => {
    return highlightedEntries.map(([, entry]) =>
      getNodeHighlight(entry.node, entry.fileIndex),
    );
  }, [highlightedEntries]);

  useEffect(() => {
    setSelectedFileIndexState(0);
    setSelectedNodeIdState(null);
    setHighlightMode("selection");
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

    const firstMatchingEntry = treeEntries.find(
      ([, entry]) => entry.node.kind === kind,
    );

    if (!firstMatchingEntry) {
      setSelectedNodeIdState(null);
      return;
    }

    const [firstMatchingNodeId, firstMatchingEntryValue] = firstMatchingEntry;

    setSelectedNodeIdState(firstMatchingNodeId);
    setSelectedFileIndexState(firstMatchingEntryValue.fileIndex);
  }

  function clearHighlights() {
    setHighlightMode("selection");
    setSelectedNodeIdState(null);
  }

  return {
    selectedFile,
    selectedFileIndex,
    selectedNode,
    selectedNodeId,
    selectedNodeFileIndex,
    selectedSpans,
    highlightedNodes,
    highlightedNodeIds,
    highlightedSpans,
    highlightMode,
    setSelectedFileIndex,
    setSelectedNodeId,
    highlightAllMoves,
    highlightAllInserts,
    highlightAllDeletes,
    clearHighlights,
  };
}
