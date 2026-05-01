import type { VisualizedFile } from "../../types";

type FileTabsProps = {
  files: VisualizedFile[];
  selectedFileIndex: number;
  onSelectFileIndex: (index: number) => void;
};

export function FileTabs({
  files,
  selectedFileIndex,
  onSelectFileIndex,
}: FileTabsProps) {
  return (
    <div
      className="mt-5 flex flex-wrap gap-3"
      role="tablist"
      aria-label="Archive files"
    >
      {files.map((file, index) => (
        <button
          key={`${file.unit}-${file.filename}`}
          type="button"
          className={[
            "cursor-pointer rounded-full border px-4 py-2.5 text-sm transition",
            index === selectedFileIndex
              ? "border-sky-300/30 bg-sky-300/15 text-slate-50"
              : "border-white/8 bg-white/5 text-slate-300 hover:border-sky-300/20 hover:bg-sky-300/8",
          ].join(" ")}
          onClick={() => onSelectFileIndex(index)}
        >
          {file.filename}
        </button>
      ))}
    </div>
  );
}
