import {
  cleanup,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import App from "./App";
import {
  singleUnitHighlightFixture,
  singleUnitMoveId,
} from "./test/fixtures/singleUnitHighlightFixture";

const exampleFilename = "e2e_custom_1x1_basic.xml";
const exampleLabel = "1x1_basic.xml";
const exampleXml = "<unit>single unit srcdiff</unit>";

class MockEventSource {
  onmessage: ((event: MessageEvent<string>) => void) | null = null;

  constructor(public readonly url: string) {}

  close() {}
}

describe("App single-unit move highlighting", () => {
  beforeEach(() => {
    vi.spyOn(globalThis.crypto, "randomUUID").mockReturnValue(
      "00000000-0000-4000-8000-000000000002",
    );

    vi.stubGlobal("EventSource", MockEventSource);
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL) => {
        const url = String(input);

        if (url === "/api/examples") {
          return jsonResponse({ examples: [exampleFilename] });
        }

        if (url === `/api/examples/${encodeURIComponent(exampleFilename)}`) {
          return jsonResponse({ content: exampleXml });
        }

        if (url === "/api/visualize") {
          return jsonResponse(singleUnitHighlightFixture);
        }

        throw new Error(`Unexpected fetch URL: ${url}`);
      }),
    );
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("highlights single-root unit moves across the tree and source panes", async () => {
    const user = userEvent.setup();

    render(<App />);

    await user.click(await screen.findByRole("button", { name: exampleLabel }));

    await waitFor(() => {
      expect(screen.getByPlaceholderText("Paste srcDiff XML here")).toHaveValue(
        exampleXml,
      );
    });

    await user.click(screen.getByRole("button", { name: "Submit" }));
    await screen.findByLabelText("srcDiff Tree");

    const tree = screen.getByLabelText("srcDiff Tree");
    await waitFor(() => {
      expect(getHighlightedTreeNodeIds(tree)).toEqual([
        "/src:unit[1]/diff:delete[1]",
        "/src:unit[1]/diff:insert[1]",
      ]);
    });

    expect(
      getHighlightedLineNumbers(screen.getByLabelText("basic.cpp Revision 0")),
    ).toEqual([1]);
    expect(
      getHighlightedLineNumbers(screen.getByLabelText("basic.cpp Revision 1")),
    ).toEqual([1]);

    const sourceSection = screen.getByLabelText("Source Code");
    expect(
      within(sourceSection).getByText("2 highlighted"),
    ).toBeInTheDocument();
    expect(
      sourceSection.querySelectorAll(`[data-move-id="${singleUnitMoveId}"]`),
    ).not.toHaveLength(0);
  });
});

function jsonResponse(payload: unknown): Response {
  return new Response(JSON.stringify(payload), {
    status: 200,
    headers: {
      "content-type": "application/json",
    },
  });
}

function getHighlightedLineNumbers(region: HTMLElement): number[] {
  return Array.from(
    region.querySelectorAll<HTMLElement>(
      '[data-highlighted="true"][data-line-number]',
    ),
  ).map((line) => Number(line.dataset.lineNumber));
}

function getHighlightedTreeNodeIds(region: HTMLElement): string[] {
  return Array.from(
    region.querySelectorAll<HTMLElement>(
      '[data-highlighted="true"][data-highlight-kind="move"]',
    ),
  )
    .map((row) => row.dataset.nodeId ?? "")
    .filter(Boolean);
}
