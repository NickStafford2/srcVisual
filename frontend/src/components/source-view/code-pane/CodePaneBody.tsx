import type { SourceRevision } from "../../../srcdiff/lineLinks";
import type { SourceViewLine } from "./CodeLine";
import { CodeLine } from "./CodeLine";
import { getCodePaneBodyStyle } from "./codePaneStyles";
import type {
  RegisterMoveSegment,
  UnregisterMoveSegment,
} from "./moveConnectors";
import type { MoveTooltipInfo } from "./MoveTooltip";

type CodePaneBodyProps = {
  fileIndex: number;
  revision: SourceRevision;
  title: string;
  lines: SourceViewLine[];
  registerMoveSegment?: RegisterMoveSegment;
  unregisterMoveSegment?: UnregisterMoveSegment;
  moveTooltipInfoById?: Map<string, MoveTooltipInfo>;
};

export function CodePaneBody({
  fileIndex,
  revision,
  title,
  lines,
  registerMoveSegment,
  unregisterMoveSegment,
  moveTooltipInfoById,
}: CodePaneBodyProps) {
  return (
    <div
      className="max-h-[58vh] overflow-auto border-t border-white/10 bg-slate-950/85 font-mono"
      style={getCodePaneBodyStyle(revision)}
    >
      {lines.length === 0 ? (
        <div className="px-5 py-5 text-sm text-slate-400">
          No source to render.
        </div>
      ) : (
        lines.map((line) => (
          <CodeLine
            key={`${title}-${line.number}`}
            fileIndex={fileIndex}
            revision={revision}
            title={title}
            line={line}
            registerMoveSegment={registerMoveSegment}
            unregisterMoveSegment={unregisterMoveSegment}
            moveTooltipInfoById={moveTooltipInfoById}
          />
        ))
      )}
    </div>
  );
}
