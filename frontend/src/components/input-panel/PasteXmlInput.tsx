import {
  DELETE_INSERT_SAMPLE,
  NESTED_SAMPLE,
  SIMPLE_MOVE_SAMPLE,
} from "../../samples";
import { SampleButton } from "./SampleButton";

type PasteXmlInputProps = {
  xmlInput: string;
  disabled: boolean;
  onXmlInputChange: (value: string) => void;
};

export function PasteXmlInput({
  xmlInput,
  disabled,
  onXmlInputChange,
}: PasteXmlInputProps) {
  return (
    <div className="space-y-3">
      <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
        <p className="text-sm font-medium text-slate-100">Paste srcdiff XML</p>
        <p className="mt-1 text-xs leading-5 text-slate-400">
          Use this mode for web-based workflows where you already have srcdiff
          XML in another tool, tab, or terminal.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        <SampleButton
          disabled={disabled}
          onClick={() => onXmlInputChange(NESTED_SAMPLE)}
        >
          Load nested sample
        </SampleButton>

        <SampleButton
          disabled={disabled}
          onClick={() => onXmlInputChange(SIMPLE_MOVE_SAMPLE)}
        >
          Load move sample
        </SampleButton>

        <SampleButton
          disabled={disabled}
          onClick={() => onXmlInputChange(DELETE_INSERT_SAMPLE)}
        >
          Load rename sample
        </SampleButton>
      </div>

      <textarea
        className="min-h-[180px] w-full resize-y rounded-2xl border border-white/10 bg-slate-950/80 px-4 py-3 font-mono text-sm leading-5 text-slate-100 transition outline-none placeholder:text-slate-500 focus:border-sky-300/40"
        spellCheck={false}
        disabled={disabled}
        value={xmlInput}
        onChange={(event) => onXmlInputChange(event.target.value)}
        placeholder="Paste srcdiff XML here"
      />
    </div>
  );
}
