export function Hero() {
  return (
    <section className="rounded-[28px] border border-white/10 bg-slate-950/65 p-7 shadow-[0_24px_80px_rgba(0,0,0,0.28)] backdrop-blur-xl">
      <div className="grid gap-5">
        <div>
          <h1 className="leading-none font-semibold sm:text-3xl lg:text-5xl">
            Send a srcDiff document to the backend and inspect the XML tree
            against live source spans.
          </h1>
          <p className="mt-4 text-base leading-7 text-slate-300">
            The backend reconstructs revision 0 and revision 1, reruns srcdiff
            with position data, runs srcMove, then sends back a normalized tree.
            Selecting any node in that tree highlights the corresponding source
            region.
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <LegendChip tone="amber">delete branch</LegendChip>
          <LegendChip tone="sky">insert branch</LegendChip>
          <LegendChip tone="emerald">move-tagged branch</LegendChip>
          <LegendChip tone="slate">shared src node</LegendChip>
        </div>
      </div>
    </section>
  );
}

function LegendChip({
  children,
  tone,
}: {
  children: string;
  tone: "amber" | "sky" | "emerald" | "slate";
}) {
  const toneClasses =
    tone === "amber"
      ? "border-amber-200/15 bg-amber-300/20"
      : tone === "sky"
        ? "border-sky-200/15 bg-sky-300/20"
        : tone === "emerald"
          ? "border-emerald-200/15 bg-emerald-300/20"
          : "border-white/10 bg-white/8";

  return (
    <span
      className={`inline-flex items-center rounded-full border px-3 py-2 text-sm ${toneClasses}`}
    >
      {children}
    </span>
  );
}
