import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { SourceViewHighlight } from "../../srcdiff/srcView";
import { XmlPane } from "./XmlPane";

describe("XmlPane", () => {
  it("renders move, insert, and delete highlights at the same time", () => {
    const _source = [
      "<unit>",
      '  <diff:delete>old</diff:delete>',
      '  <diff:insert>new</diff:insert>',
      '  <function mv:id="move-1">moved</function>',
      "</unit>",
    ].join("\n");

    const _highlights: SourceViewHighlight[] = [
      {
        nodeId: "delete-node",
        kind: "delete",
        span: {
          start_line: 2,
          start_col: 3,
          end_line: 2,
          end_col: 34,
        },
      },
      {
        nodeId: "insert-node",
        kind: "insert",
        span: {
          start_line: 3,
          start_col: 3,
          end_line: 3,
          end_col: 34,
        },
      },
      {
        nodeId: "move-node",
        kind: "move",
        span: {
          start_line: 4,
          start_col: 3,
          end_line: 4,
          end_col: 41,
        },
      },
    ];

    render(<XmlPane source={_source} highlights={_highlights} />);

    const _xmlPane = screen.getByLabelText("srcDiff XML");

    expect(
      _xmlPane.querySelector('[data-highlighted-segment="true"][data-highlight-kind="delete"]'),
    ).not.toBeNull();
    expect(
      _xmlPane.querySelector('[data-highlighted-segment="true"][data-highlight-kind="insert"]'),
    ).not.toBeNull();
    expect(
      _xmlPane.querySelector('[data-highlighted-segment="true"][data-highlight-kind="move"]'),
    ).not.toBeNull();
  });
});
