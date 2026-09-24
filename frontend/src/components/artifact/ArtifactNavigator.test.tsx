import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, expect, it, vi } from "vitest";
import {
  fetchArtifactNodeChildren,
  fetchArtifactTree,
} from "../../api";
import type { ArtifactManifest, ArtifactTreeNode } from "../../types";
import { ArtifactNavigator } from "./ArtifactNavigator";

vi.mock("../../api", () => ({
  fetchArtifactNodeChildren: vi.fn(),
  fetchArtifactTree: vi.fn(),
}));

const root: ArtifactTreeNode = {
  node_id: "f-one:n00000000",
  path: "/unit",
  tag: "unit",
  label: "unit: one.cpp",
  kind: "plain",
  move_id: null,
  srcdiff_attributes: {},
  xml_span: null,
  revision_0_span: null,
  revision_1_span: null,
  child_count: 101,
  children_complete: false,
  children: [],
};

const manifest: ArtifactManifest = {
  schema_version: 2,
  projection_schema_version: 1,
  artifact_id: "artifact-1",
  source_filename: "comparison.xml",
  has_position_data: true,
  file_count: 2,
  node_count: 102,
  focus_profiles: ["changes-and-moves", "moves", "changes", "complete-file"],
  files: [
    {
      file_id: "f-one",
      root_node_id: root.node_id,
      filename: "one.cpp",
      revision_0_filename: "before/one.cpp",
      revision_1_filename: "after/one.cpp",
      language: "C++",
      revision_0_lines: 10,
      revision_1_lines: 10,
    },
    {
      file_id: "f-two",
      root_node_id: "f-two:n00000000",
      filename: "two.cpp",
      revision_0_filename: "before/two.cpp",
      revision_1_filename: "after/two.cpp",
      language: "C++",
      revision_0_lines: 10,
      revision_1_lines: 10,
    },
  ],
  moves: {
    move_count: 1,
    items: [
      {
        move_id: "move-1",
        match_kind: "exact",
        from_node_ids: ["f-one:n00000001"],
        to_node_ids: ["f-two:n00000001"],
      },
    ],
  },
};

beforeEach(() => {
  vi.mocked(fetchArtifactTree).mockResolvedValue({
    schema_version: 1,
    artifact_id: manifest.artifact_id,
    file_id: "f-one",
    focus_profile: "changes-and-moves",
    root,
    node_count: 1,
    truncated: true,
  });
  vi.mocked(fetchArtifactNodeChildren).mockResolvedValue({
    children: [
      {
        ...root,
        node_id: "f-one:n00000001",
        label: "function: moved",
        child_count: 0,
        children_complete: true,
      },
    ],
    next_offset: 100,
  });
});

it("pages tree children explicitly and selects cross-file moves", async () => {
  const user = userEvent.setup();
  const onSelectFile = vi.fn();
  const onToggleMove = vi.fn();
  const onSelectNode = vi.fn();
  render(
    <ArtifactNavigator
      manifest={manifest}
      selectedFileId="f-one"
      selectedMoveId={null}
      visibleMoveIds={new Set(["move-1"])}
      selectedNodeId={null}
      focus="changes-and-moves"
      onSelectFile={onSelectFile}
      onToggleMove={onToggleMove}
      onSelectNode={onSelectNode}
    />,
  );

  await user.click(await screen.findByRole("button", { name: "Load more children" }));
  expect(fetchArtifactNodeChildren).toHaveBeenCalledWith(
    "artifact-1",
    root.node_id,
    0,
  );
  expect(await screen.findByText("function: moved")).toBeInTheDocument();
  await user.click(screen.getByRole("button", { name: /function: moved/ }));
  expect(onSelectNode).toHaveBeenCalledWith(
    expect.objectContaining({ node_id: "f-one:n00000001" }),
  );

  await user.click(screen.getByRole("button", { name: "move-1" }));
  expect(screen.getByRole("button", { name: "move-1" })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  expect(onToggleMove).toHaveBeenCalledWith(manifest.moves.items[0]);

  await user.type(screen.getByRole("searchbox", { name: "Filter artifact files" }), "two");
  expect(screen.queryByRole("button", { name: "one.cpp" })).not.toBeInTheDocument();
  expect(screen.getByRole("button", { name: "two.cpp" })).toBeInTheDocument();
});
