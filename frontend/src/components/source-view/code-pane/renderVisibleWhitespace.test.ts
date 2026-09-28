import { expect, it } from "vitest";
import {
  renderVisibleWhitespace,
  sourceColumnAt,
} from "./renderVisibleWhitespace";

it("keeps visible tab markers aligned to eight-column tab stops", () => {
  expect(renderVisibleWhitespace("\tvalue")).toBe("⇥       value");
  expect(renderVisibleWhitespace("\tvalue", 4)).toBe("⇥   value");
  expect(renderVisibleWhitespace(" \tvalue", 4)).toBe("·⇥  value");
});

it("computes a segment's visual source column across preceding tabs", () => {
  expect(sourceColumnAt("\t\tvalue", 2)).toBe(16);
  expect(sourceColumnAt("abc\tvalue", 4)).toBe(8);
});
