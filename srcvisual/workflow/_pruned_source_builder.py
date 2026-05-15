from __future__ import annotations

from bisect import bisect_right
from dataclasses import dataclass
import xml.etree.ElementTree as ET

from srcvisual.core.namespaces import SKIPPED_TREE_TAGS, prefixed_name
from srcvisual.core.source_span import SourceSpan
from srcvisual.core.units import get_srcdiff_file_unit_elements
from srcvisual.files.models import RevisionFile

RevisionName = str
REVISION_0 = "revision_0"
REVISION_1 = "revision_1"
ALL_REVISIONS = (REVISION_0, REVISION_1)


@dataclass(frozen=True)
class RenderedRevisionFile:
    revision_file: RevisionFile
    revision_0_spans_by_path: dict[str, SourceSpan]
    revision_1_spans_by_path: dict[str, SourceSpan]


def build_pruned_revision_files(
    *,
    moved_srcdiff_xml: str,
    revision_files: tuple[RevisionFile, ...],
    include_skipped_tags: bool,
) -> tuple[RenderedRevisionFile, ...]:
    _root = ET.fromstring(moved_srcdiff_xml)
    _unit_elements = get_srcdiff_file_unit_elements(_root)
    _rendered_files: list[RenderedRevisionFile] = []

    assert len(_unit_elements) == len(revision_files), (
        "Pruned moved srcdiff XML and revision file metadata are out of sync. "
        f"xml units={len(_unit_elements)}, revision_files={len(revision_files)}."
    )

    for _unit_index, (_unit_element, _revision_file) in enumerate(
        zip(_unit_elements, revision_files, strict=True),
        start=1,
    ):
        _rendered_unit = _render_unit_sources(
            unit_element=_unit_element,
            path=f"/src:unit[{_unit_index}]",
            include_skipped_tags=include_skipped_tags,
        )
        _rendered_files.append(
            RenderedRevisionFile(
                revision_file=RevisionFile(
                    unit_id=_unit_index,
                    filename=_revision_file.filename,
                    revision_0_filename=_revision_file.revision_0_filename,
                    revision_1_filename=_revision_file.revision_1_filename,
                    language=_revision_file.language,
                    revision_0_source_code=_rendered_unit.revision_0_source_code,
                    revision_1_source_code=_rendered_unit.revision_1_source_code,
                ),
                revision_0_spans_by_path=_rendered_unit.revision_0_spans_by_path,
                revision_1_spans_by_path=_rendered_unit.revision_1_spans_by_path,
            )
        )

    return tuple(_rendered_files)


@dataclass
class _RenderedUnitSources:
    revision_0_source_code: str
    revision_1_source_code: str
    revision_0_spans_by_path: dict[str, SourceSpan]
    revision_1_spans_by_path: dict[str, SourceSpan]


@dataclass
class _TextBuffer:
    chunks: list[str]
    length: int = 0

    def append(self, text: str) -> None:
        self.chunks.append(text)
        self.length += len(text)

    def render(self) -> str:
        return "".join(self.chunks)


def _render_unit_sources(
    *,
    unit_element: ET.Element,
    path: str,
    include_skipped_tags: bool,
) -> _RenderedUnitSources:
    _buffers = {
        REVISION_0: _TextBuffer(chunks=[]),
        REVISION_1: _TextBuffer(chunks=[]),
    }
    _ranges = {
        REVISION_0: {},
        REVISION_1: {},
    }

    _render_element(
        element=unit_element,
        path=path,
        include_skipped_tags=include_skipped_tags,
        parent_revisions=set(ALL_REVISIONS),
        buffers=_buffers,
        ranges=_ranges,
    )

    _revision_0_source = _buffers[REVISION_0].render()
    _revision_1_source = _buffers[REVISION_1].render()

    return _RenderedUnitSources(
        revision_0_source_code=_revision_0_source,
        revision_1_source_code=_revision_1_source,
        revision_0_spans_by_path=_ranges_to_spans(
            _ranges[REVISION_0],
            _revision_0_source,
        ),
        revision_1_spans_by_path=_ranges_to_spans(
            _ranges[REVISION_1],
            _revision_1_source,
        ),
    )


def _render_element(
    *,
    element: ET.Element,
    path: str,
    include_skipped_tags: bool,
    parent_revisions: set[RevisionName],
    buffers: dict[RevisionName, _TextBuffer],
    ranges: dict[RevisionName, dict[str, tuple[int, int]]],
) -> None:
    _revisions = _active_revisions_for_element(element, parent_revisions)
    _start_offsets = {_revision: buffers[_revision].length for _revision in _revisions}

    _emit_text(element.text, _revisions, buffers)

    _tag_counts: dict[str, int] = {}

    for _child in list(element):
        if not include_skipped_tags and _child.tag in SKIPPED_TREE_TAGS:
            continue

        _child_name = prefixed_name(_child.tag)
        _tag_counts[_child_name] = _tag_counts.get(_child_name, 0) + 1
        _child_path = f"{path}/{_child_name}[{_tag_counts[_child_name]}]"

        _render_element(
            element=_child,
            path=_child_path,
            include_skipped_tags=include_skipped_tags,
            parent_revisions=_revisions,
            buffers=buffers,
            ranges=ranges,
        )
        _emit_text(_child.tail, _revisions, buffers)

    for _revision in _revisions:
        _end_offset = buffers[_revision].length
        _start_offset = _start_offsets[_revision]

        if _end_offset > _start_offset:
            ranges[_revision][path] = (_start_offset, _end_offset)


def _active_revisions_for_element(
    element: ET.Element,
    parent_revisions: set[RevisionName],
) -> set[RevisionName]:
    _tag = prefixed_name(element.tag)

    if _tag == "diff:delete":
        return parent_revisions & {REVISION_0}

    if _tag == "diff:insert":
        return parent_revisions & {REVISION_1}

    return set(parent_revisions)


def _emit_text(
    text: str | None,
    revisions: set[RevisionName],
    buffers: dict[RevisionName, _TextBuffer],
) -> None:
    if not text:
        return

    for _revision in revisions:
        buffers[_revision].append(text)


def _ranges_to_spans(
    ranges_by_path: dict[str, tuple[int, int]],
    source_code: str,
) -> dict[str, SourceSpan]:
    _line_starts = _compute_line_starts(source_code)

    return {
        _path: _offset_range_to_span(_start, _end, _line_starts)
        for _path, (_start, _end) in ranges_by_path.items()
    }


def _compute_line_starts(source_code: str) -> list[int]:
    _line_starts = [0]

    for _index, _character in enumerate(source_code):
        if _character == "\n":
            _line_starts.append(_index + 1)

    return _line_starts


def _offset_range_to_span(
    start_offset: int,
    end_offset: int,
    line_starts: list[int],
) -> SourceSpan:
    _start_line, _start_col = _offset_to_line_col(start_offset, line_starts)
    _end_line, _end_col = _offset_to_line_col(max(end_offset - 1, start_offset), line_starts)

    return SourceSpan(
        start_line=_start_line,
        start_col=_start_col,
        end_line=_end_line,
        end_col=_end_col,
    )


def _offset_to_line_col(
    offset: int,
    line_starts: list[int],
) -> tuple[int, int]:
    _line_index = bisect_right(line_starts, offset) - 1
    _line_start = line_starts[_line_index]
    return _line_index + 1, offset - _line_start + 1
