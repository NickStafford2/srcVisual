import type { ViewerLineSegment } from "../../../srcdiff/types";
import { getSourceSegmentClasses } from "../segmentStyles";
import { renderVisibleWhitespace } from "./renderVisibleWhitespace";

type CodeSegmentProps = {
  segment: ViewerLineSegment;
};

export function CodeSegment({ segment }: CodeSegmentProps) {
  const text = segment.highlighted
    ? renderVisibleWhitespace(segment.text)
    : segment.text;

  return (
    <span
      className={getSourceSegmentClasses(segment.kind, segment.highlighted)}
    >
      {text}
    </span>
  );
}
