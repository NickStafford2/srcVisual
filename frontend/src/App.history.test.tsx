import { cleanup, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import App from "./App";

const statusDocument = {
  schema_version: 2,
  analysis: {
    name: "notepadpp",
    repository: "/history/repository",
    root: "/history/repository/.srcmove",
  },
  state: "target_reached_with_failures",
  coverage: {
    committed_commit_pairs: 370,
    checkpointed_commit_pairs: 0,
    durable_commit_pairs: 370,
    target_commit_pairs: 370,
  },
  outcomes: {
    compared_commit_pairs: 200,
    without_analyzable_changes: 168,
    failed_commit_pairs: 2,
    by_status: { completed: 200 },
  },
  moves: {
    detections: 336,
    source_destination_pairings: 340,
    annotated_regions: 683,
    by_match_type: { exact: 123 },
  },
  history: {
    newest_commit: "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
    oldest_analyzed_commit: "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
    exhausted: false,
  },
};

const pairItem = {
  number: 1,
  distance_from_newest: 0,
  old_commit: "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
  new_commit: "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
  status: "completed",
  changed_path_count: 4,
  analyzable_path_count: 3,
  move_count: 2,
  elapsed_seconds: 1.5,
  checkpointed: false,
  invocation_id: "invocation-1",
};

describe("repository history browser", () => {
  beforeEach(() => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL) => {
        const url = String(input);
        if (url === "/api/examples") {
          return jsonResponse({ examples: [] });
        }
        if (url === "/api/history/status") {
          return jsonResponse(statusDocument);
        }
        if (url === "/api/history/pairs?selection=moves&limit=50") {
          return jsonResponse({
            schema_version: 1,
            analysis: statusDocument.analysis,
            pairs: { items: [pairItem], next_after: null },
          });
        }
        if (url === "/api/history/pairs/1") {
          return jsonResponse({
            schema_version: 1,
            analysis: statusDocument.analysis,
            pair: {
              ...pairItem,
              pair_fingerprint: "fingerprint",
              metrics: {},
              timings: { pair_seconds: 1.5 },
              error: null,
              failure_evidence: {},
              results_observation: {},
              moves: [
                {
                  match_kind: "exact",
                  from_xpaths: ["/src:unit[1]/diff:delete[1]"],
                  to_xpaths: ["/src:unit[1]/diff:insert[1]"],
                },
                {
                  match_kind: "type3",
                  from_xpaths: ["/src:unit[2]/diff:delete[1]"],
                  to_xpaths: ["/src:unit[2]/diff:insert[1]"],
                },
              ],
            },
          });
        }
        if (url === "/api/history/pairs/1/visualize") {
          return jsonResponse({
            source_filename: "history-pair-1.srcmove.xml",
            moved_srcdiff_xml: "<unit />",
            move_results: { move_count: 0, moves: [] },
            has_position_data: false,
            files: [],
            unit_count: 0,
          });
        }
        throw new Error(`Unexpected fetch URL: ${url}`);
      }),
    );
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it("loads summary, filtered pairs, and selected compact evidence", async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole("tab", { name: /^History/ }));

    expect(await screen.findByText("notepadpp")).toBeInTheDocument();
    expect(screen.getByText("370")).toBeInTheDocument();
    expect(screen.getByText("336")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "With moves" }),
    ).toHaveAttribute("aria-pressed", "true");

    const pairList = screen.getByLabelText("History commit pairs");
    await user.click(within(pairList).getByRole("button", { name: /#1/ }));

    const details = await screen.findByLabelText("Commit pair 1 details");
    await waitFor(() => {
      expect(within(details).getByText("Move 1 · exact")).toBeInTheDocument();
      expect(within(details).getByText("Move 2 · type3")).toBeInTheDocument();
    });

    await user.click(
      within(details).getByRole("button", { name: "Open visualization" }),
    );

    await waitFor(() => {
      expect(screen.getByRole("tab", { name: "Source" })).toHaveAttribute(
        "aria-selected",
        "true",
      );
    });
  });
});

function jsonResponse(payload: unknown): Response {
  return new Response(JSON.stringify(payload), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}
