import { createContext, useContext } from "react";
import type { SrcDiffHighlight } from "./selection";
import type { SrcDiffNodeEntry } from "./treeIndex";

export type HighlightMode =
  | "selection"
  | "all-moves"
  | "all-inserts"
  | "all-deletes";

export type SrcDiffHighlightContextValue = {
  highlightedNodes: SrcDiffNodeEntry[];
  highlightedNodeIds: Set<string>;
  highlightedSpans: SrcDiffHighlight[];
  highlightMode: HighlightMode;
  unhighlightNode: (nodeId: string) => void;
  highlightAllMoves: () => void;
  highlightAllInserts: () => void;
  highlightAllDeletes: () => void;
  clearHighlights: () => void;
};

const SrcDiffHighlightContext =
  createContext<SrcDiffHighlightContextValue | null>(null);

export function SrcDiffHighlightProvider({
  value,
  children,
}: {
  value: SrcDiffHighlightContextValue;
  children: React.ReactNode;
}) {
  return (
    <SrcDiffHighlightContext.Provider value={value}>
      {children}
    </SrcDiffHighlightContext.Provider>
  );
}

export function useSrcDiffHighlight(): SrcDiffHighlightContextValue {
  const value = useContext(SrcDiffHighlightContext);

  if (!value) {
    throw new Error(
      "useSrcDiffHighlight must be used inside SrcDiffHighlightProvider.",
    );
  }

  return value;
}
