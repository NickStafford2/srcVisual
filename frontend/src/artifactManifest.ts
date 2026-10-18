import { assertClassificationContract, assertDetectorMove } from "./contentRelationships";
import type { ArtifactManifest } from "./types";

// Artifact storage and results/projection schemas have separate versions.
export const ARTIFACT_SCHEMA_VERSION = 5;

export function assertArtifactManifest(
  payload: unknown,
): asserts payload is ArtifactManifest {
  if (typeof payload !== "object" || payload === null) {
    throw new Error("Backend returned an unsupported artifact manifest.");
  }
  const manifest = payload as Partial<ArtifactManifest>;
  if (
    manifest.schema_version !== ARTIFACT_SCHEMA_VERSION ||
    manifest.projection_schema_version !== 2 ||
    typeof manifest.artifact_id !== "string" ||
    !Array.isArray(manifest.files) ||
    !Array.isArray(manifest.focus_profiles)
  ) {
    throw new Error(
      "Backend returned an unsupported artifact manifest. Preserve old artifacts and regenerate them.",
    );
  }
  assertClassificationContract(manifest);
  manifest.moves?.items.forEach((move) => assertDetectorMove(move, true));
}

