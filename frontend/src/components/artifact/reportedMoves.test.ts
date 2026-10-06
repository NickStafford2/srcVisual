import { describe, expect, it } from "vitest";
import { expandReportEndpoints, reportIdsByMember } from "./reportedMoves";
import type { ArtifactMoveSummary } from "../../types";

const report: ArtifactMoveSummary = {
  move_id: "sequence:a", report_kind: "ordered_sequence", member_move_ids: ["a", "b"],
  content_relationship: "type1", from_node_ids: ["old:a", "old:b"], to_node_ids: ["new:a", "new:b"],
};

describe("compound move reports", () => {
  it("keeps exactly n original endpoint pairs instead of n squared links", () => {
    expect(expandReportEndpoints(report)).toEqual([
      { move_id: "a", content_relationship: "type1", from_node_ids: ["old:a"], to_node_ids: ["new:a"] },
      { move_id: "b", content_relationship: "type1", from_node_ids: ["old:b"], to_node_ids: ["new:b"] },
    ]);
    expect(reportIdsByMember([report]).get("b")).toBe("sequence:a");
  });
  it("retains legacy equivalence groups and rejects incomplete ordered reports", () => {
    const atomic: ArtifactMoveSummary = { move_id: "a", content_relationship: "type1", from_node_ids: ["x", "y"], to_node_ids: ["z"] };
    expect(expandReportEndpoints(atomic)).toEqual([atomic]);
    expect(() => expandReportEndpoints({ ...report, to_node_ids: ["new:a"] })).toThrow("one endpoint pair");
  });
});
