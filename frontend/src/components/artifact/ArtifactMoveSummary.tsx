import { useEffect, useState } from "react";
import { moveLayer, type MoveLayer } from "./artifactMoveLayers";
import type { ArtifactFileSummary, ArtifactMoveSummary } from "../../types";

type Props = {
  files: ArtifactFileSummary[];
  moves: ArtifactMoveSummary[];
  inspectedMoveId: string | null;
  selectedNodeId: string | null;
  onInspectMove: (moveId: string, position: { x: number; y: number }) => void;
  onSelectEndpoint: (nodeId: string) => void;
};

export function ArtifactMoveSummary({
  files,
  moves: allMoves,
  inspectedMoveId,
  selectedNodeId,
  onInspectMove,
  onSelectEndpoint,
}: Props) {
  const [layer, setLayer] = useState<MoveLayer>(() =>
    allMoves.some((move) => moveLayer(move) === "srcmove")
      ? "srcmove"
      : "srcdiff",
  );
  useEffect(() => {
    setLayer(
      allMoves.some((move) => moveLayer(move) === "srcmove")
        ? "srcmove"
        : "srcdiff",
    );
  }, [allMoves]);
  const moves = allMoves.filter((move) => moveLayer(move) === layer);
  const filenames = new Map(files.map((file) => [file.file_id, file.filename]));

  return (
    <section className="rounded-xl border border-white/10 bg-slate-950/65 p-4">
      <header className="border-b border-white/10 pb-3">
        <div
          role="group"
          aria-label="Move summary origin"
          className="mb-3 flex gap-2"
        >
          {(["srcmove", "srcdiff"] as const).map((origin) => (
            <button
              key={origin}
              type="button"
              aria-pressed={layer === origin}
              onClick={() => setLayer(origin)}
              className={`rounded border px-3 py-1.5 text-xs ${origin === "srcdiff" ? "border-violet-300/40 text-violet-200 aria-pressed:bg-violet-400/20" : "border-diff-move-1/40 text-diff-move-1 aria-pressed:bg-diff-move-1/20"}`}
            >
              {origin === "srcmove" ? "srcMove results" : "srcDiff annotations"}{" "}
              ({allMoves.filter((move) => moveLayer(move) === origin).length})
            </button>
          ))}
        </div>
        <p className="text-sm text-slate-300">
          {moves.length}{" "}
          {layer === "srcmove" ? "srcMove result" : "srcDiff annotation"}
          {moves.length === 1 ? "" : "s"}
        </p>
        <p className="mt-1 text-xs text-slate-500">
          {layer === "srcmove"
            ? "Inspect a result or open either endpoint in Source. Content relationship badges are predictions, not evidence of continuity, relocation, or computational equivalence."
            : "Inspect inherited srcDiff move annotations or open either endpoint in Source. These annotations are separate from srcMove results."}
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
                inspectedMoveId === move.move_id
                  ? layer === "srcdiff"
                    ? "border-violet-300/60 bg-violet-400/10"
                    : "border-diff-move-1/60 bg-diff-move-1/10"
                  : "border-white/10 bg-black/20"
              }`}
            >
              <button
                type="button"
                aria-pressed={inspectedMoveId === move.move_id}
                onClick={(event) =>
                  onInspectMove(move.move_id, {
                    x: event.clientX,
                    y: event.clientY,
                  })
                }
                className="flex w-full items-center justify-between gap-3 text-left"
              >
                <span
                  className={`${layer === "srcmove" ? "text-diff-move-1" : "text-violet-200"} font-mono`}
                >
                  {move.move_id}
                </span>{" "}
                <span className="text-xs text-slate-400">
                  {layer === "srcmove"
                    ? (move.content_relationship ?? "unclassified")
                    : "srcDiff annotation"}
                </span>
              </button>

              <EndpointList
                layer={layer}
                label="From"
                nodeIds={move.from_node_ids}
                filenames={filenames}
                selectedNodeId={selectedNodeId}
                onSelect={onSelectEndpoint}
              />
              <EndpointList
                layer={layer}
                label="To"
                nodeIds={move.to_node_ids}
                filenames={filenames}
                selectedNodeId={selectedNodeId}
                onSelect={onSelectEndpoint}
              />
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

function EndpointList({
  layer,
  label,
  nodeIds,
  filenames,
  selectedNodeId,
  onSelect,
}: {
  layer: MoveLayer;
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
                ? layer === "srcdiff"
                  ? "border-violet-300/70 bg-violet-400/20 text-violet-100 ring-1"
                  : "border-diff-move-1/70 bg-diff-move-1/20 ring-diff-move-1/30 text-amber-50 ring-1"
                : layer === "srcdiff"
                  ? "border-violet-300/20 bg-slate-950 text-slate-300 hover:border-violet-300/50"
                  : "border-diff-move-1/20 hover:border-diff-move-1/50 bg-slate-950 text-slate-300 hover:text-amber-100"
            }`}
          >
            <span className="block max-w-64 truncate">
              {filenames.get(fileIdFromNodeId(nodeId)) ??
                fileIdFromNodeId(nodeId)}
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
