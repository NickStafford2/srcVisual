import { createContext, useContext, type ReactNode } from "react";
import type { SrcDiffHighlight } from "./selection";

export type HighlightMode =
  | "selection"
  | "all-moves"
  | "all-inserts"
  | "all-deletes";

export type SrcDiffHighlightContextValue = {
  highlightedNodeIds: Set<string>;
  highlightedSpans: SrcDiffHighlight[];
  highlightMode: HighlightMode;
  highlightAllMoves: () => void;
  highlightAllInserts: () => void;
  highlightAllDeletes: () => void;
  clearHighlights: () => void;
};

const srcDiffHighlightContext =
  createContext<SrcDiffHighlightContextValue | null>(null);

type SrcDiffHighlightProviderProps = {
  value: SrcDiffHighlightContextValue;
  children: ReactNode;
};

export function SrcDiffHighlightProvider({
  value,
  children,
}: SrcDiffHighlightProviderProps) {
  return (
    <srcDiffHighlightContext.Provider value={value}>
      {children}
    </srcDiffHighlightContext.Provider>
  );
}

export function useSrcDiffHighlight(): SrcDiffHighlightContextValue {
  const value = useContext(srcDiffHighlightContext);

  if (!value) {
    throw new Error(
      "useSrcDiffHighlight must be used within a SrcDiffHighlightProvider.",
    );
  }

  return value;
}
