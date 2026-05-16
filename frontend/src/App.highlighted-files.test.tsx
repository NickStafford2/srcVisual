import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import App from "./App";
import {
  complexHighlightFixture,
  complexMovedFilenames,
  complexUntouchedFilenames,
} from "./test/fixtures/complexHighlightFixture";

const exampleFilename = "e2e_generated_complex_diff.xml";
const exampleLabel = "complex_diff.xml";
const exampleXml = "<unit>complex example srcdiff</unit>";

class MockEventSource {
  onmessage: ((event: MessageEvent<string>) => void) | null = null;

  constructor(public readonly url: string) {}

  close() {}
}

describe("App file-level highlight behavior", () => {
  beforeEach(() => {
    vi.spyOn(globalThis.crypto, "randomUUID").mockReturnValue(
      "00000000-0000-4000-8000-000000000001",
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
          return jsonResponse(complexHighlightFixture);
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

  it("shows source highlights only for files that participate in moves", async () => {
    const user = userEvent.setup();

    await renderHighlightedMovesApp(user);

    for (const filename of complexMovedFilenames) {
      expectFileToHaveHighlightedSourceLines(filename);
    }

    for (const filename of complexUntouchedFilenames) {
      expectFileToHaveNoHighlightedSourceLines(filename);
    }
  });

  it("keeps move highlights active while adding delete highlights", async () => {
    const user = userEvent.setup();

    await renderHighlightedMovesApp(user);

    await user.click(screen.getByRole("tab", { name: "Node Info" }));

    const _movesButton = screen.getByRole("button", {
      name: "Highlight all moves",
    });
    const _deletesButton = screen.getByRole("button", {
      name: "Highlight all deletes",
    });
    const _insertsButton = screen.getByRole("button", {
      name: "Highlight all inserts",
    });

    expect(_movesButton).toHaveAttribute("aria-pressed", "true");
    expect(_deletesButton).toHaveAttribute("aria-pressed", "false");
    expect(_insertsButton).toHaveAttribute("aria-pressed", "false");

    await user.click(_deletesButton);

    await waitFor(() => {
      expect(_movesButton).toHaveAttribute("aria-pressed", "true");
      expect(_deletesButton).toHaveAttribute("aria-pressed", "true");
    });

    await user.click(_insertsButton);

    await waitFor(() => {
      expect(_movesButton).toHaveAttribute("aria-pressed", "true");
      expect(_deletesButton).toHaveAttribute("aria-pressed", "true");
      expect(_insertsButton).toHaveAttribute("aria-pressed", "true");
    });

    await user.click(screen.getByRole("tab", { name: "Source" }));

    expectFileToHaveHighlightedSourceLines("foo.hpp");
    expectFileToHaveHighlightedSourceLines("foo.cpp");
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
  await screen.findByLabelText("srcDiff Tree");
}
function expectFileToHaveHighlightedSourceLines(filename: string) {
  expect(getHighlightedSourceLineCountForFile(filename)).toBeGreaterThan(0);
}

function expectFileToHaveNoHighlightedSourceLines(filename: string) {
  expect(getHighlightedSourceLineCountForFile(filename)).toBe(0);
}

function getHighlightedSourceLineCountForFile(filename: string): number {
  return screen
    .getByLabelText(`Source file ${filename}`)
    .querySelectorAll('[data-highlighted="true"][data-line-number]').length;
}
