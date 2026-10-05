export const CONTENT_RELATIONSHIPS = ["type1", "type2c", "type3"] as const;

export type ContentRelationship = (typeof CONTENT_RELATIONSHIPS)[number];

export function contentRelationshipLabel(kind: string) {
  return `Type ${kind.slice(4)}`;
}
