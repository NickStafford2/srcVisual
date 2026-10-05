import {
  assertClassificationContract,
  assertDetectorMove,
} from "../contentRelationships";
export async function readBenchmark<T>(path: string): Promise<T> {
  const response = await fetch(`/api/bigmovebench/runs${path}`);
  const payload = await response.json();
  if (!response.ok)
    throw new Error(payload.error ?? "Unable to load benchmark results.");
  if (payload.schema_version !== 2)
    throw new Error("Unsupported benchmark browser response.");
  assertClassificationContract(payload);
  if (Array.isArray(payload.moves))
    payload.moves.forEach((move: unknown) => assertDetectorMove(move));
  const cases =
    Array.isArray(payload.items) && path.includes("/cases?")
      ? payload.items
      : payload.case
        ? [payload.case]
        : [];
  if (
    cases.some(
      (item: object) =>
        ![
          "expected_content_relationship",
          "reviewed_expected_content_relationship",
          "observed_content_relationship",
        ].every((key) => Object.prototype.hasOwnProperty.call(item, key)),
    )
  )
    throw new Error(
      "Benchmark case requires content relationship classifications. Regenerate the collection and run.",
    );
  return payload as T;
}

export async function visualizeSavedBenchmarkCase(
  runId: string,
  category: string,
  caseId: string,
): Promise<ArtifactManifest> {
  const response = await fetch(
    `/api/bigmovebench/runs/${encodeURIComponent(runId)}/cases/${encodeURIComponent(category)}/${encodeURIComponent(caseId)}/visualize`,
    { method: "POST" },
  );
  const payload = await response.json();
  if (!response.ok)
    throw new Error(payload.error ?? "Unable to open benchmark Source view.");
  if (
    payload.schema_version !== 4 ||
    payload.projection_schema_version !== 2 ||
    typeof payload.artifact_id !== "string"
  )
    throw new Error("Unsupported benchmark visualization artifact.");
  return payload;
}
import type { ArtifactManifest } from "../types";
