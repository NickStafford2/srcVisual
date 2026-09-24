import { useEffect, useState } from "react";
import { fetchArtifactNodeChildren, fetchArtifactTree } from "../../api";
import type {
  ArtifactFocusProfile,
  ArtifactManifest,
  ArtifactMoveSummary,
  ArtifactTreeNode,
} from "../../types";

type Props = {
  manifest: ArtifactManifest;
  selectedFileId: string;
  selectedMoveId: string | null;
  visibleMoveIds: ReadonlySet<string>;
  selectedNodeId: string | null;
  focus: ArtifactFocusProfile;
  onSelectFile: (fileId: string) => void;
  onToggleMove: (move: ArtifactMoveSummary) => void;
  onSelectNode: (node: ArtifactTreeNode) => void;
};

export function ArtifactNavigator({
  manifest,
  selectedFileId,
  selectedMoveId,
  visibleMoveIds,
  selectedNodeId,
  focus,
  onSelectFile,
  onToggleMove,
  onSelectNode,
}: Props) {
  const [root, setRoot] = useState<ArtifactTreeNode | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [fileQuery, setFileQuery] = useState("");
  const visibleFiles = manifest.files.filter((file) =>
    file.filename.toLocaleLowerCase().includes(fileQuery.toLocaleLowerCase()),
  );

  useEffect(() => {
    let active = true;
    setRoot(null);
    setError(null);
    void fetchArtifactTree(manifest.artifact_id, selectedFileId, focus)
      .then((projection) => {
        if (active) setRoot(projection.root);
      })
      .catch((reason: unknown) => {
        if (active) setError(errorMessage(reason));
      });
    return () => {
      active = false;
    };
  }, [focus, manifest.artifact_id, selectedFileId]);

  return (
    <section className="flex h-full min-h-0 flex-col overflow-hidden border border-white/10 bg-slate-950/75" aria-label="Artifact navigator">
      <div className="border-b border-white/10 p-4">
        <p className="text-[11px] tracking-[0.28em] text-slate-500 uppercase">Files</p>
        <input
          type="search"
          value={fileQuery}
          onChange={(event) => setFileQuery(event.target.value)}
          placeholder="Filter files…"
          aria-label="Filter artifact files"
          className="mt-3 w-full rounded border border-white/15 bg-slate-950 px-2 py-1.5 text-xs text-slate-200 placeholder:text-slate-600"
        />
        <div className="mt-3 max-h-48 space-y-1 overflow-auto">
          {visibleFiles.map((file) => (
            <button
              key={file.file_id}
              type="button"
              onClick={() => onSelectFile(file.file_id)}
              className={`block w-full truncate rounded px-2 py-1 text-left text-xs ${file.file_id === selectedFileId ? "bg-sky-500/20 text-sky-200" : "text-slate-300 hover:bg-white/5"}`}
            >
              {file.filename}
            </button>
          ))}
          {visibleFiles.length === 0 ? (
            <p className="px-2 py-2 text-xs text-slate-500">No matching files.</p>
          ) : null}
        </div>
      </div>

      {manifest.moves.items.length > 0 ? (
        <div className="border-b border-white/10 p-4">
          <p className="text-[11px] tracking-[0.28em] text-slate-500 uppercase">Moves</p>
          <div className="mt-2 flex flex-wrap gap-1">
            {manifest.moves.items.map((move) => (
              <button
                key={move.move_id}
                type="button"
                aria-pressed={visibleMoveIds.has(move.move_id)}
                data-selected-move={selectedMoveId === move.move_id}
                title={`${visibleMoveIds.has(move.move_id) ? "Hide" : "Show"} ${move.move_id} connector`}
                onClick={() => onToggleMove(move)}
                className={`rounded border px-2 py-1 text-xs ${
                  selectedMoveId === move.move_id
                    ? "ring-1 ring-diff-move-1/80"
                    : ""
                } ${
                  visibleMoveIds.has(move.move_id)
                    ? "border-diff-move-1/70 bg-diff-move-1/25 text-diff-move-1"
                    : "border-diff-move-1/25 bg-slate-950 text-amber-100/70 hover:border-diff-move-1/50 hover:text-amber-100"
                }`}
              >
                <span aria-hidden="true" className="mr-1">
                  {visibleMoveIds.has(move.move_id) ? "●" : "○"}
                </span>
                {move.move_id}
              </button>
            ))}
          </div>
        </div>
      ) : null}

      <div className="min-h-0 flex-1 overflow-auto p-3 font-mono text-xs">
        {error ? <p className="text-rose-300">{error}</p> : null}
        {!root && !error ? <p className="text-slate-500">Loading tree…</p> : null}
        {root ? (
          <ArtifactTreeBranch
            key={`${root.node_id}-${focus}`}
            artifactId={manifest.artifact_id}
            initialNode={root}
            selectedNodeId={selectedNodeId}
            onSelectNode={onSelectNode}
          />
        ) : null}
      </div>
    </section>
  );
}

function ArtifactTreeBranch({
  artifactId,
  initialNode,
  selectedNodeId,
  onSelectNode,
}: {
  artifactId: string;
  initialNode: ArtifactTreeNode;
  selectedNodeId: string | null;
  onSelectNode: (node: ArtifactTreeNode) => void;
}) {
  const [node, setNode] = useState(initialNode);
  const [expanded, setExpanded] = useState(true);
  const [loading, setLoading] = useState(false);
  const [nextOffset, setNextOffset] = useState(0);
  const [error, setError] = useState<string | null>(null);

  async function loadMore() {
    if (node.children_complete || loading) return;
    setLoading(true);
    setError(null);
    try {
      const page = await fetchArtifactNodeChildren(
        artifactId,
        node.node_id,
        nextOffset,
      );
      setNode((current) => ({
        ...current,
        children: mergeNodes(current.children, page.children),
        children_complete: page.next_offset === null,
      }));
      setNextOffset(page.next_offset ?? node.child_count);
    } catch (reason) {
      setError(errorMessage(reason));
    } finally {
      setLoading(false);
    }
  }

  function toggle() {
    setExpanded((current) => !current);
  }

  return (
    <div>
      <div
        className={`flex items-center rounded ${
          selectedNodeId === node.node_id
            ? node.kind === "move"
              ? "bg-diff-move-1/12 ring-1 ring-diff-move-1/25"
              : "bg-sky-400/10"
            : ""
        }`}
      >
        {node.child_count > 0 ? (
          <button
            type="button"
            aria-label={`${expanded ? "Collapse" : "Expand"} ${node.label}`}
            onClick={toggle}
            className="w-5 shrink-0 py-0.5 text-slate-600 hover:text-white"
          >
            {expanded ? "▾" : "▸"}
          </button>
        ) : (
          <span className="w-5 shrink-0 text-center text-slate-600">·</span>
        )}
        <button
          type="button"
          onClick={() => onSelectNode(node)}
          aria-pressed={selectedNodeId === node.node_id}
          className={`min-w-0 flex-1 py-0.5 text-left hover:text-white ${
            node.kind === "move"
              ? "text-diff-move-1"
              : selectedNodeId === node.node_id
                ? "text-sky-200"
                : "text-slate-300"
          }`}
        >
          <span>{node.label}</span>
          {node.kind === "move" ? (
            <span className="ml-1 rounded-full bg-diff-move-1/15 px-1.5 py-0.5 text-[9px] tracking-wide text-diff-move-1 uppercase">
              move
            </span>
          ) : null}
          {!node.children_complete ? (
            <span className="ml-1 text-slate-600">({node.child_count})</span>
          ) : null}
        </button>
      </div>
      {expanded && node.children.length > 0 ? (
        <div className="ml-3 border-l border-white/10 pl-2">
          {node.children.map((child) => (
            <ArtifactTreeBranch
              key={child.node_id}
              artifactId={artifactId}
              initialNode={child}
              selectedNodeId={selectedNodeId}
              onSelectNode={onSelectNode}
            />
          ))}
        </div>
      ) : null}
      {expanded && !node.children_complete ? (
        <button
          type="button"
          onClick={() => void loadMore()}
          disabled={loading}
          className="ml-5 my-1 rounded border border-white/10 px-2 py-1 text-[11px] text-sky-300 disabled:opacity-50"
        >
          {loading ? "Loading…" : "Load more children"}
        </button>
      ) : null}
      {error ? <p className="ml-5 text-[11px] text-rose-300">{error}</p> : null}
    </div>
  );
}

function mergeNodes(current: ArtifactTreeNode[], loaded: ArtifactTreeNode[]) {
  const byId = new Map(current.map((node) => [node.node_id, node]));
  for (const node of loaded) {
    const existing = byId.get(node.node_id);
    byId.set(
      node.node_id,
      existing
        ? {
            ...node,
            children: existing.children,
            children_complete: existing.children_complete,
          }
        : node,
    );
  }
  return [...byId.values()];
}

function errorMessage(reason: unknown) {
  return reason instanceof Error ? reason.message : "Unable to load tree projection.";
}
