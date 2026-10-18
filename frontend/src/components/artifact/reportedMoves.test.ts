import { buildMoveConnectorGroup } from "../source-view/code-pane/_moveConnectorGeometry";
import { describe, expect, it } from "vitest";
import {
  expandReportEndpoints,
  reportIdsByMember,
  reportedMoveConnectorGroups,
} from "./reportedMoves";
import type { ArtifactMoveSummary } from "../../types";

const report: ArtifactMoveSummary = {
  move_id: "sequence:a",
  report_kind: "ordered_sequence",
  member_move_ids: ["a", "b"],
  content_relationship: "type1",
  from_node_ids: ["old:a", "old:b"],
  to_node_ids: ["new:a", "new:b"],
};

describe("compound move reports", () => {
  it("keeps exactly n original endpoint pairs instead of n squared links", () => {
    expect(expandReportEndpoints(report)).toEqual([
      {
        move_id: "a",
        content_relationship: "type1",
        from_node_ids: ["old:a"],
        to_node_ids: ["new:a"],
      },
      {
        move_id: "b",
        content_relationship: "type1",
        from_node_ids: ["old:b"],
        to_node_ids: ["new:b"],
      },
    ]);
    expect(reportIdsByMember([report]).get("b")).toBe("sequence:a");
  });
  it.each([
    { from_node_ids: ["x", "y"], to_node_ids: ["z"] },
    { from_node_ids: ["x"], to_node_ids: ["y", "z"] },
  ])(
    "maps atomic report identity to its complete XML group endpoints: %j",
    (endpoints) => {
      const atomic: ArtifactMoveSummary = {
        move_id: "item:a",
        report_kind: "atomic",
        member_move_ids: ["a"],
        content_relationship: "type1",
        ...endpoints,
      };
      expect(expandReportEndpoints(atomic)).toEqual([
        { ...atomic, move_id: "a" },
      ]);
      expect(reportIdsByMember([atomic]).get("a")).toBe("item:a");
    },
  );

  it("rejects atomic reports without exactly one retained XML group", () => {
    const atomic: ArtifactMoveSummary = { ...report, report_kind: "atomic" };
    for (const members of [undefined, [], ["a", "b"]]) {
      expect(() =>
        expandReportEndpoints({ ...atomic, member_move_ids: members }),
      ).toThrow("exactly one XML group");
    }
  });

  it("retains legacy equivalence groups and rejects incomplete ordered reports", () => {
    const atomic: ArtifactMoveSummary = {
      move_id: "a",
      content_relationship: "type1",
      from_node_ids: ["x", "y"],
      to_node_ids: ["z"],
    };
    expect(expandReportEndpoints(atomic)).toEqual([atomic]);
    expect(() =>
      expandReportEndpoints({ ...report, to_node_ids: ["new:a"] }),
    ).toThrow("one endpoint pair");
  });
});

it("bundles only declared sequence members and leaves independent moves unchanged", () => {
  const rect = {
    left: 10,
    right: 40,
    top: 10,
    bottom: 30,
    width: 30,
    height: 20,
  };
  const groups = ["a", "b", "independent"].map(
    (moveId) =>
      buildMoveConnectorGroup({
        moveId,
        containerRect: rect,
        fromRects: [rect],
        toRects: [{ ...rect, left: 100, right: 130 }],
      })!,
  );
  const bundled = reportedMoveConnectorGroups(groups, [report]);
  expect(bundled.map((group) => group.moveId)).toEqual([
    "independent",
    "sequence:a",
  ]);
  expect(bundled[0]).toEqual(groups[2]);
  expect(bundled[1].boxes).toHaveLength(4);
  expect(
    bundled[1].paths.filter((path) => path.role === "sequence"),
  ).toHaveLength(1);
  expect(reportedMoveConnectorGroups([], [report])).toEqual([]);
});
