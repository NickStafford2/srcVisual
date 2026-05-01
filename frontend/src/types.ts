import type { SrcDiffTreeNode } from "./srcdiff";

export interface VisualizedFile {
  unit: number;
  filename: string;
  language?: string;
  before_source: string;
  after_source: string;
  tree: SrcDiffTreeNode | null;
}

export interface VisualizeResponse {
  source_filename: string;
  annotated_srcdiff_xml: string;
  units: string;
  has_position_data: boolean;
  files: VisualizedFile[];
}
