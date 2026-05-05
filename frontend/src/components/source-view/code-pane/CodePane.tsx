import { useMemo } from "react";
import type { SourceRevision } from "../../../srcdiff/lineLinks";
import type { SourceViewHighlight } from "../../../srcdiff/srcView";
import { buildSourceView } from "../../../srcdiff/srcView";
import { CodePaneBody } from "./CodePaneBody";
import { CodePaneHeader } from "./CodePaneHeader";
import { getCodePaneSurfaceStyle } from "./codePaneStyles";
import type { RegisterMoveSegment } from "./moveConnectors";
import type { MoveTooltipInfo } from "./MoveTooltip";

type CodePaneProps = {
  fileIndex: number;
  revision: SourceRevision;
  title: string;
  subtitle: string;
  source?: string;
  highlights: SourceViewHighlight[];
  moveTooltipInfoById?: Map<string, MoveTooltipInfo>;
  registerMoveSegment?: RegisterMoveSegment;
};

export function CodePane({
  fileIndex,
  revision,
  title,
  subtitle,
  source = "",
  highlights,
  moveTooltipInfoById,
  registerMoveSegment,
}: CodePaneProps) {
  const lines = useMemo(
    () => buildSourceView(source, highlights),
    [source, highlights],
  );

  return (
    <article
      className="overflow-hidden rounded-[18px] border border-white/10 bg-slate-950/45"
      style={getCodePaneSurfaceStyle(revision)}
    >
      <CodePaneHeader revision={revision} title={title} subtitle={subtitle} />

      <CodePaneBody
        fileIndex={fileIndex}
        revision={revision}
        title={title}
        lines={lines}
        registerMoveSegment={registerMoveSegment}
        moveTooltipInfoById={moveTooltipInfoById}
      />
    </article>
  );
}
