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

  it("uses one shared inactive look for box border, line, and hub", () => {
    render(<MoveConnectorOverlay groups={[_group]} />);

    const _box = document.querySelector("[data-move-overlay-box='true']");
    const _line = document.querySelector("[data-move-overlay-line='true']");
    const _hub = document.querySelector("[data-move-overlay-hub='true']");

    expect(document.querySelector("svg")).not.toBeNull();
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

    const _visibleBox = document.querySelector("[data-move-overlay-box='true']");
    const _boxHit = document.querySelector("[data-move-overlay-box-hit='true']");

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

  it("brightens the whole group together when active", () => {
    render(<MoveConnectorOverlay groups={[_group]} activeMoveId="move-1" />);

    const _box = document.querySelector("[data-move-overlay-box='true']");
    const _line = document.querySelector("[data-move-overlay-line='true']");
    const _hub = document.querySelector("[data-move-overlay-hub='true']");

    expect(_box).toHaveAttribute("fill-opacity", "0.18");
    expect(_box).toHaveAttribute("stroke-opacity", "0.96");
    expect(_box).toHaveAttribute("stroke-width", "2");
    expect(_line).toHaveAttribute("stroke-opacity", "0.96");
    expect(_line).toHaveAttribute("stroke-width", "3.5");
    expect(_hub).toHaveAttribute("fill-opacity", "0.96");
  });
});
