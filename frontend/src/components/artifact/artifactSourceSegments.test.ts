import { describe, expect, it } from "vitest";
import type { ArtifactSourceLine } from "../../types";
import { buildArtifactLineSegments } from "./artifactSourceSegments";

const _moveSpan = {
  start_line: 2,
  start_col: 8,
  end_line: 4,
  end_col: 5,
};

function moveLine(lineNumber: number, text: string): ArtifactSourceLine {
  return {
    line_number: lineNumber,
    text,
    anchors: [
      {
        node_id: "f-1:n00000002",
        kind: "move",
        move_id: "move-1",
        span: _moveSpan,
      },
    ],
  };
}

describe("artifact source segments", () => {
  it("clips a multiline semantic endpoint to exact source columns", () => {
    expect(buildArtifactLineSegments(moveLine(2, "before moved"))).toEqual([
      {
        text: "before ",
        kind: "plain",
        highlighted: false,
        nodeId: null,
        moveId: null,
      },
      {
        text: "moved",
        kind: "move",
        highlighted: true,
        nodeId: "f-1:n00000002",
        moveId: "move-1",
      },
    ]);
    expect(buildArtifactLineSegments(moveLine(3, "middle"))).toEqual([
      {
        text: "middle",
        kind: "move",
        highlighted: true,
        nodeId: "f-1:n00000002",
        moveId: "move-1",
      },
    ]);
    expect(buildArtifactLineSegments(moveLine(4, "after tail"))).toEqual([
      {
        text: "after",
        kind: "move",
        highlighted: true,
        nodeId: "f-1:n00000002",
        moveId: "move-1",
      },
      {
        text: " tail",
        kind: "plain",
        highlighted: false,
        nodeId: null,
        moveId: null,
      },
    ]);
  });

  it("keeps blank lines inside a multiline endpoint registered", () => {
    expect(buildArtifactLineSegments(moveLine(3, ""))).toEqual([
      {
        text: " ",
        kind: "move",
        highlighted: true,
        nodeId: "f-1:n00000002",
        moveId: "move-1",
      },
    ]);
  });

  it("gives a nested move precedence over its enclosing change", () => {
    const _line: ArtifactSourceLine = {
      line_number: 1,
      text: "before moved after",
      anchors: [
        {
          node_id: "f-1:n00000001",
          kind: "delete",
          move_id: null,
          span: { start_line: 1, start_col: 1, end_line: 1, end_col: 18 },
        },
        {
          node_id: "f-1:n00000002",
          kind: "move",
          move_id: "move-1",
          span: { start_line: 1, start_col: 8, end_line: 1, end_col: 12 },
        },
      ],
    };

    expect(
      buildArtifactLineSegments(_line).map((_segment) => [
        _segment.text,
        _segment.kind,
        _segment.nodeId,
      ]),
    ).toEqual([
      ["before ", "delete", "f-1:n00000001"],
      ["moved", "move", "f-1:n00000002"],
      [" after", "delete", "f-1:n00000001"],
    ]);
  });

  it("uses the nearest nested boundary for common inside an insert", () => {
    const _line: ArtifactSourceLine = {
      line_number: 1,
      text: "outside shared removed",
      anchors: [
        {
          node_id: "f-1:n00000000",
          kind: "insert",
          move_id: null,
          span: { start_line: 1, start_col: 1, end_line: 1, end_col: 22 },
        },
        {
          node_id: "f-1:n00000001",
          kind: "common",
          move_id: null,
          span: { start_line: 1, start_col: 9, end_line: 1, end_col: 22 },
        },
        {
          node_id: "f-1:n00000002",
          kind: "delete",
          move_id: null,
          span: { start_line: 1, start_col: 16, end_line: 1, end_col: 22 },
        },
      ],
    };

    expect(
      buildArtifactLineSegments(_line).map((_segment) => [
        _segment.text,
        _segment.kind,
      ]),
    ).toEqual([
      ["outside ", "insert"],
      ["shared ", "common"],
      ["removed", "delete"],
    ]);

    const nested = buildArtifactLineSegments(_line).find(
      (segment) => segment.text === "removed",
    );
    expect(nested?.diffRegions).toEqual([
      { nodeId: "f-1:n00000000", kind: "insert" },
      { nodeId: "f-1:n00000001", kind: "common" },
      { nodeId: "f-1:n00000002", kind: "delete" },
    ]);
  });
});

function overlappingMoves(): ArtifactSourceLine {
  const span = { start_line: 60, start_col: 1, end_line: 60, end_col: 25 };
  return {
    line_number: 60,
    text: "unsigned int nMultiInsert;",
    anchors: [
      {
        node_id: "wrapper",
        kind: "move",
        diff_kind: "delete",
        move_id: "1",
        move_origin: "srcdiff",
        span,
      },
      {
        node_id: "declaration",
        kind: "move",
        move_id: "item:97b1dcdaf",
        move_origin: "srcmove",
        span,
      },
    ],
  };
}

it("does not let a disabled srcDiff wrapper mask the srcMove endpoint", () => {
  const [segment] = buildArtifactLineSegments(
    overlappingMoves(),
    new Set(["item:97b1dcdaf"]),
  );
  expect(segment.moveId).toBe("item:97b1dcdaf");
  expect(segment.nodeId).toBe("declaration");
  expect(segment.moveAnchors).toEqual([
    { moveId: "item:97b1dcdaf", nodeId: "declaration", origin: "srcmove" },
  ]);
});

it("retains both overlapping identities when both layers are visible", () => {
  const [segment] = buildArtifactLineSegments(
    overlappingMoves(),
    new Set(["1", "item:97b1dcdaf"]),
  );
  expect(segment.moveId).toBe("item:97b1dcdaf");
  expect(segment.moveAnchors?.map((anchor) => anchor.moveId)).toEqual([
    "1",
    "item:97b1dcdaf",
  ]);
});

it("reveals srcDiff moves independently and preserves diff highlights when neither move is visible", () => {
  const [srcdiff] = buildArtifactLineSegments(
    overlappingMoves(),
    new Set(["1"]),
  );
  expect(srcdiff.moveId).toBe("1");
  expect(srcdiff.moveOrigin).toBe("srcdiff");
  const [diff] = buildArtifactLineSegments(overlappingMoves(), new Set());
  expect(diff.kind).toBe("delete");
  expect(diff.moveId).toBeNull();
  expect(diff.moveAnchors).toEqual([]);
});

it("retains different producer annotations attached to the same XML element", () => {
  const line = overlappingMoves();
  line.anchors[1].node_id = line.anchors[0].node_id;
  const [segment] = buildArtifactLineSegments(
    line,
    new Set(["1", "item:97b1dcdaf"]),
  );
  expect(segment.moveAnchors).toHaveLength(2);
  expect(
    segment.moveAnchors?.map((anchor) => [anchor.moveId, anchor.nodeId]),
  ).toEqual([
    ["1", "wrapper"],
    ["item:97b1dcdaf", "wrapper"],
  ]);
});
