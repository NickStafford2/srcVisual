import { useEffect, useMemo, useState } from "react";
import type { VisualizeResponse, VisualizedFile } from "../types";
import type { SrcDiffTreeNode } from "./types";
import { getSelectionSpans, type SrcDiffSelectionSpans } from "./selection";
import { buildForestTreeIndex } from "./treeIndex";

export type SrcDiffSelectionState = {
  selectedFile: VisualizedFile | null;
  selectedFileIndex: number;
  selectedNode: SrcDiffTreeNode | null;
  selectedNodeId: string | null;
  selectedNodeFileIndex: number | null;
  selectedSpans: SrcDiffSelectionSpans;
  setSelectedFileIndex: (index: number) => void;
  setSelectedNodeId: (nodeId: string) => void;
};

export function useSrcDiffSelection(
  data: VisualizeResponse | null,
): SrcDiffSelectionState {
  const [selectedFileIndex, setSelectedFileIndexState] = useState(0);
  const [selectedNodeId, setSelectedNodeIdState] = useState<string | null>(
    null,
  );

  const files = data?.files ?? [];
  const selectedFile = files[selectedFileIndex] ?? null;

  const treeIndex = useMemo(() => buildForestTreeIndex(files), [files]);

  const selectedNodeEntry = selectedNodeId
    ? (treeIndex.get(selectedNodeId) ?? null)
    : null;

  const selectedNode = selectedNodeEntry?.node ?? null;
  const selectedNodeFileIndex = selectedNodeEntry?.fileIndex ?? null;

  const selectedSpans = useMemo(
    () => getSelectionSpans(selectedNode),
    [selectedNode],
  );

  useEffect(() => {
    setSelectedFileIndexState(0);
    setSelectedNodeIdState(null);
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
    setSelectedNodeIdState(nodeId);

    const entry = treeIndex.get(nodeId);
    if (entry) {
      setSelectedFileIndexState(entry.fileIndex);
    }
  }

  return {
    selectedFile,
    selectedFileIndex,
    selectedNode,
    selectedNodeId,
    selectedNodeFileIndex,
    selectedSpans,
    setSelectedFileIndex,
    setSelectedNodeId,
  };
}
