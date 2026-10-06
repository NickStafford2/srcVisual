import { withReportedMoveCount } from "./history/pairCounts";
import {
  assertClassificationContract,
  assertDetectorMove,
} from "./contentRelationships";
import type {
  ArtifactDiffTreeProjection,
  ArtifactFocusProfile,
  ArtifactManifest,
  ArtifactMoveProjection,
  ArtifactSourceProjection,
  ArtifactTreeNode,
  ArtifactTreeProjection,
  ArtifactXmlProjection,
} from "./types";
import type {
  HistoryPairDocument,
  HistoryPairPageDocument,
  HistoryRepositoryDocument,
  HistoryRun,
  HistoryRunCreationDocument,
  HistoryRunDocument,
  HistoryRunEvent,
  HistoryRunEventDocument,
  HistorySelection,
  HistoryStatusDocument,
} from "./history/types";

export type VisualizationProgressEvent = {
  type: "connected" | "progress" | "complete" | "error";
  message: string;
  elapsed_ms: number;
  delta_ms: number;
};

export async function fetchExampleList(): Promise<string[]> {
  const response = await fetch("/api/examples");
  const payload = (await response.json()) as {
    examples?: string[];
    error?: string;
  };

  if (!response.ok) {
    throw new Error(payload.error ?? "Unable to load examples.");
  }

  return payload.examples ?? [];
}

export async function fetchExampleContent(filename: string): Promise<string> {
  const response = await fetch(`/api/examples/${encodeURIComponent(filename)}`);
  const payload = (await response.json()) as {
    content?: string;
    error?: string;
  };

  if (!response.ok || typeof payload.content !== "string") {
    throw new Error(payload.error ?? "Unable to load example content.");
  }

  return payload.content;
}

export async function fetchHistoryRepositories(): Promise<HistoryRepositoryDocument> {
  const payload = await fetchJson("/api/history/repositories");
  if (
    payload.schema_version !== 1 ||
    typeof payload.default_id !== "string" ||
    !Array.isArray(payload.repositories)
  ) {
    throw new Error("Backend returned an unsupported repository list.");
  }
  return payload as unknown as HistoryRepositoryDocument;
}

export async function fetchHistoryStatus(
  repositoryId: string,
): Promise<HistoryStatusDocument> {
  const payload = await fetchJson(
    `/api/history/status?repository=${encodeURIComponent(repositoryId)}`,
  );
  if (payload.schema_version !== 3 || typeof payload.analysis !== "object") {
    throw new Error("Backend returned an unsupported history status document.");
  }
  assertClassificationContract(payload);
  const moves = payload.moves as
    | { by_content_relationship?: unknown }
    | undefined;
  if (!moves?.by_content_relationship)
    throw new Error(
      "History status requires moves.by_content_relationship. Start a fresh analysis.",
    );
  return payload as unknown as HistoryStatusDocument;
}

export async function fetchHistoryPairs(
  repositoryId: string,
  selection: HistorySelection,
  after?: number,
  signal?: AbortSignal,
): Promise<HistoryPairPageDocument> {
  const parameters = new URLSearchParams({
    repository: repositoryId,
    selection,
    limit: "50",
  });
  if (after !== undefined) parameters.set("after", String(after));
  const payload = await fetchJson(
    `/api/history/pairs?${parameters.toString()}`,
    signal,
  );
  if (
    payload.schema_version !== 2 ||
    typeof payload.pairs !== "object" ||
    payload.pairs === null ||
    !Array.isArray((payload.pairs as { items?: unknown }).items)
  ) {
    throw new Error("Backend returned an unsupported history pair page.");
  }
  const document = payload as unknown as HistoryPairPageDocument;
  return { ...document, pairs: { ...document.pairs, items: document.pairs.items.map(withReportedMoveCount) } };
}

export async function fetchHistoryPair(
  repositoryId: string,
  pairNumber: number,
): Promise<HistoryPairDocument> {
  const payload = await fetchJson(
    `/api/history/pairs/${pairNumber}?repository=${encodeURIComponent(repositoryId)}`,
  );
  if (payload.schema_version !== 2 || typeof payload.pair !== "object") {
    throw new Error("Backend returned unsupported history pair evidence.");
  }
  assertClassificationContract(payload);
  const pair = payload.pair as { moves?: unknown[] };
  if (!Array.isArray(pair.moves))
    throw new Error("History pair requires move evidence.");
  pair.moves.forEach((move) => assertDetectorMove(move));
  return payload as unknown as HistoryPairDocument;
}

export async function visualizeHistoryPair(
  repositoryId: string,
  pairNumber: number,
  observer: {
    onRun?: (run: HistoryRun) => void;
    onEvent?: (event: HistoryRunEvent) => void;
  } = {},
): Promise<ArtifactManifest> {
  const response = await fetch(
    `/api/history/pairs/${pairNumber}/runs?repository=${encodeURIComponent(repositoryId)}`,
    { method: "POST" },
  );
  const payload: unknown = await response.json();
  if (!response.ok) {
    throw new Error(
      responseError(payload) ??
        `Unable to visualize commit pair ${pairNumber}.`,
    );
  }
  if (!isHistoryRunCreationDocument(payload)) {
    throw new Error("Backend returned an unsupported run-creation document.");
  }

  observer.onRun?.(payload.run);
  const eventStream = openHistoryRunEventStream(
    payload.run.run_id,
    observer.onEvent,
  );
  let run: HistoryRun;
  try {
    run = await awaitCompletedHistoryRun(payload.run, observer.onRun);
  } finally {
    eventStream.close();
  }
  if (run.status === "failed") {
    throw new Error(run.diagnostic?.message ?? "History visualization failed.");
  }
  if (run.status === "cancelled") {
    throw new Error("History visualization was cancelled.");
  }
  if (run.status !== "completed" || run.artifact_id === null) {
    throw new Error("Backend returned an invalid terminal history run.");
  }
  return fetchArtifactManifest(run.artifact_id);
}

export async function cancelHistoryRun(runId: string): Promise<HistoryRun> {
  const response = await fetch(`/api/runs/${runId}/cancel`, { method: "POST" });
  const payload: unknown = await response.json();
  if (!response.ok) {
    throw new Error(responseError(payload) ?? "Unable to cancel history run.");
  }
  if (!isHistoryRunDocument(payload)) {
    throw new Error("Backend returned an unsupported run-status document.");
  }
  return payload.run;
}

async function awaitCompletedHistoryRun(
  initialRun: HistoryRun,
  onRun: ((run: HistoryRun) => void) | undefined,
): Promise<HistoryRun> {
  let run = initialRun;
  while (run.status === "queued" || run.status === "running") {
    const payload = await fetchJson(`/api/runs/${run.run_id}`);
    if (!isHistoryRunDocument(payload)) {
      throw new Error("Backend returned an unsupported run-status document.");
    }
    run = payload.run;
    onRun?.(run);
    if (run.status === "queued" || run.status === "running") {
      await new Promise((resolve) => window.setTimeout(resolve, 500));
    }
  }
  return run;
}

function openHistoryRunEventStream(
  runId: string,
  onEvent: ((event: HistoryRunEvent) => void) | undefined,
): { close: () => void } {
  if (!onEvent) return { close: () => undefined };
  const eventSource = new EventSource(`/api/runs/${runId}/events`);
  eventSource.addEventListener("run", (message) => {
    let payload: unknown;
    try {
      payload = JSON.parse((message as MessageEvent<string>).data) as unknown;
    } catch {
      return;
    }
    if (!isHistoryRunEventDocument(payload)) return;
    onEvent(payload.event);
    if (["completed", "failed", "cancelled"].includes(payload.event.status)) {
      eventSource.close();
    }
  });
  return { close: () => eventSource.close() };
}

async function fetchArtifactManifest(
  artifactId: string,
): Promise<ArtifactManifest> {
  const payload = await fetchJson(`/api/artifacts/${artifactId}`);
  assertArtifactManifest(payload);
  return payload;
}

async function fetchJson(url: string, signal?: AbortSignal): Promise<Record<string, unknown>> {
  const response = await (signal ? fetch(url, { signal }) : fetch(url));
  const payload = (await response.json()) as Record<string, unknown> & {
    error?: string;
  };
  if (!response.ok) {
    throw new Error(
      payload.error ?? `Request failed with status ${response.status}.`,
    );
  }
  return payload;
}

export async function visualizeSrcDiff(
  formData: FormData,
): Promise<ArtifactManifest> {
  const response = await fetch("/api/visualize", {
    method: "POST",
    body: formData,
  });

  const payload = await parseArtifactResponse(response);

  if (!response.ok) {
    throw new Error(responseError(payload) ?? "Upload failed.");
  }

  assertArtifactManifest(payload);

  return payload;
}

async function parseArtifactResponse(response: Response): Promise<unknown> {
  const contentType = response.headers.get("content-type") ?? "";

  if (contentType.includes("application/json")) {
    return await response.json();
  }

  const text = await response.text();
  return {
    error: text.trim() || `Upload failed with status ${response.status}.`,
  };
}

function assertArtifactManifest(
  payload: unknown,
): asserts payload is ArtifactManifest {
  if (typeof payload !== "object" || payload === null) {
    throw new Error("Backend returned an unsupported artifact manifest.");
  }
  const manifest = payload as Partial<ArtifactManifest>;
  if (
    manifest.schema_version !== 4 ||
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

function isHistoryRunCreationDocument(
  payload: unknown,
): payload is HistoryRunCreationDocument {
  if (typeof payload !== "object" || payload === null) return false;
  const document = payload as Partial<HistoryRunCreationDocument>;
  return (
    document.schema_version === 1 &&
    isHistoryRun(document.run) &&
    ["new", "active-run", "artifact"].includes(document.reuse ?? "")
  );
}

function isHistoryRunDocument(payload: unknown): payload is HistoryRunDocument {
  if (typeof payload !== "object" || payload === null) return false;
  const document = payload as Partial<HistoryRunDocument>;
  return document.schema_version === 1 && isHistoryRun(document.run);
}

function isHistoryRun(value: unknown): value is HistoryRun {
  if (typeof value !== "object" || value === null) return false;
  const run = value as Partial<HistoryRun>;
  return (
    typeof run.run_id === "string" &&
    run.kind === "history-visualization" &&
    typeof run.repository_id === "string" &&
    typeof run.history_pair === "number" &&
    run.history_pair > 0 &&
    (run.artifact_id === null || typeof run.artifact_id === "string") &&
    typeof run.cancellation_requested === "boolean" &&
    ["queued", "running", "completed", "failed", "cancelled"].includes(
      run.status ?? "",
    )
  );
}

function isHistoryRunEventDocument(
  payload: unknown,
): payload is HistoryRunEventDocument {
  if (typeof payload !== "object" || payload === null) return false;
  const document = payload as Partial<HistoryRunEventDocument>;
  const event = document.event;
  return (
    document.schema_version === 1 &&
    typeof event === "object" &&
    event !== null &&
    typeof event.run_id === "string" &&
    typeof event.sequence === "number" &&
    ["status", "progress", "cancellation-requested"].includes(event.type) &&
    ["queued", "running", "completed", "failed", "cancelled"].includes(
      event.status,
    ) &&
    typeof event.message === "string"
  );
}

function responseError(payload: unknown): string | null {
  if (typeof payload !== "object" || payload === null) return null;
  const error = (payload as { error?: unknown }).error;
  return typeof error === "string" && error ? error : null;
}

export async function fetchArtifactSource(
  artifactId: string,
  fileId: string,
  focus: ArtifactFocusProfile,
  ranges?: {
    left?: ArtifactSourceRangeRequest;
    right?: ArtifactSourceRangeRequest;
  }[],
): Promise<ArtifactSourceProjection> {
  const parameters = new URLSearchParams({ focus, context: "3" });
  for (const range of ranges ?? []) {
    parameters.append("left_range", encodeSourceRange(range.left));
    parameters.append("right_range", encodeSourceRange(range.right));
  }
  return (await fetchJson(
    `/api/artifacts/${artifactId}/files/${fileId}/source?${parameters.toString()}`,
  )) as unknown as ArtifactSourceProjection;
}

export async function fetchArtifactMove(
  artifactId: string,
  moveId: string,
): Promise<ArtifactMoveProjection> {
  const payload = await fetchJson(
    `/api/artifacts/${artifactId}/moves/${encodeURIComponent(moveId)}`,
  );
  if (
    payload.schema_version !== 2 ||
    typeof payload.move !== "object" ||
    payload.move === null
  ) {
    throw new Error(
      "Backend returned an unsupported artifact move projection.",
    );
  }
  assertDetectorMove(payload.move, true);
  return payload as unknown as ArtifactMoveProjection;
}

type ArtifactSourceRangeRequest = { start: number; end: number };

function encodeSourceRange(range: ArtifactSourceRangeRequest | undefined) {
  return range ? `${range.start}:${range.end}` : "";
}

export async function fetchArtifactTree(
  artifactId: string,
  fileId: string,
  focus: ArtifactFocusProfile,
): Promise<ArtifactTreeProjection> {
  const parameters = new URLSearchParams({ focus, limit: "500" });
  return (await fetchJson(
    `/api/artifacts/${artifactId}/files/${fileId}/tree?${parameters.toString()}`,
  )) as unknown as ArtifactTreeProjection;
}

export async function fetchArtifactDiffTree(
  artifactId: string,
  fileId: string,
): Promise<ArtifactDiffTreeProjection> {
  return (await fetchJson(
    `/api/artifacts/${artifactId}/files/${fileId}/diff-tree?limit=1000`,
  )) as unknown as ArtifactDiffTreeProjection;
}

export async function fetchArtifactNodeChildren(
  artifactId: string,
  nodeId: string,
  offset = 0,
): Promise<{ children: ArtifactTreeNode[]; next_offset: number | null }> {
  return (await fetchJson(
    `/api/artifacts/${artifactId}/tree/nodes/${encodeURIComponent(nodeId)}/children?offset=${offset}&limit=100`,
  )) as unknown as { children: ArtifactTreeNode[]; next_offset: number | null };
}

export async function fetchArtifactNode(
  artifactId: string,
  nodeId: string,
): Promise<ArtifactTreeNode> {
  const payload = await fetchJson(
    `/api/artifacts/${artifactId}/tree/nodes/${encodeURIComponent(nodeId)}`,
  );
  if (payload.schema_version !== 1 || typeof payload.node !== "object") {
    throw new Error(
      "Backend returned an unsupported artifact node projection.",
    );
  }
  return payload.node as unknown as ArtifactTreeNode;
}

export async function fetchArtifactXml(
  artifactId: string,
): Promise<ArtifactXmlProjection> {
  const payload = await fetchJson(`/api/artifacts/${artifactId}/xml`);
  if (
    payload.schema_version !== 1 ||
    typeof payload.xml !== "string" ||
    !Array.isArray(payload.anchors)
  ) {
    throw new Error("Backend returned an unsupported artifact XML projection.");
  }
  return payload as unknown as ArtifactXmlProjection;
}

export function openVisualizationProgressStream(
  token: string,
  onEvent: (event: VisualizationProgressEvent) => void,
): { close: () => void } {
  const eventSource = new EventSource(
    `/api/visualize/events?token=${encodeURIComponent(token)}`,
  );

  eventSource.onmessage = (event) => {
    const payload = JSON.parse(event.data) as VisualizationProgressEvent;
    onEvent(payload);
  };

  return {
    close: () => eventSource.close(),
  };
}
