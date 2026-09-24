import { cleanup, render } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import type { ViewerLineSegment } from "../../../srcdiff/types";
import { CodeSegment } from "./CodeSegment";

const _moveSegment: ViewerLineSegment = {
  text: "moved();",
  kind: "move",
  highlighted: true,
  nodeId: "f-1:n00000001",
  moveId: "move-1",
};

afterEach(cleanup);

it("uses explicit amber states for inactive, visible, and selected moves", () => {
  const _register = vi.fn();
  const { container, rerender } = render(
    <CodeSegment
      revision="revision-0"
      segment={_moveSegment}
      visibleMoveIds={new Set()}
      registerMoveSegment={_register}
    />,
  );

  let _move = container.querySelector("[data-move-id='move-1']");
  expect(_move).toHaveAttribute("data-move-visual-state", "inactive");
  expect(_move).toHaveClass("bg-diff-move-1/10");
  expect(_register).not.toHaveBeenCalled();

  rerender(
    <CodeSegment
      revision="revision-0"
      segment={_moveSegment}
      visibleMoveIds={new Set(["move-1"])}
      registerMoveSegment={_register}
    />,
  );
  _move = container.querySelector("[data-move-id='move-1']");
  expect(_move).toHaveAttribute("data-move-visual-state", "visible");
  expect(_move).toHaveClass("bg-diff-move-1/25");
  expect(_register).toHaveBeenCalledOnce();

  rerender(
    <CodeSegment
      revision="revision-0"
      segment={_moveSegment}
      visibleMoveIds={new Set(["move-1"])}
      registerMoveSegment={_register}
      selected
    />,
  );
  _move = container.querySelector("[data-move-id='move-1']");
  expect(_move).toHaveAttribute("data-move-visual-state", "selected");
  expect(_move).toHaveClass("bg-diff-move-1/35");
  expect(_move).toHaveClass("ring-diff-move-1/70");
  expect(_move).not.toHaveClass("text-sky-100");
});
