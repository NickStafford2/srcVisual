import { describe, expect, it } from "vitest";
import {
  buildMoveConnectorGroup,
  clusterMoveRects,
  type RectLike,
} from "./_moveConnectorGeometry";

function buildRect(
  left: number,
  top: number,
  right: number,
  bottom: number,
): RectLike {
  return {
    left,
    top,
    right,
    bottom,
    width: right - left,
    height: bottom - top,
  };
}

describe("move connector geometry", () => {
  it("keeps a direct connector for 1x1 moves", () => {
    const _group = buildMoveConnectorGroup({
      moveId: "move-1",
      containerRect: buildRect(0, 0, 800, 400),
      fromRects: [buildRect(100, 20, 220, 60)],
      toRects: [buildRect(520, 40, 680, 80)],
    });

    expect(_group).not.toBeNull();
    expect(_group?.boxes).toHaveLength(2);
    expect(_group?.hub).toBeNull();
    expect(_group?.paths).toHaveLength(1);
    expect(_group?.paths[0]?.key).toBe("move-1-direct");
    expect(_group?.boxes[0]).toMatchObject({
      key: "move-1-revision-0-box-0",
      x: 94,
      y: 16,
      width: 132,
      height: 48,
    });
    expect(_group?.paths[0]?.d).toContain("M 226 40");
    expect(_group?.paths[0]?.d).toContain("514 60");
  });

  it("clusters nearby move spans into one block per side", () => {
    const _blocks = clusterMoveRects([
      buildRect(100, 20, 220, 40),
      buildRect(120, 42, 240, 62),
      buildRect(110, 130, 260, 150),
    ]);

    expect(_blocks).toHaveLength(2);
    expect(_blocks[0]).toEqual(buildRect(100, 20, 240, 62));
    expect(_blocks[1]).toEqual(buildRect(110, 130, 260, 150));
  });

  it("builds a hub with one spoke per block for nxm moves", () => {
    const _group = buildMoveConnectorGroup({
      moveId: "move-2",
      containerRect: buildRect(0, 0, 900, 600),
      fromRects: [
        buildRect(80, 20, 220, 60),
        buildRect(90, 180, 250, 220),
      ],
      toRects: [
        buildRect(620, 40, 760, 80),
        buildRect(640, 260, 780, 300),
      ],
    });

    expect(_group).not.toBeNull();
    expect(_group?.boxes).toHaveLength(4);
    expect(_group?.hub).not.toBeNull();
    expect(_group?.paths).toHaveLength(4);
    expect(_group?.hub?.cx).toBeGreaterThan(220);
    expect(_group?.hub?.cx).toBeLessThan(620);
    expect(_group?.hub?.cy).toBeGreaterThan(60);
    expect(_group?.hub?.cy).toBeLessThan(260);
  });
});
