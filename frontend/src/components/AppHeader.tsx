type AppHeaderProps = {
  isInputOpen: boolean;
  onToggleInput: () => void;
};

export function AppHeader({
  isInputOpen,
  onToggleInput,
}: AppHeaderProps) {
  return (
    <header className="flex shrink-0 items-center justify-between gap-3 rounded-[18px] border border-white/10 bg-slate-950/80 px-4 py-3 shadow-[0_12px_40px_rgba(0,0,0,0.22)] backdrop-blur-xl">
      <div className="min-w-0">
        <p className="text-[11px] font-medium uppercase tracking-[0.28em] text-slate-500">
          srcVisual
        </p>
        <h1 className="mt-1 truncate text-sm font-semibold text-slate-100">
          Workspace
        </h1>
      </div>

      <button
        type="button"
        aria-expanded={isInputOpen}
        aria-controls="input-dialog-title"
        onClick={onToggleInput}
        className="shrink-0 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-medium text-slate-200 transition hover:bg-white/10"
      >
        {isInputOpen ? "Hide Input" : "Show Input"}
      </button>
    </header>
  );
}
