import { SampleButton } from "./SampleButton";

type PasteXmlInputProps = {
  exampleFilenames: string[];
  examplesError: string | null;
  isLoadingExample: boolean;
  xmlInput: string;
  disabled: boolean;
  onLoadExample: (filename: string) => void;
  onXmlInputChange: (value: string) => void;
};

export function PasteXmlInput({
  exampleFilenames,
  examplesError,
  isLoadingExample,
  xmlInput,
  disabled,
  onLoadExample,
  onXmlInputChange,
}: PasteXmlInputProps) {
  return (
    <div className="space-y-3">
      <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
        <p className="text-sm font-medium text-slate-100">Examples</p>
        <p className="mt-1 text-xs leading-5 text-slate-400">
          Example inputs are discovered from the examples directory and shown by
          filename.
        </p>

        <div className="mt-3 flex flex-wrap gap-2">
          {exampleFilenames.map((filename) => (
            <SampleButton
              key={filename}
              disabled={disabled || isLoadingExample}
              onClick={() => onLoadExample(filename)}
            >
              {filename}
            </SampleButton>
          ))}
        </div>

        {exampleFilenames.length === 0 && !examplesError ? (
          <p className="mt-3 text-xs text-slate-400">
            {isLoadingExample ? "Loading example..." : "No examples found."}
          </p>
        ) : null}

        {examplesError ? (
          <p className="mt-3 text-xs text-red-300">{examplesError}</p>
        ) : null}
      </div>

      <textarea
        className="min-h-[180px] w-full resize-y rounded-2xl border border-white/10 bg-slate-950/80 px-4 py-3 font-mono text-sm leading-5 text-slate-100 transition outline-none placeholder:text-slate-500 focus:border-sky-300/40"
        spellCheck={false}
        disabled={disabled}
        value={xmlInput}
        onChange={(event) => onXmlInputChange(event.target.value)}
        placeholder="Paste srcDiff XML here"
      />
    </div>
  );
}
