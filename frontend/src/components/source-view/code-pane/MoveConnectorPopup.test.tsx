import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import type { SrcMoveResults } from "../../../types";
import { MoveConnectorPopup } from "./MoveConnectorPopup";

const _moveResults: SrcMoveResults = {
  move_count: 1,
  moves: [
    {
      move_id: "move-1",
      from_xpaths: ["/unit[@filename='before.cpp']/function"],
      from_node_ids: [],
      to_xpaths: ["/unit[@filename='after.cpp']/function"],
      to_node_ids: [],
      from_raw_texts: ["before();"],
      to_raw_texts: ["after();"],
    },
  ],
  annotated_regions: 1,
  regions_total: 1,
  candidates_total: 1,
  groups_total: 1,
};

describe("MoveConnectorPopup", () => {
  afterEach(() => {
    cleanup();
    Object.defineProperty(window, "innerWidth", {
      configurable: true,
      value: 1024,
    });
    Object.defineProperty(window, "innerHeight", {
      configurable: true,
      value: 768,
    });
  });

  it("renders through a body portal and drags using viewport coordinates", () => {
    Object.defineProperty(window, "innerWidth", {
      configurable: true,
      value: 800,
    });
    Object.defineProperty(window, "innerHeight", {
      configurable: true,
      value: 600,
    });

    const _rendered = render(
      <MoveConnectorPopup
        moveId="move-1"
        moveResults={_moveResults}
        moveNodes={[]}
        position={{ x: 50, y: 60 }}
      />,
    );

    const _title = screen.getByText("Move Window");
    const _popup = _title.closest("[data-move-popup='true']");

    expect(_rendered.container).toBeEmptyDOMElement();
    expect(_popup).not.toBeNull();
    expect(_popup).toHaveStyle({
      left: "68px",
      top: "78px",
    });

    fireEvent.pointerDown(_title.parentElement as HTMLElement, {
      pointerId: 1,
      clientX: 100,
      clientY: 100,
    });
    fireEvent.pointerMove(window, {
      pointerId: 1,
      clientX: 200,
      clientY: 190,
    });

    expect(_popup).toHaveStyle({
      left: "168px",
      top: "168px",
    });
  });

  it("clamps the popup inside the viewport on open and resize", () => {
    Object.defineProperty(window, "innerWidth", {
      configurable: true,
      value: 800,
    });
    Object.defineProperty(window, "innerHeight", {
      configurable: true,
      value: 600,
    });

    render(
      <MoveConnectorPopup
        moveId="move-1"
        moveResults={_moveResults}
        moveNodes={[]}
        position={{ x: 790, y: 590 }}
      />,
    );

    const _popup = screen
      .getByText("Move Window")
      .closest("[data-move-popup='true']");

    expect(_popup).toHaveStyle({
      left: "328px",
      top: "360px",
    });

    Object.defineProperty(window, "innerWidth", {
      configurable: true,
      value: 640,
    });
    Object.defineProperty(window, "innerHeight", {
      configurable: true,
      value: 500,
    });
    fireEvent(window, new Event("resize"));

    expect(_popup).toHaveStyle({
      left: "168px",
      top: "260px",
    });
  });
});
