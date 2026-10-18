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
  diff_region_counts: { delete: 0, insert: 0 },
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
  content_relationship: "type1" as const,
  from_node_ids: ["f-1:n00000001"],
  to_node_ids: ["f-1:n00000002"],
};

describe("ArtifactSourcePane", () => {
  beforeEach(() => {
    vi.mocked(fetchArtifactSource).mockReset().mockResolvedValue(projection);
  });

  afterEach(cleanup);

  it("bundles sequence members into two hubs and keeps report interactions through collapse", async () => {
    const user = userEvent.setup();
    const inspect = vi.fn();
    const sequence = {
      move_id: "sequence:a",
      report_kind: "ordered_sequence" as const,
      member_move_ids: ["a", "b"],
      content_relationship: "type1" as const,
      from_node_ids: ["f-1:n00000001", "f-1:n00000003"],
      to_node_ids: ["f-1:n00000002", "f-1:n00000004"],
    };
    vi.mocked(fetchArtifactSource).mockResolvedValue({
      ...projection,
      blocks: [
        {
          type: "hunk",
          block_id: "sequence",
          left: { start_line: 11, end_line: 12 },
          right: { start_line: 11, end_line: 12 },
          rows: ["a", "b"].map((id, index) => {
            const span = {
              start_line: 11 + index,
              end_line: 11 + index,
              start_col: 1,
              end_col: 4,
            };
            return {
              kind: "replace" as const,
              left: {
                line_number: 11 + index,
                text: `${id}();`,
                anchors: [
                  {
                    node_id: sequence.from_node_ids[index],
                    kind: "move" as const,
                    move_id: id,
                    span,
                  },
                ],
              },
              right: {
                line_number: 11 + index,
                text: `${id}();`,
                anchors: [
                  {
                    node_id: sequence.to_node_ids[index],
                    kind: "move" as const,
                    move_id: id,
                    span,
                  },
                ],
              },
            };
          }),
        },
      ],
    });
    const { container } = render(
      <ArtifactSourcePane
        artifactId="artifact-1"
        files={[file]}
        selectedFileId="f-1"
        selectedNodeId={null}
        active
        focus="moves"
        inspectedMoveId={null}
        moves={[sequence]}
        visibleMoveIds={new Set([sequence.move_id])}
        onInspectMove={inspect}
        onFocusChange={vi.fn()}
      />,
    );
    await screen.findAllByRole("button", { name: "a();" });
    await waitFor(() => {
      expect(container.querySelectorAll("svg g[data-move-id]")).toHaveLength(1);
      expect(
        container.querySelectorAll("[data-move-overlay-hub]"),
      ).toHaveLength(2);
      expect(
        container.querySelectorAll("[data-move-overlay-box]"),
      ).toHaveLength(4);
      expect(
        container.querySelectorAll('[data-move-connector-role="sequence"]'),
      ).toHaveLength(1);
    });
    await user.click(container.querySelector("circle[data-move-overlay-hit]")!);
    expect(inspect).toHaveBeenLastCalledWith(
      sequence.move_id,
      expect.any(Object),
    );
    expect(container.querySelector("g[data-move-id]")).toHaveAttribute(
      "data-move-visual-state",
      "emphasized",
    );
    await user.click(screen.getByRole("button", { name: "Collapse all" }));
    await waitFor(() =>
      expect(
        container.querySelectorAll("[data-move-overlay-hub]"),
      ).toHaveLength(2),
    );
    expect(
      container.querySelectorAll('[data-move-connector-role="sequence"]'),
    ).toHaveLength(1);
    await user.click(
      container.querySelector('[data-move-connector-role="sequence"]')!
        .nextElementSibling!,
    );
    expect(inspect).toHaveBeenLastCalledWith(
      sequence.move_id,
      expect.any(Object),
    );
  });

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
        id: "pair:0",
        kind: "type2c",
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
          container.querySelectorAll('[data-correspondence-segment="pair:0"]'),
        ).toHaveLength(2),
      );
      expect(
        [
          ...container.querySelectorAll(
            '[data-correspondence-segment="pair:0"]',
          ),
        ].map((e) => e.textContent),
      ).toEqual(["old", "new"]);
      await user.click(screen.getByRole("button", { name: "Collapse all" }));
      const proxy = screen.getByRole("button", {
        name: /Pair pair:0 · Before endpoint hidden/,
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
    expect(leftGapControl.parentElement).toHaveClass("sticky", "left-0");
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

  it.each([
    ["leading", "above", 5570, 5589],
    ["trailing", "below", 1, 20],
    ["middle", "above", 5570, 5589],
    ["middle", "below", 1, 20],
  ] as const)(
    "reveals 20 nearby lines from a %s gap (%s)",
    async (position, direction, start, end) => {
      const user = userEvent.setup();
      const gap = {
        type: "gap" as const,
        block_id: "large-gap",
        left: { start_line: 1, end_line: 5589, line_count: 5589 },
        right: { start_line: 1, end_line: 5589, line_count: 5589 },
      };
      const hunk = projection.blocks[1];
      const blocks =
        position === "leading"
          ? [gap, hunk]
          : position === "trailing"
            ? [hunk, gap]
            : [{ ...hunk, block_id: "before" }, gap, hunk];
      const initial = { ...projection, blocks };
      const updated = structuredClone(initial);
      const remaining = updated.blocks.find((block) => block.type === "gap")!;
      if (remaining.type === "gap") {
        for (const side of ["left", "right"] as const) {
          remaining[side].line_count -= 20;
          if (direction === "above") remaining[side].end_line! -= 20;
          else remaining[side].start_line! += 20;
        }
      }
      vi.mocked(fetchArtifactSource)
        .mockResolvedValueOnce(initial)
        .mockResolvedValue(updated);
      render(
        <ArtifactSourcePane
          artifactId="artifact-1"
          files={[file]}
          selectedFileId="f-1"
          selectedNodeId={null}
          active
          focus="moves"
          inspectedMoveId={null}
          moves={[]}
          visibleMoveIds={new Set()}
          onInspectMove={vi.fn()}
          onFocusChange={vi.fn()}
        />,
      );
      await user.click(
        await screen.findByRole("button", {
          name: `Show 20 left lines ${direction} · 5589 hidden`,
        }),
      );
      const first = { left: { start, end }, right: { start, end } };
      await waitFor(() =>
        expect(fetchArtifactSource).toHaveBeenLastCalledWith(
          "artifact-1",
          "f-1",
          "moves",
          [first],
        ),
      );
      await user.click(
        await screen.findByRole("button", {
          name: `Show 20 left lines ${direction} · 5569 hidden`,
        }),
      );
      const shift = direction === "above" ? -20 : 20;
      await waitFor(() =>
        expect(fetchArtifactSource).toHaveBeenLastCalledWith(
          "artifact-1",
          "f-1",
          "moves",
          [
            first,
            {
              left: { start: start + shift, end: end + shift },
              right: { start: start + shift, end: end + shift },
            },
          ],
        ),
      );
    },
  );

  it.each([false, true])(
    "renders atomic move highlights and connectors (producer report=%s)",
    async (producerReport) => {
      const reportMove = producerReport
        ? {
            ...activeMove,
            move_id: "item:move-1",
            report_kind: "atomic" as const,
            member_move_ids: ["move-1"],
          }
        : activeMove;
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
          inspectedMoveId={reportMove.move_id}
          moves={[reportMove]}
          visibleMoveIds={new Set([reportMove.move_id])}
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
        reportMove.move_id,
        expect.objectContaining({
          x: expect.any(Number),
          y: expect.any(Number),
        }),
      );
      await waitFor(() => {
        const connector = document.querySelector("svg g[data-move-id]");
        expect(connector).toHaveAttribute("data-move-id", reportMove.move_id);
        expect(
          connector?.querySelector('[data-move-overlay-line="true"]'),
        ).not.toBeNull();
      });
      const connectorHit = document.querySelector(
        '[data-move-overlay-hit="true"]',
      )!;
      await user.click(connectorHit);
      expect(onInspectMove).toHaveBeenLastCalledWith(
        reportMove.move_id,
        expect.objectContaining({
          x: expect.any(Number),
          y: expect.any(Number),
        }),
      );
      await waitFor(() => expect(scrollIntoView).toHaveBeenCalledOnce());
      expect(
        screen.getByLabelText("Artifact source file example.cpp"),
      ).toHaveClass("bg-black");
    },
  );

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

describe("overlapping srcDiff and srcMove layers", () => {
  afterEach(cleanup);

  it("keeps real endpoints and both connector groups across visibility changes", async () => {
    const producer = {
      ...activeMove,
      move_id: "item:97b1dcdaf",
      move_origin: "srcmove" as const,
      report_kind: "atomic" as const,
      member_move_ids: ["97b1dcdaf"],
    };
    const upstream = {
      move_id: "1",
      move_origin: "srcdiff" as const,
      content_relationship: null,
      from_node_ids: ["f-1:n00000003"],
      to_node_ids: ["f-1:n00000004"],
    };
    const text = "unsigned int nMultiInsert;";
    const source = (line: number, nodeId: string, wrapperId: string) => ({
      line_number: line,
      text,
      anchors: [
        {
          node_id: wrapperId,
          kind: "move" as const,
          move_id: "1",
          move_origin: "srcdiff" as const,
          span: {
            start_line: line,
            start_col: 1,
            end_line: line,
            end_col: text.length,
          },
        },
        {
          node_id: nodeId,
          kind: "move" as const,
          move_id: "97b1dcdaf",
          move_origin: "srcmove" as const,
          span: {
            start_line: line,
            start_col: 1,
            end_line: line,
            end_col: text.length,
          },
        },
      ],
    });
    vi.mocked(fetchArtifactSource).mockResolvedValue({
      ...projection,
      blocks: [
        {
          type: "hunk",
          block_id: "overlap",
          left: { start_line: 60, end_line: 60 },
          right: { start_line: 45, end_line: 45 },
          rows: [
            {
              kind: "replace",
              left: source(
                60,
                producer.from_node_ids[0],
                upstream.from_node_ids[0],
              ),
              right: source(
                45,
                producer.to_node_ids[0],
                upstream.to_node_ids[0],
              ),
            },
          ],
        },
      ],
    });
    const inspect = vi.fn();
    const props = {
      artifactId: "artifact-1",
      files: [file],
      selectedFileId: "f-1",
      selectedNodeId: null,
      active: true,
      focus: "moves" as const,
      inspectedMoveId: null,
      moves: [producer, upstream],
      onInspectMove: inspect,
      onFocusChange: vi.fn(),
    };
    const { container, rerender } = render(
      <ArtifactSourcePane
        {...props}
        visibleMoveIds={new Set([producer.move_id])}
      />,
    );
    await screen.findAllByRole("button", { name: text.replace(/ /g, "·") });
    expect(screen.queryByText(/unrendered/)).not.toBeInTheDocument();
    await waitFor(() =>
      expect(container.querySelectorAll("svg g[data-move-id]")).toHaveLength(1),
    );
    expect(container.querySelector("svg g[data-move-id]")).toHaveAttribute(
      "data-move-id",
      producer.move_id,
    );

    rerender(
      <ArtifactSourcePane
        {...props}
        visibleMoveIds={new Set([producer.move_id, upstream.move_id])}
      />,
    );
    await waitFor(() =>
      expect(container.querySelectorAll("svg g[data-move-id]")).toHaveLength(2),
    );
    expect(screen.queryByText(/unrendered/)).not.toBeInTheDocument();
    expect(container.querySelector("[data-move-ids]")).toHaveClass(
      "decoration-violet-400",
    );

    rerender(
      <ArtifactSourcePane
        {...props}
        visibleMoveIds={new Set([upstream.move_id])}
      />,
    );
    await waitFor(() =>
      expect(container.querySelectorAll("svg g[data-move-id]")).toHaveLength(1),
    );
    expect(container.querySelector("svg g[data-move-id]")).toHaveAttribute(
      "data-move-id",
      upstream.move_id,
    );
    expect(
      container.querySelector("[data-move-id='1'][data-source-revision]"),
    ).toHaveClass("bg-violet-400/25");
    expect(screen.queryByText(/unrendered/)).not.toBeInTheDocument();
  });
});
