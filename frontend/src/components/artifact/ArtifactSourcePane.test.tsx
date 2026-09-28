import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fetchArtifactSource } from "../../api";
import type { ArtifactSourceProjection } from "../../types";
import type { Pair } from "./ArtifactCorrespondences";
import { ArtifactSourcePane } from "./ArtifactSourcePane";

vi.mock("../../api", () => ({
  fetchArtifactSource: vi.fn(),
}));

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
  match_kind: "type1",
  from_node_ids: ["f-1:n00000001"],
  to_node_ids: ["f-1:n00000002"],
};

describe("ArtifactSourcePane", () => {
  beforeEach(() => {
    vi.mocked(fetchArtifactSource).mockReset().mockResolvedValue(projection);
  });

  afterEach(cleanup);

  it.each([false, true])(
    "highlights exact correspondence columns and uses explicit proxies (unicode=%s)",
    async (unicode) => {
      const user = userEvent.setup();
      if (unicode) {
        const unicodeProjection = structuredClone(projection);
        const hunk = unicodeProjection.blocks[1];
        if (hunk.type === "hunk") {
          hunk.rows[0].left!.text = "😀old();";
          hunk.rows[0].right!.text = "😀new();";
        }
        vi.mocked(fetchArtifactSource).mockResolvedValue(unicodeProjection);
      }
      const location = {
        file_id: "f-1",
        span: {
          start_line: 11,
          start_col: unicode ? 2 : 1,
          end_line: 11,
          end_col: unicode ? 4 : 3,
        },
        reason: null,
      };
      const pair: Pair = {
        id: 0,
        kind: "type2",
        classification: "stationary",
        outcome: "not_move",
        reason: "same_interval",
        cardinality: "one_to_one",
        before_file: "example.cpp",
        after_file: "example.cpp",
        before_location: location,
        after_location: location,
      };
      const inspect = vi.fn();
      const { container } = render(
        <ArtifactSourcePane
          artifactId="artifact-1"
          files={[file]}
          selectedFileId="f-1"
          selectedNodeId={null}
          active
          focus="changes-and-moves"
          inspectedMoveId={null}
          moves={[]}
          visibleMoveIds={new Set()}
          onInspectMove={vi.fn()}
          onFocusChange={vi.fn()}
          visibleCorrespondences={[pair]}
          onInspectCorrespondence={inspect}
        />,
      );
      await waitFor(() =>
        expect(
          container.querySelectorAll('[data-correspondence-segment="0"]'),
        ).toHaveLength(2),
      );
      expect(
        [
          ...container.querySelectorAll('[data-correspondence-segment="0"]'),
        ].map((e) => e.textContent),
      ).toEqual(["old", "new"]);
      await user.click(screen.getByRole("button", { name: "Collapse all" }));
      const proxy = screen.getByRole("button", {
        name: /Pair 1 · Before endpoint hidden/,
      });
      await user.click(proxy);
      expect(inspect).toHaveBeenCalledWith(
        pair,
        expect.objectContaining({
          x: expect.any(Number),
          y: expect.any(Number),
        }),
      );
      expect(container.querySelector("code")).toBeNull();
    },
  );

  it("loads a bounded focus projection and requests explicit gap ranges", async () => {
    const user = userEvent.setup();
    render(
      <ArtifactSourcePane
        artifactId="artifact-1"
        files={[file, secondFile]}
        selectedFileId="f-1"
        selectedNodeId={null}
        active
        focus="changes-and-moves"
        inspectedMoveId={null}
        moves={[activeMove]}
        visibleMoveIds={new Set()}
        onInspectMove={vi.fn()}
        onFocusChange={vi.fn()}
      />,
    );

    expect(await screen.findByText("old();")).toBeInTheDocument();
    expect(screen.getByText("old();")).not.toHaveClass("underline");
    expect(screen.getByText("new();")).not.toHaveClass("underline");
    expect(screen.getByText("Original")).toBeInTheDocument();
    expect(screen.getByText("Modified")).toBeInTheDocument();
    expect(screen.getByLabelText("Original source")).toHaveClass(
      "min-w-0",
      "overflow-x-auto",
    );
    expect(screen.getByLabelText("Modified source")).toHaveClass(
      "min-w-0",
      "overflow-x-auto",
    );
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

    const leftGapControl = screen.getByRole("button", {
      name: /Show 10 left/,
    });
    expect(leftGapControl).toHaveClass("sticky", "left-0");
    await user.click(leftGapControl);
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

  it("renders type1 move fragments with the established move color", async () => {
    const user = userEvent.setup();
    const onInspectMove = vi.fn();
    const scrollIntoView = vi.fn();
    Object.defineProperty(HTMLElement.prototype, "scrollIntoView", {
      configurable: true,
      value: scrollIntoView,
    });
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
        selectedNodeId={activeMove.from_node_ids[0]}
        active
        focus="moves"
        inspectedMoveId={activeMove.move_id}
        moves={[activeMove]}
        visibleMoveIds={new Set(["move-1"])}
        onInspectMove={onInspectMove}
        onFocusChange={vi.fn()}
      />,
    );

    await screen.findAllByText("before", {
      exact: false,
      selector: "code span",
    });
    const moveSegments = document.querySelectorAll(
      '[data-highlight-kind="move"][data-move-id="move-1"]',
    );
    expect(moveSegments).toHaveLength(2);
    expect(moveSegments[0]).toHaveTextContent("moved");
    expect(moveSegments[0]).toHaveClass("bg-diff-move-1/35");
    expect(moveSegments[0]).toHaveAttribute(
      "data-move-visual-state",
      "selected",
    );
    expect(moveSegments[0]).toHaveClass("ring-diff-move-1/70");
    expect(
      document.querySelector('[data-source-row-kind="replace"]'),
    ).toHaveClass("bg-black");
    await user.click(screen.getAllByRole("button", { name: "moved" })[0]);
    expect(onInspectMove).toHaveBeenCalledWith(
      "move-1",
      expect.objectContaining({ x: expect.any(Number), y: expect.any(Number) }),
    );
    await waitFor(() => expect(scrollIntoView).toHaveBeenCalledOnce());
    expect(
      screen.getByLabelText("Artifact source file example.cpp"),
    ).toHaveClass("bg-black");
  });

  it("uses a collapsed file header as a lazy cross-file move endpoint", async () => {
    const user = userEvent.setup();
    const crossFileMove = {
      ...activeMove,
      to_node_ids: ["f-2:n00000002"],
    };
    render(
      <ArtifactSourcePane
        artifactId="artifact-1"
        files={[file, secondFile]}
        selectedFileId="f-1"
        selectedNodeId={null}
        active
        focus="moves"
        inspectedMoveId={crossFileMove.move_id}
        moves={[crossFileMove]}
        visibleMoveIds={new Set(["move-1"])}
        onInspectMove={vi.fn()}
        onFocusChange={vi.fn()}
      />,
    );

    expect(
      await screen.findByText("move-1: 1 hidden to endpoint"),
    ).toBeInTheDocument();
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
    expect(
      await screen.findByText("move-1: 1 unrendered to endpoint"),
    ).toBeInTheDocument();
  });

  it("keeps a proxy for an endpoint missing from an expanded projection", async () => {
    vi.mocked(fetchArtifactSource).mockResolvedValue({
      ...projection,
      focus_profile: "moves",
      blocks: [
        {
          type: "hunk",
          block_id: "h-10-11",
          left: { start_line: 11, end_line: 11 },
          right: { start_line: 11, end_line: 11 },
          rows: [
            {
              kind: "replace",
              left: null,
              right: {
                line_number: 11,
                text: "moved();",
                anchors: [
                  {
                    node_id: activeMove.to_node_ids[0],
                    kind: "move",
                    move_id: activeMove.move_id,
                    span: {
                      start_line: 11,
                      start_col: 1,
                      end_line: 11,
                      end_col: 8,
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
        selectedNodeId={null}
        active
        focus="moves"
        inspectedMoveId={null}
        moves={[activeMove]}
        visibleMoveIds={new Set([activeMove.move_id])}
        onInspectMove={vi.fn()}
        onFocusChange={vi.fn()}
      />,
    );

    expect(
      await screen.findByText("move-1: 1 unrendered from endpoint"),
    ).toBeInTheDocument();
    expect(
      screen.queryByText("move-1: 1 unrendered to endpoint"),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "moved();" }),
    ).toBeInTheDocument();
  });

  it("isolates inspected move files only after an explicit action", async () => {
    const user = userEvent.setup();
    render(
      <ArtifactSourcePane
        artifactId="artifact-1"
        files={[file, secondFile]}
        selectedFileId="f-1"
        selectedNodeId={null}
        active
        focus="changes-and-moves"
        inspectedMoveId={activeMove.move_id}
        moves={[activeMove]}
        visibleMoveIds={new Set()}
        onInspectMove={vi.fn()}
        onFocusChange={vi.fn()}
      />,
    );

    expect(screen.getByText("other.cpp")).toBeInTheDocument();
    expect(screen.getByRole("combobox", { name: /Focus/ })).toBeEnabled();

    await user.click(
      screen.getByRole("button", { name: "Isolate inspected move" }),
    );
    expect(screen.queryByText("other.cpp")).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Show all files" }));
    expect(screen.getByText("other.cpp")).toBeInTheDocument();
  });
});
