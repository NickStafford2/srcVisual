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
      <p className="mt-1 leading-5 text-slate-400">
        Supported file types include{" "}
        <code className="text-slate-300">.xml</code> and{" "}
        <code className="text-slate-300">.srcdiff</code>.
      </p>

      <div className="flex flex-row justify-center rounded-2xl border border-dashed border-sky-300/30 bg-sky-300/[0.06] px-5 py-8 text-center transition hover:border-sky-300/45 hover:bg-sky-300/[0.1]">
        {selectedUpload ? (
          <div className="flex w-fit flex-col gap-3 rounded-4xl border border-white/40 p-2 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-row flex-nowrap gap-3">
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
              X
            </button>
          </div>
        ) : (
          <label className="flex cursor-pointer flex-col items-center justify-center gap-2">
            <input
              className="hidden"
              type="file"
              accept=".xml,.srcdiff"
              disabled={disabled}
              onChange={(event) =>
                onUploadChange(event.target.files?.[0] ?? null)
              }
            />

            <span className="text-sm font-semibold text-slate-100">
              {selectedUpload ? "Replace selected file" : "Choose srcdiff file"}
            </span>

            <span className="text-xs leading-5 text-slate-400">
              Click to browse for a file to send to the backend.
            </span>
          </label>
        )}
      </div>
    </div>
  );
}
