import type { ReturnTypeOfUseHistoryData } from "./historyInputTypes";

type HistoryInputProps = ReturnTypeOfUseHistoryData;

const FILTERS = [
  { value: "moves", label: "With moves" },
  { value: "all", label: "All pairs" },
  { value: "failed", label: "Failed" },
] as const;

export function HistoryInput(props: HistoryInputProps) {
  const {
    status,
    pairs,
    nextAfter,
    selection,
    selectedPair,
    isLoading,
    isLoadingMore,
    isLoadingPair,
    error,
    setSelection,
    selectPair,
    loadMore,
    refresh,
  } = props;

  return (
    <div className="space-y-4" aria-label="Repository history browser">
      <div className="flex flex-wrap items-start justify-between gap-3 rounded-2xl border border-white/10 bg-white/[0.025] p-4">
        <div>
          <p className="text-xs font-medium tracking-[0.18em] text-sky-300 uppercase">
            Read-only analysis
          </p>
          <h2 className="mt-1 text-xl font-semibold text-slate-100">
            {status?.analysis.name ?? "Repository history"}
          </h2>
          <p className="mt-1 text-sm text-slate-400">
            Browse durable srcMove results. Pair visualization arrives in the
            next phase.
          </p>
        </div>
        <button
          type="button"
          onClick={refresh}
          disabled={isLoading}
          className="rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-sm text-slate-200 transition hover:bg-white/[0.08] disabled:opacity-50"
        >
          Refresh
        </button>
      </div>

      {error ? (
        <div className="rounded-xl border border-red-300/20 bg-red-300/10 px-4 py-3 text-sm text-red-100">
          {error}
        </div>
      ) : null}

      {status ? <HistorySummary status={status} /> : null}

      <div className="flex flex-wrap gap-2" aria-label="History pair filters">
        {FILTERS.map((filter) => (
          <button
            key={filter.value}
            type="button"
            aria-pressed={selection === filter.value}
            onClick={() => setSelection(filter.value)}
            className={[
              "rounded-full border px-3 py-1.5 text-xs font-medium transition",
              selection === filter.value
                ? "border-sky-300/30 bg-sky-300/15 text-sky-100"
                : "border-white/10 bg-white/[0.03] text-slate-300 hover:bg-white/[0.07]",
            ].join(" ")}
          >
            {filter.label}
          </button>
        ))}
      </div>

      <div className="grid min-h-[430px] gap-4 xl:grid-cols-[minmax(0,1.45fr)_minmax(320px,0.75fr)]">
        <HistoryPairList
          pairs={pairs}
          selectedPairNumber={selectedPair?.number ?? null}
          isLoading={isLoading}
          isLoadingMore={isLoadingMore}
          hasMore={nextAfter !== null}
          onSelectPair={selectPair}
          onLoadMore={loadMore}
        />
        <HistoryPairDetails
          pair={selectedPair}
          isLoading={isLoadingPair}
        />
      </div>
    </div>
  );
}

function HistorySummary({ status }: { status: HistoryInputProps["status"] }) {
  if (!status) return null;
  const cards = [
    ["Analyzed pairs", status.coverage.durable_commit_pairs],
    ["Move detections", status.moves.detections],
    ["Compared", status.outcomes.compared_commit_pairs],
    ["Failed", status.outcomes.failed_commit_pairs],
  ] as const;

  return (
    <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
      {cards.map(([label, value]) => (
        <div
          key={label}
          className="rounded-2xl border border-white/10 bg-slate-900/55 px-4 py-3"
        >
          <div className="text-2xl font-semibold text-slate-100">{value}</div>
          <div className="text-xs text-slate-400">{label}</div>
        </div>
      ))}
    </div>
  );
}

function HistoryPairList({
  pairs,
  selectedPairNumber,
  isLoading,
  isLoadingMore,
  hasMore,
  onSelectPair,
  onLoadMore,
}: {
  pairs: HistoryInputProps["pairs"];
  selectedPairNumber: number | null;
  isLoading: boolean;
  isLoadingMore: boolean;
  hasMore: boolean;
  onSelectPair: HistoryInputProps["selectPair"];
  onLoadMore: HistoryInputProps["loadMore"];
}) {
  return (
    <section className="min-w-0 rounded-2xl border border-white/10 bg-slate-950/50 p-3">
      <div className="mb-2 grid grid-cols-[70px_minmax(150px,1fr)_120px_70px_65px_65px] gap-2 px-3 text-[11px] font-medium tracking-wide text-slate-500 uppercase">
        <span>Pair</span>
        <span>Commits</span>
        <span>Status</span>
        <span>Paths</span>
        <span>Moves</span>
        <span>Time</span>
      </div>
      <div className="max-h-[520px] space-y-1 overflow-auto" aria-label="History commit pairs">
        {isLoading ? (
          <p className="px-3 py-8 text-center text-sm text-slate-400">
            Loading repository history…
          </p>
        ) : null}
        {!isLoading && pairs.length === 0 ? (
          <p className="px-3 py-8 text-center text-sm text-slate-400">
            No commit pairs match this filter.
          </p>
        ) : null}
        {pairs.map((pair) => (
          <button
            key={pair.number}
            type="button"
            onClick={() => void onSelectPair(pair.number)}
            aria-pressed={selectedPairNumber === pair.number}
            className={[
              "grid w-full grid-cols-[70px_minmax(150px,1fr)_120px_70px_65px_65px] gap-2 rounded-xl px-3 py-2.5 text-left text-xs transition",
              selectedPairNumber === pair.number
                ? "bg-sky-300/15 text-sky-50"
                : "bg-white/[0.025] text-slate-300 hover:bg-white/[0.07]",
            ].join(" ")}
          >
            <span className="font-semibold">#{pair.number}</span>
            <span className="truncate font-mono text-[11px]">
              {shortCommit(pair.old_commit)} → {shortCommit(pair.new_commit)}
            </span>
            <span className="truncate">{displayStatus(pair.status)}</span>
            <span>
              {pair.analyzable_path_count}/{pair.changed_path_count}
            </span>
            <span>{pair.move_count}</span>
            <span>{pair.elapsed_seconds.toFixed(1)}s</span>
          </button>
        ))}
      </div>
      {hasMore ? (
        <button
          type="button"
          onClick={() => void onLoadMore()}
          disabled={isLoadingMore}
          className="mt-3 w-full rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-xs text-slate-200 hover:bg-white/[0.08] disabled:opacity-50"
        >
          {isLoadingMore ? "Loading…" : "Load more"}
        </button>
      ) : null}
    </section>
  );
}

function HistoryPairDetails({
  pair,
  isLoading,
}: {
  pair: HistoryInputProps["selectedPair"];
  isLoading: boolean;
}) {
  if (isLoading) {
    return <DetailShell>Loading pair evidence…</DetailShell>;
  }
  if (!pair) {
    return <DetailShell>Select a commit pair to inspect its evidence.</DetailShell>;
  }

  return (
    <section className="min-w-0 rounded-2xl border border-white/10 bg-slate-950/50 p-4" aria-label={`Commit pair ${pair.number} details`}>
      <p className="text-xs text-slate-500">Commit pair</p>
      <h3 className="text-xl font-semibold text-slate-100">#{pair.number}</h3>
      <p className="mt-2 break-all font-mono text-[11px] text-slate-400">
        {shortCommit(pair.old_commit, 12)} → {shortCommit(pair.new_commit, 12)}
      </p>
      <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
        <DetailStat label="Status" value={displayStatus(pair.status)} />
        <DetailStat label="Moves" value={String(pair.moves.length)} />
        <DetailStat label="Changed paths" value={String(pair.changed_path_count)} />
        <DetailStat label="Analyzable" value={String(pair.analyzable_path_count)} />
      </div>
      {pair.error ? (
        <p className="mt-4 rounded-xl border border-red-300/20 bg-red-300/10 p-3 text-xs text-red-100">
          {pair.error}
        </p>
      ) : null}
      <div className="mt-4 max-h-[300px] space-y-2 overflow-auto">
        {pair.moves.length === 0 ? (
          <p className="text-sm text-slate-400">No moves detected.</p>
        ) : null}
        {pair.moves.map((move, index) => (
          <article key={index} className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
            <p className="text-xs font-semibold text-amber-200">
              Move {index + 1} · {move.match_kind ?? "unknown"}
            </p>
            <MovePaths label="From" paths={move.from_xpaths ?? []} />
            <MovePaths label="To" paths={move.to_xpaths ?? []} />
          </article>
        ))}
      </div>
    </section>
  );
}

function DetailShell({ children }: { children: string }) {
  return (
    <section className="flex min-h-[220px] items-center justify-center rounded-2xl border border-dashed border-white/10 bg-slate-950/35 p-6 text-center text-sm text-slate-400">
      {children}
    </section>
  );
}

function DetailStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-white/[0.035] p-2.5">
      <div className="text-slate-500">{label}</div>
      <div className="mt-0.5 truncate text-slate-200">{value}</div>
    </div>
  );
}

function MovePaths({ label, paths }: { label: string; paths: string[] }) {
  return (
    <div className="mt-2">
      <span className="text-[10px] font-medium tracking-wide text-slate-500 uppercase">
        {label}
      </span>
      {paths.map((path) => (
        <code key={path} className="mt-1 block break-all text-[10px] leading-4 text-slate-300">
          {path}
        </code>
      ))}
    </div>
  );
}

function shortCommit(commit: string, length = 8): string {
  return commit.slice(0, length);
}

function displayStatus(status: string): string {
  return status.replace(/_/g, " ");
}
