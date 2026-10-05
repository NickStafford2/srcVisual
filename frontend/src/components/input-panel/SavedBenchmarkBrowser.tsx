import { useEffect, useState } from "react";
import {
  readBenchmark,
  visualizeSavedBenchmarkCase,
} from "../../bigmovebench/browserApi";
import type { ArtifactManifest, ComparisonContext } from "../../types";
import type {
  BenchmarkRun,
  BenchmarkRuns,
  BenchmarkCases,
  BenchmarkCaseDetail,
} from "../../bigmovebench/browserTypes";

const categoryLabel = (value: string | null) =>
  value === "known-false-positive"
    ? "Known false positive"
    : value?.startsWith("type")
      ? `Type ${value.slice(4)}`
      : value || "Unavailable";
const outcomeLabel = (value: string) =>
  (
    ({
      oracle_pass: "Expected result",
      wrong_classification: "Different classification",
      srcmove_miss: "Missed fragment",
      srcmove_false_positive: "Whole-fragment false positive",
      srcdiff_semantic_ineligible: "Rejected by srcDiff",
      srcmove_tool_failure: "srcMove error",
      upstream_failure: "Upstream error",
      oracle_failure: "Oracle error",
      not_executed: "Not executed",
    }) as Record<string, string>
  )[value] ?? value.replace(/_/g, " ");
const control =
  "rounded-lg border border-white/15 bg-slate-950 px-3 py-2 text-sm text-slate-200";
const button = `${control} hover:bg-white/10 disabled:opacity-40`;

export function SavedBenchmarkBrowser({
  acceptVisualization,
}: {
  acceptVisualization?: (
    artifact: ArtifactManifest,
    context?: ComparisonContext,
  ) => void;
}) {
  const [runs, setRuns] = useState<BenchmarkRuns | null>(null);
  const [runId, setRunId] = useState("");
  const [run, setRun] = useState<BenchmarkRun | null>(null);
  const [page, setPage] = useState<BenchmarkCases | null>(null);
  const [category, setCategory] = useState("");
  const [outcome, setOutcome] = useState("");
  const [basis, setBasis] = useState("original");
  const [query, setQuery] = useState("");
  const [offset, setOffset] = useState(0);
  const [selected, setSelected] = useState<{
    category: string;
    case_id: string;
  } | null>(null);
  const [detail, setDetail] = useState<BenchmarkCaseDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [refresh, setRefresh] = useState(0);
  const [opening, setOpening] = useState(false);
  const [openError, setOpenError] = useState<string | null>(null);

  async function openSource() {
    if (!detail || !acceptVisualization || opening) return;
    setOpening(true);
    setOpenError(null);
    try {
      const artifact = await visualizeSavedBenchmarkCase(
        runId,
        detail.case.category,
        detail.case.case_id,
      );
      acceptVisualization(artifact, {
        mode: "benchmark",
        label: `BigMoveBench · ${categoryLabel(detail.case.category)} · Case ${detail.case.ordinal} · ${outcomeLabel(detail.case.outcome)} · Run ${runId}`,
      });
    } catch (reason) {
      setOpenError(
        reason instanceof Error
          ? reason.message
          : "Unable to open Source view.",
      );
    } finally {
      setOpening(false);
    }
  }

  useEffect(() => {
    let current = true;
    setError(null);
    void readBenchmark<BenchmarkRuns>("")
      .then((value) => {
        if (!current) return;
        setRuns(value);
        setRunId((previous) =>
          value.items.some((item) => item.run_id === previous)
            ? previous
            : (value.default_run_id ?? ""),
        );
      })
      .catch((reason) => {
        if (current) setError(reason.message);
      });
    return () => {
      current = false;
    };
  }, [refresh]);

  useEffect(() => {
    if (!runId) return;
    let current = true;
    setRun(null);
    void readBenchmark<BenchmarkRun>(`/${encodeURIComponent(runId)}`)
      .then((value) => {
        if (current) setRun(value);
      })
      .catch((reason) => {
        if (current) setError(reason.message);
      });
    return () => {
      current = false;
    };
  }, [runId, refresh]);

  useEffect(() => {
    if (!runId) return;
    let current = true;
    setLoading(true);
    setError(null);
    setPage(null);
    const timer = setTimeout(
      () => {
        const parameters = new URLSearchParams({
          category,
          outcome,
          basis,
          query,
          offset: String(offset),
          limit: "50",
        });
        void readBenchmark<BenchmarkCases>(
          `/${encodeURIComponent(runId)}/cases?${parameters}`,
        )
          .then((value) => {
            if (current) setPage(value);
          })
          .catch((reason) => {
            if (current) setError(reason.message);
          })
          .finally(() => {
            if (current) setLoading(false);
          });
      },
      query ? 200 : 0,
    );
    return () => {
      current = false;
      clearTimeout(timer);
    };
  }, [runId, category, outcome, basis, query, offset, refresh]);

  useEffect(() => {
    setDetail(null);
    setDetailError(null);
    setOpenError(null);
    if (!selected || !runId) return;
    let current = true;
    void readBenchmark<BenchmarkCaseDetail>(
      `/${encodeURIComponent(runId)}/cases/${selected.category}/${encodeURIComponent(selected.case_id)}`,
    )
      .then((value) => {
        if (current) setDetail(value);
      })
      .catch((reason) => {
        if (current) setDetailError(reason.message);
      });
    return () => {
      current = false;
    };
  }, [runId, selected, refresh]);

  function change(setter: (value: string) => void, value: string) {
    setter(value);
    setOffset(0);
    setSelected(null);
  }

  return (
    <section
      aria-label="Saved BigMoveBench results"
      className="space-y-4 rounded-2xl border border-violet-300/20 bg-violet-400/[0.04] p-4"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold text-violet-100">
            BigMoveBench results
          </h2>
          <p className="mt-1 text-sm text-slate-400">
            Browse recorded tests and compare the expected fragments with
            detected moves.
          </p>
        </div>
        <button
          type="button"
          className={button}
          onClick={() => setRefresh((value) => value + 1)}
        >
          Refresh runs
        </button>
      </div>
      {error ? (
        <p role="alert" className="text-rose-300">
          {error}
        </p>
      ) : null}
      {!runs && !error ? <p role="status">Loading benchmark runs…</p> : null}
      {runs?.items.length === 0 ? (
        <p>
          No completed local benchmark runs are available. Configure the
          BigMoveBench results and cache mounts to browse them.
        </p>
      ) : null}
      {runs && runs.items.length > 0 ? (
        <>
          <div className="flex flex-wrap items-end gap-3">
            <label className="flex min-w-0 flex-1 flex-col gap-1 text-xs text-slate-400">
              Benchmark run
              <select
                className={`${control} w-full`}
                value={runId}
                onChange={(event) => {
                  change(setRunId, event.target.value);
                  setCategory("");
                  setOutcome("");
                }}
              >
                {runs.items.map((item) => (
                  <option key={item.run_id} value={item.run_id}>
                    {item.completed_at
                      ? new Date(item.completed_at).toLocaleString()
                      : item.run_id}{" "}
                    · {item.selected.toLocaleString()} cases ·{" "}
                    {item.status.replace(/_/g, " ")}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1 text-xs text-slate-400">
              Outcome basis
              <select
                className={control}
                value={basis}
                onChange={(event) => change(setBasis, event.target.value)}
              >
                <option value="original">Original labels</option>
                <option value="reviewed">Reviewed labels</option>
              </select>
            </label>
          </div>
          {run ? (
            <>
              <p className="text-sm text-slate-300">
                {run.selected.toLocaleString()} selected cases · recorded
                outcomes · click a category or count to filter
              </p>
              <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-5">
                {run.member_summaries.map((member) => {
                  const counts =
                    basis === "reviewed"
                      ? member.reviewed_counts
                      : member.counts;
                  return (
                    <div
                      key={member.pair_set}
                      className="rounded-xl border border-white/10 bg-slate-950/70 p-3"
                    >
                      <button
                        type="button"
                        aria-pressed={category === member.pair_set}
                        className="text-sm font-semibold text-violet-200"
                        onClick={() => {
                          change(setCategory, member.pair_set);
                          setOutcome("");
                        }}
                      >
                        {categoryLabel(member.pair_set)} · {counts.selected}
                      </button>
                      <div className="mt-2 flex flex-col gap-1 text-xs">
                        {Object.entries(counts)
                          .filter(
                            ([key, count]) =>
                              count > 0 &&
                              [
                                "oracle_pass",
                                "wrong_classification",
                                "srcmove_miss",
                                "srcmove_false_positive",
                                "srcdiff_semantic_ineligible",
                                "srcmove_tool_failure",
                                "upstream_failure",
                                "oracle_failure",
                              ].includes(key),
                          )
                          .map(([key, count]) => (
                            <button
                              type="button"
                              key={key}
                              className="flex justify-between gap-2 text-left text-slate-300 hover:text-white"
                              onClick={() => {
                                change(setCategory, member.pair_set);
                                setOutcome(key);
                              }}
                            >
                              <span>{outcomeLabel(key)}</span>
                              <span>{count.toLocaleString()}</span>
                            </button>
                          ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          ) : null}
          <div className="flex flex-wrap items-end gap-3">
            <label className="flex flex-col gap-1 text-xs text-slate-400">
              Category
              <select
                className={control}
                value={category}
                onChange={(event) => change(setCategory, event.target.value)}
              >
                <option value="">All categories</option>
                {(run?.member_summaries.map((item) => item.pair_set) ?? []).map(
                  (value) => (
                    <option key={value} value={value}>
                      {categoryLabel(value)}
                    </option>
                  ),
                )}
              </select>
            </label>
            <label className="flex flex-col gap-1 text-xs text-slate-400">
              Outcome
              <select
                className={control}
                value={outcome}
                onChange={(event) => change(setOutcome, event.target.value)}
              >
                <option value="">All outcomes</option>
                {(
                  page?.filters.outcomes ??
                  (run
                    ? [
                        ...new Set(
                          run.member_summaries.flatMap((item) =>
                            Object.keys(
                              basis === "reviewed"
                                ? item.reviewed_counts
                                : item.counts,
                            ).filter((key) =>
                              [
                                "oracle_pass",
                                "wrong_classification",
                                "srcmove_miss",
                                "srcmove_false_positive",
                                "srcdiff_semantic_ineligible",
                                "srcmove_tool_failure",
                                "upstream_failure",
                                "oracle_failure",
                              ].includes(key),
                            ),
                          ),
                        ),
                      ]
                    : [])
                ).map((value) => (
                  <option key={value} value={value}>
                    {outcomeLabel(value)}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-1 flex-col gap-1 text-xs text-slate-400">
              Search case ID or oracle reason
              <input
                type="search"
                maxLength={200}
                className={control}
                value={query}
                onChange={(event) => change(setQuery, event.target.value)}
              />
            </label>
          </div>
          {loading ? <p role="status">Loading cases…</p> : null}
          {page ? (
            <>
              <p className="text-xs text-slate-400">
                {page.matched.toLocaleString()} matching /{" "}
                {page.total.toLocaleString()} total cases
              </p>
              <div className="max-h-[480px] overflow-auto rounded-xl border border-white/10">
                <table className="w-full text-left text-xs">
                  <thead className="sticky top-0 bg-slate-900 text-slate-400">
                    <tr>
                      {[
                        "Case",
                        "Expected",
                        "Observed",
                        "Complete fragment",
                        "Outcome",
                        "Moves",
                        "Tokens / similarity",
                      ].map((title) => (
                        <th key={title} className="p-3">
                          {title}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {page.items.map((item) => (
                      <tr
                        key={`${item.category}:${item.case_id}`}
                        className={`border-t border-white/10 ${selected?.case_id === item.case_id && selected.category === item.category ? "bg-violet-300/10" : "hover:bg-white/5"}`}
                      >
                        <td className="p-3">
                          <button
                            type="button"
                            className="text-violet-200 underline underline-offset-4"
                            aria-label={`Inspect ${categoryLabel(item.category)} case ${item.ordinal}`}
                            onClick={() =>
                              setSelected({
                                category: item.category,
                                case_id: item.case_id,
                              })
                            }
                          >
                            Case {item.ordinal}
                          </button>
                        </td>
                        <td className="p-3">
                          {item.case_kind === "known_false_positive"
                            ? "Reject whole fragment"
                            : categoryLabel(
                                basis === "reviewed"
                                  ? item.reviewed_expected_match_kind
                                  : item.expected_match_kind,
                              )}
                          {item.label_correction_id ? " *" : ""}
                        </td>
                        <td className="p-3">
                          {categoryLabel(item.observed_match_kind)}
                        </td>
                        <td className="p-3">
                          {item.complete_fragment_detected === null
                            ? "—"
                            : item.complete_fragment_detected
                              ? "Detected"
                              : "Not detected"}
                        </td>
                        <td className="p-3">
                          {outcomeLabel(
                            basis === "reviewed"
                              ? item.reviewed_outcome
                              : item.outcome,
                          )}
                        </td>
                        <td className="p-3">{item.move_count ?? "—"}</td>
                        <td className="p-3">
                          {item.min_tokens ?? "—"}
                          {item.type3_both_similarity !== null
                            ? ` / ${item.type3_both_similarity.toFixed(3)}`
                            : ""}
                          {item.type3_strength_stratum
                            ? ` · ${item.type3_strength_stratum.replace(/_/g, " ")}`
                            : ""}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {page.items.length === 0 ? (
                  <p className="p-4">No cases match these filters.</p>
                ) : null}
              </div>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  className={button}
                  disabled={offset === 0}
                  onClick={() => setOffset(Math.max(0, offset - 50))}
                >
                  Previous page
                </button>
                <span className="text-xs text-slate-400">
                  Page {Math.floor(offset / 50) + 1}
                </span>
                <button
                  type="button"
                  className={button}
                  disabled={page.next_offset === null}
                  onClick={() => setOffset(page.next_offset!)}
                >
                  Next page
                </button>
              </div>
            </>
          ) : null}
          {detailError ? (
            <p role="alert" className="text-rose-300">
              {detailError}
            </p>
          ) : null}
          {selected && !detail && !detailError ? (
            <p role="status">Loading fragments and recorded evidence…</p>
          ) : null}
          {detail ? (
            <>
              <div className="flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  className={button}
                  disabled={
                    opening || !detail.results_available || !acceptVisualization
                  }
                  onClick={() => void openSource()}
                >
                  {opening ? "Opening Source view…" : "Open in Source view"}
                </button>
                <p className="text-xs text-slate-400">
                  {detail.results_available
                    ? "Uses the recorded move results. Return to Input to continue browsing."
                    : "Source view requires a completed recorded srcMove result."}
                </p>
                {openError ? (
                  <p role="alert" className="text-rose-300">
                    {openError}
                  </p>
                ) : null}
              </div>
              <CaseEvidence detail={detail} basis={basis} />
            </>
          ) : null}
        </>
      ) : null}
    </section>
  );
}

function CaseEvidence({
  detail,
  basis,
}: {
  detail: BenchmarkCaseDetail;
  basis: string;
}) {
  const failures =
    basis === "reviewed" ? detail.reviewed_failures : detail.failures;
  return (
    <section
      aria-label="Benchmark case evidence"
      className="space-y-4 border-t border-white/15 pt-4"
    >
      <div>
        <h3 className="text-lg font-semibold text-violet-100">
          {categoryLabel(detail.case.category)} · Case {detail.case.ordinal}
        </h3>
        <p className="mt-1 break-all text-xs text-slate-500">
          {detail.case.case_id}
        </p>
        <p className="mt-2 text-sm">
          Expected{" "}
          {detail.case.case_kind === "known_false_positive"
            ? "whole-fragment rejection"
            : categoryLabel(
                basis === "reviewed"
                  ? detail.case.reviewed_expected_match_kind
                  : detail.case.expected_match_kind,
              )}{" "}
          · observed {categoryLabel(detail.case.observed_match_kind)} ·{" "}
          {outcomeLabel(
            basis === "reviewed"
              ? detail.case.reviewed_outcome
              : detail.case.outcome,
          )}
        </p>
        {detail.label_correction ? (
          <p className="mt-2 text-sm text-amber-200">
            Reviewed label correction: {detail.label_correction.reason}
          </p>
        ) : null}
      </div>
      <div className="grid min-w-0 gap-3 lg:grid-cols-2">
        {(["original", "modified"] as const).map((side) => (
          <section
            key={side}
            aria-label={`${side === "original" ? "Original" : "Modified"} benchmark fragment`}
            className="min-w-0 rounded-xl border border-white/10 bg-slate-950"
          >
            <h4 className="border-b border-white/10 p-3 text-sm font-semibold">
              {side === "original" ? "Original fragment" : "Modified fragment"}
            </h4>
            {detail[side].text === null ? (
              <p className="p-3 text-amber-200">{detail[side].reason}</p>
            ) : (
              <pre className="max-h-[520px] overflow-auto p-3 font-mono text-xs leading-5 text-slate-200">
                {detail[side].text}
              </pre>
            )}
            <p className="break-all border-t border-white/10 p-3 text-[10px] text-slate-500">
              SHA-256 {detail[side].sha256}
            </p>
          </section>
        ))}
      </div>
      <div className="rounded-xl border border-white/10 p-3 text-sm">
        <h4 className="font-semibold">Recorded oracle evidence</h4>
        <p className="mt-2 text-xs text-slate-400">
          Expected generated ranges: source lines{" "}
          {detail.expected_ranges.from.join("–")} · destination lines{" "}
          {detail.expected_ranges.to.join("–")}. These ranges include the
          synthetic wrapper offset.
        </p>
        {failures.length ? (
          <ul className="mt-2 list-inside list-disc text-amber-200">
            {failures.map((reason, index) => (
              <li key={index}>{reason}</li>
            ))}
          </ul>
        ) : (
          <p className="mt-2 text-slate-400">
            {detail.results_available
              ? "No recorded oracle failures."
              : "No completed srcMove scoring result is available."}
          </p>
        )}
        <p className="mt-2 text-xs text-slate-400">
          srcDiff: {detail.case.semantic_reason ?? "not checked"} · diagnostic
          stage: {detail.case.diagnostic_stage ?? "not recorded"}
        </p>
      </div>
      <div>
        <h4 className="font-semibold">
          Reported moves · {detail.moves.length}
        </h4>
        <p className="mt-1 text-xs text-slate-400">
          Reported moves can cover smaller fragments even when the expected
          complete fragment was missed.
        </p>
        {detail.moves.map((move) => (
          <details
            key={move.move_id}
            className="mt-2 rounded-xl border border-white/10 bg-slate-950 p-3"
          >
            <summary className="cursor-pointer text-sm text-violet-200">
              {move.move_id} · {categoryLabel(move.match_kind ?? null)}
            </summary>
            <div className="mt-3 grid min-w-0 gap-3 lg:grid-cols-2">
              {(["from", "to"] as const).map((side) => (
                <div key={side} className="min-w-0">
                  <h5 className="text-xs font-semibold text-slate-400">
                    {side === "from" ? "Moved from" : "Moved to"}
                  </h5>
                  {(move[`${side}_raw_texts`] ?? []).map((text, index) => (
                    <pre
                      key={index}
                      className="mt-2 max-h-72 overflow-auto text-xs"
                    >
                      {text}
                    </pre>
                  ))}
                  <p className="mt-2 break-all text-[10px] text-slate-500">
                    {(move[`${side}_xpaths`] ?? []).join("\n")}
                  </p>
                </div>
              ))}
            </div>
            <pre className="mt-3 max-h-80 overflow-auto text-xs text-slate-400">
              {JSON.stringify(move, null, 2)}
            </pre>
          </details>
        ))}
        {detail.moves.length === 0 ? (
          <p className="mt-2 text-sm text-slate-400">
            {detail.results_available
              ? "No moves were reported."
              : "Move results are unavailable for this case."}
          </p>
        ) : null}
      </div>
      <details className="rounded-xl border border-white/10 p-3 text-xs">
        <summary className="cursor-pointer text-slate-300">
          Diagnostics and provenance
        </summary>
        <p className="mt-3">
          {detail.diagnostics
            ? "Recorded diagnostics are available below."
            : "Correspondence diagnostics were not recorded for this case."}
        </p>
        <pre className="mt-3 max-h-96 overflow-auto">
          {JSON.stringify(
            {
              attempt_id: detail.case.attempt_id,
              attempt_ordinal: detail.case.attempt_ordinal,
              tool_sha256: detail.tool_sha256,
              text_validation: detail.text_validation,
              semantic_details: detail.semantic_details,
              diagnostics: detail.diagnostics,
            },
            null,
            2,
          )}
        </pre>
      </details>
    </section>
  );
}
