import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fetchArtifactSource } from "../../api";
import type { ArtifactSourceProjection } from "../../types";
import { ArtifactSourcePane } from "./ArtifactSourcePane";

vi.mock("../../api", () => ({ fetchArtifactSource: vi.fn() }));

const projection: ArtifactSourceProjection = {
  schema_version: 1,
  artifact_id: "artifact-1",
  file_id: "f-1",
  filename: "example.cpp",
  revision_0_filename: "before/example.cpp",
  revision_1_filename: "after/example.cpp",
  focus_profile: "changes-and-moves",
  context_lines: 3,
  truncated: false,
  revision_0_line_count: 20,
  revision_1_line_count: 20,
  blocks: [
    {
      type: "gap",
      block_id: "g-0-10",
      left: { start_line: 1, end_line: 10, line_count: 10 },
      right: { start_line: 1, end_line: 10, line_count: 10 },
    },
    {
      type: "hunk",
      block_id: "h-10-11",
      left: { start_line: 11, end_line: 11 },
      right: { start_line: 11, end_line: 11 },
      rows: [
        {
          kind: "replace",
          left: { line_number: 11, text: "old();", anchors: [] },
          right: { line_number: 11, text: "new();", anchors: [] },
        },
      ],
    },
  ],
};

const file = {
  file_id: "f-1",
  root_node_id: "f-1:n00000000",
  filename: "example.cpp",
  revision_0_filename: "before/example.cpp",
  revision_1_filename: "after/example.cpp",
  language: "C++",
  revision_0_lines: 20,
  revision_1_lines: 20,
};

const secondFile = {
  ...file,
  file_id: "f-2",
  root_node_id: "f-2:n00000000",
  filename: "other.cpp",
  revision_0_filename: "before/other.cpp",
  revision_1_filename: "after/other.cpp",
};

const activeMove = {
  move_id: "move-1",
  match_kind: "exact",
  from_node_ids: ["f-1:n00000001"],
  to_node_ids: ["f-1:n00000002"],
};

describe("ArtifactSourcePane", () => {
  beforeEach(() => {
    vi.mocked(fetchArtifactSource).mockReset().mockResolvedValue(projection);
  });

  afterEach(cleanup);

  it("loads a bounded focus projection and requests explicit gap ranges", async () => {
    const user = userEvent.setup();
    render(
      <ArtifactSourcePane
        artifactId="artifact-1"
        files={[file, secondFile]}
        selectedFileId="f-1"
        focus="changes-and-moves"
        activeMove={null}
        onFocusChange={vi.fn()}
      />,
    );

    expect(await screen.findByText("old();")).toBeInTheDocument();
    expect(fetchArtifactSource).toHaveBeenCalledWith(
      "artifact-1",
      "f-1",
      "changes-and-moves",
    );
    expect(screen.getByText("other.cpp")).toBeInTheDocument();
    expect(fetchArtifactSource).not.toHaveBeenCalledWith(
      "artifact-1",
      "f-2",
      "changes-and-moves",
    );

    await user.click(screen.getByRole("button", { name: /Show 10 left/ }));
    await waitFor(() =>
      expect(fetchArtifactSource).toHaveBeenLastCalledWith(
        "artifact-1",
        "f-1",
        "changes-and-moves",
        [
          {
            left: { start: 1, end: 10 },
            right: { start: 1, end: 10 },
          },
        ],
      ),
    );
  });

  it("renders exact move fragments with the established move color", async () => {
    vi.mocked(fetchArtifactSource).mockResolvedValue({
      ...projection,
      focus_profile: "moves",
      blocks: [
        {
          type: "hunk",
          block_id: "h-0-1",
          left: { start_line: 11, end_line: 11 },
          right: { start_line: 11, end_line: 11 },
          rows: [
            {
              kind: "replace",
              left: {
                line_number: 11,
                text: "before moved after",
                anchors: [
                  {
                    node_id: "f-1:n00000000",
                    kind: "delete",
                    move_id: null,
                    span: {
                      start_line: 11,
                      start_col: 1,
                      end_line: 11,
                      end_col: 18,
                    },
                  },
                  {
                    node_id: "f-1:n00000001",
                    kind: "move",
                    move_id: "move-1",
                    span: {
                      start_line: 11,
                      start_col: 8,
                      end_line: 11,
                      end_col: 12,
                    },
                  },
                ],
              },
              right: {
                line_number: 11,
                text: "after moved before",
                anchors: [
                  {
                    node_id: "f-1:n00000003",
                    kind: "insert",
                    move_id: null,
                    span: {
                      start_line: 11,
                      start_col: 1,
                      end_line: 11,
                      end_col: 18,
                    },
                  },
                  {
                    node_id: "f-1:n00000002",
                    kind: "move",
                    move_id: "move-1",
                    span: {
                      start_line: 11,
                      start_col: 7,
                      end_line: 11,
                      end_col: 11,
                    },
                  },
                ],
              },
            },
          ],
        },
      ],
    });

    render(
      <ArtifactSourcePane
        artifactId="artifact-1"
        files={[file]}
        selectedFileId="f-1"
        focus="moves"
        activeMove={activeMove}
        onFocusChange={vi.fn()}
      />,
    );

    await screen.findByText("before", { exact: false });
    const moveSegments = document.querySelectorAll(
      '[data-highlight-kind="move"][data-move-id="move-1"]',
    );
    expect(moveSegments).toHaveLength(2);
    expect(moveSegments[0]).toHaveTextContent("moved");
    expect(moveSegments[0]).toHaveClass("bg-diff-move-1/25");
    expect(screen.getByLabelText("Artifact source file example.cpp")).toHaveClass(
      "bg-black",
    );
  });

  it("uses a collapsed file header as a lazy cross-file move endpoint", async () => {
    const user = userEvent.setup();
    render(
      <ArtifactSourcePane
        artifactId="artifact-1"
        files={[file, secondFile]}
        selectedFileId="f-1"
        focus="moves"
        activeMove={{
          ...activeMove,
          to_node_ids: ["f-2:n00000002"],
        }}
        onFocusChange={vi.fn()}
      />,
    );

    expect(await screen.findByText("1 hidden to endpoint")).toBeInTheDocument();
    expect(fetchArtifactSource).not.toHaveBeenCalledWith(
      "artifact-1",
      "f-2",
      "moves",
    );

    await user.click(screen.getByRole("button", { name: /other\.cpp/ }));
    await waitFor(() =>
      expect(fetchArtifactSource).toHaveBeenCalledWith(
        "artifact-1",
        "f-2",
        "moves",
      ),
    );
    expect(screen.queryByText("1 hidden to endpoint")).not.toBeInTheDocument();
  });
});
