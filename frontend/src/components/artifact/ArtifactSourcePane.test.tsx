import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
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

describe("ArtifactSourcePane", () => {
  beforeEach(() => {
    vi.mocked(fetchArtifactSource).mockReset().mockResolvedValue(projection);
  });

  it("loads a bounded focus projection and requests explicit gap ranges", async () => {
    const user = userEvent.setup();
    render(
      <ArtifactSourcePane
        artifactId="artifact-1"
        file={{
          file_id: "f-1",
          root_node_id: "f-1:n00000000",
          filename: "example.cpp",
          revision_0_filename: "before/example.cpp",
          revision_1_filename: "after/example.cpp",
          language: "C++",
          revision_0_lines: 20,
          revision_1_lines: 20,
        }}
        focus="changes-and-moves"
        onFocusChange={vi.fn()}
      />,
    );

    expect(await screen.findByText("old();")).toBeInTheDocument();
    expect(fetchArtifactSource).toHaveBeenCalledWith(
      "artifact-1",
      "f-1",
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
});
