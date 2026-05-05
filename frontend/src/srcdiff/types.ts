export type HighlightKind = "plain" | "delete" | "insert" | "move";

export interface SourceCodeSpan {
  start_line: number;
  start_col: number;
  end_line: number;
  end_col: number;
}

export interface SrcDiffPositionAttributes {
  start: string;
  end: string;
}

export interface SrcDiffMoveAttributes {
  id: string;
}

export interface SrcDiffUnitAttributes {
  filename: string | null;
  language: string | null;
  revision: string | null;
  url: string | null;
  hash: string | null;
  timestamp: string | null;
}

export interface SrcDiffDiffAttributes {
  revision: string | null;
}

export interface SrcDiffAttributes {
  position: SrcDiffPositionAttributes | null;
  move: SrcDiffMoveAttributes | null;
  unit: SrcDiffUnitAttributes | null;
  diff: SrcDiffDiffAttributes | null;
}

export interface SrcDiffTreeNode {
  id: string;
  path: string;
  tag: string;
  label: string;
  kind: HighlightKind;
  move_id?: string | null;
  srcdiff_attributes: SrcDiffAttributes;
  xml_span?: SourceCodeSpan | null;
  revision_0_span?: SourceCodeSpan | null;
  revision_1_span?: SourceCodeSpan | null;
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
