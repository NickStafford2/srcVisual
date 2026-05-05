import type { SrcMoveRecord } from "../../../types";

export type MoveTooltipInfo = {
  moveId: string;
  fromXpaths: string[];
  toXpaths: string[];
  fromRawTexts: string[];
  toRawTexts: string[];
};

type MoveTooltipProps = {
  move: MoveTooltipInfo;
};

export function MoveTooltip({ move }: MoveTooltipProps) {
  const fromXpath = summarizeXpath(move.fromXpaths[0]);
  const toXpath = summarizeXpath(move.toXpaths[0]);
  const fromText = summarizeRawText(move.fromRawTexts[0]);
  const toText = summarizeRawText(move.toRawTexts[0]);

  return (
    <span className="pointer-events-none absolute bottom-full left-1/2 z-40 mb-2 hidden w-max max-w-[420px] -translate-x-1/2 rounded-xl border border-white/10 bg-slate-950/98 px-3 py-2 text-left text-[11px] leading-relaxed text-slate-100 shadow-2xl ring-1 ring-black/40 group-hover:block">
      <span className="text-diff-move-1 block text-xs font-semibold">
        move_id: {move.moveId}
      </span>

      <span className="mt-2 block">
        <span className="block font-semibold text-slate-400">from XPath</span>
        <span className="block max-w-[380px] truncate font-mono text-slate-200">
          {fromXpath}
        </span>
      </span>

      <span className="mt-1.5 block">
        <span className="block font-semibold text-slate-400">to XPath</span>
        <span className="block max-w-[380px] truncate font-mono text-slate-200">
          {toXpath}
        </span>
      </span>

      {fromText || toText ? (
        <span className="mt-2 block border-t border-white/10 pt-2">
          {fromText ? (
            <span className="block">
              <span className="font-semibold text-slate-400">from text: </span>
              <span className="font-mono text-slate-200">{fromText}</span>
            </span>
          ) : null}

          {toText ? (
            <span className="mt-1 block">
              <span className="font-semibold text-slate-400">to text: </span>
              <span className="font-mono text-slate-200">{toText}</span>
            </span>
          ) : null}
        </span>
      ) : null}
    </span>
  );
}

export function buildMoveTooltipInfoById(
  moves: SrcMoveRecord[],
): Map<string, MoveTooltipInfo> {
  const tooltipInfoById = new Map<string, MoveTooltipInfo>();

  for (const move of moves) {
    if (!move.move_id) {
      continue;
    }

    tooltipInfoById.set(move.move_id, {
      moveId: move.move_id,
      fromXpaths: move.from_xpaths,
      toXpaths: move.to_xpaths,
      fromRawTexts: move.from_raw_texts,
      toRawTexts: move.to_raw_texts,
    });
  }

  return tooltipInfoById;
}

function summarizeXpath(xpath: string | undefined): string {
  if (!xpath) {
    return "missing";
  }

  const parts = xpath.split("/").filter(Boolean);

  if (parts.length <= 4) {
    return xpath;
  }

  return `…/${parts.slice(-4).join("/")}`;
}

function summarizeRawText(text: string | undefined): string | null {
  if (!text) {
    return null;
  }

  const normalized = text.replace(/\s+/g, " ").trim();

  if (!normalized) {
    return null;
  }

  if (normalized.length <= 80) {
    return normalized;
  }

  return `${normalized.slice(0, 77)}…`;
}
