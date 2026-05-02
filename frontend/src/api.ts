import type { VisualizeResponse } from "./types";
import type { SrcDiffTreeNode } from "./srcdiff/types";

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
