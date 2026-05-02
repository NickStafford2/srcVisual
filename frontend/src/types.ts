import type { SrcDiffTreeNode } from "./srcdiff/types";

export interface VisualizedFile {
  unit: number;
  filename: string;
  language: string | null;
  revision_0_source_code: string;
  revision_1_source_code: string;
  tree: SrcDiffTreeNode | null;
}

export interface VisualizeResponse {
  source_filename: string;
  annotated_srcdiff_xml: string;
  units: number;
  has_position_data: boolean;
  files: VisualizedFile[];
}
