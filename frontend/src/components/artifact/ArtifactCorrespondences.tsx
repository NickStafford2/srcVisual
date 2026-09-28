import { useEffect, useState } from "react";

type Pair = {
  id: number;
  kind: string;
  classification: string;
  outcome: string;
  reason: string;
  cardinality: string;
  before_file: string;
  after_file: string;
};
type Page = {
  schema_version: 1;
  artifact_id: string;
  available: boolean;
  items: Pair[];
  total: number;
  matched: number;
  next_offset: number | null;
  filters: { kinds: string[]; classifications: string[]; outcomes: string[] };
};
type Endpoint = {
  candidate_id: number;
  filename: string;
  xpath: string;
  construct: string;
  raw_text: string;
  text_length: number;
  text_truncated: boolean;
};
type Detail = {
  schema_version: 1;
  artifact_id: string;
  id: number;
  before: Endpoint;
  after: Endpoint;
  evidence: Record<string, unknown>;
};

async function getProjection<T>(url: string): Promise<T> {
  const response = await fetch(url);
  const payload = await response.json();
  if (!response.ok)
    throw new Error(
      payload.error ?? "Unable to load correspondence diagnostics.",
    );
  if (payload.schema_version !== 1)
    throw new Error("Unsupported correspondence projection version.");
  return payload as T;
}
const label = (value: string) => value.replace(/_/g, " ");
const outcomeLabel = (value: string) =>
  value === "move"
    ? "Selected move"
    : value === "not_move"
      ? "Not selected as a move"
      : label(value);
const evidenceLabel = (key: string) =>
  (
    ({
      shadow_change: "Location classification",
      current_result: "Move selection outcome",
      classification_reason: "Location classification reason",
      carried_by_parent: "Carried by enclosing correspondence",
    }) as Record<string, string>
  )[key] ?? label(key);

export function ArtifactCorrespondences({
  artifactId,
  active,
}: {
  artifactId: string;
  active: boolean;
}) {
  const [query, setQuery] = useState("");
  const [kind, setKind] = useState("");
  const [classification, setClassification] = useState("");
  const [outcome, setOutcome] = useState("");
  const [offset, setOffset] = useState(0);
  const [page, setPage] = useState<Page | null>(null);
  const [selected, setSelected] = useState<number | null>(null);
  const [detail, setDetail] = useState<Detail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  useEffect(() => {
    if (!active) return;
    let current = true;
    setLoading(true);
    setError(null);
    setSelected(null);
    setDetail(null);
    const timer = setTimeout(() => {
      const params = new URLSearchParams({
        q: query,
        kind,
        classification,
        outcome,
        offset: String(offset),
        limit: "50",
      });
      void getProjection<Page>(
        `/api/artifacts/${artifactId}/correspondences?${params}`,
      )
        .then((value) => {
          if (current) setPage(value);
        })
        .catch((reason) => {
          if (current) {
            setPage(null);
            setError(String(reason.message ?? reason));
          }
        })
        .finally(() => {
          if (current) setLoading(false);
        });
    }, 200);
    return () => {
      current = false;
      clearTimeout(timer);
    };
  }, [active, artifactId, query, kind, classification, outcome, offset]);
  useEffect(() => {
    if (!active || selected === null) return;
    let current = true;
    setDetail(null);
    setDetailError(null);
    void getProjection<Detail>(
      `/api/artifacts/${artifactId}/correspondences/${selected}`,
    )
      .then((value) => {
        if (current) setDetail(value);
      })
      .catch((reason) => {
        if (current) setDetailError(String(reason.message ?? reason));
      });
    return () => {
      current = false;
    };
  }, [active, artifactId, selected]);
  const change = (setter: (value: string) => void, value: string) => {
    setter(value);
    setOffset(0);
  };
  return (
    <section
      aria-label="Correspondence inspector"
      className="space-y-4 rounded-xl border border-white/10 bg-slate-950 p-4 text-sm text-slate-300"
    >
      <div>
        <h2 className="font-semibold text-slate-100">
          Correspondences · diagnostic evidence
        </h2>
        <p className="mt-1 text-xs text-slate-400">
          Inspect recorded relationships, including pairs not selected as moves.
          This is not an exhaustive trace of every candidate considered. Type-3
          classifications are observations; they do not control move selection.
        </p>
      </div>
      {error ? (
        <p role="alert" className="text-rose-300">
          {error}
        </p>
      ) : null}
      {page && !page.available ? (
        <p>
          No correspondence diagnostics were recorded for this artifact. In
          Input, enable “Collect correspondence diagnostics” and submit srcDiff
          XML without existing srcMove annotations. History and benchmark
          diagnostic runs are not included in this first version.
        </p>
      ) : null}
      {page?.available ? (
        <>
          <div className="flex flex-wrap items-end gap-3">
            <label className="flex flex-col gap-1 text-xs">
              Search files, constructs or reasons
              <input
                className="rounded border border-white/20 bg-slate-900 p-2"
                value={query}
                maxLength={200}
                onChange={(e) => change(setQuery, e.target.value)}
              />
            </label>
            {(
              [
                ["Match type", kind, setKind, page.filters.kinds],
                [
                  "Classification",
                  classification,
                  setClassification,
                  page.filters.classifications,
                ],
                [
                  "Selection outcome",
                  outcome,
                  setOutcome,
                  page.filters.outcomes,
                ],
              ] as const
            ).map(([title, value, setter, options]) => (
              <label key={title} className="flex flex-col gap-1 text-xs">
                {title}
                <select
                  className="rounded border border-white/20 bg-slate-900 p-2"
                  value={value}
                  onChange={(e) => change(setter, e.target.value)}
                >
                  <option value="">All</option>
                  {options.map((option) => (
                    <option key={option} value={option}>
                      {title === "Selection outcome"
                        ? outcomeLabel(option)
                        : label(option)}
                    </option>
                  ))}
                </select>
              </label>
            ))}
          </div>
          <p className="text-xs">
            {page.matched} matching / {page.total} recorded correspondences
          </p>
          {!loading ? (
            <div className="max-h-72 overflow-auto rounded border border-white/10">
              {page.items.length === 0 ? (
                <p className="p-3">No correspondences match these filters.</p>
              ) : (
                page.items.map((pair) => (
                  <button
                    key={pair.id}
                    type="button"
                    aria-pressed={selected === pair.id}
                    onClick={() => setSelected(pair.id)}
                    className="block w-full border-b border-white/10 p-3 text-left hover:bg-white/5 aria-pressed:bg-sky-500/15"
                  >
                    <span className="flex flex-wrap gap-x-3 gap-y-1">
                      <strong>Pair {pair.id + 1}</strong>
                      <span className="text-sky-300">
                        {pair.kind.toUpperCase()}
                      </span>
                      <span>{label(pair.classification)}</span>
                      <span
                        className={
                          pair.outcome === "move"
                            ? "text-amber-300"
                            : "text-slate-400"
                        }
                      >
                        {outcomeLabel(pair.outcome)}
                      </span>
                    </span>
                    <span className="mt-1 block break-all text-xs">
                      {pair.before_file} → {pair.after_file}
                    </span>
                    <span className="mt-1 block text-xs text-slate-500">
                      {label(pair.reason)} · {label(pair.cardinality)}
                    </span>
                  </button>
                ))
              )}
            </div>
          ) : null}
          <div className="flex items-center gap-3 text-xs">
            <button
              type="button"
              disabled={loading || offset === 0}
              onClick={() => setOffset(Math.max(0, offset - 50))}
              className="rounded border border-white/15 px-3 py-1 disabled:opacity-40"
            >
              Previous page
            </button>
            <span>Page {Math.floor(offset / 50) + 1}</span>
            <button
              type="button"
              disabled={loading || page.next_offset === null}
              onClick={() => setOffset(page.next_offset!)}
              className="rounded border border-white/15 px-3 py-1 disabled:opacity-40"
            >
              Next page
            </button>
          </div>
          {selected === null && !loading ? (
            <p className="text-xs text-slate-400">
              Choose a pair to inspect its original candidate snippets and
              recorded reasoning.
            </p>
          ) : null}
        </>
      ) : null}
      {loading ? <p role="status">Loading correspondences…</p> : null}
      {detailError ? (
        <p role="alert" className="text-rose-300">
          {detailError}
        </p>
      ) : null}
      {selected !== null && !detail && !detailError ? (
        <p role="status">Loading pair…</p>
      ) : null}
      {detail ? (
        <div className="space-y-3">
          <h3 className="font-semibold text-slate-100">
            Pair {detail.id + 1} · candidate snippets
          </h3>
          <div className="grid gap-3 lg:grid-cols-2">
            {(
              [
                ["Before", detail.before],
                ["After", detail.after],
              ] as const
            ).map(([side, endpoint]) => (
              <section
                key={side}
                aria-label={`${side} candidate`}
                className="min-w-0 rounded border border-white/15 bg-black"
              >
                <div className="border-b border-white/10 p-3 text-xs">
                  <strong className="text-sky-200">
                    {side} · Candidate {endpoint.candidate_id}
                  </strong>
                  <p className="mt-1 break-all">
                    {endpoint.filename} · {endpoint.construct}
                  </p>
                  <p className="mt-1 break-all text-slate-500">
                    {endpoint.xpath}
                  </p>
                </div>
                <pre className="max-h-96 overflow-auto p-3 text-xs text-slate-200">
                  {endpoint.raw_text || "(Empty candidate text)"}
                </pre>
                {endpoint.text_truncated ? (
                  <p className="p-3 text-xs text-amber-300">
                    Showing first 20,000 of {endpoint.text_length} characters.
                  </p>
                ) : null}
              </section>
            ))}
          </div>
          <h3 className="font-semibold text-slate-100">Recorded reasoning</h3>
          <p className="text-xs text-slate-400">
            The location reason explains the classification; it does not
            necessarily explain why a pair was omitted from the final moves.
          </p>
          <dl className="grid gap-2 text-xs sm:grid-cols-2">
            {Object.entries(detail.evidence)
              .filter(([key]) => !key.endsWith("_context"))
              .map(([key, value]) => (
                <div key={key} className="rounded bg-white/5 p-2">
                  <dt className="text-slate-500">{evidenceLabel(key)}</dt>
                  <dd className="mt-1 break-words">
                    {key === "current_result"
                      ? outcomeLabel(String(value))
                      : value === null
                        ? "Not applicable"
                        : typeof value === "boolean"
                          ? value
                            ? "Yes"
                            : "No"
                          : label(String(value))}
                  </dd>
                </div>
              ))}
          </dl>
          <details className="text-xs">
            <summary className="cursor-pointer text-sky-300">
              Full recorded context (JSON)
            </summary>
            <pre className="mt-2 max-h-96 overflow-auto whitespace-pre-wrap break-all">
              {JSON.stringify(detail.evidence, null, 2)}
            </pre>
          </details>
        </div>
      ) : null}
    </section>
  );
}
