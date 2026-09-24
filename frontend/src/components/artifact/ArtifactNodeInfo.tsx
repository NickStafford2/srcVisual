import type { ArtifactTreeNode } from "../../types";

type Props = {
  node: ArtifactTreeNode | null;
  loading: boolean;
  error: string | null;
  onRevealSource: () => void;
};

export function ArtifactNodeInfo({
  node,
  loading,
  error,
  onRevealSource,
}: Props) {
  if (loading) {
    return <p className="text-sm text-slate-400">Loading selected tag…</p>;
  }
  if (error) {
    return <p className="text-sm text-rose-300">{error}</p>;
  }
  if (!node) {
    return (
      <p className="rounded-xl border border-dashed border-white/10 bg-white/[0.03] p-4 text-sm text-slate-400">
        Select a tag in the structure tree or a move endpoint to inspect it.
      </p>
    );
  }

  const hasSourceSpan =
    node.kind !== "plain" && Boolean(node.revision_0_span || node.revision_1_span);
  const attributes = Object.entries(node.srcdiff_attributes ?? {}).filter(
    ([, value]) => value !== null && value !== undefined,
  );

  return (
    <article className="space-y-4 rounded-xl border border-white/10 bg-slate-950/70 p-4">
      <header className="flex flex-wrap items-start justify-between gap-3 border-b border-white/10 pb-3">
        <div>
          <p className="text-[11px] tracking-[0.24em] text-slate-500 uppercase">
            Selected srcDiff tag
          </p>
          <h2 className="mt-1 font-mono text-lg text-slate-100">
            &lt;{node.tag}&gt;
          </h2>
          <p className="mt-1 text-sm text-slate-400">{node.label}</p>
        </div>
        {hasSourceSpan ? (
          <button
            type="button"
            onClick={onRevealSource}
            className="rounded border border-sky-300/30 bg-sky-400/10 px-3 py-1.5 text-xs text-sky-200"
          >
            Reveal in Source
          </button>
        ) : null}
      </header>

      <dl className="grid gap-3 text-sm md:grid-cols-2">
        <Info label="Kind" value={node.kind} />
        <Info label="Move" value={node.move_id ?? "Not a move endpoint"} />
        <Info label="Before source" value={formatSpan(node.revision_0_span)} />
        <Info label="After source" value={formatSpan(node.revision_1_span)} />
      </dl>

      <div>
        <p className="text-xs text-slate-500">Canonical path</p>
        <code className="mt-1 block overflow-auto rounded bg-black/40 p-2 text-xs text-slate-300">
          {node.path}
        </code>
      </div>

      {attributes.length > 0 ? (
        <div>
          <p className="mb-2 text-xs text-slate-500">srcDiff attributes</p>
          <dl className="grid gap-2 text-xs md:grid-cols-2">
            {attributes.map(([name, value]) => (
              <Info key={name} label={name} value={formatValue(value)} />
            ))}
          </dl>
        </div>
      ) : null}
    </article>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-white/5 bg-black/20 p-3">
      <dt className="text-xs text-slate-500">{label}</dt>
      <dd className="mt-1 whitespace-pre-wrap break-words font-mono text-slate-200">
        {value}
      </dd>
    </div>
  );
}

function formatSpan(
  span: ArtifactTreeNode["revision_0_span"],
): string {
  if (!span) return "Not present";
  return `${span.start_line}:${span.start_col}–${span.end_line}:${span.end_col}`;
}

function formatValue(value: unknown): string {
  if (typeof value === "string") return value;
  return JSON.stringify(value, null, 2) ?? String(value);
}
