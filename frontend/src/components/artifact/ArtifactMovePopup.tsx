import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { fetchArtifactMove } from "../../api";
import type { ArtifactMoveProjection } from "../../types";

type Position = { x: number; y: number };

type Props = {
  artifactId: string;
  moveId: string;
  position: Position;
  onClose: () => void;
};

const POPUP_WIDTH = 480;
const VIEWPORT_PADDING = 12;

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
  const [windowPosition, setWindowPosition] = useState(() =>
    initialPosition(position),
  );
  const [drag, setDrag] = useState<{
    pointerId: number;
    offsetX: number;
    offsetY: number;
  } | null>(null);

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

  useEffect(() => {
    if (!drag) return;
    const activeDrag = drag;

    function move(event: PointerEvent) {
      if (event.pointerId !== activeDrag.pointerId) return;
      setWindowPosition(
        clampPosition({
          left: event.clientX - activeDrag.offsetX,
          top: event.clientY - activeDrag.offsetY,
        }),
      );
    }

    function end(event: PointerEvent) {
      if (event.pointerId === activeDrag.pointerId) setDrag(null);
    }

    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", end);
    window.addEventListener("pointercancel", end);
    return () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", end);
      window.removeEventListener("pointercancel", end);
    };
  }, [drag]);

  const popup = (
    <section
      aria-label={`Move details ${moveId}`}
      className="border-diff-move-1/40 fixed z-50 max-h-[calc(100vh-24px)] w-[480px] max-w-[calc(100vw-24px)] overflow-auto rounded-2xl border bg-slate-950/95 text-slate-200 shadow-[0_20px_60px_rgba(0,0,0,0.55)] backdrop-blur-xl"
      style={windowPosition}
    >
      <header
        className={`border-diff-move-1/20 bg-diff-move-1/10 flex touch-none items-start gap-3 border-b px-4 py-3 ${drag ? "cursor-grabbing" : "cursor-grab"}`}
        onPointerDown={(event) => {
          setDrag({
            pointerId: event.pointerId,
            offsetX: event.clientX - windowPosition.left,
            offsetY: event.clientY - windowPosition.top,
          });
        }}
      >
        <div className="min-w-0 flex-1">
          <p className="text-[11px] tracking-[0.2em] text-amber-300 uppercase">
            Move details
          </p>
          <h2 className="mt-1 truncate font-mono text-sm text-slate-100">
            {moveId}
          </h2>
        </div>
        {projection?.move.match_kind ? (
          <span className="border-diff-move-1/40 bg-diff-move-1/15 rounded-full border px-2.5 py-1 font-mono text-xs text-amber-200">
            {projection.move.match_kind}
          </span>
        ) : null}
        <button
          type="button"
          aria-label={`Close move details ${moveId}`}
          onPointerDown={(event) => event.stopPropagation()}
          onClick={onClose}
          className="rounded border border-white/10 bg-white/5 px-2 py-1 text-xs text-slate-300 hover:bg-white/10"
        >
          Close
        </button>
      </header>

      {error ? <p className="p-4 text-sm text-rose-300">{error}</p> : null}
      {!projection && !error ? (
        <p className="p-4 text-sm text-slate-400">Loading srcMove result…</p>
      ) : null}
      {projection ? <MoveRecord projection={projection} /> : null}
    </section>
  );

  return typeof document === "undefined"
    ? popup
    : createPortal(popup, document.body);
}

function MoveRecord({ projection }: { projection: ArtifactMoveProjection }) {
  const move = projection.move;
  const hasProducerDetails =
    move.match_kind !== undefined ||
    move.confidence_milli !== undefined ||
    move.selection_utility !== undefined ||
    move.matched_units !== undefined ||
    move.selection_reason !== undefined;

  return (
    <div className="space-y-4 p-4">
      {hasProducerDetails ? (
        <dl className="grid grid-cols-2 gap-2 text-xs sm:grid-cols-3">
          <Value label="match_kind" value={move.match_kind} />
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

      <TextEvidence label="from_raw_texts" values={move.from_raw_texts} />
      <TextEvidence label="to_raw_texts" values={move.to_raw_texts} />

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

function TextEvidence({ label, values }: { label: string; values?: string[] }) {
  if (!values?.length) return null;
  return (
    <div>
      <p className="mb-1 text-[10px] tracking-wide text-slate-500 uppercase">
        {label}
      </p>
      <pre className="max-h-40 overflow-auto rounded-lg border border-white/10 bg-black/35 p-3 text-xs whitespace-pre-wrap text-slate-200">
        {values.join("\n\n---\n\n")}
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

function initialPosition(position: Position) {
  return clampPosition({ left: position.x + 16, top: position.y + 16 });
}

function clampPosition(position: { left: number; top: number }) {
  if (typeof window === "undefined") return position;
  return {
    left: Math.max(
      VIEWPORT_PADDING,
      Math.min(
        position.left,
        Math.max(
          VIEWPORT_PADDING,
          window.innerWidth - POPUP_WIDTH - VIEWPORT_PADDING,
        ),
      ),
    ),
    top: Math.max(
      VIEWPORT_PADDING,
      Math.min(
        position.top,
        Math.max(VIEWPORT_PADDING, window.innerHeight - 260),
      ),
    ),
  };
}

function errorMessage(reason: unknown) {
  return reason instanceof Error
    ? reason.message
    : "Unable to load move details.";
}
