import { useMemo, useState } from "react";
import type { ReturnTypeOfUseBigMoveBenchReview } from "./bigMoveBenchInputTypes";

type OutcomeFilter = "all" | "passed" | "review";

export function BigMoveBenchInput({
  selectedBundle,
  manifest,
  activeOrdinal,
  isLoading,
  error,
  setSelectedBundle,
  importBundle,
  visualizeCase,
}: ReturnTypeOfUseBigMoveBenchReview) {
  const [filter, setFilter] = useState<OutcomeFilter>("review");
  const cases = useMemo(
    () =>
      (manifest?.cases ?? []).filter((item) => {
        if (filter === "all") return true;
        const passed = item.outcome === "oracle_pass";
        return filter === "passed" ? passed : !passed;
      }),
    [filter, manifest],
  );

  return (
    <section className="space-y-3 rounded-2xl border border-violet-300/20 bg-violet-400/[0.04] p-4">
      <div>
        <h2 className="text-sm font-semibold text-violet-100">
          BigMoveBench Type-3 review
        </h2>
        <p className="mt-1 text-xs leading-5 text-slate-400">
          Import the generated review ZIP. Cases retain expected fragments,
          srcDiff XML, annotated srcMove XML, results, and selection
          diagnostics.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <input
          aria-label="BigMoveBench review ZIP"
          type="file"
          accept=".zip,application/zip"
          disabled={isLoading}
          onChange={(event) =>
            setSelectedBundle(event.target.files?.item(0) ?? null)
          }
          className="min-w-0 flex-1 text-xs text-slate-300 file:mr-3 file:rounded-xl file:border-0 file:bg-violet-300/15 file:px-3 file:py-2 file:text-violet-100"
        />
        <button
          type="button"
          disabled={isLoading || !selectedBundle}
          onClick={() => void importBundle()}
          className="rounded-xl bg-violet-300/15 px-4 py-2 text-sm font-semibold text-violet-100 disabled:opacity-50"
        >
          {isLoading ? "Working…" : "Import review"}
        </button>
      </div>

      {error ? <p className="text-sm text-rose-300">{error}</p> : null}

      {manifest ? (
        <>
          <div className="flex items-center justify-between gap-3 text-xs text-slate-300">
            <span>{manifest.case_count} cases</span>
            <select
              aria-label="Review case filter"
              value={filter}
              onChange={(event) =>
                setFilter(event.target.value as OutcomeFilter)
              }
              className="rounded-lg border border-white/10 bg-slate-950 px-2 py-1"
            >
              <option value="review">Needs review</option>
              <option value="passed">Passed</option>
              <option value="all">All cases</option>
            </select>
          </div>
          <div className="max-h-[420px] space-y-2 overflow-y-auto pr-1">
            {cases.map((item) => (
              <button
                key={item.case_id}
                type="button"
                disabled={isLoading}
                onClick={() => void visualizeCase(item.ordinal)}
                className={`flex w-full items-center gap-3 rounded-xl border px-3 py-2 text-left ${
                  activeOrdinal === item.ordinal
                    ? "border-violet-300/50 bg-violet-300/10"
                    : "border-white/10 bg-slate-950/60 hover:bg-white/[0.05]"
                }`}
              >
                <span className="w-9 text-xs font-semibold text-slate-400">
                  {item.ordinal}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm text-slate-100">
                    {item.diagnosis.stage}: {item.diagnosis.reason}
                  </span>
                  <span className="block text-xs text-slate-400">
                    {item.strength_stratum} · similarity{" "}
                    {item.type3_both_similarity}
                  </span>
                </span>
                <span
                  className={`rounded-full px-2 py-1 text-[11px] font-semibold ${
                    item.outcome === "oracle_pass"
                      ? "bg-emerald-300/10 text-emerald-200"
                      : "bg-amber-300/10 text-amber-200"
                  }`}
                >
                  {item.outcome === "oracle_pass" ? "pass" : "review"}
                </span>
              </button>
            ))}
          </div>
        </>
      ) : null}
    </section>
  );
}
