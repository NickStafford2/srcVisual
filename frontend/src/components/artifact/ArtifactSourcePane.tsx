import { useEffect, useState } from "react";
import { fetchArtifactSource } from "../../api";
import type {
  ArtifactFileSummary,
  ArtifactFocusProfile,
  ArtifactSourceLine,
  ArtifactSourceProjection,
} from "../../types";

type Props = {
  artifactId: string;
  file: ArtifactFileSummary;
  focus: ArtifactFocusProfile;
  onFocusChange: (focus: ArtifactFocusProfile) => void;
};

export function ArtifactSourcePane({
  artifactId,
  file,
  focus,
  onFocusChange,
}: Props) {
  const [projection, setProjection] =
    useState<ArtifactSourceProjection | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [expandedRanges, setExpandedRanges] = useState<
    { left?: { start: number; end: number }; right?: { start: number; end: number } }[]
  >([]);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);
    setExpandedRanges([]);
    void fetchArtifactSource(artifactId, file.file_id, focus)
      .then((result) => {
        if (active) setProjection(result);
      })
      .catch((reason: unknown) => {
        if (active) setError(errorMessage(reason));
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [artifactId, file.file_id, focus]);

  async function showGap(block: Extract<NonNullable<typeof projection>["blocks"][number], { type: "gap" }>) {
    setLoading(true);
    setError(null);
    try {
      const nextRanges = [
        ...expandedRanges,
        {
          left: boundedRange(block.left.start_line, block.left.end_line),
          right: boundedRange(block.right.start_line, block.right.end_line),
        },
      ];
      const result = await fetchArtifactSource(
        artifactId,
        file.file_id,
        focus,
        nextRanges,
      );
      setProjection(result);
      setExpandedRanges(nextRanges);
    } catch (reason) {
      setError(errorMessage(reason));
    } finally {
      setLoading(false);
    }
  }

  async function returnToFocus() {
    setLoading(true);
    try {
      setProjection(await fetchArtifactSource(artifactId, file.file_id, focus));
      setExpandedRanges([]);
    } catch (reason) {
      setError(errorMessage(reason));
    } finally {
      setLoading(false);
    }
  }

  return (
    <section aria-label="Artifact source" className="space-y-3">
      <div className="flex flex-wrap items-center gap-3 rounded-xl border border-white/10 bg-slate-950/70 p-3">
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-slate-100">
            {file.filename}
          </p>
          <p className="text-xs text-slate-400">
            {file.revision_0_lines} → {file.revision_1_lines} lines
          </p>
        </div>
        <label className="text-xs text-slate-300">
          Focus{" "}
          <select
            value={focus}
            onChange={(event) =>
              onFocusChange(event.target.value as ArtifactFocusProfile)
            }
            className="rounded border border-white/15 bg-slate-900 px-2 py-1"
          >
            <option value="changes-and-moves">Changes and moves</option>
            <option value="moves">Moves</option>
            <option value="changes">Changes</option>
            <option value="complete-file">Complete file</option>
          </select>
        </label>
        {expandedRanges.length > 0 ? (
          <button
            type="button"
            onClick={() => void returnToFocus()}
            className="rounded border border-sky-300/30 px-3 py-1 text-xs text-sky-200"
          >
            Collapse expanded gaps
          </button>
        ) : null}
      </div>

      {loading ? <p className="text-sm text-slate-400">Loading source…</p> : null}
      {error ? <p className="text-sm text-rose-300">{error}</p> : null}
      {projection ? (
        <div className="overflow-auto rounded-xl border border-white/10 bg-slate-950 font-mono text-xs">
          {projection.blocks.map((block) =>
            block.type === "gap" ? (
              <button
                key={block.block_id}
                type="button"
                onClick={() => void showGap(block)}
                className="block w-full border-y border-sky-400/20 bg-sky-950/30 px-3 py-2 text-left text-sky-300 hover:bg-sky-900/40"
              >
                Show {block.left.line_count} left / {block.right.line_count} right hidden lines
              </button>
            ) : (
              <div key={block.block_id}>
                {block.rows.map((row, index) => (
                  <div
                    key={`${block.block_id}-${index}`}
                    className={`grid grid-cols-2 border-b border-white/5 ${rowClass(row.kind)}`}
                  >
                    <SourceCell line={row.left} />
                    <SourceCell line={row.right} />
                  </div>
                ))}
              </div>
            ),
          )}
          {projection.truncated ? (
            <p className="px-3 py-2 text-amber-300">
              This projection reached the 2,000-row response bound. Expand a gap to inspect another range.
            </p>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}

function SourceCell({ line }: { line: ArtifactSourceLine | null }) {
  return (
    <div className="grid min-h-7 grid-cols-[3.5rem_1fr] border-r border-white/10">
      <span className="select-none px-2 py-1 text-right text-slate-600">
        {line?.line_number ?? ""}
      </span>
      <code className="whitespace-pre px-2 py-1 text-slate-200">
        {line?.text ?? ""}
        {line?.anchors.some((anchor) => anchor.kind === "move") ? (
          <span className="ml-2 rounded bg-violet-500/20 px-1 text-violet-200">move</span>
        ) : null}
      </code>
    </div>
  );
}

function boundedRange(start: number | null, end: number | null) {
  if (start === null || end === null) return undefined;
  return { start, end: Math.min(end, start + 1_999) };
}

function rowClass(kind: string) {
  if (kind === "delete") return "bg-rose-950/25";
  if (kind === "insert") return "bg-emerald-950/25";
  if (kind === "replace") return "bg-amber-950/20";
  return "";
}

function errorMessage(reason: unknown) {
  return reason instanceof Error ? reason.message : "Unable to load source projection.";
}
