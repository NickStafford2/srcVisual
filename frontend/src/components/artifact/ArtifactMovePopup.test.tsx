import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, expect, it, vi } from "vitest";
import { fetchArtifactMove } from "../../api";
import { ArtifactMovePopup } from "./ArtifactMovePopup";

vi.mock("../../api", () => ({ fetchArtifactMove: vi.fn() }));

afterEach(cleanup);

it("does not invent srcMove fields for annotation-only moves", async () => {
  vi.mocked(fetchArtifactMove).mockResolvedValue({
    schema_version: 2,
    artifact_id: "artifact-1",
    results_schema_version: null,
    move: {
      move_id: "move-1",
      result_provenance: "xml-annotation",
      from_xpaths: ["/unit/delete"],
      to_xpaths: ["/unit/insert"],
      from_raw_texts: ["old();"],
      to_raw_texts: ["new();"],
    },
  });
  const onClose = vi.fn();

  render(
    <ArtifactMovePopup
      artifactId="artifact-1"
      moveId="move-1"
      position={{ x: 20, y: 20 }}
      onClose={onClose}
    />,
  );

  expect(
    await screen.findByText(/no srcMove result fields were provided/i),
  ).toBeInTheDocument();
  expect(screen.queryByText("type1")).not.toBeInTheDocument();
  expect(screen.getByText("old();")).toBeInTheDocument();
  expect(screen.getByText("new();")).toBeInTheDocument();

  await userEvent
    .setup()
    .click(screen.getByRole("button", { name: "Close move details move-1" }));
  expect(onClose).toHaveBeenCalledOnce();
});
