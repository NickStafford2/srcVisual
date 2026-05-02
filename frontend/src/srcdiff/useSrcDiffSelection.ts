import { useEffect, useMemo, useState } from "react";
import type { VisualizeResponse, VisualizedFile } from "../types";
import type { SrcDiffTreeNode } from "./types";
import {
  getNodeHighlight,
  getSelectionSpans,
  type SrcDiffHighlight,
  type SrcDiffSelectionSpans,
} from "./selection";
import { buildForestTreeIndex } from "./treeIndex";

type HighlightMode = "selection" | "all-moves";

export type SrcDiffSelectionState = {
  selectedFile: VisualizedFile | null;
  selectedFileIndex: number;
  selectedNode: SrcDiffTreeNode | null;
  selectedNodeId: string | null;
  selectedNodeFileIndex: number | null;
  selectedSpans: SrcDiffSelectionSpans;
  highlightedNodeIds: Set<string>;
  highlightedSpans: SrcDiffHighlight[];
  highlightMode: HighlightMode;
  setSelectedFileIndex: (index: number) => void;
  setSelectedNodeId: (nodeId: string) => void;
  highlightAllMoves: () => void;
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
    setHighlightMode("all-moves");

    const firstMoveEntry = treeEntries.find(
      ([, entry]) => entry.node.kind === "move",
    );

    if (!firstMoveEntry) return;

    const [firstMoveNodeId, firstMove] = firstMoveEntry;

    setSelectedNodeIdState(firstMoveNodeId);
    setSelectedFileIndexState(firstMove.fileIndex);
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
    highlightedNodeIds,
    highlightedSpans,
    highlightMode,
    setSelectedFileIndex,
    setSelectedNodeId,
    highlightAllMoves,
    clearHighlights,
  };
}
