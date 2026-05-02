import { SrcDiffTreeNode } from "./srcdiff/types";

export interface VisualizedFile {
  unit: number;
  filename: string;
  language?: string;
  source_code_before: string;
  source_code_after: string;
  tree: SrcDiffTreeNode | null;
}

export interface VisualizeResponse {
  source_filename: string;
  annotated_srcdiff_xml: string;
  units: string; // todo: decide if this should be string. check if backend returns a number.
  has_position_data: boolean;
  files: VisualizedFile[];
}
