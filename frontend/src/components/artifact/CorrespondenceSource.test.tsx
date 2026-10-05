import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, expect, it, vi } from "vitest";
import { CorrespondenceOverlay } from "./CorrespondenceSource";
import type { Pair } from "./ArtifactCorrespondences";
afterEach(cleanup);
it("uses type colors, corner routes and clickable swatches below moves", async () => {
  const user = userEvent.setup();
  const pair = { id: 2, kind: "type2c" } as Pair;
  const inspect = vi.fn();
  const { container } = render(
    <CorrespondenceOverlay
      pairs={[pair]}
      inspect={inspect}
      groups={[
        {
          key: "c",
          moveId: "correspondence-2",
          boxes: [
            {
              key: "l",
              revision: "revision-0",
              x: 20,
              y: 20,
              width: 80,
              height: 20,
              rx: 4,
            },
            {
              key: "r",
              revision: "revision-1",
              x: 200,
              y: 70,
              width: 80,
              height: 20,
              rx: 4,
            },
          ],
          paths: [],
          hub: null,
        },
      ]}
    />,
  );
  expect(container.querySelector("svg")).toHaveClass("z-20");
  expect(container.querySelector("[data-correspondence-id]")).toHaveStyle({
    color: "#34d399",
  });
  expect(container.querySelector("path")).toHaveAttribute(
    "d",
    "M 100 23 C 100 11, 200 61, 200 73",
  );
  await user.click(
    screen.getByRole("button", { name: "Inspect correspondence 3 before" }),
  );
  expect(inspect).toHaveBeenCalledWith(pair, expect.any(Object));
});
