export type HighlightKind = "plain" | "delete" | "insert" | "move";

export interface SourceSpan {
  start_line: number;
  start_col: number;
  end_line: number;
  end_col: number;
}

export interface SrcDiffTreeNode {
  id: string;
  path: string;
  tag: string;
  xml_label: string;
  kind: HighlightKind;
  move_id?: string | null;
  xml_span?: SourceSpan | null;
  before_span?: SourceSpan | null;
  after_span?: SourceSpan | null;
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
