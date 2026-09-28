import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, expect, it, vi } from "vitest";
import { ArtifactCorrespondences } from "./ArtifactCorrespondences";
const pair = {
  id: 3,
  kind: "type2",
  classification: "stationary",
  outcome: "not_move",
  reason: "same_interval",
  cardinality: "one_to_one",
  before_file: "old.cpp",
  after_file: "new.cpp",
};
const page = {
  schema_version: 1,
  available: true,
  items: [pair],
  total: 1,
  matched: 1,
  next_offset: null,
  filters: {
    kinds: ["type2"],
    classifications: ["stationary"],
    outcomes: ["not_move"],
  },
};
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});
it("loads only on demand, filters nonmoves and shows selected candidate evidence", async () => {
  const user = userEvent.setup();
  const fetchMock = vi.fn(
    async (input: string) =>
      new Response(
        JSON.stringify(
          input.endsWith("/3")
            ? {
                schema_version: 1,
                id: 3,
                before: {
                  candidate_id: 0,
                  filename: "old.cpp",
                  xpath: "/delete",
                  construct: "function",
                  raw_text: "before();",
                  text_truncated: false,
                },
                after: {
                  candidate_id: 1,
                  filename: "new.cpp",
                  xpath: "/insert",
                  construct: "function",
                  raw_text: "after();",
                  text_truncated: false,
                },
                evidence: {
                  current_result: "not_move",
                  classification_reason: "same_interval",
                },
              }
            : page,
        ),
      ),
  );
  vi.stubGlobal("fetch", fetchMock);
  const { rerender } = render(
    <ArtifactCorrespondences artifactId="artifact" active={false} />,
  );
  expect(fetchMock).not.toHaveBeenCalled();
  rerender(<ArtifactCorrespondences artifactId="artifact" active />);
  await user.click(await screen.findByRole("button", { name: /Pair 4/ }));
  expect(await screen.findByText("before();")).toBeInTheDocument();
  expect(screen.getByText("after();")).toBeInTheDocument();
  expect(screen.getAllByText("Not selected as a move").length).toBeGreaterThan(
    0,
  );
  await user.selectOptions(
    screen.getByLabelText("Selection outcome"),
    "not_move",
  );
  await waitFor(() =>
    expect(fetchMock).toHaveBeenLastCalledWith(
      expect.stringContaining("outcome=not_move"),
    ),
  );
  expect(screen.queryByText("before();")).not.toBeInTheDocument();
});
it("explains unavailable diagnostics instead of reporting zero correspondences", async () => {
  vi.stubGlobal(
    "fetch",
    vi.fn(
      async () =>
        new Response(
          JSON.stringify({ ...page, available: false, items: [], total: 0 }),
        ),
    ),
  );
  render(<ArtifactCorrespondences artifactId="old-artifact" active />);
  expect(
    await screen.findByText(/No correspondence diagnostics were recorded/),
  ).toBeInTheDocument();
  expect(screen.queryByText(/0 matching/)).not.toBeInTheDocument();
});
