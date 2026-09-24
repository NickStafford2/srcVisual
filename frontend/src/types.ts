import type { SourceCodeSpan, SrcDiffTreeNode } from "./srcdiff/types";

export interface VisualizedFile {
  unit_id: number;
  filename: string;
  revision_0_filename?: string;
  revision_1_filename?: string;
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

export type ArtifactFocusProfile =
  | "changes-and-moves"
  | "moves"
  | "changes"
  | "complete-file";

export interface ArtifactFileSummary {
  file_id: string;
  root_node_id: string | null;
  filename: string;
  revision_0_filename: string;
  revision_1_filename: string;
  language: string | null;
  revision_0_lines: number;
  revision_1_lines: number;
}

export interface ArtifactMoveSummary {
  move_id: string;
  match_kind: string | null;
  from_node_ids: string[];
  to_node_ids: string[];
}

export interface ArtifactManifest {
  schema_version: number;
  projection_schema_version: 1;
  artifact_id: string;
  source_filename: string;
  has_position_data: boolean;
  file_count: number;
  node_count: number;
  files: ArtifactFileSummary[];
  moves: { move_count: number; items: ArtifactMoveSummary[] };
  focus_profiles: ArtifactFocusProfile[];
}

export type VisualizationResult = VisualizeResponse | ArtifactManifest;

export function isArtifactManifest(
  result: VisualizationResult,
): result is ArtifactManifest {
  return "artifact_id" in result;
}

export interface ArtifactSourceLine {
  line_number: number;
  text: string;
  anchors: {
    node_id: string;
    kind: "plain" | "delete" | "insert" | "move";
    move_id: string | null;
    span: SourceCodeSpan;
  }[];
}

export interface ArtifactSourceRow {
  kind: "context" | "delete" | "insert" | "replace";
  left: ArtifactSourceLine | null;
  right: ArtifactSourceLine | null;
}

export interface ArtifactSourceRange {
  start_line: number | null;
  end_line: number | null;
}

export type ArtifactSourceBlock =
  | {
      type: "hunk";
      block_id: string;
      left: ArtifactSourceRange;
      right: ArtifactSourceRange;
      rows: ArtifactSourceRow[];
    }
  | {
      type: "gap";
      block_id: string;
      left: ArtifactSourceRange & { line_count: number };
      right: ArtifactSourceRange & { line_count: number };
    };

export interface ArtifactSourceProjection {
  schema_version: 1;
  artifact_id: string;
  file_id: string;
  filename: string;
  revision_0_filename: string;
  revision_1_filename: string;
  focus_profile: ArtifactFocusProfile;
  context_lines: number;
  truncated: boolean;
  revision_0_line_count: number;
  revision_1_line_count: number;
  blocks: ArtifactSourceBlock[];
}

export interface ArtifactTreeNode {
  node_id: string;
  path: string;
  tag: string;
  label: string;
  kind: "plain" | "delete" | "insert" | "move";
  move_id: string | null;
  srcdiff_attributes: Record<string, unknown>;
  xml_span: SourceCodeSpan | null;
  revision_0_span: SourceCodeSpan | null;
  revision_1_span: SourceCodeSpan | null;
  child_count: number;
  children_complete: boolean;
  children: ArtifactTreeNode[];
}

export interface ArtifactTreeProjection {
  schema_version: 1;
  artifact_id: string;
  file_id: string;
  focus_profile: ArtifactFocusProfile;
  root: ArtifactTreeNode | null;
  node_count: number;
  truncated: boolean;
}
