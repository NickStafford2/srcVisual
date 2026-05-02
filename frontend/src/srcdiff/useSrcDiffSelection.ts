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

export type SrcDiffSelectionState = {
  selectedFile: VisualizedFile | null;
  selectedFileIndex: number;
  selectedNode: SrcDiffTreeNode | null;
  selectedNodeId: string | null;
  selectedNodeFileIndex: number | null;
  selectedSpans: SrcDiffSelectionSpans;
  highlightedNodeIds: Set<string>;
  highlightedSpans: SrcDiffHighlight[];
  hasMoveHighlights: boolean;
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
  const [highlightedNodeIds, setHighlightedNodeIds] = useState<Set<string>>(
    () => new Set(),
  );

  const files = data?.files ?? [];
  const selectedFile = files[selectedFileIndex] ?? null;

  const treeIndex = useMemo(() => buildForestTreeIndex(files), [files]);

  const allTreeEntries = useMemo(
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

  const highlightedSpans = useMemo(() => {
    return Array.from(highlightedNodeIds).flatMap((nodeId) => {
      const entry = treeIndex.get(nodeId);
      if (!entry) return [];

      return [getNodeHighlight(entry.node, entry.fileIndex)];
    });
  }, [highlightedNodeIds, treeIndex]);

  const hasMoveHighlights = highlightedSpans.some(
    (highlight) => highlight.kind === "move",
  );

  useEffect(() => {
    setSelectedFileIndexState(0);
    setSelectedNodeIdState(null);
    setHighlightedNodeIds(new Set());
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

  useEffect(() => {
    setHighlightedNodeIds((current) => {
      const next = new Set<string>();

      for (const nodeId of current) {
        if (treeIndex.has(nodeId)) {
          next.add(nodeId);
        }
      }

      return next;
    });
  }, [treeIndex]);

  function setSelectedFileIndex(index: number) {
    setSelectedFileIndexState(index);
  }

  function setSelectedNodeId(nodeId: string) {
    setSelectedNodeIdState(nodeId);
    setHighlightedNodeIds(new Set([nodeId]));

    const entry = treeIndex.get(nodeId);
    if (entry) {
      setSelectedFileIndexState(entry.fileIndex);
    }
  }

  function highlightAllMoves() {
    const moveEntries = allTreeEntries.filter(
      ([, entry]) => entry.node.kind === "move",
    );

    const moveNodeIds = moveEntries.map(([nodeId]) => nodeId);

    setHighlightedNodeIds(new Set(moveNodeIds));

    const firstMoveEntry = moveEntries[0];

    if (firstMoveEntry) {
      const [firstMoveNodeId, firstMove] = firstMoveEntry;

      setSelectedNodeIdState(firstMoveNodeId);
      setSelectedFileIndexState(firstMove.fileIndex);
    }
  }

  function clearHighlights() {
    setHighlightedNodeIds(new Set());
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
    hasMoveHighlights,
    setSelectedFileIndex,
    setSelectedNodeId,
    highlightAllMoves,
    clearHighlights,
  };
}
