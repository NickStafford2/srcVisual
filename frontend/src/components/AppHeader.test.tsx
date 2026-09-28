import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, expect, it, vi } from "vitest";
import { AppHeader } from "./AppHeader";
import type { ArtifactManifest } from "../types";

vi.mock("virtual:viewer-identity", () => ({
  default: { sha256: "f".repeat(64), mode: "Development" },
}));
afterEach(cleanup);
const artifact: ArtifactManifest = {
  schema_version: 2,
  projection_schema_version: 1,
  artifact_id: "a".repeat(32),
  source_filename: "pasted.srcdiff.xml",
  has_position_data: true,
  file_count: 0,
  node_count: 0,
  files: [],
  moves: { move_count: 0, items: [] },
  focus_profiles: [],
};
it("identifies the loaded comparison and copies full provenance without inventing producer versions", async () => {
  const user = userEvent.setup();
  render(
    <AppHeader
      artifact={artifact}
      context={{ mode: "examples", label: "blocks_swapped.xml" }}
      view="Source"
      focus="changes-and-moves"
      visibleMoveCount={0}
    />,
  );
  expect(screen.getByText("blocks_swapped.xml")).toBeInTheDocument();
  expect(screen.getByText("srcMove version unknown")).toBeInTheDocument();
  await user.click(screen.getByText(/srcDiffVisual frontend SHA/));
  await user.click(screen.getByRole("button", { name: "Copy details" }));
  const copied = await navigator.clipboard.readText();
  expect(copied).toContain("srcMove recorded runtime SHA-256: unknown");
  expect(copied).toContain(
    `srcDiffVisual frontend source SHA-256: ${"f".repeat(64)}`,
  );
  expect(copied).toContain(`Artifact: ${artifact.artifact_id}`);
});
it("only displays checksums with observed runtime provenance", () => {
  const props = {
    artifact: {
      ...artifact,
      tools: {
        identity_status: "observed-runtime-binaries" as const,
        srcmove_sha256: "b".repeat(64),
        srcdiff_sha256: "c".repeat(64),
      },
    },
    context: null,
    view: "XML",
    focus: "moves" as const,
    visibleMoveCount: 0,
  };
  const { rerender } = render(<AppHeader {...props} />);
  expect(screen.getByText("srcMove SHA bbbbbbbbbb")).toBeInTheDocument();
  rerender(
    <AppHeader
      {...props}
      artifact={{
        ...props.artifact,
        tools: {
          ...props.artifact.tools,
          identity_status: "producer-not-observed",
        },
      }}
    />,
  );
  expect(screen.getByText("srcMove version unknown")).toBeInTheDocument();
});
