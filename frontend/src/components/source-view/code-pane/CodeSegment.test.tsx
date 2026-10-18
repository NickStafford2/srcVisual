import { cleanup, fireEvent, render } from "@testing-library/react";
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

it("uses explicit amber states for inactive, visible, and selected endpoints", () => {
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

it("filters srcDiff highlighting while leaving source text visible", () => {
  const _deleteSegment: ViewerLineSegment = {
    text: "removed();",
    kind: "delete",
    highlighted: true,
  };
  const { container, rerender } = render(
    <CodeSegment
      revision="revision-0"
      segment={_deleteSegment}
      visibleDiffKinds={new Set(["delete"])}
    />,
  );

  let _segment = container.querySelector("[data-diff-kind='delete']");
  expect(_segment).toHaveTextContent("removed();");
  expect(_segment).toHaveClass("bg-diff-delete/25");
  expect(_segment).toHaveAttribute("data-highlighted-segment", "true");

  rerender(
    <CodeSegment
      revision="revision-0"
      segment={_deleteSegment}
      visibleDiffKinds={new Set()}
    />,
  );
  _segment = container.querySelector("[data-diff-kind='delete']");
  expect(_segment).toHaveTextContent("removed();");
  expect(_segment).not.toHaveClass("bg-diff-delete/25");
  expect(_segment).toHaveAttribute("data-highlighted-segment", "false");
});

it("can highlight common source independently", () => {
  const _commonSegment: ViewerLineSegment = {
    text: "unchanged();",
    kind: "common",
    highlighted: true,
  };
  const { container } = render(
    <CodeSegment
      revision="revision-1"
      segment={_commonSegment}
      visibleDiffKinds={new Set(["common"])}
    />,
  );

  const _segment = container.querySelector("[data-diff-kind='common']");
  expect(_segment).toHaveTextContent("unchanged();");
  expect(_segment).toHaveClass("bg-diff-plain/25");
  expect(_segment).toHaveAttribute("data-highlighted-segment", "true");
});

it("registers both enabled overlapping endpoints and distinguishes their layers", () => {
  const register = vi.fn();
  const unregister = vi.fn();
  const inspect = vi.fn();
  const segment: ViewerLineSegment = {
    ..._moveSegment,
    moveOrigin: "srcmove",
    moveAnchors: [
      { moveId: "1", nodeId: "wrapper", origin: "srcdiff" },
      { moveId: "move-1", nodeId: "declaration", origin: "srcmove" },
    ],
  };
  const { container, rerender } = render(
    <CodeSegment
      revision="revision-0"
      segment={segment}
      visibleMoveIds={new Set(["1", "move-1"])}
      registerMoveSegment={register}
      unregisterMoveSegment={unregister}
      onMoveInspect={inspect}
    />,
  );
  const endpoint = container.querySelector("[data-move-id='move-1']")!;
  fireEvent.click(endpoint, { altKey: true });
  expect(inspect).toHaveBeenLastCalledWith("1", expect.any(Object));
  fireEvent.keyDown(endpoint, { key: "Enter", altKey: true });
  expect(inspect).toHaveBeenLastCalledWith("1", expect.any(Object));
  expect(endpoint).toHaveAttribute(
    "title",
    expect.stringContaining("srcDiff: 1"),
  );
  expect(register).toHaveBeenCalledTimes(2);
  expect(
    register.mock.calls.map(([registration]) => [
      registration.moveId,
      registration.moveOrigin,
    ]),
  ).toEqual([
    ["1", "srcdiff"],
    ["move-1", "srcmove"],
  ]);
  expect(container.querySelector("[data-move-id='move-1']")).toHaveClass(
    "bg-diff-move-1/25",
    "decoration-violet-400",
  );
  rerender(
    <CodeSegment
      revision="revision-0"
      segment={segment}
      visibleMoveIds={new Set(["move-1"])}
      registerMoveSegment={register}
      unregisterMoveSegment={unregister}
    />,
  );
  expect(unregister).toHaveBeenCalledTimes(2);
  expect(register.mock.calls[register.mock.calls.length - 1]?.[0].moveId).toBe(
    "move-1",
  );
  expect(container.querySelector("[data-move-id='move-1']")).not.toHaveClass(
    "decoration-violet-400",
  );
});
