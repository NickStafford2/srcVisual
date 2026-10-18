import { cleanup, fireEvent, render } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import type { MoveConnectorGroup } from "./_moveConnectorGeometry";
import { MoveConnectorOverlay } from "./MoveConnectorOverlay";

const _group: MoveConnectorGroup = {
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
    {
      key: "move-1-revision-1-box-0",
      revision: "revision-1",
      x: 210,
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
  hub: {
    key: "move-1-hub",
    moveId: "move-1",
    cx: 150,
    cy: 40,
    r: 6,
    hitR: 14,
  },
};

describe("MoveConnectorOverlay", () => {
  afterEach(() => {
    cleanup();
  });

  it("distinguishes srcDiff connectors from srcMove without dropping either layer", () => {
    const srcdiff = {
      ..._group,
      key: "srcdiff-1",
      moveId: "srcdiff-1",
      moveOrigin: "srcdiff" as const,
      boxes: _group.boxes.map((box) => ({ ...box, key: `srcdiff-${box.key}` })),
      paths: _group.paths.map((path) => ({
        ...path,
        key: `srcdiff-${path.key}`,
      })),
      hub: null,
    };
    const { container } = render(
      <MoveConnectorOverlay groups={[_group, srcdiff]} />,
    );
    const srcmoveGroup = container.querySelector('[data-move-id="move-1"]')!;
    const srcdiffGroup = container.querySelector('[data-move-id="srcdiff-1"]')!;
    expect(srcmoveGroup).toHaveAttribute("data-move-origin", "srcmove");
    expect(srcmoveGroup).toHaveClass("text-diff-move-1/70");
    expect(srcdiffGroup).toHaveClass("text-violet-400/80");
    expect(
      srcdiffGroup.querySelector("[data-move-overlay-line]"),
    ).toHaveAttribute("stroke-dasharray", "5 3");
    expect(
      srcmoveGroup.querySelector("[data-move-overlay-line]"),
    ).not.toHaveAttribute("stroke-dasharray");
  });

  it("uses one shared inactive look for box border, line, and hub", () => {
    render(<MoveConnectorOverlay groups={[_group]} />);

    const _box = document.querySelector("[data-move-overlay-box='true']");
    const _line = document.querySelector("[data-move-overlay-line='true']");
    const _hub = document.querySelector("[data-move-overlay-hub='true']");

    expect(document.querySelector("svg")).not.toBeNull();
    expect(document.querySelector("[data-move-id='move-1']")).toHaveAttribute(
      "data-move-visual-state",
      "visible",
    );
    expect(_box).toHaveAttribute("stroke-opacity", "0.72");
    expect(_line).toHaveAttribute("stroke-opacity", "0.72");
    expect(_hub).toHaveAttribute("fill-opacity", "0.72");
  });

  it("uses the box border as a hover target, not the box body", () => {
    const _hoveredMoveIds: string[] = [];

    render(
      <MoveConnectorOverlay
        groups={[_group]}
        onMoveHover={(moveId) => {
          _hoveredMoveIds.push(moveId);
        }}
      />,
    );

    const _visibleBox = document.querySelector(
      "[data-move-overlay-box='true']",
    );
    const _boxHit = document.querySelector(
      "[data-move-overlay-box-hit='true']",
    );

    fireEvent.mouseEnter(_visibleBox as Element);
    expect(_hoveredMoveIds).toHaveLength(0);

    fireEvent.mouseEnter(_boxHit as Element);
    expect(_hoveredMoveIds).toEqual(["move-1"]);
  });

  it("fades the outer box border edge for each revision", () => {
    render(<MoveConnectorOverlay groups={[_group]} />);

    const _revision0Gradient = document.querySelector(
      "#move-box-stroke-mask-gradient-move-1-revision-0-box-0",
    );
    const _revision1Gradient = document.querySelector(
      "#move-box-stroke-mask-gradient-move-1-revision-1-box-0",
    );
    const _revision0Stops = _revision0Gradient?.querySelectorAll("stop");
    const _revision1Stops = _revision1Gradient?.querySelectorAll("stop");
    const _box = document.querySelector("[data-move-overlay-box='true']");

    expect(_box).toHaveAttribute(
      "mask",
      "url(#move-box-stroke-mask-move-1-revision-0-box-0)",
    );
    expect(_revision0Stops?.[0]).toHaveAttribute("stop-opacity", "0.28");
    expect(_revision0Stops?.[3]).toHaveAttribute("stop-opacity", "1");
    expect(_revision1Stops?.[0]).toHaveAttribute("stop-opacity", "1");
    expect(_revision1Stops?.[3]).toHaveAttribute("stop-opacity", "0.28");
  });

  it("brightens the whole group together when emphasized", () => {
    render(
      <MoveConnectorOverlay groups={[_group]} emphasizedMoveId="move-1" />,
    );

    const _box = document.querySelector("[data-move-overlay-box='true']");
    const _line = document.querySelector("[data-move-overlay-line='true']");
    const _hub = document.querySelector("[data-move-overlay-hub='true']");

    expect(document.querySelector("[data-move-id='move-1']")).toHaveAttribute(
      "data-move-visual-state",
      "emphasized",
    );
    expect(_box).toHaveAttribute("fill-opacity", "0.18");
    expect(_box).toHaveAttribute("stroke-opacity", "0.96");
    expect(_box).toHaveAttribute("stroke-width", "2");
    expect(_line).toHaveAttribute("stroke-opacity", "0.96");
    expect(_line).toHaveAttribute("stroke-width", "3.5");
    expect(_hub).toHaveAttribute("fill-opacity", "0.96");
  });
});
