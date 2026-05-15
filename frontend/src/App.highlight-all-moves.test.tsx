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
  toNewFileHighlightFixture,
  toNewFileMoveId,
} from "./test/fixtures/toNewFileHighlightFixture";

const exampleFilename = "e2e_generated_to_new_file_diff.xml";
const exampleLabel = "to_new_file_diff.xml";
const exampleXml = "<unit>example srcdiff</unit>";

class MockEventSource {
  onmessage: ((event: MessageEvent<string>) => void) | null = null;

  constructor(public readonly url: string) {}

  close() {}
}

describe("App highlight all moves flow", () => {
  let visualizeRequest: {
    includeSkippedTags: string | null;
    pruningLevel: string | null;
    progressToken: string | null;
    srcdiffXml: string | null;
  } | null;

  beforeEach(() => {
    visualizeRequest = null;

    vi.spyOn(globalThis.crypto, "randomUUID").mockReturnValue(
      "00000000-0000-4000-8000-000000000000",
    );

    vi.stubGlobal("EventSource", MockEventSource);
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
        const url = String(input);

        if (url === "/api/examples") {
          return jsonResponse({ examples: [exampleFilename] });
        }

        if (url === `/api/examples/${encodeURIComponent(exampleFilename)}`) {
          return jsonResponse({ content: exampleXml });
        }

        if (url === "/api/visualize") {
          const formData = init?.body;

          if (!(formData instanceof FormData)) {
            throw new Error("Expected visualize request to send FormData.");
          }

          visualizeRequest = {
            includeSkippedTags:
              formData.get("include_skipped_tags")?.toString() ?? null,
            pruningLevel: formData.get("pruning_level")?.toString() ?? null,
            progressToken: formData.get("progress_token")?.toString() ?? null,
            srcdiffXml: formData.get("srcdiff_xml")?.toString() ?? null,
          };

          return jsonResponse(toNewFileHighlightFixture);
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

  it("highlights the same move in the tree, xml pane, and source panes", async () => {
    const user = userEvent.setup();

    await renderHighlightedMovesApp(user);

    expect(visualizeRequest).toEqual({
      includeSkippedTags: "false",
      pruningLevel: "none",
      progressToken: "00000000-0000-4000-8000-000000000000",
      srcdiffXml: exampleXml,
    });

    await waitFor(() => {
      expect(
        getHighlightedTreeNodeIds(screen.getByLabelText("srcDiff Tree")),
      ).toEqual(["/src:unit[1]/diff:delete[1]", "/src:unit[2]/diff:insert[1]"]);
    });

    expect(
      getHighlightedLineNumbers(screen.getByLabelText("srcDiff XML")),
    ).toEqual([4, 5, 6, 7, 8, 16, 17, 18, 19, 20, 21]);

    expect(
      getHighlightedLineNumbers(screen.getByLabelText("main.cpp Revision 0")),
    ).toEqual([1, 2, 3, 4, 5]);
    expect(
      getHighlightedLineNumbers(screen.getByLabelText("main.cpp Revision 1")),
    ).toEqual([]);
    expect(
      getHighlightedLineNumbers(screen.getByLabelText("|foo.hpp Revision 0")),
    ).toEqual([]);
    expect(
      getHighlightedLineNumbers(screen.getByLabelText("|foo.hpp Revision 1")),
    ).toEqual([1, 2, 3, 4, 5]);

    expect(
      within(screen.getByLabelText("srcDiff Tree")).getByText("diff:delete"),
    ).toBeInTheDocument();
    expect(
      within(screen.getByLabelText("srcDiff Tree")).getByText("diff:insert"),
    ).toBeInTheDocument();

    const sourceSection = screen.getByLabelText("Source Code Section");
    expect(within(sourceSection).getAllByText("1 highlighted")).toHaveLength(2);

    expect(
      sourceSection.querySelectorAll(`[data-move-id="${toNewFileMoveId}"]`),
    ).not.toHaveLength(0);
  });

  it("only highlights source panes that actually contain the move", async () => {
    const user = userEvent.setup();

    await renderHighlightedMovesApp(user);

    expectSourcePaneHighlightPresence({
      paneLabel: "main.cpp Revision 0",
      shouldHaveHighlights: true,
    });
    expectSourcePaneHighlightPresence({
      paneLabel: "main.cpp Revision 1",
      shouldHaveHighlights: false,
    });
    expectSourcePaneHighlightPresence({
      paneLabel: "|foo.hpp Revision 0",
      shouldHaveHighlights: false,
    });
    expectSourcePaneHighlightPresence({
      paneLabel: "|foo.hpp Revision 1",
      shouldHaveHighlights: true,
    });
  });

  it("offers explicit node and move-group highlight actions in the tree menu", async () => {
    const user = userEvent.setup();

    render(<App />);

    await user.click(await screen.findByRole("button", { name: exampleLabel }));

    await waitFor(() => {
      expect(screen.getByPlaceholderText("Paste srcDiff XML here")).toHaveValue(
        exampleXml,
      );
    });

    await user.click(screen.getByRole("button", { name: "Submit" }));
    await screen.findByRole("heading", { name: "srcDiff Tree" });

    const _tree = screen.getByLabelText("srcDiff Tree");

    expect(getHighlightedTreeNodeIds(_tree)).toEqual([
      "/src:unit[1]/diff:delete[1]",
      "/src:unit[2]/diff:insert[1]",
    ]);

    await user.click(
      within(_tree).getByRole("button", { name: "Actions for diff:delete" }),
    );
    await user.click(screen.getByRole("menuitem", { name: "Highlight node" }));

    await waitFor(() => {
      expect(getHighlightedTreeNodeIds(_tree)).toEqual([
        "/src:unit[1]/diff:delete[1]",
        "/src:unit[2]/diff:insert[1]",
      ]);
    });

    await user.click(
      within(_tree).getByRole("button", { name: "Actions for diff:delete" }),
    );
    await user.click(
      screen.getByRole("menuitem", { name: "Highlight move group" }),
    );

    await waitFor(() => {
      expect(getHighlightedTreeNodeIds(_tree)).toEqual([
        "/src:unit[1]/diff:delete[1]",
        "/src:unit[2]/diff:insert[1]",
      ]);
    });
  });

  it("submits the pruning mode selected in the input panel", async () => {
    const user = userEvent.setup();

    render(<App />);

    await user.selectOptions(
      screen.getByRole("combobox", { name: "Pruning mode" }),
      "none",
    );

    await user.click(await screen.findByRole("button", { name: exampleLabel }));

    await waitFor(() => {
      expect(screen.getByPlaceholderText("Paste srcDiff XML here")).toHaveValue(
        exampleXml,
      );
    });

    await user.click(screen.getByRole("button", { name: "Submit" }));

    await waitFor(() => {
      expect(visualizeRequest?.pruningLevel).toBe("none");
    });
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

async function renderHighlightedMovesApp(
  user: ReturnType<typeof userEvent.setup>,
) {
  render(<App />);

  await user.click(await screen.findByRole("button", { name: exampleLabel }));

  await waitFor(() => {
    expect(screen.getByPlaceholderText("Paste srcDiff XML here")).toHaveValue(
      exampleXml,
    );
  });

  await user.click(screen.getByRole("button", { name: "Submit" }));

  await screen.findByRole("heading", { name: "srcDiff Tree" });
}

function expectSourcePaneHighlightPresence({
  paneLabel,
  shouldHaveHighlights,
}: {
  paneLabel: string;
  shouldHaveHighlights: boolean;
}) {
  const highlightedLines = getHighlightedLineNumbers(
    screen.getByLabelText(paneLabel),
  );

  if (shouldHaveHighlights) {
    expect(highlightedLines.length).toBeGreaterThan(0);
    return;
  }

  expect(highlightedLines).toEqual([]);
}
