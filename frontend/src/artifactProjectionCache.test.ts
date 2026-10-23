import { describe, expect, it, vi } from "vitest";
import { ArtifactProjectionCache } from "./artifactProjectionCache";

describe("immutable artifact projection cache", () => {
  it("deduplicates concurrent loads and isolates callers from mutation", async () => {
    const cache = new ArtifactProjectionCache();
    const load = vi.fn(async () => ({ rows: [{ text: "original" }] }));
    const [first, second] = await Promise.all([
      cache.get("source", load), cache.get("source", load),
    ]);
    (first.rows as { text: string }[])[0].text = "changed";
    expect(second.rows).toEqual([{ text: "original" }]);
    expect(await cache.get("source", load)).toEqual(second);
    expect(load).toHaveBeenCalledTimes(1);
  });

  it("evicts least recently used entries when the byte budget is full", async () => {
    const payload = { text: "a" };
    const cache = new ArtifactProjectionCache(JSON.stringify(payload).length * 4);
    const load = vi.fn(async () => payload);
    await cache.get("a", load);
    await cache.get("b", load);
    await cache.get("a", load);
    await cache.get("c", load);
    await cache.get("a", load);
    expect(load).toHaveBeenCalledTimes(3);
    await cache.get("b", load);
    expect(load).toHaveBeenCalledTimes(4);
  });

  it("bounds small entries by count and bypasses oversized payloads", async () => {
    const cache = new ArtifactProjectionCache(100, 1);
    const load = vi.fn(async () => ({ text: "small" }));
    await cache.get("a", load);
    await cache.get("b", load);
    await cache.get("a", load);
    expect(load).toHaveBeenCalledTimes(3);
    const large = vi.fn(async () => ({ text: "x".repeat(100) }));
    await cache.get("large", large);
    await cache.get("large", large);
    expect(large).toHaveBeenCalledTimes(2);
    await cache.get("a", load);
    expect(load).toHaveBeenCalledTimes(3);
  });

  it("retries failed requests and separates artifact and view keys", async () => {
    const cache = new ArtifactProjectionCache();
    const load = vi.fn().mockRejectedValueOnce(new Error("unavailable"))
      .mockResolvedValue({ rows: [] });
    await expect(cache.get("artifact-a?focus=moves", load)).rejects.toThrow("unavailable");
    await cache.get("artifact-a?focus=moves", load);
    await cache.get("artifact-a?focus=all", load);
    await cache.get("artifact-b?focus=moves", load);
    expect(load).toHaveBeenCalledTimes(4);
  });
});
