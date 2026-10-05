import type { ArtifactMoveRecord } from "../types";

export interface BenchmarkRunItem {
  run_id: string;
  completed_at: string | null;
  selected: number;
  status: string;
  experiment_id: string;
}
export interface BenchmarkRuns {
  schema_version: 2;
  items: BenchmarkRunItem[];
  default_run_id: string | null;
}
export interface BenchmarkRun extends BenchmarkRunItem {
  schema_version: 2;
  tool_sha256: Record<string, string>;
  member_summaries: {
    pair_set: string;
    counts: Record<string, number>;
    reviewed_counts: Record<string, number>;
  }[];
}
export interface BenchmarkCase {
  category: string;
  case_id: string;
  ordinal: number;
  case_kind: string;
  expected_content_relationship: string;
  reviewed_expected_content_relationship: string;
  observed_content_relationship: string | null;
  outcome: string;
  reviewed_outcome: string;
  complete_fragment_detected: boolean | null;
  move_count: number | null;
  min_tokens: number | null;
  type3_both_similarity: number | null;
  type3_strength_stratum: string | null;
  semantic_status: string | null;
  semantic_reason: string | null;
  diagnostic_stage: string | null;
  label_correction_id: string | null;
  attempt_id: string | null;
  attempt_ordinal: number | null;
}
export interface BenchmarkCases {
  schema_version: 2;
  run_id: string;
  items: BenchmarkCase[];
  total: number;
  matched: number;
  offset: number;
  next_offset: number | null;
  filters: { categories: string[]; outcomes: string[] };
}
export interface BenchmarkCaseDetail {
  schema_version: 2;
  run_id: string;
  case: BenchmarkCase;
  original: { sha256: string; text: string | null; reason: string | null };
  modified: { sha256: string; text: string | null; reason: string | null };
  expected_ranges: { from: [number, number]; to: [number, number] };
  failures: string[];
  reviewed_failures: string[];
  label_correction: {
    id: string;
    reason: string;
    reviewed_content_relationship: string;
  } | null;
  semantic_details: Record<string, unknown>;
  text_validation: Record<string, unknown>;
  moves: ArtifactMoveRecord[];
  content_relationships: Record<string, number>;
  diagnostics: Record<string, unknown> | null;
  results_available: boolean;
  tool_sha256: Record<string, string>;
}
