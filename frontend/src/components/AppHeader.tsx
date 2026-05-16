type AppHeaderProps = {
  isInputOpen: boolean;
  onToggleInput: () => void;
};

export function AppHeader({ isInputOpen, onToggleInput }: AppHeaderProps) {
  return (
    <header className="flex shrink-0 items-center justify-between gap-3 border border-white/10 bg-slate-950/80 px-4 py-3 shadow-[0_12px_40px_rgba(0,0,0,0.22)] backdrop-blur-xl">
      <div className="min-w-0">
        <h1 className="text-xl font-medium tracking-[0.28em] text-slate-500">
          srcDiff Visual
        </h1>
      </div>

      <button
        type="button"
        aria-expanded={isInputOpen}
        aria-controls="input-dialog-title"
        onClick={onToggleInput}
        className="shrink-0 cursor-pointer rounded-xl border border-white/10 bg-green-600 px-3 py-2 text-xs font-medium text-slate-200 transition hover:bg-green-600/50"
      >
        {isInputOpen ? "Hide Input" : "Upload File"}
      </button>
    </header>
  );
}
