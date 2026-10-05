import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, expect, it, vi } from "vitest";
import {
  fetchArtifactDiffTree,
  fetchArtifactNodeChildren,
  fetchArtifactTree,
} from "../../api";
import type {
  ArtifactDiffTreeNode,
  ArtifactManifest,
  ArtifactTreeNode,
} from "../../types";
import { ArtifactNavigator } from "./ArtifactNavigator";

vi.mock("../../api", () => ({
  fetchArtifactDiffTree: vi.fn(),
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
  schema_version: 4,
  projection_schema_version: 2,
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
    move_count: 4,
    items: [
      {
        move_id: "move-1",
        content_relationship: "type1",
        from_node_ids: ["f-one:n00000001"],
        to_node_ids: ["f-two:n00000001"],
      },
      {
        move_id: "move-2",
        content_relationship: "type2c",
        from_node_ids: ["f-one:n00000002"],
        to_node_ids: ["f-two:n00000002"],
      },
      {
        move_id: "move-3",
        content_relationship: "type3",
        from_node_ids: ["f-one:n00000003"],
        to_node_ids: ["f-two:n00000003"],
      },
    ],
  },
};

const commonDiffNode: ArtifactDiffTreeNode = {
  ...root,
  node_id: "f-one:n00000003",
  path: "/unit/diff:insert/diff:common",
  tag: "diff:common",
  label: "diff:common",
  kind: "common",
  diff_kind: "common",
  parent_diff_node_id: "f-one:n00000002",
  child_count: 0,
  children_complete: true,
  children: [],
};

const insertDiffNode: ArtifactDiffTreeNode = {
  ...root,
  node_id: "f-one:n00000002",
  path: "/unit/diff:insert",
  tag: "diff:insert",
  label: "diff:insert",
  kind: "insert",
  diff_kind: "insert",
  parent_diff_node_id: null,
  child_count: 1,
  children_complete: true,
  children: [commonDiffNode],
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
        kind: "move",
        move_id: "move-1",
        child_count: 0,
        children_complete: true,
      },
    ],
    next_offset: 100,
  });
  vi.mocked(fetchArtifactDiffTree).mockResolvedValue({
    schema_version: 1,
    artifact_id: manifest.artifact_id,
    file_id: "f-one",
    roots: [insertDiffNode],
    node_count: 2,
    total_node_count: 2,
    truncated: false,
  });
});

it("pages tree children and toggles cross-file move connectors", async () => {
  const user = userEvent.setup();
  const onSelectFile = vi.fn();
  const onToggleMove = vi.fn();
  const onVisibleMoveIdsChange = vi.fn();
  const onToggleDiffKind = vi.fn();
  const onVisibleDiffKindsChange = vi.fn();
  const onDiffOverlayRegionsChange = vi.fn();
  const onSelectNode = vi.fn();
  const onClearNode = vi.fn();
  render(
    <ArtifactNavigator
      manifest={manifest}
      selectedFileId="f-one"
      inspectedMoveId="move-1"
      visibleMoveIds={new Set(["move-1"])}
      visibleDiffKinds={new Set(["delete", "insert"])}
      selectedNodeId={commonDiffNode.node_id}
      selectedNode={commonDiffNode}
      nodeLoading={false}
      nodeError={null}
      focus="changes-and-moves"
      onSelectFile={onSelectFile}
      onToggleMove={onToggleMove}
      onVisibleMoveIdsChange={onVisibleMoveIdsChange}
      onToggleDiffKind={onToggleDiffKind}
      onVisibleDiffKindsChange={onVisibleDiffKindsChange}
      onDiffOverlayRegionsChange={onDiffOverlayRegionsChange}
      onSelectNode={onSelectNode}
      onClearNode={onClearNode}
      onRevealNode={vi.fn()}
    />,
  );

  await user.click(
    await screen.findByRole("button", { name: "Load more children" }),
  );
  expect(fetchArtifactNodeChildren).toHaveBeenCalledWith(
    "artifact-1",
    root.node_id,
    0,
  );
  expect(await screen.findByText("function: moved")).toBeInTheDocument();
  expect(screen.getByText("move", { selector: "span" })).toHaveClass(
    "text-diff-move-1",
  );
  await user.click(screen.getByRole("button", { name: /function: moved/ }));
  expect(onSelectNode).toHaveBeenCalledWith(
    expect.objectContaining({ node_id: "f-one:n00000001" }),
  );

  await user.click(screen.getByRole("button", { name: "move-1" }));
  expect(screen.getByRole("button", { name: "move-1" })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  expect(screen.getByRole("button", { name: "move-1" })).toHaveClass(
    "text-diff-move-1",
  );
  expect(onToggleMove).toHaveBeenCalledWith(manifest.moves.items[0]);

  fireEvent.click(screen.getByRole("button", { name: "None" }));
  expect(onVisibleMoveIdsChange).toHaveBeenLastCalledWith(new Set());
  fireEvent.click(screen.getByRole("button", { name: "All" }));
  expect(onVisibleMoveIdsChange).toHaveBeenLastCalledWith(
    new Set(["move-1", "move-2", "move-3"]),
  );
  fireEvent.click(screen.getByRole("button", { name: "Current only" }));
  expect(onVisibleMoveIdsChange).toHaveBeenLastCalledWith(new Set(["move-1"]));
  fireEvent.click(screen.getByRole("button", { name: "Type 1 (1 move)" }));
  expect(onVisibleMoveIdsChange).toHaveBeenLastCalledWith(new Set());
  fireEvent.click(screen.getByRole("button", { name: "Type 2c (1 move)" }));
  expect(onVisibleMoveIdsChange).toHaveBeenLastCalledWith(
    new Set(["move-1", "move-2"]),
  );
  expect(screen.queryByRole("button", { name: /Type 2b/ })).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Type 3 (1 move)" }));
  expect(onVisibleMoveIdsChange).toHaveBeenLastCalledWith(
    new Set(["move-1", "move-3"]),
  );

  expect(
    screen.getAllByRole("button", { name: "diff:common" })[0],
  ).toHaveAttribute("aria-pressed", "false");
  await user.click(screen.getAllByRole("button", { name: "diff:common" })[0]);
  expect(onToggleDiffKind).toHaveBeenCalledWith("common");
  fireEvent.click(screen.getByRole("button", { name: "All diff regions" }));
  expect(onVisibleDiffKindsChange).toHaveBeenLastCalledWith(
    new Set(["common", "delete", "insert"]),
  );
  fireEvent.click(
    screen.getByRole("button", { name: "Clear diff highlights" }),
  );
  expect(onVisibleDiffKindsChange).toHaveBeenLastCalledWith(new Set());

  await user.click(screen.getByRole("button", { name: "diff:insert(1)" }));
  expect(onSelectNode).toHaveBeenLastCalledWith(insertDiffNode);
  await user.click(screen.getAllByRole("button", { name: "diff:common" })[1]);
  expect(onClearNode).toHaveBeenCalledOnce();

  await user.type(
    screen.getByRole("searchbox", { name: "Filter artifact files" }),
    "two",
  );
  expect(
    screen.queryByRole("button", { name: "one.cpp" }),
  ).not.toBeInTheDocument();
  expect(screen.getByRole("button", { name: "two.cpp" })).toBeInTheDocument();

  await user.click(screen.getByRole("button", { name: "Collapse Files" }));
  expect(
    screen.queryByRole("searchbox", { name: "Filter artifact files" }),
  ).not.toBeInTheDocument();
  await user.click(screen.getByRole("button", { name: "Expand Files" }));
  expect(
    screen.getByRole("searchbox", { name: "Filter artifact files" }),
  ).toHaveValue("two");

  for (const panel of [
    "srcDiff",
    "srcMove",
    "Node inspector",
    "Structure tree",
  ]) {
    const collapse = screen.getByRole("button", {
      name: `Collapse ${panel}`,
    });
    expect(collapse).toHaveAttribute("aria-expanded", "true");
    await user.click(collapse);
    expect(
      screen.getByRole("button", { name: `Expand ${panel}` }),
    ).toHaveAttribute("aria-expanded", "false");
  }
});
