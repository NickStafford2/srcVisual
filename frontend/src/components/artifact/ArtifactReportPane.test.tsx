import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, expect, it, vi } from "vitest";
import { fetchArtifactReport } from "../../api";
import { ArtifactReportPane } from "./ArtifactReportPane";

vi.mock("../../api", () => ({ fetchArtifactReport: vi.fn() }));
afterEach(() => { cleanup(); vi.clearAllMocks(); });

const projection = {
  schema_version: 1 as const, artifact_id: "a", available: true,
  diagnostics_available: true, text: '{\n  "enabled": true,\n  "name": "move",\n  "count": 2\n}', truncated: false,
};

it("loads lazily, highlights JSON, copies and exposes full download", async () => {
  const user = userEvent.setup();
  vi.mocked(fetchArtifactReport).mockResolvedValue(projection);
  const copy = vi.spyOn(navigator.clipboard, "writeText").mockResolvedValue();
  const view = render(<ArtifactReportPane artifactId="a" active={false} />);
  expect(fetchArtifactReport).not.toHaveBeenCalled();
  view.rerender(<ArtifactReportPane artifactId="a" active />);
  expect(await screen.findByText('"enabled":')).toHaveClass("text-sky-300");
  expect(screen.getByText("true")).toHaveClass("text-violet-300");
  expect(screen.getByText('"move"')).toHaveClass("text-emerald-300");
  expect(screen.getByText("2", { selector: "code span" })).toHaveClass("text-amber-200");
  await user.click(screen.getByRole("button", { name: "Copy JSON" }));
  expect(copy).toHaveBeenCalledWith(projection.text);
  expect(screen.getByRole("link", { name: "Download JSON" })).toHaveAttribute("href", "/api/artifacts/a/report/download");
  view.rerender(<ArtifactReportPane artifactId="a" active={false} />);
  view.rerender(<ArtifactReportPane artifactId="a" active />);
  expect(fetchArtifactReport).toHaveBeenCalledTimes(1);
});

it("shows all lines without paging and labels truncated previews", async () => {
  vi.mocked(fetchArtifactReport).mockResolvedValue({ ...projection, text: Array.from({ length: 650 }, (_, i) => `"entry${i}": ${i},`).join("\n"), truncated: true, diagnostics_available: false });
  render(<ArtifactReportPane artifactId="a" active />);
  await screen.findByText("650 lines in preview");
  expect(screen.getByText(/Diagnostic details were not recorded/)).toBeInTheDocument();
  expect(screen.getByText(/Download JSON contains the complete report/)).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Copy preview" })).toBeInTheDocument();
  expect(screen.getByLabelText("JSON source").querySelectorAll("code")).toHaveLength(650);
  expect(screen.getByText('"entry0":')).toBeInTheDocument();
  expect(screen.getByText('"entry649":')).toBeInTheDocument();
  expect(screen.queryByRole("button", { name: "Next lines" })).not.toBeInTheDocument();
});

it("distinguishes absent reports from request failures", async () => {
  vi.mocked(fetchArtifactReport).mockResolvedValue({ ...projection, available: false, text: "", diagnostics_available: false });
  const view = render(<ArtifactReportPane artifactId="a" active />);
  await screen.findByText(/No producer results.json was retained/);
  expect(screen.queryByRole("link", { name: "Download JSON" })).not.toBeInTheDocument();
  vi.mocked(fetchArtifactReport).mockRejectedValue(new Error("Unreadable report"));
  view.rerender(<ArtifactReportPane artifactId="b" active />);
  expect(await screen.findByRole("alert")).toHaveTextContent("Unreadable report");
});
