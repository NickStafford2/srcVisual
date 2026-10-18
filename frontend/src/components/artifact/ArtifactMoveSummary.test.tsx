import { fireEvent, render, screen } from "@testing-library/react";
import { expect, it, vi } from "vitest";
import type { ArtifactMoveSummary as Move } from "../../types";
import { ArtifactMoveSummary } from "./ArtifactMoveSummary";

const moves: Move[] = [
  {
    move_id: "1",
    move_origin: "srcdiff",
    content_relationship: null,
    from_node_ids: [],
    to_node_ids: [],
  },
  {
    move_id: "item:97b1dcdaf",
    move_origin: "srcmove",
    content_relationship: "type1",
    from_node_ids: [],
    to_node_ids: [],
  },
];

it("separates producer results from inherited annotations and defaults to srcMove", () => {
  const inspect = vi.fn();
  render(
    <ArtifactMoveSummary
      files={[]}
      moves={moves}
      inspectedMoveId={null}
      selectedNodeId={null}
      onInspectMove={inspect}
      onSelectEndpoint={vi.fn()}
    />,
  );
  expect(
    screen.getByRole("button", { name: "srcMove results (1)" }),
  ).toHaveAttribute("aria-pressed", "true");
  expect(
    screen.getByRole("button", { name: /item:97b1dcdaf/ }),
  ).toBeInTheDocument();
  expect(
    screen.queryByRole("button", { name: /^1 srcDiff/ }),
  ).not.toBeInTheDocument();
  fireEvent.click(
    screen.getByRole("button", { name: "srcDiff annotations (1)" }),
  );
  expect(
    screen.queryByRole("button", { name: /item:97b1dcdaf/ }),
  ).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "1 srcDiff annotation" }));
  expect(inspect).toHaveBeenCalledWith("1", expect.any(Object));
  expect(screen.queryByText("unclassified")).not.toBeInTheDocument();
});
