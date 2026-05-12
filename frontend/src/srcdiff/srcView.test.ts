import { describe, expect, it } from "vitest";
import { toNewFileHighlightFixture } from "../test/fixtures/toNewFileHighlightFixture";
import { buildSourceView } from "./srcView";

describe("buildSourceView", () => {
  it("highlights only the moved lines in the source file that lost the function", () => {
    const file = toNewFileHighlightFixture.files[0];
    const moveNode = file.tree?.children[0];

    expect(moveNode).toBeTruthy();

    const lines = buildSourceView(file.revision_0_source_code, [
      {
        nodeId: moveNode!.id,
        moveId: moveNode!.move_id ?? null,
        kind: moveNode!.kind,
        span: moveNode!.revision_0_span,
      },
    ]);

    expect(getHighlightedLineNumbers(lines)).toEqual([1, 2, 3, 4, 5]);
    expect(lines[6]?.hasHighlight ?? false).toBe(false);
    expect(lines[7]?.hasHighlight ?? false).toBe(false);
  });

  it("highlights only the moved lines in the source file that gained the function", () => {
    const file = toNewFileHighlightFixture.files[1];
    const moveNode = file.tree?.children[0];

    expect(moveNode).toBeTruthy();

    const lines = buildSourceView(file.revision_1_source_code, [
      {
        nodeId: moveNode!.id,
        moveId: moveNode!.move_id ?? null,
        kind: moveNode!.kind,
        span: moveNode!.revision_1_span,
      },
    ]);

    expect(getHighlightedLineNumbers(lines)).toEqual([1, 2, 3, 4, 5]);
    expect(lines).toHaveLength(5);
  });
});

function getHighlightedLineNumbers(
  lines: ReturnType<typeof buildSourceView>,
): number[] {
  return lines.filter((line) => line.hasHighlight).map((line) => line.number);
}
