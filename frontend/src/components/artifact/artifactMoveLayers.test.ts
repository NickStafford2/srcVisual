import { expect, it } from "vitest";
import type { ArtifactMoveSummary } from "../../types";
import { defaultVisibleMoveIds, moveLayer } from "./artifactMoveLayers";

const upstream: ArtifactMoveSummary = {
  move_id: "1",
  move_origin: "srcdiff",
  content_relationship: null,
  from_node_ids: ["f:n1"],
  to_node_ids: ["f:n2"],
};
const producer: ArtifactMoveSummary = {
  ...upstream,
  move_id: "item:97b1dcdaf",
  move_origin: "srcmove",
};

it("defaults to srcMove annotations when present, including unclassified XML annotations", () => {
  expect(defaultVisibleMoveIds([upstream, producer])).toEqual(
    new Set([producer.move_id]),
  );
  expect(moveLayer(producer)).toBe("srcmove");
});

it("shows inherited annotations by default in a srcDiff-only artifact", () => {
  expect(defaultVisibleMoveIds([upstream])).toEqual(new Set(["1"]));
  expect(defaultVisibleMoveIds([])).toEqual(new Set());
});
