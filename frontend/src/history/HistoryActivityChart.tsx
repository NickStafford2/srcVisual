import { useMemo, useState } from "react";
import type { HistoryPairListItem } from "./types";

interface Props {
  series: HistoryPairListItem[];
  isLoading: boolean;
  error: string | null;
  selectedPair: number | null;
  onSelect: (number: number) => void;
}

export function activityPoints(series: HistoryPairListItem[], window: number) {
  const ordered = [...series].sort((a, b) => b.distance_from_newest - a.distance_from_newest);
  return ordered.map((pair, index) => {
    const recent = ordered.slice(Math.max(0, index - window + 1), index + 1);
    // A full window of consecutive successful comparisons is required. Failed
    // and no-source outcomes are gaps, never observations of zero moves.
    const average = window > 0 && pair.status === "completed" && recent.length === window && recent.every((item, offset) => item.status === "completed" && (offset === 0 || recent[offset - 1].distance_from_newest - item.distance_from_newest === 1))
      ? recent.reduce((total, item) => total + item.move_count, 0) / window
      : null;
    return { pair, average };
  });
}

export function HistoryActivityChart({ series, isLoading, error, selectedPair, onSelect }: Props) {
  const [window, setWindow] = useState(10);
  const [logarithmic, setLogarithmic] = useState(false);
  const points = useMemo(() => activityPoints(series, window), [series, window]);
  const width = 960, height = 260, left = 58, right = 24, top = 20, bottom = 42;
  const oldest = points[0]?.pair.distance_from_newest ?? 0;
  const newest = points[points.length - 1]?.pair.distance_from_newest ?? 0;
  const maximum = points.reduce((maximum, point) => point.pair.status === "completed" ? Math.max(maximum, point.pair.move_count) : maximum, 1);
  const x = (distance: number) => oldest === newest ? (left + width - right) / 2 : left + (oldest - distance) / (oldest - newest) * (width - left - right);
  const transform = (value: number) => logarithmic ? Math.log10(1 + value) : value;
  const y = (value: number) => height - bottom - transform(value) / transform(maximum) * (height - top - bottom);
  // Invert equally spaced scale positions to label the original move counts.
  const ticks = (logarithmic ? [0, 0.25, 0.5, 0.75, 1] : [0, 0.5, 1]).map(fraction => {
    const value = logarithmic ? Math.pow(10, fraction * transform(maximum)) - 1 : fraction * maximum;
    return { value, label: Number(value.toFixed(1)) };
  });
  function path(average: boolean) {
    let connected = false;
    return points.map((point, index) => {
      const value = average ? point.average : point.pair.status === "completed" ? point.pair.move_count : null;
      if (value === null) { connected = false; return ""; }
      const adjacent = index > 0 && points[index - 1].pair.distance_from_newest - point.pair.distance_from_newest === 1;
      const command = connected && adjacent ? "L" : "M";
      connected = true;
      return `${command}${x(point.pair.distance_from_newest)},${y(value)}`;
    }).join(" ");
  }
  const failed = series.filter(pair => pair.status.endsWith("_failed")).length;
  const skipped = series.filter(pair => pair.status === "no_analyzable_change").length;
  const active = series.find(pair => pair.number === selectedPair);

  return (
    <section aria-label="Historical move activity" className="rounded-2xl border border-white/10 bg-slate-950/50 p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-slate-100">Historical move activity</h3>
          <p className="mt-1 text-xs text-slate-400">Detected moves per commit comparison · oldest → newest</p>
        </div>
        <div className="flex flex-wrap items-center gap-4">
          <label className="flex items-center gap-2 text-xs text-slate-300">
            <input type="checkbox" checked={logarithmic} onChange={event => setLogarithmic(event.target.checked)} className="accent-sky-400" />
            Logarithmic Y axis
          </label>
        <label className="text-xs text-slate-300">Rolling average
          <select aria-label="Rolling average" value={window} onChange={event => setWindow(Number(event.target.value))} className="ml-2 rounded-lg border border-white/15 bg-slate-950 px-2 py-1.5">
            <option value={0}>Off</option>
            <option value={5}>5 comparisons</option>
            <option value={10}>10 comparisons</option>
            <option value={25}>25 comparisons</option>
          </select>
        </label>
        </div>
      </div>
      {isLoading ? <p role="status" className="py-8 text-sm text-slate-400">Loading all saved comparisons…</p> : error ? <p role="alert" className="py-4 text-sm text-red-200">Move activity unavailable: {error}</p> : points.length === 0 ? <p className="py-8 text-sm text-slate-400">No saved comparisons to plot yet.</p> : <>
        <div className="mt-3 overflow-x-auto">
          <svg viewBox={`0 0 ${width} ${height}`} className="min-w-[640px] w-full" aria-label="Detected moves across analyzed commit pairs">
            <text x={left} y={12} fill="#94a3b8" fontSize={11}>{logarithmic ? "Moves · log scale" : "Moves"}</text>
            {ticks.map(({ value, label }) => <g key={value}>
              <line x1={left} x2={width - right} y1={y(value)} y2={y(value)} stroke="#334155" strokeDasharray="3 5" />
              <text x={left - 10} y={y(value) + 4} textAnchor="end" fill="#94a3b8" fontSize={11}>{label}</text>
            </g>)}
            <path aria-label="Raw move counts" d={path(false)} fill="none" stroke="#38bdf8" strokeWidth={1.5} />
            {window > 0 ? <path aria-label="Rolling mean" d={path(true)} fill="none" stroke="#fbbf24" strokeWidth={2.5} /> : null}
            {points.map(({ pair }) => {
              const completed = pair.status === "completed";
              const label = `Pair ${pair.number}: ${completed ? `${pair.move_count} detected moves` : pair.status.replace(/_/g, " ")}`;
              const color = completed ? "#38bdf8" : pair.status === "no_analyzable_change" ? "#94a3b8" : "#f87171";
              return <g key={pair.number}>
                <circle cx={x(pair.distance_from_newest)} cy={completed ? y(pair.move_count) : height - bottom + 12} r={selectedPair === pair.number ? 5 : 2.5} fill={color} stroke={selectedPair === pair.number ? "#fff" : "none"} />
                <circle role="button" aria-label={label} tabIndex={0} cx={x(pair.distance_from_newest)} cy={completed ? y(pair.move_count) : height - bottom + 12} r={7} fill="transparent" className="cursor-pointer focus:stroke-white" onClick={() => onSelect(pair.number)} onKeyDown={event => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); onSelect(pair.number); } }}>
                  <title>{label} · {pair.old_commit.slice(0, 8)} → {pair.new_commit.slice(0, 8)}</title>
                </circle>
              </g>;
            })}
            <text x={left} y={height - 9} fill="#94a3b8" fontSize={11}>#{points[0].pair.number} (oldest)</text>
            {points.length > 1 ? <text x={width - right} y={height - 9} textAnchor="end" fill="#94a3b8" fontSize={11}>#{points[points.length - 1]!.pair.number} (newest)</text> : null}
          </svg>
        </div>
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-400">
          <span className="text-sky-300">● Detected moves</span>
          {window > 0 ? <span className="text-amber-300">━ {window}-comparison mean</span> : null}
          <span>● No analyzable change: {skipped}</span>
          <span className="text-red-300">● Failed: {failed}</span>
          <span>{series.length} saved comparisons</span>
        </div>
        {logarithmic ? <p className="mt-2 text-xs text-slate-400">Log scale uses log10(1 + moves) to keep zero visible. Axis labels and tooltips show original move counts; the rolling mean is calculated before scaling.</p> : null}
        <p className="mt-2 text-xs text-slate-400">Click a point to inspect its pair. Failures and no-source comparisons break both lines; the mean requires a full window of consecutive successful comparisons. List filters do not affect this graph.</p>
        {active ? <p className="mt-2 text-xs text-sky-200">Selected pair #{active.number} · {active.status === "completed" ? `${active.move_count} detected moves` : active.status.replace(/_/g, " ")}</p> : null}
      </>}
      <p className="mt-2 text-xs text-slate-500">Exploratory activity view, refreshed after history extensions complete. Peaks show detector activity, not validated clustering. Save a thesis snapshot to freeze the underlying evidence.</p>
    </section>
  );
}
