import type { HighlightMode } from "../../srcdiff/highlightContext";

type HighlightSelectorProps = {
  highlightMode: HighlightMode;
  onHighlightAllMoves: () => void;
  onHighlightAllInserts: () => void;
  onHighlightAllDeletes: () => void;
  onClearHighlights: () => void;
};

export function HighlightSelector({
  highlightMode,
  onHighlightAllMoves,
  onHighlightAllInserts,
  onHighlightAllDeletes,
  onClearHighlights,
}: HighlightSelectorProps) {
  return (
    <div className="grid grid-cols-2">
      <BulkHighlightButton
        label="Highlight all moves"
        active={highlightMode === "all-moves"}
        tone="move"
        onClick={onHighlightAllMoves}
      />

      <BulkHighlightButton
        label="Highlight all inserts"
        active={highlightMode === "all-inserts"}
        tone="insert"
        onClick={onHighlightAllInserts}
      />

      <BulkHighlightButton
        label="Highlight all deletes"
        active={highlightMode === "all-deletes"}
        tone="delete"
        onClick={onHighlightAllDeletes}
      />

      <button
        type="button"
        onClick={onClearHighlights}
        className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-medium text-slate-200 transition hover:-translate-y-0.5 hover:bg-white/10"
      >
        Clear highlights
      </button>
    </div>
  );
}

type BulkHighlightButtonProps = {
  label: string;
  active: boolean;
  tone: "move" | "insert" | "delete";
  onClick: () => void;
};

function BulkHighlightButton({
  label,
  active,
  tone,
  onClick,
}: BulkHighlightButtonProps) {
  const toneClasses = getBulkHighlightButtonClasses(tone, active);

  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        "rounded-xl border px-3 py-2 text-xs font-medium transition hover:-translate-y-0.5",
        toneClasses,
      ].join(" ")}
    >
      {label}
    </button>
  );
}

function getBulkHighlightButtonClasses(
  tone: BulkHighlightButtonProps["tone"],
  active: boolean,
): string {
  if (tone === "move") {
    return active
      ? "border-diff-move-1/30 bg-diff-move-1/15 text-diff-move-1"
      : "border-diff-move-1/20 bg-diff-move-1/10 text-diff-move-1 hover:bg-diff-move-1/20";
  }

  if (tone === "insert") {
    return active
      ? "border-diff-insert/30 bg-diff-insert/15 text-diff-insert"
      : "border-diff-insert/20 bg-diff-insert/10 text-diff-insert hover:bg-diff-insert/20";
  }

  return active
    ? "border-diff-delete/30 bg-diff-delete/15 text-diff-delete"
    : "border-diff-delete/20 bg-diff-delete/10 text-diff-delete hover:bg-diff-delete/20";
}
