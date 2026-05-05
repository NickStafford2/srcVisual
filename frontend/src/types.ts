import type { SrcDiffTreeNode } from "./srcdiff/types";

export interface VisualizedFile {
  unit: number;
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

export interface VisualizeResponse {
  source_filename: string;
  annotated_srcdiff_xml: string;
  move_results: SrcMoveResults;
  units: number;
  has_position_data: boolean;
  files: VisualizedFile[];
}
