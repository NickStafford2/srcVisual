import { CONTENT_RELATIONSHIPS } from "./contentRelationshipKinds";

const legacyFields = new Set([
  "match_kind",
  "match_kinds",
  "by_match_type",
  "expected_match_kind",
  "reviewed_expected_match_kind",
  "observed_match_kind",
  "reviewed_match_kind",
  "_oracle_observed_match_kind",
]);
const relationshipFields = new Set([
  "content_relationship",
  "expected_content_relationship",
  "reviewed_expected_content_relationship",
  "observed_content_relationship",
  "reviewed_content_relationship",
  "_oracle_observed_content_relationship",
]);

export function assertClassificationContract(value: unknown): void {
  if (Array.isArray(value)) {
    value.forEach(assertClassificationContract);
  } else if (value !== null && typeof value === "object") {
    for (const [key, item] of Object.entries(value)) {
      if (legacyFields.has(key))
        throw new Error(
          `Unsupported legacy classification field ${key}. Preserve old evidence and regenerate with current tools.`,
        );
      if (
        relationshipFields.has(key) &&
        item !== null &&
        ![...CONTENT_RELATIONSHIPS, "type2b"].includes(item as string)
      )
        throw new Error(
          `Unsupported content relationship ${String(item)}. Regenerate with current tools.`,
        );
      if (
        ["content_relationships", "by_content_relationship"].includes(key) &&
        (item === null ||
          typeof item !== "object" ||
          Array.isArray(item) ||
          Object.keys(item).some(
            (kind) =>
              !CONTENT_RELATIONSHIPS.includes(
                kind as (typeof CONTENT_RELATIONSHIPS)[number],
              ),
          ))
      )
        throw new Error(
          "Unsupported detector content relationship counts. Regenerate with current tools.",
        );
      assertClassificationContract(item);
    }
  }
}

export function assertDetectorMove(move: unknown, allowXmlOnly = false): void {
  assertClassificationContract(move);
  if (move === null || typeof move !== "object")
    throw new Error("Invalid move record.");
  const record = move as {
    content_relationship?: unknown;
    result_provenance?: unknown;
  };
  if (
    allowXmlOnly &&
    record.content_relationship == null &&
    record.result_provenance !== "producer-results"
  )
    return;
  if (
    !CONTENT_RELATIONSHIPS.includes(
      record.content_relationship as (typeof CONTENT_RELATIONSHIPS)[number],
    )
  )
    throw new Error(
      "Reported move requires content_relationship type1, type2c, or type3. Regenerate with current tools.",
    );
}
