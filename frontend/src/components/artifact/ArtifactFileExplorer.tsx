import { useMemo, useState } from "react";
import type { ArtifactFileSummary, ArtifactMoveSummary } from "../../types";
import { ArtifactFileOptions } from "./ArtifactFileOptions";
import { moveLayer } from "./artifactMoveLayers";

type Props = {
  files: ArtifactFileSummary[];
  moves: ArtifactMoveSummary[];
  selectedFileId: string;
  hiddenFileIds: ReadonlySet<string>;
  onSelectFile: (fileId: string) => void;
  onHiddenFileIdsChange: (ids: Set<string>) => void;
};

type Directory = {
  path: string;
  directories: Map<string, Directory>;
  files: ArtifactFileSummary[];
};

export function ArtifactFileExplorer({
  files,
  moves,
  selectedFileId,
  hiddenFileIds,
  onSelectFile,
  onHiddenFileIdsChange,
}: Props) {
  const [query, setQuery] = useState("");
  const [collapsed, setCollapsed] = useState<Set<string>>(() => new Set());
  const counts = useMemo(() => {
    const result = new Map(
      files.map((file) => [file.file_id, { srcdiff: 0, srcmove: 0 }]),
    );
    for (const move of moves) {
      const ids = new Set(
        [...move.from_node_ids, ...move.to_node_ids].map(
          (id) => id.split(":n", 1)[0],
        ),
      );
      for (const id of ids) {
        const count = result.get(id);
        if (count) count[moveLayer(move)] += 1;
      }
    }
    return result;
  }, [files, moves]);
  const root: Directory = { path: "", directories: new Map(), files: [] };
  const matching = files.filter((file) =>
    file.filename.toLocaleLowerCase().includes(query.toLocaleLowerCase()),
  );
  for (const file of matching) {
    const parts = file.filename.split("/");
    parts.pop();
    let directory = root;
    for (const part of parts) {
      const path = `${directory.path}${part}/`;
      if (!directory.directories.has(part))
        directory.directories.set(part, {
          path,
          directories: new Map(),
          files: [],
        });
      directory = directory.directories.get(part)!;
    }
    directory.files.push(file);
  }

  function toggleVisibility(fileId: string) {
    const next = new Set(hiddenFileIds);
    if (next.has(fileId)) next.delete(fileId);
    else next.add(fileId);
    onHiddenFileIdsChange(next);
  }

  function branch(directory: Directory) {
    return (
      <>
        {[...directory.directories]
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([name, child]) => {
            const expanded = Boolean(query) || !collapsed.has(child.path);
            return (
              <div key={child.path}>
                <button
                  type="button"
                  aria-expanded={expanded}
                  aria-label={`${expanded ? "Collapse" : "Expand"} directory ${child.path}`}
                  onClick={() =>
                    setCollapsed((current) => {
                      const next = new Set(current);
                      if (next.has(child.path)) next.delete(child.path);
                      else next.add(child.path);
                      return next;
                    })
                  }
                  className="flex h-5 w-full items-center gap-1.5 rounded px-1 text-left text-xs leading-4 text-slate-400 hover:bg-white/5 hover:text-white"
                >
                  <span aria-hidden="true" className="w-3 text-slate-600">
                    {expanded ? "▾" : "▸"}
                  </span>
                  <span aria-hidden="true" className="text-sky-300/60">
                    ▱
                  </span>
                  <span className="truncate">{name}</span>
                </button>
                {expanded ? (
                  <div className="ml-2.5 border-l border-white/10 pl-1.5">
                    {branch(child)}
                  </div>
                ) : null}
              </div>
            );
          })}
        {[...directory.files]
          .sort((a, b) => a.filename.localeCompare(b.filename))
          .map((file) => {
            const hidden = hiddenFileIds.has(file.file_id);
            const moveCounts = counts.get(file.file_id)!;
            return (
              <div
                key={file.file_id}
                className={`flex items-center rounded ${file.file_id === selectedFileId ? "bg-sky-500/15 ring-1 ring-sky-400/20 ring-inset" : "hover:bg-white/5"}`}
              >
                <button
                  type="button"
                  title={file.filename}
                  aria-label={file.filename}
                  aria-pressed={file.file_id === selectedFileId}
                  onClick={() => onSelectFile(file.file_id)}
                  className={`flex h-5 min-w-0 flex-1 items-center gap-1 px-1.5 text-left text-xs leading-4 ${hidden ? "text-slate-600" : "text-slate-200"}`}
                >
                  <span className="min-w-0 flex-1 truncate">
                    {file.filename.split("/").pop()}
                  </span>
                  <span className="flex shrink-0 gap-0.5">
                    <Badge
                      label="Delete regions"
                      symbol="−"
                      count={file.diff_region_counts.delete}
                      classes="bg-red-400/10 text-red-300"
                    />
                    <Badge
                      label="Insert regions"
                      symbol="+"
                      count={file.diff_region_counts.insert}
                      classes="bg-green-400/10 text-green-300"
                    />
                    <Badge
                      label="srcDiff moves"
                      symbol="D"
                      count={moveCounts.srcdiff}
                      classes="bg-violet-400/10 text-violet-300"
                    />
                    <Badge
                      label="srcMove moves"
                      symbol="M"
                      count={moveCounts.srcmove}
                      classes="bg-amber-400/10 text-amber-300"
                    />
                    {hidden ? (
                      <span
                        title="Hidden in Source"
                        className="px-1 text-[9px]"
                      >
                        hidden
                      </span>
                    ) : null}
                  </span>
                </button>
                <ArtifactFileOptions
                  filename={file.filename}
                  hidden={hidden}
                  onToggleVisibility={() => toggleVisibility(file.file_id)}
                  onShowOnly={() => {
                    onHiddenFileIdsChange(
                      new Set(
                        files
                          .filter((other) => other.file_id !== file.file_id)
                          .map((other) => other.file_id),
                      ),
                    );
                    onSelectFile(file.file_id);
                  }}
                />
              </div>
            );
          })}
      </>
    );
  }

  return (
    <div className="px-3 pb-2">
      <input
        type="search"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder="Filter files…"
        aria-label="Filter artifact files"
        className="w-full rounded border border-white/15 bg-slate-950 px-2 py-1 text-xs text-slate-200 placeholder:text-slate-600"
      />
      <div className="flex items-center justify-between py-1 text-[10px] text-slate-500">
        <span>
          {files.length - hiddenFileIds.size}/{files.length} visible
        </span>
        <button
          type="button"
          onClick={() => onHiddenFileIdsChange(new Set())}
          disabled={hiddenFileIds.size === 0}
          className="text-sky-300 disabled:text-slate-600"
        >
          Show all
        </button>
      </div>
      <div aria-label="File directory" className="max-h-80 overflow-y-auto">
        {branch(root)}
        {matching.length === 0 ? (
          <p className="px-2 py-2 text-xs text-slate-500">No matching files.</p>
        ) : null}
      </div>
      <p className="mt-1 text-[9px] text-slate-500">
        − deletes · + inserts · D srcDiff · M srcMove
      </p>
    </div>
  );
}

function Badge({
  label,
  symbol,
  count,
  classes,
}: {
  label: string;
  symbol: string;
  count: number;
  classes: string;
}) {
  return count > 0 ? (
    <span
      aria-label={`${label}: ${count}`}
      title={`${label}: ${count}`}
      className={`rounded px-1 py-0.5 font-mono text-[9px] leading-3 tabular-nums ${classes}`}
    >
      {symbol}
      {count}
    </span>
  ) : null;
}
