import { useState } from "react";
import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, expect, it, vi } from "vitest";
import type { ArtifactFileSummary, ArtifactMoveSummary } from "../../types";
import { ArtifactFileExplorer } from "./ArtifactFileExplorer";

afterEach(cleanup);

const files: ArtifactFileSummary[] = [
  "src/lib/a.cpp",
  "src/b.cpp",
  "README",
].map((filename, index) => ({
  file_id: `f-${index}`,
  root_node_id: null,
  filename,
  revision_0_filename: filename,
  revision_1_filename: filename,
  language: null,
  revision_0_lines: 10,
  revision_1_lines: 10,
  diff_region_counts: {
    delete: index === 0 ? 2 : 0,
    insert: index === 0 ? 3 : 0,
  },
}));
const moves: ArtifactMoveSummary[] = [
  {
    move_id: "upstream",
    move_origin: "srcdiff",
    content_relationship: null,
    from_node_ids: ["f-0:n1"],
    to_node_ids: ["f-0:n2"],
  },
  {
    move_id: "sequence",
    move_origin: "srcmove",
    content_relationship: "type1",
    from_node_ids: ["f-0:n3", "f-0:n4"],
    to_node_ids: ["f-1:n3", "f-1:n4"],
  },
];

it("groups paths, counts each move once per file, and filters through collapsed directories", async () => {
  const user = userEvent.setup();
  const select = vi.fn();
  render(
    <ArtifactFileExplorer
      files={files}
      moves={moves}
      selectedFileId="f-0"
      hiddenFileIds={new Set()}
      onSelectFile={select}
      onHiddenFileIdsChange={vi.fn()}
    />,
  );
  const first = screen.getByRole("button", { name: "src/lib/a.cpp" });
  expect(within(first).getByLabelText("Delete regions: 2")).toBeInTheDocument();
  expect(within(first).getByLabelText("Insert regions: 3")).toBeInTheDocument();
  expect(within(first).getByLabelText("srcDiff moves: 1")).toBeInTheDocument();
  expect(within(first).getByLabelText("srcMove moves: 1")).toBeInTheDocument();
  expect(
    within(screen.getByRole("button", { name: "src/b.cpp" })).getByLabelText(
      "srcMove moves: 1",
    ),
  ).toBeInTheDocument();
  await user.click(
    screen.getByRole("button", { name: "Collapse directory src/" }),
  );
  expect(
    screen.queryByRole("button", { name: "src/lib/a.cpp" }),
  ).not.toBeInTheDocument();
  await user.type(screen.getByRole("searchbox"), "a.cpp");
  await user.click(screen.getByRole("button", { name: "src/lib/a.cpp" }));
  expect(select).toHaveBeenCalledWith("f-0");
  expect(
    screen.queryByRole("button", { name: "src/b.cpp" }),
  ).not.toBeInTheDocument();
  await user.clear(screen.getByRole("searchbox"));
  await user.type(screen.getByRole("searchbox"), "missing");
  expect(screen.getByText("No matching files.")).toBeInTheDocument();
});

it("keeps hidden files in the tree and restores visibility from file and bulk options", async () => {
  const user = userEvent.setup();
  function Explorer() {
    const [hidden, setHidden] = useState(new Set<string>());
    return (
      <ArtifactFileExplorer
        files={files}
        moves={moves}
        selectedFileId="f-0"
        hiddenFileIds={hidden}
        onSelectFile={vi.fn()}
        onHiddenFileIdsChange={setHidden}
      />
    );
  }
  render(<Explorer />);
  await user.click(screen.getByLabelText("Options for src/lib/a.cpp"));
  await user.click(screen.getByRole("button", { name: "Hide file" }));
  expect(screen.getByText("2/3 visible")).toBeInTheDocument();
  expect(
    screen.getByRole("button", { name: "src/lib/a.cpp" }),
  ).toBeInTheDocument();
  await user.click(screen.getByLabelText("Options for src/lib/a.cpp"));
  await user.click(screen.getByRole("button", { name: "Show file" }));
  expect(screen.getByText("3/3 visible")).toBeInTheDocument();
  await user.click(screen.getByLabelText("Options for src/b.cpp"));
  await user.click(screen.getByRole("button", { name: "Show only this file" }));
  expect(screen.getByText("1/3 visible")).toBeInTheDocument();
  await user.click(screen.getByRole("button", { name: "Show all" }));
  expect(screen.getByText("3/3 visible")).toBeInTheDocument();
});

it("hides files without moves or diffs across the whole artifact and restores them", async () => {
  const user = userEvent.setup();
  function Explorer() {
    const [hidden, setHidden] = useState(new Set<string>());
    return <ArtifactFileExplorer files={files} moves={moves} selectedFileId="f-0" hiddenFileIds={hidden} onSelectFile={vi.fn()} onHiddenFileIdsChange={setHidden} />;
  }
  render(<Explorer />);
  await user.selectOptions(screen.getByRole("combobox", { name: "Hide files" }), "moves");
  expect(screen.getByText("2/3 visible")).toBeInTheDocument();
  expect(within(screen.getByRole("button", { name: "README" })).getByText("hidden")).toBeInTheDocument();
  expect(within(screen.getByRole("button", { name: "src/b.cpp" })).queryByText("hidden")).not.toBeInTheDocument();
  await user.selectOptions(screen.getByRole("combobox", { name: "Hide files" }), "diffs");
  expect(screen.getByText("1/3 visible")).toBeInTheDocument();
  expect(within(screen.getByRole("button", { name: "src/b.cpp" })).getByText("hidden")).toBeInTheDocument();
  await user.click(screen.getByRole("button", { name: "Show all" }));
  expect(screen.getByText("3/3 visible")).toBeInTheDocument();
  await user.type(screen.getByRole("searchbox"), "b.cpp");
  await user.selectOptions(screen.getByRole("combobox", { name: "Hide files" }), "diffs");
  expect(screen.getByText("1/3 visible")).toBeInTheDocument();
});

it("preserves manually hidden files when applying a bulk visibility action", async () => {
  const user = userEvent.setup();
  const change = vi.fn();
  render(<ArtifactFileExplorer files={files} moves={moves} selectedFileId="f-0" hiddenFileIds={new Set(["f-0"])} onSelectFile={vi.fn()} onHiddenFileIdsChange={change} />);
  await user.selectOptions(screen.getByRole("combobox", { name: "Hide files" }), "moves");
  expect(change).toHaveBeenCalledWith(new Set(["f-0", "f-2"]));
});
