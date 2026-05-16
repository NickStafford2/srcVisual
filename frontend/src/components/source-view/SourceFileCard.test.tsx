import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { SrcDiffHighlight } from "../../srcdiff/selection";
import type { VisualizedFile } from "../../types";
import { SourceFileCard } from "./SourceFileCard";

describe("SourceFileCard", () => {
  it("renders move, insert, and delete highlights at the same time", () => {
    const _file: VisualizedFile = {
      unit_id: 7,
      filename: "sample.cpp",
      revision_0_filename: "before/sample.cpp",
      revision_1_filename: "after/sample.cpp",
      language: "C++",
      revision_0_source_code: "old_line();\nmove_from();\n",
      revision_1_source_code: "new_line();\nmove_to();\n",
      tree: null,
    };

    const _highlights: SrcDiffHighlight[] = [
      {
        nodeId: "delete-node",
        moveId: null,
        fileIndex: 0,
        unitId: 7,
        filename: "sample.cpp",
        kind: "delete",
        xmlSpan: null,
        revision0Span: {
          start_line: 1,
          start_col: 1,
          end_line: 1,
          end_col: 10,
        },
        revision1Span: null,
      },
      {
        nodeId: "insert-node",
        moveId: null,
        fileIndex: 0,
        unitId: 7,
        filename: "sample.cpp",
        kind: "insert",
        xmlSpan: null,
        revision0Span: null,
        revision1Span: {
          start_line: 1,
          start_col: 1,
          end_line: 1,
          end_col: 10,
        },
      },
      {
        nodeId: "move-node",
        moveId: "move-1",
        fileIndex: 0,
        unitId: 7,
        filename: "sample.cpp",
        kind: "move",
        xmlSpan: null,
        revision0Span: {
          start_line: 2,
          start_col: 1,
          end_line: 2,
          end_col: 11,
        },
        revision1Span: {
          start_line: 2,
          start_col: 1,
          end_line: 2,
          end_col: 9,
        },
      },
    ];

    render(
      <SourceFileCard
        fileIndex={0}
        file={_file}
        highlightedSpans={_highlights}
      />,
    );

    const _revision0Pane = screen.getByLabelText("sample.cpp before/sample.cpp");
    const _revision1Pane = screen.getByLabelText("sample.cpp after/sample.cpp");

    expect(screen.getByText("3 highlighted")).toBeInTheDocument();
    expect(screen.getByText("before/sample.cpp")).toBeInTheDocument();
    expect(screen.getByText("after/sample.cpp")).toBeInTheDocument();
    expect(screen.getByText("revision 0")).toBeInTheDocument();
    expect(screen.getByText("revision 1")).toBeInTheDocument();
    expect(
      _revision0Pane.querySelector(
        '[data-highlighted-segment="true"][data-highlight-kind="delete"]',
      ),
    ).not.toBeNull();
    expect(
      _revision0Pane.querySelector(
        '[data-highlighted-segment="true"][data-highlight-kind="move"]',
      ),
    ).not.toBeNull();
    expect(
      _revision1Pane.querySelector(
        '[data-highlighted-segment="true"][data-highlight-kind="insert"]',
      ),
    ).not.toBeNull();
    expect(
      _revision1Pane.querySelector(
        '[data-highlighted-segment="true"][data-highlight-kind="move"]',
      ),
    ).not.toBeNull();
  });
});
