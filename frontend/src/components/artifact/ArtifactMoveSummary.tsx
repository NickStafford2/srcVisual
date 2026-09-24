import type {
  ArtifactFileSummary,
  ArtifactMoveSummary,
} from "../../types";

type Props = {
  files: ArtifactFileSummary[];
  moves: ArtifactMoveSummary[];
  selectedMoveId: string | null;
  selectedNodeId: string | null;
  onSelectMove: (move: ArtifactMoveSummary) => void;
  onSelectEndpoint: (move: ArtifactMoveSummary, nodeId: string) => void;
};

export function ArtifactMoveSummary({
  files,
  moves,
  selectedMoveId,
  selectedNodeId,
  onSelectMove,
  onSelectEndpoint,
}: Props) {
  const filenames = new Map(files.map((file) => [file.file_id, file.filename]));

  return (
    <section className="rounded-xl border border-white/10 bg-slate-950/65 p-4">
      <header className="border-b border-white/10 pb-3">
        <p className="text-sm text-slate-300">
          {moves.length} detected move{moves.length === 1 ? "" : "s"}
        </p>
        <p className="mt-1 text-xs text-slate-500">
          Choose a move, then open either tagged endpoint in Source.
        </p>
      </header>

      {moves.length === 0 ? (
        <p className="pt-4 text-sm text-slate-400">No moves found.</p>
      ) : (
        <div className="mt-4 grid gap-3 xl:grid-cols-2">
          {moves.map((move) => (
            <article
              key={move.move_id}
              className={`rounded-xl border p-3 ${
                selectedMoveId === move.move_id
                  ? "border-diff-move-1/60 bg-diff-move-1/10"
                  : "border-white/10 bg-black/20"
              }`}
            >
              <button
                type="button"
                aria-pressed={selectedMoveId === move.move_id}
                onClick={() => onSelectMove(move)}
                className="flex w-full items-center justify-between gap-3 text-left"
              >
                <span className="font-mono text-diff-move-1">{move.move_id}</span>
                <span className="text-xs text-slate-400">
                  {move.match_kind ?? "unclassified"}
                </span>
              </button>

              <EndpointList
                label="From"
                nodeIds={move.from_node_ids}
                filenames={filenames}
                selectedNodeId={selectedNodeId}
                onSelect={(nodeId) => onSelectEndpoint(move, nodeId)}
              />
              <EndpointList
                label="To"
                nodeIds={move.to_node_ids}
                filenames={filenames}
                selectedNodeId={selectedNodeId}
                onSelect={(nodeId) => onSelectEndpoint(move, nodeId)}
              />
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

function EndpointList({
  label,
  nodeIds,
  filenames,
  selectedNodeId,
  onSelect,
}: {
  label: string;
  nodeIds: string[];
  filenames: Map<string, string>;
  selectedNodeId: string | null;
  onSelect: (nodeId: string) => void;
}) {
  return (
    <div className="mt-3">
      <p className="mb-1 text-[11px] tracking-wide text-slate-500 uppercase">
        {label}
      </p>
      <div className="flex flex-wrap gap-1.5">
        {nodeIds.map((nodeId) => (
          <button
            key={nodeId}
            type="button"
            aria-pressed={selectedNodeId === nodeId}
            title={nodeId}
            onClick={() => onSelect(nodeId)}
            className={`rounded border px-2 py-1 text-left text-xs ${
              selectedNodeId === nodeId
                ? "border-diff-move-1/70 bg-diff-move-1/20 text-amber-50 ring-1 ring-diff-move-1/30"
                : "border-diff-move-1/20 bg-slate-950 text-slate-300 hover:border-diff-move-1/50 hover:text-amber-100"
            }`}
          >
            <span className="block max-w-64 truncate">
              {filenames.get(fileIdFromNodeId(nodeId)) ?? fileIdFromNodeId(nodeId)}
            </span>
            <span className="font-mono text-[10px] text-slate-500">
              {nodeId.split(":").slice(-1)[0]}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}

function fileIdFromNodeId(nodeId: string): string {
  return nodeId.split(":n", 1)[0];
}
