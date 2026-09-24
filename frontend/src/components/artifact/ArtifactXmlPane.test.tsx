import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { expect, it, vi } from "vitest";
import { fetchArtifactXml } from "../../api";
import { ArtifactXmlPane } from "./ArtifactXmlPane";

vi.mock("../../api", () => ({ fetchArtifactXml: vi.fn() }));

it("loads semantic XML anchors lazily and selects them by stable ID", async () => {
  const user = userEvent.setup();
  const onSelectNodeId = vi.fn();
  vi.mocked(fetchArtifactXml).mockResolvedValue({
    schema_version: 1,
    artifact_id: "artifact-1",
    xml: "<function>moved</function>",
    anchors: [
      {
        node_id: "f-one:n00000001",
        kind: "move",
        move_id: "move-1",
        span: { start_line: 1, start_col: 1, end_line: 1, end_col: 26 },
      },
    ],
  });
  const view = render(
    <ArtifactXmlPane
      artifactId="artifact-1"
      active={false}
      selectedNode={null}
      onSelectNodeId={onSelectNodeId}
    />,
  );

  expect(fetchArtifactXml).not.toHaveBeenCalled();
  view.rerender(
    <ArtifactXmlPane
      artifactId="artifact-1"
      active
      selectedNode={null}
      onSelectNodeId={onSelectNodeId}
    />,
  );

  const moveTag = await screen.findByRole("button", {
    name: "<function>moved</function>",
  });
  await user.click(moveTag);
  expect(onSelectNodeId).toHaveBeenCalledWith("f-one:n00000001");
  expect(fetchArtifactXml).toHaveBeenCalledWith("artifact-1");
});
