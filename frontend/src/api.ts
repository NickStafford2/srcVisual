import type { VisualizeResponse } from "./types";

export async function visualizeSrcDiff(
  formData: FormData,
): Promise<VisualizeResponse> {
  const response = await fetch("/api/visualize", {
    method: "POST",
    body: formData,
  });

  const payload = (await response.json()) as
    | VisualizeResponse
    | { error: string };

  if (!response.ok || "error" in payload) {
    throw new Error("error" in payload ? payload.error : "Upload failed.");
  }

  return payload;
}
