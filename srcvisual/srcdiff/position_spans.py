from __future__ import annotations

from srcvisual.core.source_span import SourceSpan
from srcvisual.core.namespaces import (
    POS_END,
    POS_START,
)


def parse_position_spans(element) -> tuple[SourceSpan, ...] | None:
    start = element.attrib.get(POS_START)
    end = element.attrib.get(POS_END)

    if not start or not end:
        return None

    try:
        start_points = _parse_position_points(start)
        end_points = _parse_position_points(end)
    except ValueError:
        return None

    if len(start_points) != len(end_points):
        return None

    spans: list[SourceSpan] = []

    for index in range(len(start_points)):
        start_line, start_col = start_points[index]
        end_line, end_col = end_points[index]

        spans.append(
            SourceSpan(
                start_line=start_line,
                start_col=start_col,
                end_line=end_line,
                end_col=end_col,
            )
        )

    return tuple(spans)


def _parse_position_point(value: str) -> tuple[int, int]:
    line_text, col_text = value.split(":", 1)
    return int(line_text), int(col_text)


def _parse_position_points(value: str) -> tuple[tuple[int, int], ...]:
    return tuple(_parse_position_point(part) for part in value.split("|"))
