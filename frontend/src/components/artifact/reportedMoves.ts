import type { ArtifactMoveSummary } from "../../types";

export function reportIdsByMember(moves: ArtifactMoveSummary[]): Map<string, string> {
  const ids = new Map<string, string>();
  for (const move of moves) {
    ids.set(move.move_id, move.move_id);
    for (const member of move.member_move_ids ?? []) ids.set(member, move.move_id);
  }
  return ids;
}

// Keep one connector per exact member pair; never construct an all-to-all group.
export function expandReportEndpoints(move: ArtifactMoveSummary): ArtifactMoveSummary[] {
  if (move.report_kind === "atomic") {
    const members = move.member_move_ids;
    if (!members || members.length !== 1) {
      throw new Error("Atomic move report requires exactly one XML group.");
    }
    // Source spans and connector registrations use the retained XML group ID.
    // Keep every endpoint in that group, including unresolved/copy partners.
    return [{ ...move, move_id: members[0] }];
  }
  if (move.report_kind !== "ordered_sequence") return [move];
  const members = move.member_move_ids;
  if (!members || members.length !== move.from_node_ids.length || members.length !== move.to_node_ids.length) {
    throw new Error("Ordered move report requires one endpoint pair per member.");
  }
  return members.map((moveId, index) => ({
    move_id: moveId,
    content_relationship: move.content_relationship,
    from_node_ids: [move.from_node_ids[index]],
    to_node_ids: [move.to_node_ids[index]],
  }));
}
