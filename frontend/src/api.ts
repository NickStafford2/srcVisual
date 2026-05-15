import type { VisualizeResponse } from "./types";
import type { SrcDiffTreeNode } from "./srcdiff/types";

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

export async function visualizeSrcDiff(
  formData: FormData,
): Promise<VisualizeResponse> {
  const response = await fetch("/api/visualize", {
    method: "POST",
    body: formData,
  });

  const payload = await parseVisualizeResponse(response);

  if (!response.ok || "error" in payload) {
    throw new Error("error" in payload ? payload.error : "Upload failed.");
  }

  assertVisualizeResponseContract(payload);
  assertVisualizeResponseHasXmlSpans(payload);

  return payload;
}

async function parseVisualizeResponse(
  response: Response,
): Promise<VisualizeResponse | { error: string }> {
  const contentType = response.headers.get("content-type") ?? "";

  if (contentType.includes("application/json")) {
    return (await response.json()) as VisualizeResponse | { error: string };
  }

  const text = await response.text();
  return {
    error: text.trim() || `Upload failed with status ${response.status}.`,
  };
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
