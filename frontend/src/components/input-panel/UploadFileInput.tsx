type UploadFileInputProps = {
  selectedUpload: File | null;
  disabled: boolean;
  onUploadChange: (file: File | null) => void;
};

function formatFileSize(bytes: number): string {
  if (bytes < 1024) {
    return `${bytes} B`;
  }

  const kibibytes = bytes / 1024;
  if (kibibytes < 1024) {
    return `${kibibytes.toFixed(1)} KB`;
  }

  return `${(kibibytes / 1024).toFixed(1)} MB`;
}

export function UploadFileInput({
  selectedUpload,
  disabled,
  onUploadChange,
}: UploadFileInputProps) {
  return (
    <div className="space-y-3">
      <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
        <p className="text-sm font-medium text-slate-100">Upload a srcdiff file</p>
        <p className="mt-1 text-xs leading-5 text-slate-400">
          Use this mode when the diff already lives on disk. Supported file
          types include <code className="text-slate-300">.xml</code> and{" "}
          <code className="text-slate-300">.srcdiff</code>.
        </p>
      </div>

      <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-sky-300/30 bg-sky-300/[0.06] px-5 py-8 text-center transition hover:border-sky-300/45 hover:bg-sky-300/[0.1]">
        <input
          className="hidden"
          type="file"
          accept=".xml,.srcdiff"
          disabled={disabled}
          onChange={(event) => onUploadChange(event.target.files?.[0] ?? null)}
        />

        <span className="text-sm font-semibold text-slate-100">
          {selectedUpload ? "Replace selected file" : "Choose srcdiff file"}
        </span>

        <span className="text-xs leading-5 text-slate-400">
          Click to browse for a file to send to the backend.
        </span>
      </label>

      <div className="rounded-2xl border border-white/10 bg-slate-950/45 px-4 py-3">
        {selectedUpload ? (
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-medium text-slate-100">
                {selectedUpload.name}
              </p>
              <p className="mt-1 text-xs text-slate-400">
                {formatFileSize(selectedUpload.size)}
              </p>
            </div>

            <button
              type="button"
              disabled={disabled}
              onClick={() => onUploadChange(null)}
              className="rounded-xl border border-white/12 bg-white/[0.04] px-3 py-2 text-xs text-slate-200 transition hover:bg-white/[0.08] disabled:cursor-not-allowed disabled:opacity-60"
            >
              Remove file
            </button>
          </div>
        ) : (
          <p className="text-sm text-slate-400">No file selected yet.</p>
        )}
      </div>
    </div>
  );
}
