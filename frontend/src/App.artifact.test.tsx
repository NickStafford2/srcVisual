import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, expect, it, vi } from "vitest";
import App from "./App";
import type {
  ArtifactManifest,
  ArtifactSourceProjection,
  ArtifactTreeProjection,
} from "./types";

class MockEventSource {
  onmessage: ((event: MessageEvent<string>) => void) | null = null;
  constructor(public readonly url: string) {}
  close() {}
}

const file = {
  file_id: "f-one",
  root_node_id: "f-one:n00000000",
  filename: "example.cpp",
  revision_0_filename: "before/example.cpp",
  revision_1_filename: "after/example.cpp",
  language: "C++",
  revision_0_lines: 1,
  revision_1_lines: 1,
};

const manifest: ArtifactManifest = {
  schema_version: 2,
  projection_schema_version: 1,
  artifact_id: "a".repeat(32),
  source_filename: "example.xml",
  has_position_data: true,
  file_count: 1,
  node_count: 1,
  files: [file],
  moves: {
    move_count: 1,
    items: [
      {
        move_id: "move-1",
        match_kind: "exact",
        from_node_ids: [file.root_node_id],
        to_node_ids: [file.root_node_id],
      },
    ],
  },
  focus_profiles: ["changes-and-moves", "moves", "changes", "complete-file"],
};

const source: ArtifactSourceProjection = {
  schema_version: 1,
  artifact_id: manifest.artifact_id,
  file_id: file.file_id,
  filename: file.filename,
  revision_0_filename: file.revision_0_filename,
  revision_1_filename: file.revision_1_filename,
  focus_profile: "changes-and-moves",
  context_lines: 3,
  truncated: false,
  revision_0_line_count: 1,
  revision_1_line_count: 1,
  blocks: [
    {
      type: "hunk",
      block_id: "h-0-1",
      left: { start_line: 1, end_line: 1 },
      right: { start_line: 1, end_line: 1 },
      rows: [
        {
          kind: "replace",
          left: {
            line_number: 1,
            text: "old();",
            anchors: [
              {
                node_id: file.root_node_id,
                kind: "move",
                move_id: "move-1",
                span: { start_line: 1, start_col: 1, end_line: 1, end_col: 6 },
              },
            ],
          },
          right: {
            line_number: 1,
            text: "new();",
            anchors: [
              {
                node_id: file.root_node_id,
                kind: "move",
                move_id: "move-1",
                span: { start_line: 1, start_col: 1, end_line: 1, end_col: 6 },
              },
            ],
          },
        },
      ],
    },
  ],
};

const tree: ArtifactTreeProjection = {
  schema_version: 1,
  artifact_id: manifest.artifact_id,
  file_id: file.file_id,
  focus_profile: "changes-and-moves",
  node_count: 1,
  truncated: false,
  root: {
    node_id: file.root_node_id,
    path: "/src:unit[1]",
    tag: "unit",
    label: "unit: example.cpp",
    kind: "move",
    move_id: "move-1",
    srcdiff_attributes: {},
    xml_span: { start_line: 1, start_col: 1, end_line: 1, end_col: 8 },
    revision_0_span: { start_line: 1, start_col: 1, end_line: 1, end_col: 6 },
    revision_1_span: { start_line: 1, start_col: 1, end_line: 1, end_col: 6 },
    child_count: 0,
    children_complete: true,
    children: [],
  },
};

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

it("loads artifact projections and defers XML until its tab opens", async () => {
  const user = userEvent.setup();
  let xmlRequests = 0;
  vi.spyOn(globalThis.crypto, "randomUUID").mockReturnValue(
    "00000000-0000-4000-8000-000000000000",
  );
  vi.stubGlobal("EventSource", MockEventSource);
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url === "/api/examples") {
        return jsonResponse({ examples: ["e2e_generated_example.xml"] });
      }
      if (url === "/api/examples/e2e_generated_example.xml") {
        return jsonResponse({ content: "<unit />" });
      }
      if (url === "/api/visualize") return jsonResponse(manifest);
      if (url.includes(`/files/${file.file_id}/source?`)) {
        return jsonResponse(source);
      }
      if (url.includes(`/files/${file.file_id}/tree?`)) {
        return jsonResponse(tree);
      }
      if (url.includes(`/tree/nodes/${encodeURIComponent(file.root_node_id)}`)) {
        return jsonResponse({ schema_version: 1, node: tree.root });
      }
      if (url.endsWith("/xml")) {
        xmlRequests += 1;
        return jsonResponse({
          schema_version: 1,
          artifact_id: manifest.artifact_id,
          xml: "<unit />",
          anchors: [
            {
              node_id: file.root_node_id,
              kind: "move",
              move_id: "move-1",
              span: tree.root!.xml_span,
            },
          ],
        });
      }
      throw new Error(`Unexpected fetch URL: ${url}`);
    }),
  );

  render(<App />);
  await user.click(await screen.findByRole("button", { name: "example.xml" }));
  await user.click(screen.getByRole("button", { name: "Submit" }));

  expect(await screen.findByText("old();")).toBeInTheDocument();
  expect(await screen.findByText("unit: example.cpp")).toBeInTheDocument();
  expect(xmlRequests).toBe(0);

  await user.click(screen.getByRole("tab", { name: "XML" }));
  await waitFor(() => expect(xmlRequests).toBe(1));
  await user.click(await screen.findByRole("button", { name: "<unit />" }));
  await waitFor(() =>
    expect(screen.getByRole("button", { name: "move-1" })).toHaveAttribute(
      "data-selected-move",
      "true",
    ),
  );
  expect(screen.getByRole("button", { name: "move-1" })).toHaveAttribute(
    "aria-pressed",
    "true",
  );

  await user.click(screen.getByRole("tab", { name: "Source" }));
  expect(await screen.findByText("Move move-1 · 1 file")).toBeInTheDocument();
});

function jsonResponse(payload: unknown): Response {
  return new Response(JSON.stringify(payload), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}
