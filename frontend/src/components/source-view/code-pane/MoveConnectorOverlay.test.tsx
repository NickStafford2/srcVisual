import { cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import type { MoveConnectorGroup } from "./_moveConnectorGeometry";
import { MoveConnectorOverlay } from "./MoveConnectorOverlay";

const _group: MoveConnectorGroup = {
  key: "move-1",
  moveId: "move-1",
  boxes: [
    {
      key: "move-1-box-0",
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
