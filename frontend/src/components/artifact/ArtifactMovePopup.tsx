import { useEffect, useState } from "react";
import { ArtifactPopup } from "./ArtifactPopup";
import { fetchArtifactMove } from "../../api";
import type { ArtifactMoveProjection } from "../../types";

type Position = { x: number; y: number };

type Props = {
  artifactId: string;
  moveId: string;
  position: Position;
  onClose: () => void;
};

export function ArtifactMovePopup({
  artifactId,
  moveId,
  position,
  onClose,
}: Props) {
  const [projection, setProjection] = useState<ArtifactMoveProjection | null>(
    null,
  );
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    let current = true;
    setProjection(null);
    setError(null);
    void fetchArtifactMove(artifactId, moveId)
      .then((result) => {
        if (current) setProjection(result);
      })
      .catch((reason: unknown) => {
        if (current) setError(errorMessage(reason));
      });
    return () => {
      current = false;
    };
  }, [artifactId, moveId]);

  return (
    <ArtifactPopup
      title="Move details"
      badge={projection?.move.content_relationship}
      identity={moveId}
      position={position}
      color="#fbbf24"
      onClose={onClose}
    >
      {error ? <p className="p-4 text-sm text-rose-300">{error}</p> : null}
      {!projection && !error ? (
        <p className="p-4 text-sm text-slate-400">Loading srcMove result…</p>
      ) : null}
      {projection ? <MoveRecord projection={projection} /> : null}
    </ArtifactPopup>
  );
}

function MoveRecord({ projection }: { projection: ArtifactMoveProjection }) {
  const move = projection.move;
  const hasProducerDetails =
    move.content_relationship !== undefined ||
    move.confidence_milli !== undefined ||
    move.selection_utility !== undefined ||
    move.matched_units !== undefined ||
    move.selection_reason !== undefined;

  return (
    <div className="space-y-4 p-4">
      {hasProducerDetails ? (
        <dl className="grid grid-cols-2 gap-2 text-xs sm:grid-cols-3">
          <Value label="Content relationship (prediction)" value={move.content_relationship} />
          <Value label="confidence_milli" value={move.confidence_milli} />
          <Value label="matched_units" value={move.matched_units} />
          <Value label="selection_utility" value={move.selection_utility} />
          <Value label="selection_reason" value={move.selection_reason} />
          <Value
            label="results_schema_version"
            value={projection.results_schema_version ?? undefined}
          />
        </dl>
      ) : (
        <p className="rounded-lg border border-white/10 bg-white/[0.03] p-3 text-xs text-slate-400">
          This artifact contains XML move annotations, but no srcMove result
          fields were provided for this move.
        </p>
      )}

      {move.report_kind === "ordered_sequence" ? (
        <details className="rounded-lg border border-white/10 p-3 text-xs">
          <summary className="cursor-pointer text-slate-300">Retained member matches ({move.member_move_ids?.length})</summary>
          <p className="mt-2 text-slate-400">Each member pairs the source and destination evidence at the same position.</p>
          {move.member_move_ids?.map((member, index) => (
            <p key={member} className="mt-1 font-mono text-slate-300">{index + 1}. {member}</p>
          ))}
        </details>
      ) : null}
      <TextEvidence label="from_raw_texts" values={move.from_raw_texts} ordered={move.report_kind === "ordered_sequence"} />
      <TextEvidence label="to_raw_texts" values={move.to_raw_texts} ordered={move.report_kind === "ordered_sequence"} />

      <details className="rounded-lg border border-white/10 bg-black/20 p-3 text-xs">
        <summary className="cursor-pointer text-slate-300">
          XPath evidence
        </summary>
        <PathList label="from_xpaths" values={move.from_xpaths} />
        <PathList label="to_xpaths" values={move.to_xpaths} />
      </details>
    </div>
  );
}

function Value({
  label,
  value,
}: {
  label: string;
  value: string | number | undefined;
}) {
  return (
    <div className="rounded-lg border border-white/5 bg-black/25 p-2.5">
      <dt className="text-[10px] tracking-wide text-slate-500 uppercase">
        {label}
      </dt>
      <dd className="mt-1 font-mono break-words text-slate-200">
        {value ?? "not provided"}
      </dd>
    </div>
  );
}

function TextEvidence({ label, values, ordered = false }: { label: string; values?: string[]; ordered?: boolean }) {
  if (!values?.length) return null;
  return (
    <div>
      <p className="mb-1 text-[10px] tracking-wide text-slate-500 uppercase">
        {label}
      </p>
      <pre className="max-h-40 overflow-auto rounded-lg border border-white/10 bg-black/35 p-3 text-xs whitespace-pre-wrap text-slate-200">
        {values.join(ordered ? "\n" : "\n\n---\n\n")}
      </pre>
    </div>
  );
}

function PathList({ label, values }: { label: string; values?: string[] }) {
  if (!values?.length) return null;
  return (
    <div className="mt-3">
      <p className="text-[10px] tracking-wide text-slate-500 uppercase">
        {label}
      </p>
      {values.map((value) => (
        <code key={value} className="mt-1 block break-all text-slate-300">
          {value}
        </code>
      ))}
    </div>
  );
}

function errorMessage(reason: unknown) {
  return reason instanceof Error
    ? reason.message
    : "Unable to load move details.";
}
