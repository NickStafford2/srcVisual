import { describe, expect, it } from "vitest";
import { buildRegionPaths } from "./_diffRegionGeometry";

describe("diff region geometry", () => {
  it("builds one stepped path for adjacent source lines", () => {
    const paths = buildRegionPaths(
      [
        { left: 110, right: 190, top: 40, bottom: 56, width: 80, height: 16 },
        { left: 110, right: 250, top: 57, bottom: 73, width: 140, height: 16 },
      ],
      { left: 100, right: 500, top: 20, bottom: 300, width: 400, height: 280 },
      "selected",
      0,
    );

    expect(paths).toHaveLength(1);
    expect(paths[0]).toContain("M 5 18");
    expect(paths[0]).toContain("H 155");
    expect(paths[0]).toContain("Z");
  });

  it("keeps source fragments separated across omitted-line gaps", () => {
    const paths = buildRegionPaths(
      [
        { left: 10, right: 50, top: 10, bottom: 20, width: 40, height: 10 },
        { left: 10, right: 50, top: 100, bottom: 110, width: 40, height: 10 },
      ],
      { left: 0, right: 200, top: 0, bottom: 200, width: 200, height: 200 },
      "ancestor",
      1,
    );

    expect(paths).toHaveLength(2);
  });
});
