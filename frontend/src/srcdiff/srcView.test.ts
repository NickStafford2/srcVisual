import { describe, expect, it } from "vitest";
import { buildSourceView } from "./srcView";

const movedFunction = [
  "int moved() {",
  "  int x = 1;",
  "  int y = 2;",
  "  return x + y;",
  "}",
].join("\n");
const moveHighlight = {
  nodeId: "move-node",
  moveId: "move-1",
  kind: "move" as const,
  span: { start_line: 1, start_col: 1, end_line: 5, end_col: 1 },
};

describe("buildSourceView", () => {
  it("highlights only the moved lines in the source file that lost the function", () => {
    const lines = buildSourceView(
      `${movedFunction}\n\nint main() {\n  return moved();\n}`,
      [moveHighlight],
    );

    expect(getHighlightedLineNumbers(lines)).toEqual([1, 2, 3, 4, 5]);
    expect(lines[6]?.hasHighlight ?? false).toBe(false);
    expect(lines[7]?.hasHighlight ?? false).toBe(false);
  });

  it("highlights only the moved lines in the source file that gained the function", () => {
    const lines = buildSourceView(movedFunction, [moveHighlight]);

    expect(getHighlightedLineNumbers(lines)).toEqual([1, 2, 3, 4, 5]);
    expect(lines).toHaveLength(5);
  });

  it("keeps a nested move selectable inside an enclosing change", () => {
    const lines = buildSourceView(
      "<insert><function>moved</function></insert>",
      [
        {
          nodeId: "insert-node",
          kind: "insert",
          span: { start_line: 1, start_col: 1, end_line: 1, end_col: 44 },
        },
        {
          nodeId: "move-node",
          moveId: "move-1",
          kind: "move",
          span: { start_line: 1, start_col: 9, end_line: 1, end_col: 34 },
        },
      ],
    );

    expect(lines[0].segments).toEqual([
      expect.objectContaining({ text: "<insert>", kind: "insert" }),
      expect.objectContaining({
        text: "<function>moved</function>",
        kind: "move",
        nodeId: "move-node",
      }),
      expect.objectContaining({ text: "</insert>", kind: "insert" }),
    ]);
  });
});

function getHighlightedLineNumbers(
  lines: ReturnType<typeof buildSourceView>,
): number[] {
  return lines.filter((line) => line.hasHighlight).map((line) => line.number);
}
