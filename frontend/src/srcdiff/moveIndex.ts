import type { SrcMoveRecord, SrcMoveResults, VisualizedFile } from "../types";
import type { SrcDiffNodeEntry, TreeIndex } from "./treeIndex";

export type MoveIndex = Map<string, SrcDiffNodeEntry[]>;

export function buildMoveIndex(
  moveResults: SrcMoveResults | null | undefined,
  treeIndex: TreeIndex,
  files: VisualizedFile[],
): MoveIndex {
  const index: MoveIndex = new Map();

  for (const move of moveResults?.moves ?? []) {
    if (!move.move_id) {
      continue;
    }

    const nodeIds = getCanonicalMoveNodeIds(move, files);

    index.set(
      move.move_id,
      dedupeNodeEntries(
        nodeIds.map((nodeId) => {
          const entry = treeIndex.get(nodeId);

          if (!entry) {
            throw new Error(`Missing tree entry for move node_id=${nodeId}.`);
          }

          return entry;
        }),
      ),
    );
  }

  return index;
}

export function getAllMoveEntries(moveIndex: MoveIndex): SrcDiffNodeEntry[] {
  return dedupeNodeEntries(Array.from(moveIndex.values()).flat());
}

function getCanonicalMoveNodeIds(
  move: SrcMoveRecord,
  files: VisualizedFile[],
): string[] {
  if (move.from_node_ids.length === 0 || move.to_node_ids.length === 0) {
    throw new Error(
      `Move ${move.move_id ?? "(unknown)"} is missing frontend node ids.`,
    );
  }

  const rawNodeIds = [...move.from_node_ids, ...move.to_node_ids];

  return dedupeNodeIds(
    rawNodeIds.map((nodeId) => normalizeNodeId(nodeId, files)),
  );
}

function normalizeNodeId(nodeId: string, files: VisualizedFile[]): string {
  const match = nodeId.match(/^\/src:unit\[@filename=(['"])(.*?)\1\](\/.*)?$/);

  if (!match) {
    return nodeId;
  }

  const filename = match[2];
  const rest = match[3] ?? "";
  const file =
    files.find((candidate) => candidate.filename === filename) ?? null;

  if (!file) {
    throw new Error(`Unable to normalize node_id for filename="${filename}".`);
  }

  return `/src:unit[${file.unit_id}]${rest}`;
}

function dedupeNodeIds(nodeIds: string[]): string[] {
  return Array.from(new Set(nodeIds));
}

export function dedupeNodeEntries(
  entries: SrcDiffNodeEntry[],
): SrcDiffNodeEntry[] {
  const seen = new Set<string>();

  return entries.filter((entry) => {
    if (seen.has(entry.node.id)) {
      return false;
    }

    seen.add(entry.node.id);
    return true;
  });
}
