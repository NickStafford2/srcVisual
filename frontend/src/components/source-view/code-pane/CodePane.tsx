import { useMemo } from "react";
import type { SourceRevision } from "../../../srcdiff/lineLinks";
import type { SourceViewHighlight } from "../../../srcdiff/srcView";
import { buildSourceView } from "../../../srcdiff/srcView";
import { CodePaneBody } from "./CodePaneBody";
import { CodePaneHeader } from "./CodePaneHeader";
import { getCodePaneSurfaceStyle } from "./codePaneStyles";
import type {
  RegisterMoveSegment,
  UnregisterMoveSegment,
} from "./moveConnectors";

type CodePaneProps = {
  fileIndex: number;
  filename: string;
  revision: SourceRevision;
  title: string;
  subtitle: string;
  source?: string;
  highlights: SourceViewHighlight[];
  registerMoveSegment?: RegisterMoveSegment;
  unregisterMoveSegment?: UnregisterMoveSegment;
};

export function CodePane({
  fileIndex,
  filename,
  revision,
  title,
  subtitle,
  source = "",
  highlights,
  registerMoveSegment,
  unregisterMoveSegment,
}: CodePaneProps) {
  const lines = useMemo(
    () => buildSourceView(source, highlights),
    [source, highlights],
  );
  const _accessibleLabel =
    title === filename
      ? `${title} ${subtitle.replace("revision", "Revision")}`
      : `${filename} ${title}`;

  return (
    <article
      aria-label={_accessibleLabel}
      data-file-name={filename}
      data-source-revision={revision}
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
        unregisterMoveSegment={unregisterMoveSegment}
      />
    </article>
  );
}
