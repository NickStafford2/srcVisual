import type {
  ArtifactFocusProfile,
  ArtifactManifest,
  ArtifactSourceProjection,
  ArtifactTreeNode,
  ArtifactTreeProjection,
  TreePruningLevel,
  VisualizationResult,
  VisualizeResponse,
} from "./types";
import { isArtifactManifest } from "./types";
import type { SrcDiffTreeNode } from "./srcdiff/types";
import type {
  HistoryPairDocument,
  HistoryPairPageDocument,
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
  const payload = (await response.json()) as { examples?: string[]; error?: string };

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

export async function fetchHistoryStatus(): Promise<HistoryStatusDocument> {
  const payload = await fetchJson("/api/history/status");
  if (payload.schema_version !== 2 || typeof payload.analysis !== "object") {
    throw new Error("Backend returned an unsupported history status document.");
  }
  return payload as unknown as HistoryStatusDocument;
}

export async function fetchHistoryPairs(
  selection: HistorySelection,
  after?: number,
): Promise<HistoryPairPageDocument> {
  const parameters = new URLSearchParams({ selection, limit: "50" });
  if (after !== undefined) parameters.set("after", String(after));
  const payload = await fetchJson(`/api/history/pairs?${parameters.toString()}`);
  if (
    payload.schema_version !== 1 ||
    typeof payload.pairs !== "object" ||
    payload.pairs === null ||
    !Array.isArray((payload.pairs as { items?: unknown }).items)
  ) {
    throw new Error("Backend returned an unsupported history pair page.");
  }
  return payload as unknown as HistoryPairPageDocument;
}

export async function fetchHistoryPair(
  pairNumber: number,
): Promise<HistoryPairDocument> {
  const payload = await fetchJson(`/api/history/pairs/${pairNumber}`);
  if (payload.schema_version !== 1 || typeof payload.pair !== "object") {
    throw new Error("Backend returned unsupported history pair evidence.");
  }
  return payload as unknown as HistoryPairDocument;
}

export async function visualizeHistoryPair(
  pairNumber: number,
  options: {
    includeSkippedTags: boolean;
    pruningLevel: TreePruningLevel;
  },
): Promise<VisualizationResult> {
  const formData = new FormData();
  formData.append(
    "include_skipped_tags",
    options.includeSkippedTags ? "true" : "false",
  );
  formData.append("pruning_level", options.pruningLevel);
  formData.append("response_format", "artifact");
  const response = await fetch(`/api/history/pairs/${pairNumber}/visualize`, {
    method: "POST",
    body: formData,
  });
  const payload = await parseVisualizeResponse(response);
  if (!response.ok || "error" in payload) {
    throw new Error(
      "error" in payload
        ? payload.error
        : `Unable to visualize commit pair ${pairNumber}.`,
    );
  }
  assertVisualizationResult(payload);
  return payload;
}

async function fetchJson(url: string): Promise<Record<string, unknown>> {
  const response = await fetch(url);
  const payload = (await response.json()) as Record<string, unknown> & {
    error?: string;
  };
  if (!response.ok) {
    throw new Error(payload.error ?? `Request failed with status ${response.status}.`);
  }
  return payload;
}

export async function visualizeSrcDiff(
  formData: FormData,
): Promise<VisualizationResult> {
  formData.set("response_format", "artifact");
  const response = await fetch("/api/visualize", {
    method: "POST",
    body: formData,
  });

  const payload = await parseVisualizeResponse(response);

  if (!response.ok || "error" in payload) {
    throw new Error("error" in payload ? payload.error : "Upload failed.");
  }

  assertVisualizationResult(payload);

  return payload;
}

async function parseVisualizeResponse(
  response: Response,
): Promise<VisualizeResponse | ArtifactManifest | { error: string }> {
  const contentType = response.headers.get("content-type") ?? "";

  if (contentType.includes("application/json")) {
    return (await response.json()) as
      | VisualizeResponse
      | ArtifactManifest
      | { error: string };
  }

  const text = await response.text();
  return {
    error: text.trim() || `Upload failed with status ${response.status}.`,
  };
}

function assertVisualizationResult(
  payload: VisualizationResult,
): asserts payload is VisualizationResult {
  if (isArtifactManifest(payload)) {
    if (
      payload.projection_schema_version !== 1 ||
      !Array.isArray(payload.files) ||
      !Array.isArray(payload.focus_profiles)
    ) {
      throw new Error("Backend returned an unsupported artifact manifest.");
    }
    return;
  }
  assertVisualizeResponseContract(payload);
  assertVisualizeResponseHasXmlSpans(payload);
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

export async function fetchArtifactNodeChildren(
  artifactId: string,
  nodeId: string,
  offset = 0,
): Promise<{ children: ArtifactTreeNode[]; next_offset: number | null }> {
  return (await fetchJson(
    `/api/artifacts/${artifactId}/tree/nodes/${encodeURIComponent(nodeId)}/children?offset=${offset}&limit=100`,
  )) as unknown as { children: ArtifactTreeNode[]; next_offset: number | null };
}

export async function fetchArtifactXml(artifactId: string): Promise<string> {
  const payload = await fetchJson(`/api/artifacts/${artifactId}/xml`);
  if (typeof payload.xml !== "string") {
    throw new Error("Backend returned an unsupported artifact XML projection.");
  }
  return payload.xml;
}

function assertVisualizeResponseHasXmlSpans(
  payload: VisualizeResponse,
): asserts payload is VisualizeResponse {
  for (const file of payload.files) {
    if (!file.tree) continue;

    assertTreeHasXmlSpans(file.tree, file.filename);
  }
}

function assertVisualizeResponseContract(
  payload: VisualizeResponse,
): asserts payload is VisualizeResponse {
  if (typeof payload.moved_srcdiff_xml !== "string") {
    throw new Error("Backend response is missing `moved_srcdiff_xml`.");
  }

  if (typeof payload.source_filename !== "string") {
    throw new Error("Backend response is missing `source_filename`.");
  }

  if (!Array.isArray(payload.files)) {
    throw new Error("Backend response is missing `files`.");
  }

  if (typeof payload.unit_count !== "number") {
    throw new Error("Backend response is missing `unit_count`.");
  }

  if (payload.unit_count !== payload.files.length) {
    throw new Error(
      `Backend response has mismatched unit count: unit_count=${payload.unit_count}, files=${payload.files.length}.`,
    );
  }
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

function assertTreeHasXmlSpans(
  root: SrcDiffTreeNode,
  filename: string,
): asserts root is SrcDiffTreeNode {
  const stack: SrcDiffTreeNode[] = [root];

  while (stack.length > 0) {
    const node = stack.pop()!;

    if (!node.xml_span) {
      throw new Error(
        [
          "Backend returned SrcDiffTreeNode without xml_span.",
          `filename=${filename}`,
          `id=${node.id}`,
          `path=${node.path}`,
          `tag=${node.tag}`,
          `label=${node.label}`,
        ].join(" "),
      );
    }

    for (const child of node.children) {
      stack.push(child);
    }
  }
}
