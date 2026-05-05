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
      <div className="flex flex-wrap gap-2">
        <span>Example Inputs:</span>
        <SampleButton
          disabled={disabled}
          onClick={() => onXmlInputChange(NESTED_SAMPLE)}
        >
          Nested
        </SampleButton>

        <SampleButton
          disabled={disabled}
          onClick={() => onXmlInputChange(SIMPLE_MOVE_SAMPLE)}
        >
          Move
        </SampleButton>

        <SampleButton
          disabled={disabled}
          onClick={() => onXmlInputChange(DELETE_INSERT_SAMPLE)}
        >
          Rename
        </SampleButton>
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
