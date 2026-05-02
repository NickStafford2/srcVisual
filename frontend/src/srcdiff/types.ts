export type HighlightKind = "plain" | "delete" | "insert" | "move";

export interface SourceCodeSpan {
  start_line: number;
  start_col: number;
  end_line: number;
  end_col: number;
}

export interface SrcDiffTreeNode {
  id: string;
  path: string;
  tag: string;
  label: string;
  kind: HighlightKind;
  move_id?: string | null;
  xml_span?: SourceCodeSpan | null;
  before_span?: SourceCodeSpan | null;
  after_span?: SourceCodeSpan | null;
  children: SrcDiffTreeNode[];
}

export interface ViewerLineSegment {
  text: string;
  kind: HighlightKind;
  highlighted: boolean;
  nodeId?: string | null;
}

export interface ViewerLine {
  number: number;
  segments: ViewerLineSegment[];
  hasHighlight: boolean;
}
