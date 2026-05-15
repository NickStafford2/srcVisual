import { useEffect, useRef } from "react";
import type { ProgressLogEntry } from "../../srcdiff/useSrcDiffData";

type ProgressLogProps = {
  entries: ProgressLogEntry[];
};

export function ProgressLog({ entries }: ProgressLogProps) {
  const progressLogRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!progressLogRef.current) {
      return;
    }

    progressLogRef.current.scrollTop = progressLogRef.current.scrollHeight;
  }, [entries]);

  return (
    <section className="rounded-xl border border-emerald-400/20 bg-slate-950/90 shadow-inner shadow-black/30">
      <header className="flex items-center justify-between border-b border-emerald-400/15 px-3 py-2">
        <h3 className="font-mono text-xs font-semibold tracking-[0.28em] text-emerald-300 uppercase">
          Progress Log
        </h3>

        <span className="font-mono text-[11px] text-slate-500">
          {entries.length} line{entries.length === 1 ? "" : "s"}
        </span>
      </header>

      <div
        ref={progressLogRef}
        aria-label="Visualization progress log"
        className="max-h-64 overflow-y-auto px-3 py-3 font-mono text-xs leading-6 text-emerald-100"
      >
        {entries.length > 0 ? (
          entries.map((entry, index) => (
            <div
              key={`${index}:${entry.message}:${entry.elapsedMs}`}
              className="flex gap-3 border-l border-emerald-400/15 pl-3 break-words whitespace-pre-wrap"
            >
              <span className="text-emerald-500 select-none">
                {String(index + 1).padStart(2, "0")}
              </span>

              <span className="min-w-0 flex-1">{entry.message}</span>

              <span className="shrink-0 text-emerald-500/80">
                +{formatElapsedTime(entry.deltaMs)} [
                {formatElapsedTime(entry.elapsedMs)}]
              </span>
            </div>
          ))
        ) : (
          <div className="border-l border-emerald-400/15 pl-3 text-slate-500">
            No progress messages yet.
          </div>
        )}
      </div>
    </section>
  );
}

function formatElapsedTime(elapsedMs: number): string {
  return `${(elapsedMs / 1000).toFixed(2)}s`;
}
