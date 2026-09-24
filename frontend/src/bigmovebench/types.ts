import type { ArtifactManifest } from "../types";

export interface BigMoveBenchDiagnosis {
  stage: string;
  reason: string;
  [key: string]: unknown;
}

export interface BigMoveBenchCaseSummary {
  ordinal: number;
  case_id: string;
  outcome: string;
  strength_stratum: string;
  type3_both_similarity: number;
  diagnosis: BigMoveBenchDiagnosis;
  directory: string;
  files: Record<string, string>;
}

export interface BigMoveBenchReviewManifest {
  schema_version: 1;
  review_id: string;
  case_count: number;
  cases: BigMoveBenchCaseSummary[];
}

export interface BigMoveBenchReviewState {
  selectedBundle: File | null;
  manifest: BigMoveBenchReviewManifest | null;
  activeOrdinal: number | null;
  isLoading: boolean;
  error: string | null;
  setSelectedBundle: (file: File | null) => void;
  importBundle: () => Promise<void>;
  visualizeCase: (ordinal: number) => Promise<void>;
  acceptVisualization: (payload: ArtifactManifest) => void;
}
