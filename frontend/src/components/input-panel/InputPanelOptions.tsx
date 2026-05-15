import type { TreePruningLevel } from "../../types";

type InputPanelOptionsProps = {
  includeSkippedTags: boolean;
  pruningLevel: TreePruningLevel;
  disabled: boolean;
  onIncludeSkippedTagsChange: (value: boolean) => void;
  onPruningLevelChange: (value: TreePruningLevel) => void;
};

export function InputPanelOptions({
  includeSkippedTags,
  pruningLevel,
  disabled,
  onIncludeSkippedTagsChange,
  onPruningLevelChange,
}: InputPanelOptionsProps) {
  return (
    <>
      <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-sm text-slate-200 transition hover:bg-white/[0.05]">
        <input
          type="checkbox"
          checked={includeSkippedTags}
          onChange={(event) => onIncludeSkippedTagsChange(event.target.checked)}
          className="mt-1 h-4 w-4 rounded border-white/20 bg-slate-950"
        />

        <span>
          <span className="block font-medium text-slate-100">
            Show every XML tag
          </span>

          <span className="block text-xs leading-5 text-slate-400">
            Includes tags normally hidden from the Units tree, such as diff:ws.
          </span>
        </span>
      </label>

      <label className="flex flex-col gap-2 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-sm text-slate-200">
        <span className="font-medium text-slate-100">Pruning mode</span>

        <span className="text-xs leading-5 text-slate-400">
          Choose how aggressively the backend removes non-target files, XML
          tags, tree branches, and source code before the payload is built.
        </span>

        <select
          value={pruningLevel}
          disabled={disabled}
          onChange={(event) =>
            onPruningLevelChange(event.target.value as TreePruningLevel)
          }
          className="rounded-xl border border-white/10 bg-slate-950 px-3 py-2 text-sm text-slate-100 transition outline-none focus:border-sky-300/40"
          aria-label="Pruning mode"
        >
          <option value="none">
            No pruning: keep all files and full trees
          </option>
          <option value="file-and-tree">
            Changed branches: keep only changed files and changed
            XML/tree/source branches
          </option>
          <option value="file-only">
            Changed files: keep only files with any diff, but preserve full file
            contents
          </option>
          <option value="move-only">
            Move branches: keep only files with moves and prune everything else
            away
          </option>
        </select>
      </label>
    </>
  );
}
