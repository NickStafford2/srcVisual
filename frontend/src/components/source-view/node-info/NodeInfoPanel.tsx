import type { ReactNode } from "react";
import type { SelectedNodeLink } from "./selectedNodeLinks";
import { LineTargetPill } from "../../LineTargetPill";

export type NodeInfoPanelItem = {
  key: string;
  label: string;
  filename: string | null;
  path: string;
  moveId: string | null | undefined;
  xmlSpanText: string;
  links: SelectedNodeLink[];
  actions?: ReactNode;
  details?: ReactNode;
};

type NodeInfoPanelProps = {
  title: string;
  emptyMessage: string;
  items: NodeInfoPanelItem[];
  actions?: ReactNode;
};

export function NodeInfoPanel({
  title,
  emptyMessage,
  items,
  actions,
}: NodeInfoPanelProps) {
  return (
    <section className="rounded-[20px] border border-white/10 bg-slate-950/65 p-4 shadow-[0_16px_48px_rgba(0,0,0,0.24)] backdrop-blur-xl">
      <header className="flex flex-col gap-3 border-b border-white/10 pb-3 md:flex-row md:items-start md:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-slate-50">{title}</h2>
          <p className="mt-1 text-xs text-slate-400">
            {items.length} item{items.length === 1 ? "" : "s"}
          </p>
        </div>

        {actions ? <div className="shrink-0">{actions}</div> : null}
      </header>

      {items.length === 0 ? (
        <div className="pt-4 text-sm text-slate-400">{emptyMessage}</div>
      ) : (
        <div className="mt-4 space-y-3">
          {items.map((item) => (
            <article
              key={item.key}
              className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3"
            >
              <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                <div>
                  <h3 className="text-sm font-semibold text-slate-100">
                    {item.label}
                  </h3>

                  <p className="mt-1 text-xs text-slate-400">
                    {item.filename ?? "unknown file"}
                  </p>

                  <p className="mt-1 font-mono text-[11px] text-slate-500">
                    {item.path}
                  </p>

                  <p className="mt-1 font-mono text-[11px] text-slate-400">
                    xml_span: {item.xmlSpanText}
                  </p>

                  {item.links.length > 0 ? (
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {item.links.map((link) => (
                        <LineTargetPill
                          key={`${item.key}-${link.targetId}-${link.label}`}
                          label={link.label}
                          targetId={link.targetId}
                          title={link.title}
                          variant={link.variant}
                        />
                      ))}
                    </div>
                  ) : null}
                </div>

                {item.moveId ? (
                  <div className="flex flex-wrap items-center gap-2">
                    {item.actions}

                    <span className="inline-flex items-center rounded-full border border-emerald-300/20 bg-emerald-300/10 px-3 py-1.5 text-xs text-emerald-200">
                      move={item.moveId}
                    </span>
                  </div>
                ) : item.actions ? (
                  <div>{item.actions}</div>
                ) : null}
              </div>

              {item.details ? <div className="mt-3">{item.details}</div> : null}
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
