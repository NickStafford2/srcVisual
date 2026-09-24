import { cleanup, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import App from "./App";

class MockEventSource {
  static instances: MockEventSource[] = [];
  private listeners = new Map<string, (event: MessageEvent<string>) => void>();
  closed = false;

  constructor(public readonly url: string) {
    MockEventSource.instances.push(this);
  }

  addEventListener(
    type: string,
    listener: (event: MessageEvent<string>) => void,
  ) {
    this.listeners.set(type, listener);
  }

  emit(type: string, payload: unknown) {
    this.listeners.get(type)?.(
      new MessageEvent(type, { data: JSON.stringify(payload) }),
    );
  }

  close() {
    this.closed = true;
  }
}

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
  let runPollCount = 0;
  let cancellationRequested = false;

  beforeEach(() => {
    MockEventSource.instances = [];
    runPollCount = 0;
    cancellationRequested = false;
    vi.stubGlobal("EventSource", MockEventSource);
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
        if (url === "/api/history/pairs/1/runs") {
          return jsonResponse({
            schema_version: 1,
            reuse: "new",
            run: historyRun("queued"),
          }, 202);
        }
        if (url === `/api/runs/${"r".repeat(32)}`) {
          runPollCount += 1;
          return jsonResponse({
            schema_version: 1,
            run: cancellationRequested
              ? historyRun("cancelled", true)
              : historyRun(runPollCount === 1 ? "running" : "completed"),
          });
        }
        if (url === `/api/runs/${"r".repeat(32)}/cancel`) {
          cancellationRequested = true;
          return jsonResponse(
            {
              schema_version: 1,
              run: historyRun("running", true),
            },
            202,
          );
        }
        if (url === `/api/artifacts/${"a".repeat(32)}`) {
          return jsonResponse({
            schema_version: 2,
            projection_schema_version: 1,
            artifact_id: "a".repeat(32),
            source_filename: "history-pair-1.srcmove.xml",
            has_position_data: false,
            file_count: 0,
            node_count: 0,
            files: [],
            moves: { move_count: 0, items: [] },
            focus_profiles: [
              "changes-and-moves",
              "moves",
              "changes",
              "complete-file",
            ],
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

    await waitFor(() => expect(MockEventSource.instances).toHaveLength(1));
    MockEventSource.instances[0].emit("run", {
      schema_version: 1,
      event: {
        run_id: "r".repeat(32),
        sequence: 2,
        type: "progress",
        status: "running",
        message: "Building the synchronized visualization.",
        created_at: "2026-09-24T00:00:01.500Z",
      },
    });
    expect(
      await screen.findByText("Building the synchronized visualization."),
    ).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByRole("tab", { name: "Source" })).toHaveAttribute(
        "aria-selected",
        "true",
      );
    });
    expect(fetch).toHaveBeenCalledWith("/api/history/pairs/1/runs", {
      method: "POST",
    });
    expect(fetch).not.toHaveBeenCalledWith(
      "/api/history/pairs/1/visualize",
      expect.anything(),
    );
    expect(MockEventSource.instances[0].closed).toBe(true);
  });

  it("requests durable cancellation and reports the terminal state", async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole("tab", { name: /^History/ }));
    const pairList = await screen.findByLabelText("History commit pairs");
    await user.click(within(pairList).getByRole("button", { name: /#1/ }));
    const details = await screen.findByLabelText("Commit pair 1 details");
    await user.click(
      within(details).getByRole("button", { name: "Open visualization" }),
    );

    await user.click(await within(details).findByRole("button", { name: "Cancel" }));

    expect(fetch).toHaveBeenCalledWith(`/api/runs/${"r".repeat(32)}/cancel`, {
      method: "POST",
    });
    expect(
      await screen.findByText("History visualization was cancelled."),
    ).toBeInTheDocument();
    expect(MockEventSource.instances[0].closed).toBe(true);
  });
});

function historyRun(
  status: "queued" | "running" | "completed" | "cancelled",
  cancellationRequested = false,
) {
  return {
    run_id: "r".repeat(32),
    kind: "history-visualization",
    history_pair: 1,
    status,
    artifact_id: status === "completed" ? "a".repeat(32) : null,
    cancellation_requested: cancellationRequested,
    diagnostic: null,
    created_at: "2026-09-24T00:00:00.000Z",
    started_at: status === "completed" ? "2026-09-24T00:00:01.000Z" : null,
    finished_at: status === "completed" ? "2026-09-24T00:00:02.000Z" : null,
    latest_event_sequence: status === "completed" ? 3 : 1,
  };
}

function jsonResponse(payload: unknown, status = 200): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}
