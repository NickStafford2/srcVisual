import type { SourceRevision } from "../../../srcdiff/lineLinks";

type CodePaneHeaderProps = {
  revision: SourceRevision;
  title: string;
  subtitle: string;
};

export function CodePaneHeader({
  revision,
  title,
  subtitle,
}: CodePaneHeaderProps) {
  const isRevisionOne = revision === "revision-1";

  return (
    <header
      className={[
        "px-4 pt-3 pb-2",
        isRevisionOne ? "text-right" : "text-left",
      ].join(" ")}
    >
      <h3 className="text-base font-semibold text-slate-50">{title}</h3>
      <p className="mt-0.5 text-xs text-slate-300">{subtitle}</p>
    </header>
  );
}
