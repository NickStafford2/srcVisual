import { describe, expect, it } from "vitest";
import {
  assertClassificationContract,
  assertDetectorMove,
} from "./contentRelationships";

describe("content relationship admission", () => {
  it("keeps Type-2b expectations and diagnostic evidence distinct from predictions", () => {
    expect(() =>
      assertClassificationContract({
        expected_content_relationship: "type2b",
        observed_content_relationship: "type3",
        label_correction: { reviewed_content_relationship: "type2b" },
        diagnostics: { correspondence_kind: "type2b" },
      }),
    ).not.toThrow();
    expect(() =>
      assertDetectorMove({ content_relationship: "type2b" }),
    ).toThrow();
  });
  it.each([
    "match_kind",
    "match_kinds",
    "by_match_type",
    "reviewed_match_kind",
  ])("rejects nested legacy %s", (field) => {
    expect(() =>
      assertClassificationContract({ correction: { [field]: "type2" } }),
    ).toThrow(/legacy/);
  });
  it("rejects missing predictions while allowing explicit XML-only evidence", () => {
    expect(() => assertDetectorMove({})).toThrow(/requires/);
    expect(() =>
      assertDetectorMove({ result_provenance: "xml-annotation" }, true),
    ).not.toThrow();
    expect(() =>
      assertDetectorMove({ content_relationship: "type2" }),
    ).toThrow();
    expect(() =>
      assertClassificationContract({ content_relationships: { type2: 1 } }),
    ).toThrow();
  });
});
