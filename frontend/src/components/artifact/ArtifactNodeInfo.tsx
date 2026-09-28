import type { ArtifactTreeNode } from "../../types";

type Props = {
  node: ArtifactTreeNode | null;
  loading: boolean;
  error: string | null;
  onRevealSource: () => void;
  onClear: () => void;
  embedded?: boolean;
};

export function ArtifactNodeInfo({
  node,
  loading,
  error,
  onRevealSource,
  onClear,
  embedded = false,
}: Props) {
  if (loading) {
    return (
      <p
        className={`${embedded ? "" : "border-b border-white/10"} p-4 text-xs text-slate-400`}
      >
        Loading inspected node…
      </p>
    );
  }
  if (error) {
    return (
      <div
        className={`${embedded ? "" : "border-b border-white/10"} p-4 text-xs text-rose-300`}
      >
        <p>{error}</p>
        <button type="button" onClick={onClear} className="mt-2 underline">
          Clear selection
        </button>
      </div>
    );
  }
  if (!node) {
    return (
      <div
        className={`${embedded ? "" : "border-b border-white/10"} px-4 py-3`}
      >
        {!embedded ? (
          <p className="text-[11px] tracking-[0.28em] text-slate-500 uppercase">
            Node inspector
          </p>
        ) : null}
        <p className={`${embedded ? "" : "mt-1"} text-xs text-slate-500`}>
          No node inspected. Choose a node in the structure tree or a move
          endpoint.
        </p>
      </div>
    );
  }

  const hasSourceSpan =
    node.kind !== "plain" &&
    Boolean(node.revision_0_span || node.revision_1_span);
  const attributes = Object.entries(node.srcdiff_attributes ?? {}).filter(
    ([, value]) => value !== null && value !== undefined,
  );

  return (
    <article
      className={`${embedded ? "" : "border-b border-white/10"} bg-sky-400/[0.04] p-4`}
    >
      <header className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          {!embedded ? (
            <p className="text-[11px] tracking-[0.24em] text-sky-300/70 uppercase">
              Inspected node
            </p>
          ) : null}
          <h2
            className={`${embedded ? "" : "mt-1"} truncate font-mono text-base text-slate-100`}
          >
            &lt;{node.tag}&gt;
          </h2>
          <p
            className="mt-1 truncate text-xs text-slate-400"
            title={node.label}
          >
            {node.label}
          </p>
        </div>
        <button
          type="button"
          onClick={onClear}
          aria-label="Clear inspected node"
          title="Clear inspected node"
          className="rounded px-2 py-1 text-sm text-slate-500 hover:bg-white/5 hover:text-white"
        >
          ×
        </button>
      </header>

      <dl className="mt-3 grid grid-cols-2 gap-2 text-xs">
        <Info label="Kind" value={node.kind} />
        <Info label="Move" value={node.move_id ?? "Not a move endpoint"} />
        <Info label="Before source" value={formatSpan(node.revision_0_span)} />
        <Info label="After source" value={formatSpan(node.revision_1_span)} />
      </dl>

      <div className="mt-3 flex gap-2">
        {hasSourceSpan ? (
          <button
            type="button"
            onClick={onRevealSource}
            className="rounded border border-sky-300/30 bg-sky-400/10 px-2 py-1.5 text-xs text-sky-200"
          >
            Reveal in Source
          </button>
        ) : null}
        <button
          type="button"
          onClick={onClear}
          className="rounded border border-white/10 px-2 py-1.5 text-xs text-slate-300 hover:border-white/20 hover:text-white"
        >
          Deselect
        </button>
      </div>

      <details className="mt-3 text-xs text-slate-400">
        <summary className="cursor-pointer select-none hover:text-slate-200">
          Technical details
        </summary>
        <p className="mt-2 text-[10px] tracking-wide text-slate-600 uppercase">
          Canonical path
        </p>
        <code className="mt-1 block max-h-24 overflow-auto rounded bg-black/40 p-2 text-[11px] text-slate-300">
          {node.path}
        </code>
        {attributes.length > 0 ? (
          <div className="mt-2">
            <p className="mb-1 text-[10px] tracking-wide text-slate-600 uppercase">
              srcDiff attributes
            </p>
            <dl className="grid gap-2">
              {attributes.map(([name, value]) => (
                <Info key={name} label={name} value={formatValue(value)} />
              ))}
            </dl>
          </div>
        ) : null}
      </details>
    </article>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded border border-white/5 bg-black/20 p-2">
      <dt className="text-[10px] text-slate-500">{label}</dt>
      <dd className="mt-0.5 font-mono text-[11px] break-words whitespace-pre-wrap text-slate-200">
        {value}
      </dd>
    </div>
  );
}

function formatSpan(span: ArtifactTreeNode["revision_0_span"]): string {
  if (!span) return "Not present";
  return `${span.start_line}:${span.start_col}–${span.end_line}:${span.end_col}`;
}

function formatValue(value: unknown): string {
  if (typeof value === "string") return value;
  return JSON.stringify(value, null, 2) ?? String(value);
}
