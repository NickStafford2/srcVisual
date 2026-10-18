/// <reference types="node" />
import { readFileSync } from "node:fs";
import { afterEach, describe, expect, it, vi } from "vitest";
import { visualizeHistoryPair, visualizeSrcDiff } from "./api";
import { visualizeBigMoveBenchCase } from "./bigmovebench/api";
import { visualizeSavedBenchmarkCase } from "./bigmovebench/browserApi";

// The same checks can consume an actual /api/visualize response for a live
// backend/frontend contract check, without changing or deleting saved artifacts.
const manifest = process.env.ARTIFACT_MANIFEST_FIXTURE
  ? JSON.parse(readFileSync(process.env.ARTIFACT_MANIFEST_FIXTURE, "utf-8"))
  : {
      schema_version: 5, projection_schema_version: 2, artifact_id: "a".repeat(32),
      source_filename: "example.xml", files: [], focus_profiles: ["moves"],
      moves: { move_count: 0, items: [] },
    };

const entryPoints = [
  ["examples/uploads", () => visualizeSrcDiff(new FormData())],
  ["history", () => visualizeHistoryPair("notepadpp", 1)],
  ["review bundles", () => visualizeBigMoveBenchCase("review", 1)],
  ["saved benchmarks", () => visualizeSavedBenchmarkCase("run", "type1", "case")],
] as const;

function respondWith(payload: unknown) {
  vi.stubGlobal("fetch", vi.fn(async (url: string) => {
    const body = url.startsWith("/api/history/pairs/")
      ? { schema_version: 1, reuse: "artifact", run: {
          run_id: "run", kind: "history-visualization", repository_id: "notepadpp",
          history_pair: 1, artifact_id: manifest.artifact_id, status: "completed",
          cancellation_requested: false,
        } }
      : payload;
    return new Response(JSON.stringify(body), { status: 200, headers: { "content-type": "application/json" } });
  }));
}

afterEach(() => vi.unstubAllGlobals());

describe.each(entryPoints)("artifact admission through %s", (_name, visualize) => {
  it("accepts the current backend artifact manifest", async () => {
    respondWith(manifest);
    await expect(visualize()).resolves.toEqual(manifest);
  });

  it.each([4, 6])("rejects incompatible artifact schema %s", async (schema) => {
    respondWith({ ...manifest, schema_version: schema });
    await expect(visualize()).rejects.toThrow(/unsupported.*artifact/i);
  });

  it("rejects an incompatible projection", async () => {
    respondWith({ ...manifest, projection_schema_version: 1 });
    await expect(visualize()).rejects.toThrow(/unsupported.*artifact/i);
  });
});
