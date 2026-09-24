export type HighlightKind = "plain" | "delete" | "insert" | "move";

export interface SourceCodeSpan {
  start_line: number;
  start_col: number;
  end_line: number;
  end_col: number;
}

export interface ViewerLineSegment {
  text: string;
  kind: HighlightKind;
  highlighted: boolean;
  nodeId?: string | null;
  moveId?: string | null;
}

export interface ViewerLine {
  number: number;
  segments: ViewerLineSegment[];
  hasHighlight: boolean;
}
