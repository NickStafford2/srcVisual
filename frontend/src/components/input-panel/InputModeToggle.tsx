import type { InputMode } from "../../srcdiff/useSrcDiffData";

type InputModeToggleProps = {
  mode: InputMode;
  disabled: boolean;
  onChange: (mode: InputMode) => void;
};

const OPTIONS: ReadonlyArray<{
  mode: InputMode;
  label: string;
  description: string;
}> = [
  {
    mode: "examples",
    label: "Examples",
    description: "Load a known srcDiff example from the repo.",
  },
  {
    mode: "paste",
    label: "Custom XML",
    description: "Paste raw srcdiff XML directly into the page.",
  },
  {
    mode: "upload",
    label: "File Upload",
    description: "Choose a srcDiff file from disk to visualize.",
  },
];

export function InputModeToggle({
  mode,
  disabled,
  onChange,
}: InputModeToggleProps) {
  return (
    <div
      aria-label="Input mode tabs"
      className="flex flex-wrap gap-2 rounded-2xl border border-white/10 bg-slate-950/70 p-2"
      role="tablist"
    >
      {OPTIONS.map((option) => {
        const _isActive = option.mode === mode;

        return (
          <button
            key={option.mode}
            aria-selected={_isActive}
            type="button"
            disabled={disabled}
            onClick={() => onChange(option.mode)}
            role="tab"
            className={[
              "rounded-2xl px-4 py-3 text-left transition",
              "disabled:cursor-not-allowed disabled:opacity-60",
              _isActive
                ? "bg-sky-300/12 shadow-[0_10px_30px_rgba(56,189,248,0.12)]"
                : "bg-white/[0.03] hover:bg-white/[0.05]",
            ].join(" ")}
          >
            <span className="block text-sm font-semibold text-slate-100">
              {option.label}
            </span>

            <span className="mt-1 block text-xs leading-5 text-slate-400">
              {option.description}
            </span>
          </button>
        );
      })}
    </div>
  );
}
