export type HistorySelection = "all" | "moves" | "failed";

export interface HistoryStatusDocument {
  schema_version: 2;
  analysis: {
    name: string;
    repository: string;
    root: string;
  };
  state: string;
  coverage: {
    committed_commit_pairs: number;
    checkpointed_commit_pairs: number;
    durable_commit_pairs: number;
    target_commit_pairs: number | null;
  };
  outcomes: {
    compared_commit_pairs: number;
    without_analyzable_changes: number;
    failed_commit_pairs: number;
    by_status: Record<string, number>;
  };
  moves: {
    detections: number;
    source_destination_pairings: number;
    annotated_regions: number;
    by_match_type: Record<string, number>;
  };
  history: {
    newest_commit: string;
    oldest_analyzed_commit: string | null;
    exhausted: boolean;
  };
}

export interface HistoryPairListItem {
  number: number;
  distance_from_newest: number;
  old_commit: string;
  new_commit: string;
  status: string;
  changed_path_count: number;
  analyzable_path_count: number;
  move_count: number;
  elapsed_seconds: number;
  checkpointed: boolean;
  invocation_id: string;
}

export interface HistoryPairPageDocument {
  schema_version: 1;
  analysis: {
    name: string;
    repository: string;
    root: string;
  };
  pairs: {
    items: HistoryPairListItem[];
    next_after: number | null;
  };
}

export interface HistoryMoveEvidence {
  match_kind?: string;
  from_xpaths?: string[];
  to_xpaths?: string[];
  [key: string]: unknown;
}

export interface HistoryPairDetail {
  number: number;
  distance_from_newest: number;
  old_commit: string;
  new_commit: string;
  pair_fingerprint: string;
  status: string;
  invocation_id: string;
  changed_path_count: number;
  analyzable_path_count: number;
  metrics: Record<string, unknown>;
  timings: Record<string, unknown>;
  error: string | null;
  failure_evidence: Record<string, unknown>;
  results_observation: Record<string, unknown>;
  moves: HistoryMoveEvidence[];
}

export interface HistoryPairDocument {
  schema_version: 1;
  analysis: {
    name: string;
    repository: string;
    root: string;
  };
  pair: HistoryPairDetail;
}
