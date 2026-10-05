export const MOVE_MATCH_KINDS = ["type1", "type2b", "type2c", "type3"] as const;

export type MoveMatchKind = (typeof MOVE_MATCH_KINDS)[number];

export function moveKindLabel(kind: MoveMatchKind) {
  return `Type ${kind.slice(4)}`;
}
