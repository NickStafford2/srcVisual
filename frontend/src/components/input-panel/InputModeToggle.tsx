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
    mode: "paste",
    label: "Paste srcdiff XML",
    description: "Paste raw srcdiff XML directly into the page.",
  },
  {
    mode: "upload",
    label: "Upload File",
    description: "Choose a srcdiff file from disk to visualize.",
  },
];

export function InputModeToggle({
  mode,
  disabled,
  onChange,
}: InputModeToggleProps) {
  return (
    <div className="grid gap-2 sm:grid-cols-2">
      {OPTIONS.map((option) => {
        const isActive = option.mode === mode;

        return (
          <button
            key={option.mode}
            type="button"
            disabled={disabled}
            onClick={() => onChange(option.mode)}
            className={[
              "rounded-2xl border px-4 py-3 text-left transition",
              "disabled:cursor-not-allowed disabled:opacity-60",
              isActive
                ? "border-sky-300/45 bg-sky-300/12 shadow-[0_10px_30px_rgba(56,189,248,0.12)]"
                : "border-white/10 bg-white/[0.03] hover:border-sky-300/25 hover:bg-white/[0.05]",
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
