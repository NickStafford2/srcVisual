import type { HighlightKind, SrcDiffTreeNode, ViewerLine } from "../srcdiff";

type SourceSectionProps = {
  filename: string | null;
  selectedNode: SrcDiffTreeNode | null;
  beforeLines: ViewerLine[];
  afterLines: ViewerLine[];
};

export function SourceSection({
  filename,
  selectedNode,
  beforeLines,
  afterLines,
}: SourceSectionProps) {
  return (
    <section className="rounded-[24px] border border-white/10 bg-slate-950/65 p-6 shadow-[0_24px_80px_rgba(0,0,0,0.28)] backdrop-blur-xl">
      <div className="flex flex-col gap-3 border-b border-white/10 pb-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-slate-50">Src</h2>
          <p className="mt-2 text-sm leading-6 text-slate-300">
            {selectedNode
              ? `Selected ${selectedNode.label} at ${selectedNode.path}`
              : "Select a tree node to highlight its source span."}
          </p>
        </div>

        {selectedNode?.move_id ? (
          <span className="inline-flex items-center rounded-full border border-emerald-300/20 bg-emerald-300/10 px-3 py-2 text-sm text-emerald-200">
            move={selectedNode.move_id}
          </span>
        ) : null}
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <SourcePane
          title="Revision 0"
          subtitle={filename ? `${filename} before` : "Upload a file to begin"}
          lines={beforeLines}
        />
        <SourcePane
          title="Revision 1"
          subtitle={filename ? `${filename} after` : "Upload a file to begin"}
          lines={afterLines}
        />
      </div>
    </section>
  );
}

function SourcePane({
  title,
  subtitle,
  lines,
}: {
  title: string;
  subtitle: string;
  lines: ViewerLine[];
}) {
  return (
    <article className="overflow-hidden rounded-[24px] border border-white/10 bg-slate-950/45">
      <header className="px-5 pt-5 pb-4">
        <h3 className="text-xl font-semibold text-slate-50">{title}</h3>
        <p className="mt-2 text-sm text-slate-300">{subtitle}</p>
      </header>

      <div className="max-h-[72vh] overflow-auto border-t border-white/10 bg-slate-950/85 font-mono">
        {lines.length === 0 ? (
          <div className="px-6 py-8 text-sm text-slate-400">
            No source to render yet.
          </div>
        ) : (
          lines.map((line, index) => (
            <div
              key={`${title}-${index}`}
              className={[
                "grid grid-cols-[72px_1fr] gap-3 px-5",
                line.hasHighlight ? "bg-white/[0.04]" : "",
              ].join(" ")}
            >
              <span className="border-r border-white/5 py-2 pr-3 text-right text-sm text-slate-500 select-none">
                {line.number}
              </span>
              <span className="block py-2 text-sm break-words whitespace-pre-wrap text-slate-100">
                {line.segments.map((segment, segmentIndex) => (
                  <span
                    key={segmentIndex}
                    className={segmentClasses(
                      segment.kind,
                      segment.highlighted,
                    )}
                  >
                    {segment.text}
                  </span>
                ))}
              </span>
            </div>
          ))
        )}
      </div>
    </article>
  );
}

function segmentClasses(kind: HighlightKind, highlighted: boolean): string {
  if (!highlighted) return "";

  switch (kind) {
    case "delete":
      return "rounded-md bg-amber-300/25";
    case "insert":
      return "rounded-md bg-sky-300/25";
    case "move":
      return "rounded-md bg-emerald-300/25";
    default:
      return "rounded-md bg-white/10";
  }
}
