import { render, screen } from "@testing-library/react";
import { expect, it, vi } from "vitest";
import { fetchArtifactXml } from "../../api";
import { ArtifactXmlPane } from "./ArtifactXmlPane";

vi.mock("../../api", () => ({ fetchArtifactXml: vi.fn() }));

it("does not fetch the complete XML until its tab is active", async () => {
  vi.mocked(fetchArtifactXml).mockResolvedValue("<unit />");
  const view = render(<ArtifactXmlPane artifactId="artifact-1" active={false} />);

  expect(fetchArtifactXml).not.toHaveBeenCalled();
  view.rerender(<ArtifactXmlPane artifactId="artifact-1" active />);

  expect(await screen.findByText("<unit />")).toBeInTheDocument();
  expect(fetchArtifactXml).toHaveBeenCalledWith("artifact-1");
});
