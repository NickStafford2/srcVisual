import type { SrcDiffTreeNode } from "./srcdiff/types";

export type TreePruningLevel =
  | "none"
  | "file-only"
  | "file-and-tree"
  | "move-only";

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
  from_node_ids: string[];
  to_xpaths: string[];
  to_node_ids: string[];
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
  moved_srcdiff_xml: string;
  move_results: SrcMoveResults;
  unit_count: number;
  has_position_data: boolean;
  files: VisualizedFile[];
}
