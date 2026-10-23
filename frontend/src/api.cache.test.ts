import { afterEach, expect, it, vi } from "vitest";
import { fetchArtifactSource, fetchHistoryRepositories } from "./api";

afterEach(() => vi.unstubAllGlobals());

it("reuses identical source projections while preserving focus and range identity", async () => {
  const fetchMock = vi.fn(async () => new Response(JSON.stringify({ hunks: [] }), {
    status: 200, headers: { "content-type": "application/json" },
  }));
  vi.stubGlobal("fetch", fetchMock);
  await Promise.all([
    fetchArtifactSource("cache-api-test", "file", "moves"),
    fetchArtifactSource("cache-api-test", "file", "moves"),
  ]);
  await fetchArtifactSource("cache-api-test", "file", "moves");
  expect(fetchMock).toHaveBeenCalledTimes(1);
  await fetchArtifactSource("cache-api-test", "file", "complete-file");
  await fetchArtifactSource("cache-api-test", "file", "moves", [
    { left: { start: 1, end: 20 } },
  ]);
  expect(fetchMock).toHaveBeenCalledTimes(3);
});

it("keeps mutable history discovery outside the projection cache", async () => {
  const fetchMock = vi.fn(async () => new Response(JSON.stringify({
    schema_version: 1, default_id: "repository", repositories: [],
  }), { status: 200, headers: { "content-type": "application/json" } }));
  vi.stubGlobal("fetch", fetchMock);
  await fetchHistoryRepositories();
  await fetchHistoryRepositories();
  expect(fetchMock).toHaveBeenCalledTimes(2);
});
