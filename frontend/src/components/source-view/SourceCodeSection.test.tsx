import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { MoveConnectorGroup } from "./code-pane/_moveConnectorGeometry";
import { SourceCodeSection } from "./SourceCodeSection";

const _useMoveConnectorOverlay = vi.fn();

vi.mock("./code-pane/useMoveConnectorOverlay", () => ({
  useMoveConnectorOverlay: () => _useMoveConnectorOverlay(),
}));

const _moveResults = {
  move_count: 1,
  moves: [
    {
      move_id: "move-1",
      from_xpaths: ["/unit[@filename='before.cpp']/function"],
      from_node_ids: [],
      to_xpaths: ["/unit[@filename='after.cpp']/function"],
      to_node_ids: [],
      from_raw_texts: ["before();"],
      to_raw_texts: ["after();"],
    },
  ],
  annotated_regions: 1,
  regions_total: 1,
  candidates_total: 1,
  groups_total: 1,
};

const _groups: MoveConnectorGroup[] = [
  {
    key: "move-1",
    moveId: "move-1",
    boxes: [
      {
        key: "move-1-revision-0-box-0",
        revision: "revision-0",
        x: 10,
        y: 20,
        width: 100,
        height: 40,
        rx: 8,
      },
    ],
    paths: [
      {
        key: "move-1-path-0",
        d: "M 110 40 C 140 40 160 40 190 40",
      },
    ],
    hub: null,
  },
];

describe("SourceCodeSection", () => {
  afterEach(() => {
    cleanup();
    _useMoveConnectorOverlay.mockReset();
  });

  it("does not open a duplicate hover popup when the move window already exists", () => {
    _useMoveConnectorOverlay.mockReturnValue({
      containerRef: { current: null },
      groups: _groups,
      registerMoveSegment: vi.fn(),
      unregisterMoveSegment: vi.fn(),
    });

    render(
      <SourceCodeSection
        files={[]}
        highlightedSpansByUnitId={new Map()}
        moveResults={_moveResults}
        moveNodesById={new Map()}
        onHighlightMoveGroup={vi.fn()}
      />,
    );

    const _overlayHit = document.querySelector("[data-move-overlay-hit='true']");

    fireEvent.mouseEnter(_overlayHit as Element, {
      clientX: 100,
      clientY: 120,
    });
    expect(document.querySelectorAll("[data-move-popup='true']")).toHaveLength(1);

    fireEvent.click(_overlayHit as Element, {
      clientX: 100,
      clientY: 120,
    });
    expect(document.querySelectorAll("[data-move-popup='true']")).toHaveLength(1);

    fireEvent.click(
      screen.getByRole("button", {
        name: "Disable auto close for move move-1",
      }),
    );

    fireEvent.mouseEnter(_overlayHit as Element, {
      clientX: 100,
      clientY: 120,
    });

    expect(document.querySelectorAll("[data-move-popup='true']")).toHaveLength(1);
    expect(
      screen.getByRole("button", {
        name: "Enable auto close for move move-1",
      }),
    ).toBeInTheDocument();
  });

  it("does not reset a manual-close window when the same move is clicked again", () => {
    _useMoveConnectorOverlay.mockReturnValue({
      containerRef: { current: null },
      groups: _groups,
      registerMoveSegment: vi.fn(),
      unregisterMoveSegment: vi.fn(),
    });

    render(
      <SourceCodeSection
        files={[]}
        highlightedSpansByUnitId={new Map()}
        moveResults={_moveResults}
        moveNodesById={new Map()}
        onHighlightMoveGroup={vi.fn()}
      />,
    );

    const _overlayHit = document.querySelector("[data-move-overlay-hit='true']");

    fireEvent.click(_overlayHit as Element, {
      clientX: 100,
      clientY: 120,
    });
    fireEvent.click(
      screen.getByRole("button", {
        name: "Disable auto close for move move-1",
      }),
    );

    expect(
      screen.getByRole("button", {
        name: "Enable auto close for move move-1",
      }),
    ).toBeInTheDocument();

    fireEvent.click(_overlayHit as Element, {
      clientX: 120,
      clientY: 140,
    });

    expect(document.querySelectorAll("[data-move-popup='true']")).toHaveLength(1);
    expect(
      screen.getByRole("button", {
        name: "Enable auto close for move move-1",
      }),
    ).toBeInTheDocument();
  });

  it("shares the active hover state between the popup and connector overlay", () => {
    _useMoveConnectorOverlay.mockReturnValue({
      containerRef: { current: null },
      groups: _groups,
      registerMoveSegment: vi.fn(),
      unregisterMoveSegment: vi.fn(),
    });

    render(
      <SourceCodeSection
        files={[]}
        highlightedSpansByUnitId={new Map()}
        moveResults={_moveResults}
        moveNodesById={new Map()}
        onHighlightMoveGroup={vi.fn()}
      />,
    );

    const _overlayHit = document.querySelector("[data-move-overlay-hit='true']");
    const _line = document.querySelector("[data-move-overlay-line='true']");

    fireEvent.click(_overlayHit as Element, {
      clientX: 100,
      clientY: 120,
    });
    fireEvent.mouseLeave(_overlayHit as Element);

    const _popup = document.querySelector("[data-move-popup='true']");

    expect(_popup).toHaveAttribute("data-move-popup-active", "false");
    expect(_line).toHaveAttribute("stroke-width", "2");

    fireEvent.mouseEnter(_popup as Element);

    expect(_popup).toHaveAttribute("data-move-popup-active", "true");
    expect(_line).toHaveAttribute("stroke-width", "3.5");
  });
});
