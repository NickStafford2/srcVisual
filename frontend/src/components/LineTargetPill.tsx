import { buildLineHref, jumpToLineTarget } from "../srcdiff/lineLinks";

export type LineTargetPillVariant = "revision-0" | "revision-1" | "xml";

type LineTargetPillProps = {
  label: string;
  targetId: string;
  title: string;
  variant: LineTargetPillVariant;
  size?: "compact" | "regular";
};

export function LineTargetPill({
  label,
  targetId,
  title,
  variant,
  size = "regular",
}: LineTargetPillProps) {
  return (
    <a
      href={buildLineHref(targetId)}
      onClick={(event) => {
        event.preventDefault();
        jumpToLineTarget(targetId);
      }}
      className={[
        "rounded-full border border-white/10 bg-white/[0.06] font-mono tracking-wide text-slate-300 transition hover:border-sky-300/30 hover:text-sky-100",
        size === "compact"
          ? "px-2 py-0.5 text-[10px]"
          : "px-2.5 py-1 text-[11px]",
      ].join(" ")}
      style={getLineTargetPillStyle(variant)}
      title={title}
    >
      {label}
    </a>
  );
}

function getLineTargetPillStyle(variant: LineTargetPillVariant): {
  backgroundImage: string;
} {
  if (variant === "revision-0") {
    return {
      backgroundImage:
        "linear-gradient(90deg, rgb(var(--site-bg-rgb) / 0.96) 0%, rgb(15 23 42 / 0.8) 100%)",
    };
  }

  if (variant === "revision-1") {
    return {
      backgroundImage:
        "linear-gradient(270deg, rgb(var(--site-bg-rgb) / 0.96) 0%, rgb(15 23 42 / 0.8) 100%)",
    };
  }

  return {
    backgroundImage:
      "linear-gradient(90deg, rgb(var(--site-bg-rgb) / 0.52) 0%, rgb(var(--site-bg-rgb) / 0.28) 55%, rgb(15 23 42 / 0.78) 100%)",
  };
}
