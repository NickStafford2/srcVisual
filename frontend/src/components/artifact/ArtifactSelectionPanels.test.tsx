import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { expect, it, vi } from "vitest";
import type {
  ArtifactFileSummary,
  ArtifactMoveSummary,
  ArtifactTreeNode,
} from "../../types";
import { ArtifactMoveSummary as ArtifactMoveSummaryPane } from "./ArtifactMoveSummary";
import { ArtifactNodeInfo } from "./ArtifactNodeInfo";

const files: ArtifactFileSummary[] = [
  {
    file_id: "f-before",
    root_node_id: "f-before:n00000000",
    filename: "before.cpp",
    revision_0_filename: "before.cpp",
    revision_1_filename: "before.cpp",
    language: "C++",
    revision_0_lines: 20,
    revision_1_lines: 20,
  },
  {
    file_id: "f-after",
    root_node_id: "f-after:n00000000",
    filename: "after.cpp",
    revision_0_filename: "after.cpp",
    revision_1_filename: "after.cpp",
    language: "C++",
    revision_0_lines: 20,
    revision_1_lines: 20,
  },
];

const move: ArtifactMoveSummary = {
  move_id: "move-1",
  match_kind: "exact",
  from_node_ids: ["f-before:n00000001"],
  to_node_ids: ["f-after:n00000002"],
};

const node: ArtifactTreeNode = {
  node_id: move.to_node_ids[0],
  path: "/src:unit/src:function[1]",
  tag: "function",
  label: "function: render",
  kind: "move",
  move_id: move.move_id,
  srcdiff_attributes: { diff: { move: "move-1" } },
  xml_span: null,
  revision_0_span: null,
  revision_1_span: {
    start_line: 12,
    start_col: 1,
    end_line: 15,
    end_col: 2,
  },
  child_count: 0,
  children_complete: true,
  children: [],
};

it("navigates from a move summary to a stable semantic endpoint", async () => {
  const user = userEvent.setup();
  const onSelectEndpoint = vi.fn();
  render(
    <ArtifactMoveSummaryPane
      files={files}
      moves={[move]}
      selectedMoveId={move.move_id}
      selectedNodeId={null}
      onSelectMove={vi.fn()}
      onSelectEndpoint={onSelectEndpoint}
    />,
  );

  await user.click(screen.getByRole("button", { name: /after\.cpp/ }));

  expect(onSelectEndpoint).toHaveBeenCalledWith(move, move.to_node_ids[0]);
});

it("presents canonical tag details and reveals positioned tags in Source", async () => {
  const user = userEvent.setup();
  const onRevealSource = vi.fn();
  render(
    <ArtifactNodeInfo
      node={node}
      loading={false}
      error={null}
      onRevealSource={onRevealSource}
    />,
  );

  expect(screen.getByRole("heading", { name: "<function>" })).toBeInTheDocument();
  expect(screen.getByText("12:1–15:2")).toBeInTheDocument();
  await user.click(screen.getByRole("button", { name: "Reveal in Source" }));
  expect(onRevealSource).toHaveBeenCalledOnce();
});
