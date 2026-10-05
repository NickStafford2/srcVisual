import {
  cleanup,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import {
  readBenchmark,
  visualizeSavedBenchmarkCase,
} from "../../bigmovebench/browserApi";
import type { ArtifactManifest } from "../../types";
import { SavedBenchmarkBrowser } from "./SavedBenchmarkBrowser";

vi.mock("../../bigmovebench/browserApi", () => ({
  readBenchmark: vi.fn(),
  visualizeSavedBenchmarkCase: vi.fn(),
}));

const caseRecord = {
  category: "type2b",
  case_id: "case-one",
  ordinal: 1,
  case_kind: "positive",
  expected_content_relationship: "type2b",
  reviewed_expected_content_relationship: "type2b",
  observed_content_relationship: "type3",
  outcome: "wrong_classification",
  reviewed_outcome: "wrong_classification",
  complete_fragment_detected: true,
  move_count: 1,
  min_tokens: 101,
  type3_both_similarity: null,
  type3_strength_stratum: null,
  label_correction_id: null,
  semantic_reason: "payload_exposed",
  diagnostic_stage: "classification",
  attempt_id: "attempt-one",
  attempt_ordinal: 0,
};
const page = {
  schema_version: 2,
  run_id: "saved-run",
  items: [caseRecord],
  total: 5598,
  matched: 80,
  offset: 0,
  next_offset: 50,
  filters: {
    categories: ["type2b"],
    outcomes: ["wrong_classification", "srcmove_miss"],
  },
};
const run = {
  schema_version: 2,
  run_id: "saved-run",
  selected: 5598,
  completed_at: "2026-10-05T06:50:28Z",
  status: "completed",
  experiment_id: "experiment",
  tool_sha256: {},
  member_summaries: [
    {
      pair_set: "type2b",
      counts: { selected: 80, wrong_classification: 62, srcmove_miss: 18 },
      reviewed_counts: {
        selected: 80,
        wrong_classification: 62,
        srcmove_miss: 18,
      },
    },
  ],
};
const detail = {
  schema_version: 2,
  run_id: "saved-run",
  case: caseRecord,
  original: {
    text: "int before() { return a; }",
    sha256: "original-hash",
    reason: null,
  },
  modified: {
    text: "int after() { return b; }",
    sha256: "modified-hash",
    reason: null,
  },
  expected_ranges: { from: [3, 4], to: [3, 4] },
  failures: ["content_relationship: expected type2b, got type3"],
  reviewed_failures: ["content_relationship: expected type2b, got type3"],
  label_correction: null,
  semantic_details: {},
  text_validation: {},
  moves: [
    {
      move_id: "move-one",
      content_relationship: "type3",
      from_raw_texts: ["a();"],
      to_raw_texts: ["b();"],
      from_xpaths: ["/original"],
      to_xpaths: ["/modified"],
    },
  ],
  diagnostics: null,
  results_available: true,
  tool_sha256: {},
};

beforeEach(() => {
  vi.mocked(readBenchmark).mockReset();
  vi.mocked(visualizeSavedBenchmarkCase).mockReset();
  vi.mocked(readBenchmark).mockImplementation(async (path) => {
    if (path === "")
      return { schema_version: 2, items: [run], default_run_id: "saved-run" };
    if (path === "/saved-run") return run;
    if (path === "/saved-run/cases/type2b/case-one") return detail;
    if (path.includes("offset=50"))
      return {
        ...page,
        offset: 50,
        next_offset: null,
        items: [{ ...caseRecord, ordinal: 51, case_id: "case-51" }],
      };
    return page;
  });
});
afterEach(cleanup);

it("opens the selected saved case in Source view and reports publication errors", async () => {
  const user = userEvent.setup();
  const accept = vi.fn();
  const artifact = {
    artifact_id: "published",
    projection_schema_version: 2,
  } as ArtifactManifest;
  vi.mocked(visualizeSavedBenchmarkCase)
    .mockRejectedValueOnce(new Error("Retained XML checksum differs."))
    .mockResolvedValueOnce(artifact);
  render(<SavedBenchmarkBrowser acceptVisualization={accept} />);
  await user.click(
    await screen.findByRole("button", { name: "Inspect Type 2b case 1" }),
  );
  expect(screen.getAllByText("Classification disagreement").length).toBeGreaterThan(0);
  expect(screen.getByText(/A completely detected Type-2b expectation/)).toBeInTheDocument();
  const open = await screen.findByRole("button", {
    name: "Open in Source view",
  });
  await user.click(open);
  expect(await screen.findByRole("alert")).toHaveTextContent(
    "Retained XML checksum differs.",
  );
  expect(accept).not.toHaveBeenCalled();
  await user.click(open);
  await waitFor(() =>
    expect(accept).toHaveBeenCalledWith(
      artifact,
      expect.objectContaining({
        mode: "benchmark",
        label: expect.stringContaining("Type 2b · Case 1"),
      }),
    ),
  );
  expect(visualizeSavedBenchmarkCase).toHaveBeenLastCalledWith(
    "saved-run",
    "type2b",
    "case-one",
  );
  expect(screen.getByLabelText("Benchmark run")).toHaveValue("saved-run");
});

it("selects the saved run, filters cases and opens exact fragments and reported moves", async () => {
  const user = userEvent.setup();
  render(<SavedBenchmarkBrowser />);
  await screen.findByRole("button", { name: "Inspect Type 2b case 1" });
  expect(screen.getByLabelText("Benchmark run")).toHaveValue("saved-run");
  expect(
    screen.getByText("80 matching / 5,598 total cases"),
  ).toBeInTheDocument();
  expect(screen.getByText("Detected")).toBeInTheDocument();
  expect(
    screen.queryByLabelText("BigMoveBench review ZIP"),
  ).not.toBeInTheDocument();
  await user.selectOptions(screen.getByLabelText("Category"), "type2b");
  await user.selectOptions(
    screen.getByLabelText("Outcome"),
    "wrong_classification",
  );
  await waitFor(() =>
    expect(readBenchmark).toHaveBeenLastCalledWith(
      expect.stringContaining("category=type2b&outcome=wrong_classification"),
    ),
  );
  await user.click(
    await screen.findByRole("button", { name: "Inspect Type 2b case 1" }),
  );
  const evidence = await screen.findByRole("region", {
    name: "Benchmark case evidence",
  });
  expect(
    within(evidence).getByText("int before() { return a; }"),
  ).toBeInTheDocument();
  expect(
    within(evidence).getByText("int after() { return b; }"),
  ).toBeInTheDocument();
  expect(
    within(evidence).getByText("content_relationship: expected type2b, got type3"),
  ).toBeInTheDocument();
  await user.click(within(evidence).getByText("move-one · Type 3"));
  expect(within(evidence).getByText("a();")).toBeVisible();
  await user.selectOptions(screen.getByLabelText("Outcome basis"), "reviewed");
  await waitFor(() =>
    expect(readBenchmark).toHaveBeenLastCalledWith(
      expect.stringContaining("basis=reviewed"),
    ),
  );
  expect(
    screen.queryByRole("region", { name: "Benchmark case evidence" }),
  ).not.toBeInTheDocument();
});

it("pages results and resets the page when filters change", async () => {
  const user = userEvent.setup();
  render(<SavedBenchmarkBrowser />);
  await screen.findByRole("button", { name: "Inspect Type 2b case 1" });
  expect(screen.getByRole("button", { name: "Previous page" })).toBeDisabled();
  await user.click(screen.getByRole("button", { name: "Next page" }));
  await screen.findByRole("button", { name: "Inspect Type 2b case 51" });
  expect(screen.getByText("Page 2")).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Next page" })).toBeDisabled();
  await user.selectOptions(screen.getByLabelText("Outcome"), "srcmove_miss");
  await waitFor(() =>
    expect(readBenchmark).toHaveBeenLastCalledWith(
      expect.stringContaining("offset=0"),
    ),
  );
  await screen.findByRole("button", { name: "Inspect Type 2b case 1" });
  expect(screen.getByText("Page 1")).toBeInTheDocument();
});

it("explains empty configuration and case-detail failures", async () => {
  vi.mocked(readBenchmark).mockResolvedValueOnce({
    schema_version: 2,
    items: [],
    default_run_id: null,
  });
  const first = render(<SavedBenchmarkBrowser />);
  expect(
    await screen.findByText(/No completed local benchmark runs/),
  ).toBeInTheDocument();
  first.unmount();
  const user = userEvent.setup();
  render(<SavedBenchmarkBrowser />);
  await screen.findByRole("button", { name: "Inspect Type 2b case 1" });
  vi.mocked(readBenchmark).mockRejectedValueOnce(
    new Error("Fragment checksum differs."),
  );
  await user.click(
    screen.getByRole("button", { name: "Inspect Type 2b case 1" }),
  );
  expect(await screen.findByRole("alert")).toHaveTextContent(
    "Fragment checksum differs.",
  );
});
