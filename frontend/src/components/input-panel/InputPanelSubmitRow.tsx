import type { VisualizeResponse } from "../../types";
import { StatusPill } from "./StatusPill";

type InputPanelSubmitRowProps = {
  isLoading: boolean;
  error: string | null;
  progressMessage: string | null;
  data: VisualizeResponse | null;
};

export function InputPanelSubmitRow({
  isLoading,
  error,
  progressMessage,
  data,
}: InputPanelSubmitRowProps) {
  return (
    <div className="flex flex-row gap-3">
      <button
        type="submit"
        disabled={isLoading}
        className="rounded-xl border border-sky-300/30 bg-green-900 px-4 py-2 text-sm font-medium text-slate-50 transition hover:-translate-y-0.5 hover:bg-sky-300/20 disabled:cursor-wait disabled:opacity-70 disabled:hover:translate-y-0"
      >
        {isLoading ? "Submitting..." : "Submit"}
      </button>

      <StatusPill error={error}>{getStatusText()}</StatusPill>
    </div>
  );

  function getStatusText(): string {
    if (error) {
      return error;
    }

    if (isLoading && progressMessage) {
      return progressMessage;
    }

    if (data) {
      return `Loaded ${data.files.length} file${data.files.length === 1 ? "" : "s"} from ${data.source_filename}`;
    }

    return "Waiting for input";
  }
}
