export async function readBenchmark<T>(path: string): Promise<T> {
  const response = await fetch(`/api/bigmovebench/runs${path}`);
  const payload = await response.json();
  if (!response.ok)
    throw new Error(payload.error ?? "Unable to load benchmark results.");
  if (payload.schema_version !== 1)
    throw new Error("Unsupported benchmark browser response.");
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
    payload.projection_schema_version !== 1 ||
    typeof payload.artifact_id !== "string"
  )
    throw new Error("Unsupported benchmark visualization artifact.");
  return payload;
}
import type { ArtifactManifest } from "../types";
