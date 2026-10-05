export async function readBenchmark<T>(path: string): Promise<T> {
  const response = await fetch(`/api/bigmovebench/runs${path}`);
  const payload = await response.json();
  if (!response.ok)
    throw new Error(payload.error ?? "Unable to load benchmark results.");
  if (payload.schema_version !== 1)
    throw new Error("Unsupported benchmark browser response.");
  return payload as T;
}
