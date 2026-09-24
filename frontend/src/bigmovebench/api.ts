import type { ArtifactManifest } from "../types";
import type { BigMoveBenchReviewManifest } from "./types";

export async function importBigMoveBenchReview(
  bundle: File,
): Promise<BigMoveBenchReviewManifest> {
  const formData = new FormData();
  formData.append("review_bundle", bundle);
  const response = await fetch("/api/bigmovebench/reviews", {
    method: "POST",
    body: formData,
  });
  const payload: unknown = await response.json();
  if (!response.ok) throw new Error(responseError(payload));
  assertReviewManifest(payload);
  return payload;
}

export async function visualizeBigMoveBenchCase(
  reviewId: string,
  ordinal: number,
): Promise<ArtifactManifest> {
  const response = await fetch(
    `/api/bigmovebench/reviews/${encodeURIComponent(reviewId)}/cases/${ordinal}/visualize`,
    { method: "POST" },
  );
  const payload: unknown = await response.json();
  if (!response.ok) throw new Error(responseError(payload));
  if (
    typeof payload !== "object" ||
    payload === null ||
    (payload as Partial<ArtifactManifest>).projection_schema_version !== 1 ||
    typeof (payload as Partial<ArtifactManifest>).artifact_id !== "string"
  ) {
    throw new Error("Backend returned an unsupported visualization artifact.");
  }
  return payload as ArtifactManifest;
}

function assertReviewManifest(
  payload: unknown,
): asserts payload is BigMoveBenchReviewManifest {
  if (
    typeof payload !== "object" ||
    payload === null ||
    (payload as Partial<BigMoveBenchReviewManifest>).schema_version !== 1 ||
    typeof (payload as Partial<BigMoveBenchReviewManifest>).review_id !==
      "string" ||
    !Array.isArray((payload as Partial<BigMoveBenchReviewManifest>).cases)
  ) {
    throw new Error("Backend returned an unsupported BigMoveBench review.");
  }
}

function responseError(payload: unknown): string {
  if (typeof payload === "object" && payload !== null) {
    const error = (payload as { error?: unknown }).error;
    if (typeof error === "string") return error;
  }
  return "BigMoveBench review request failed.";
}
