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

    expect(buildArtifactLineSegments(_line).map((_segment) => [
      _segment.text,
      _segment.kind,
      _segment.nodeId,
    ])).toEqual([
      ["before ", "delete", "f-1:n00000001"],
      ["moved", "move", "f-1:n00000002"],
      [" after", "delete", "f-1:n00000001"],
    ]);
  });
});
