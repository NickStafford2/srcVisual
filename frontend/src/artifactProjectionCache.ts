type JsonPayload = Record<string, unknown>;

/** Session-only LRU for immutable projections. Each caller gets its own object. */
export class ArtifactProjectionCache {
  private entries = new Map<string, string>();
  private pending = new Map<string, Promise<string>>();
  private bytes = 0;

  constructor(
    private readonly maxBytes = 32 * 1024 * 1024,
    private readonly maxEntries = 128,
  ) {}

  async get(key: string, load: () => Promise<JsonPayload>): Promise<JsonPayload> {
    const cached = this.entries.get(key);
    if (cached !== undefined) {
      this.entries.delete(key);
      this.entries.set(key, cached);
      return JSON.parse(cached) as JsonPayload;
    }

    let request = this.pending.get(key);
    if (!request) {
      request = load().then((payload) => {
        const serialized = JSON.stringify(payload);
        // Budget UTF-16 string storage; the entry cap bounds Map overhead.
        const size = serialized.length * 2;
        if (size <= this.maxBytes && this.maxEntries > 0) {
          while (
            this.entries.size >= this.maxEntries ||
            this.bytes + size > this.maxBytes
          ) {
            const oldest = this.entries.keys().next().value!;
            this.bytes -= this.entries.get(oldest)!.length * 2;
            this.entries.delete(oldest);
          }
          this.entries.set(key, serialized);
          this.bytes += size;
        }
        return serialized;
      });
      this.pending.set(key, request);
    }

    try {
      return JSON.parse(await request) as JsonPayload;
    } finally {
      if (this.pending.get(key) === request) this.pending.delete(key);
    }
  }
}

export const artifactProjectionCache = new ArtifactProjectionCache();
