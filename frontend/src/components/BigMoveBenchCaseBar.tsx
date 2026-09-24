import type { ReturnTypeOfUseBigMoveBenchReview } from "./input-panel/bigMoveBenchInputTypes";

export function BigMoveBenchCaseBar({
  manifest,
  activeOrdinal,
  isLoading,
  error,
  visualizeCase,
}: ReturnTypeOfUseBigMoveBenchReview) {
  if (!manifest || activeOrdinal === null) return null;
  const index = manifest.cases.findIndex(
    (item) => item.ordinal === activeOrdinal,
  );
  const current = manifest.cases[index];
  if (!current) return null;
  const previous = manifest.cases[index - 1];
  const next = manifest.cases[index + 1];

  return (
    <section className="mx-2 mb-2 flex flex-wrap items-center gap-3 rounded-2xl border border-violet-300/20 bg-violet-400/[0.06] px-4 py-3">
      <div className="min-w-0 flex-1">
        <p className="text-xs font-semibold tracking-wide text-violet-200 uppercase">
          BigMoveBench Type-3 · Case {current.ordinal} of {manifest.case_count}
        </p>
        <p className="truncate text-sm text-slate-200">
          {current.outcome} · {current.diagnosis.stage}:{" "}
          {current.diagnosis.reason}
          {" · "}
          {current.strength_stratum} ({current.type3_both_similarity})
        </p>
        {error ? <p className="text-xs text-rose-300">{error}</p> : null}
      </div>
      <button
        type="button"
        disabled={isLoading || !previous}
        onClick={() => previous && void visualizeCase(previous.ordinal)}
        className="rounded-xl border border-white/10 px-3 py-2 text-xs font-semibold text-slate-200 disabled:opacity-35"
      >
        Previous
      </button>
      <button
        type="button"
        disabled={isLoading || !next}
        onClick={() => next && void visualizeCase(next.ordinal)}
        className="rounded-xl border border-white/10 px-3 py-2 text-xs font-semibold text-slate-200 disabled:opacity-35"
      >
        Next
      </button>
    </section>
  );
}
