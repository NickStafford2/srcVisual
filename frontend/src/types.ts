import type { SrcDiffTreeNode } from "./srcdiff/types";

export interface VisualizedFile {
  unit_id: number;
  filename: string;
  language: string | null;
  revision_0_source_code: string;
  revision_1_source_code: string;
  tree: SrcDiffTreeNode | null;
}

export interface SrcMoveRecord {
  move_id: string | null;
  from_xpaths: string[];
  to_xpaths: string[];
  from_raw_texts: string[];
  to_raw_texts: string[];
}

export interface SrcMoveResults {
  move_count: number;
  moves: SrcMoveRecord[];
  annotated_regions: number;
  regions_total: number;
  candidates_total: number;
  groups_total: number;
}

export interface MoveSourceHighlight {
  path: string;
  unit_id: number;
  move_id: string;
  revision: "revision_0" | "revision_1";
  span: {
    start_line: number;
    start_col: number;
    end_line: number;
    end_col: number;
  };
}

export interface VisualizeResponse {
  source_filename: string;
  annotated_srcdiff_xml: string;
  move_results: SrcMoveResults;
  move_source_highlights: MoveSourceHighlight[];
  unit_count: number;
  has_position_data: boolean;
  files: VisualizedFile[];
}
