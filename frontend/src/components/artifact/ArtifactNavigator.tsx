import { useEffect, useState, type ReactNode } from "react";
import {
  fetchArtifactDiffTree,
  fetchArtifactNodeChildren,
  fetchArtifactTree,
} from "../../api";
import type {
  ArtifactDiffKind,
  ArtifactDiffOverlayRegion,
  ArtifactDiffTreeNode,
  ArtifactFocusProfile,
  ArtifactManifest,
  ArtifactMoveSummary,
  ArtifactTreeNode,
} from "../../types";
import { ArtifactNodeInfo } from "./ArtifactNodeInfo";

type Props = {
  correspondenceControls?: ReactNode;
  manifest: ArtifactManifest;
  selectedFileId: string;
  inspectedMoveId: string | null;
  visibleMoveIds: ReadonlySet<string>;
  visibleDiffKinds: ReadonlySet<ArtifactDiffKind>;
  selectedNodeId: string | null;
  selectedNode: ArtifactTreeNode | null;
  nodeLoading: boolean;
  nodeError: string | null;
  focus: ArtifactFocusProfile;
  onSelectFile: (fileId: string) => void;
  onToggleMove: (move: ArtifactMoveSummary) => void;
  onVisibleMoveIdsChange: (moveIds: Set<string>) => void;
  onToggleDiffKind: (kind: ArtifactDiffKind) => void;
  onVisibleDiffKindsChange: (kinds: Set<ArtifactDiffKind>) => void;
  onDiffOverlayRegionsChange: (regions: ArtifactDiffOverlayRegion[]) => void;
  onSelectNode: (node: ArtifactTreeNode) => void;
  onClearNode: () => void;
  onRevealNode: () => void;
};

export function ArtifactNavigator({
  correspondenceControls,
  manifest,
  selectedFileId,
  inspectedMoveId,
  visibleMoveIds,
  visibleDiffKinds,
  selectedNodeId,
  selectedNode,
  nodeLoading,
  nodeError,
  focus,
  onSelectFile,
  onToggleMove,
  onVisibleMoveIdsChange,
  onToggleDiffKind,
  onVisibleDiffKindsChange,
  onDiffOverlayRegionsChange,
  onSelectNode,
  onClearNode,
  onRevealNode,
}: Props) {
  const [root, setRoot] = useState<ArtifactTreeNode | null>(null);
  const [diffRoots, setDiffRoots] = useState<ArtifactDiffTreeNode[]>([]);
  const [diffTreeLoading, setDiffTreeLoading] = useState(true);
  const [diffTreeError, setDiffTreeError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [fileQuery, setFileQuery] = useState("");
  const visibleFiles = manifest.files.filter((file) =>
    file.filename.toLocaleLowerCase().includes(fileQuery.toLocaleLowerCase()),
  );
  const currentMoveId = inspectedMoveId ?? selectedNode?.move_id ?? null;

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

  useEffect(() => {
    let active = true;
    setDiffRoots([]);
    setDiffTreeLoading(true);
    setDiffTreeError(null);
    void fetchArtifactDiffTree(manifest.artifact_id, selectedFileId)
      .then((projection) => {
        if (active) setDiffRoots(projection.roots);
      })
      .catch((reason: unknown) => {
        if (active) setDiffTreeError(errorMessage(reason));
      })
      .finally(() => {
        if (active) setDiffTreeLoading(false);
      });
    return () => {
      active = false;
    };
  }, [manifest.artifact_id, selectedFileId]);

  useEffect(() => {
    const path = selectedNodeId
      ? findDiffNodePath(diffRoots, selectedNodeId)
      : null;
    if (!path) {
      onDiffOverlayRegionsChange([]);
      return;
    }
    const selected = path[path.length - 1];
    const regions: ArtifactDiffOverlayRegion[] = [
      {
        nodeId: selected.node_id,
        kind: selected.diff_kind,
        relation: "selected",
        distance: 0,
      },
      ...path.slice(0, -1).flatMap((node, index) =>
        visibleDiffKinds.has(node.diff_kind)
          ? [
              {
                nodeId: node.node_id,
                kind: node.diff_kind,
                relation: "ancestor" as const,
                distance: path.length - index - 1,
              },
            ]
          : [],
      ),
      ...selected.children.flatMap((node) =>
        visibleDiffKinds.has(node.diff_kind)
          ? [
              {
                nodeId: node.node_id,
                kind: node.diff_kind,
                relation: "child" as const,
                distance: 1,
              },
            ]
          : [],
      ),
    ];
    onDiffOverlayRegionsChange(regions);
  }, [diffRoots, onDiffOverlayRegionsChange, selectedNodeId, visibleDiffKinds]);

  return (
    <section
      className="flex h-full min-h-0 flex-col overflow-hidden border border-white/10 bg-slate-950/75"
      aria-label="Artifact navigator"
    >
      <div className="border-b border-white/10 p-4">
        <p className="text-[11px] tracking-[0.28em] text-slate-500 uppercase">
          Files
        </p>
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
            <p className="px-2 py-2 text-xs text-slate-500">
              No matching files.
            </p>
          ) : null}
        </div>
      </div>

      <div className="shrink-0 border-b border-white/10">
        <h2 className="px-4 pt-3 text-sm font-semibold text-slate-200">
          srcDiff
        </h2>
        <div className="p-4 pt-2">
          <div className="flex items-center justify-between gap-3">
            <p className="text-[11px] tracking-[0.28em] text-slate-500 uppercase">
              Region highlighting
            </p>
            <span className="text-[10px] text-slate-600">
              {visibleDiffKinds.size}/3 shown
            </span>
          </div>
          <p className="mt-1 text-[11px] text-slate-500">
            Highlight only; source remains visible.
          </p>
          <div
            role="group"
            aria-label="srcDiff region highlighting"
            className="mt-3 grid grid-cols-3 gap-1"
          >
            {DIFF_KIND_OPTIONS.map(({ kind, label, classes }) => (
              <button
                key={kind}
                type="button"
                aria-pressed={visibleDiffKinds.has(kind)}
                onClick={() => onToggleDiffKind(kind)}
                className={`rounded border px-2 py-1.5 text-xs transition ${classes} ${
                  visibleDiffKinds.has(kind)
                    ? "opacity-100"
                    : "bg-slate-950 text-slate-500 opacity-60"
                }`}
              >
                <span aria-hidden="true" className="mr-1">
                  {visibleDiffKinds.has(kind) ? "●" : "○"}
                </span>
                {label}
              </button>
            ))}
          </div>
          <div className="mt-2 flex gap-2 text-[11px]">
            <button
              type="button"
              onClick={() => onVisibleDiffKindsChange(new Set(ALL_DIFF_KINDS))}
              className="text-slate-400 hover:text-white"
            >
              All diff regions
            </button>
            <span className="text-slate-700">·</span>
            <button
              type="button"
              onClick={() => onVisibleDiffKindsChange(new Set())}
              className="text-slate-400 hover:text-white"
            >
              Clear diff highlights
            </button>
          </div>
        </div>
        <div
          className="max-h-56 overflow-auto border-t border-white/10 p-3 font-mono text-xs"
          aria-label="srcDiff region tree"
        >
          <div className="mb-2 flex items-center justify-between gap-2 font-sans">
            <p className="text-[11px] tracking-[0.24em] text-slate-500 uppercase">
              Nested diff tags
            </p>
            {diffRoots.length > 0 ? (
              <span className="text-[10px] text-slate-600">
                Select to outline
              </span>
            ) : null}
          </div>
          {diffTreeLoading ? (
            <p className="text-slate-500">Loading diff regions…</p>
          ) : null}
          {diffTreeError ? (
            <p className="text-rose-300">{diffTreeError}</p>
          ) : null}
          {!diffTreeLoading && !diffTreeError && diffRoots.length === 0 ? (
            <p className="text-slate-500">No explicit diff tags.</p>
          ) : null}
          {diffRoots.map((node) => (
            <ArtifactDiffTreeBranch
              key={node.node_id}
              node={node}
              depth={0}
              selectedNodeId={selectedNodeId}
              onSelectNode={onSelectNode}
            />
          ))}
        </div>
      </div>

      <div className="max-h-[55vh] shrink-0 overflow-auto border-b border-white/10">
        <h2 className="sticky top-0 z-10 bg-slate-950 px-4 py-3 text-sm font-semibold text-slate-200">
          srcMove
        </h2>
        {manifest.moves.items.length > 0 ? (
          <div className="border-b border-white/10 p-4">
            <div className="flex items-center justify-between gap-3">
              <p className="text-[11px] tracking-[0.28em] text-slate-500 uppercase">
                Move highlighting
              </p>
              <span className="text-[10px] text-slate-600">
                {visibleMoveIds.size}/{manifest.moves.items.length} shown
              </span>
            </div>
            <div
              role="group"
              aria-label="Move connector visibility"
              className="mt-3 grid grid-cols-3 overflow-hidden rounded border border-white/15 bg-slate-950 text-xs"
            >
              <button
                type="button"
                disabled={!currentMoveId}
                aria-pressed={
                  currentMoveId !== null &&
                  visibleMoveIds.size === 1 &&
                  visibleMoveIds.has(currentMoveId)
                }
                onClick={() => {
                  if (currentMoveId) {
                    onVisibleMoveIdsChange(new Set([currentMoveId]));
                  }
                }}
                className="aria-pressed:bg-diff-move-1/20 border-r border-white/10 px-2 py-1.5 text-slate-300 disabled:opacity-40 aria-pressed:text-amber-200"
              >
                Current only
              </button>
              <button
                type="button"
                aria-pressed={
                  visibleMoveIds.size === manifest.moves.items.length
                }
                onClick={() =>
                  onVisibleMoveIdsChange(
                    new Set(manifest.moves.items.map((move) => move.move_id)),
                  )
                }
                className="aria-pressed:bg-diff-move-1/20 border-r border-white/10 px-2 py-1.5 text-slate-300 aria-pressed:text-amber-200"
              >
                All
              </button>
              <button
                type="button"
                aria-pressed={visibleMoveIds.size === 0}
                onClick={() => onVisibleMoveIdsChange(new Set())}
                className="px-2 py-1.5 text-slate-300 aria-pressed:bg-white/10 aria-pressed:text-white"
              >
                None
              </button>
            </div>
            <div className="mt-2 flex flex-wrap gap-1">
              {manifest.moves.items.map((move) => (
                <button
                  key={move.move_id}
                  type="button"
                  aria-pressed={visibleMoveIds.has(move.move_id)}
                  data-inspected-move={inspectedMoveId === move.move_id}
                  title={`${visibleMoveIds.has(move.move_id) ? "Hide" : "Show"} ${move.move_id} connector`}
                  onClick={() => onToggleMove(move)}
                  className={`rounded border px-2 py-1 text-xs ${
                    inspectedMoveId === move.move_id
                      ? "ring-diff-move-1/80 ring-1"
                      : ""
                  } ${
                    visibleMoveIds.has(move.move_id)
                      ? "border-diff-move-1/70 bg-diff-move-1/25 text-diff-move-1"
                      : "border-diff-move-1/25 hover:border-diff-move-1/50 bg-slate-950 text-amber-100/70 hover:text-amber-100"
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

        {correspondenceControls}
      </div>

      <ArtifactNodeInfo
        node={selectedNode}
        loading={nodeLoading}
        error={nodeError}
        onRevealSource={onRevealNode}
        onClear={onClearNode}
      />

      <div
        className="min-h-0 flex-1 overflow-auto p-3 font-mono text-xs"
        aria-label="Structure tree"
      >
        {error ? <p className="text-rose-300">{error}</p> : null}
        {!root && !error ? (
          <p className="text-slate-500">Loading tree…</p>
        ) : null}
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

const ALL_DIFF_KINDS: ArtifactDiffKind[] = ["common", "delete", "insert"];

const DIFF_KIND_OPTIONS: {
  kind: ArtifactDiffKind;
  label: string;
  classes: string;
}[] = [
  {
    kind: "common",
    label: "diff:common",
    classes: "border-diff-plain/40 bg-diff-plain/20 text-slate-200",
  },
  {
    kind: "delete",
    label: "diff:delete",
    classes: "border-diff-delete/50 bg-diff-delete/20 text-red-200",
  },
  {
    kind: "insert",
    label: "diff:insert",
    classes: "border-diff-insert/50 bg-diff-insert/20 text-green-200",
  },
];

function ArtifactDiffTreeBranch({
  node,
  depth,
  selectedNodeId,
  onSelectNode,
}: {
  node: ArtifactDiffTreeNode;
  depth: number;
  selectedNodeId: string | null;
  onSelectNode: (node: ArtifactTreeNode) => void;
}) {
  const [expanded, setExpanded] = useState(depth < 2);
  const selected = selectedNodeId === node.node_id;
  return (
    <div>
      <div
        className={`flex items-center rounded ${selected ? "bg-sky-400/10 ring-1 ring-sky-300/25" : ""}`}
      >
        {node.children.length > 0 ? (
          <button
            type="button"
            aria-label={`${expanded ? "Collapse" : "Expand"} ${node.tag}`}
            onClick={() => setExpanded((current) => !current)}
            className="w-5 shrink-0 py-1 text-slate-600 hover:text-white"
          >
            {expanded ? "▾" : "▸"}
          </button>
        ) : (
          <span className="w-5 shrink-0 text-center text-slate-700">·</span>
        )}
        <button
          type="button"
          aria-pressed={selected}
          onClick={() => onSelectNode(node)}
          className={`min-w-0 flex-1 truncate py-1 text-left ${diffTreeTextColor(node.diff_kind, selected)}`}
        >
          {node.tag}
          {node.kind === "move" ? (
            <span className="ml-1 text-[9px] text-amber-300">move</span>
          ) : null}
          {node.child_count > 0 ? (
            <span className="ml-1 text-[10px] text-slate-600">
              ({node.child_count})
            </span>
          ) : null}
        </button>
      </div>
      {expanded && node.children.length > 0 ? (
        <div className="ml-3 border-l border-white/10 pl-2">
          {node.children.map((child) => (
            <ArtifactDiffTreeBranch
              key={child.node_id}
              node={child}
              depth={depth + 1}
              selectedNodeId={selectedNodeId}
              onSelectNode={onSelectNode}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}

function findDiffNodePath(
  roots: ArtifactDiffTreeNode[],
  nodeId: string,
): ArtifactDiffTreeNode[] | null {
  for (const node of roots) {
    if (node.node_id === nodeId) return [node];
    const childPath = findDiffNodePath(node.children, nodeId);
    if (childPath) return [node, ...childPath];
  }
  return null;
}

function diffTreeTextColor(kind: ArtifactDiffKind, selected: boolean) {
  if (selected) return "text-sky-100";
  if (kind === "delete") return "text-red-200";
  if (kind === "insert") return "text-green-200";
  return "text-slate-300";
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
              ? "bg-diff-move-1/12 ring-diff-move-1/25 ring-1"
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
            <span className="bg-diff-move-1/15 text-diff-move-1 ml-1 rounded-full px-1.5 py-0.5 text-[9px] tracking-wide uppercase">
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
          className="my-1 ml-5 rounded border border-white/10 px-2 py-1 text-[11px] text-sky-300 disabled:opacity-50"
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
  return reason instanceof Error
    ? reason.message
    : "Unable to load tree projection.";
}
