from __future__ import annotations

from srcvisual.core.source_span import SourceSpan
from srcvisual.files.models import RevisionFile
from srcvisual.workflow._pruned_source_builder import (
    build_pruned_revision_files,
    _compute_line_starts,
    _offset_to_line_col,
)


def test_build_pruned_revision_files_renders_revision_specific_source() -> None:
    moved_srcdiff_xml = """<?xml version="1.0" encoding="UTF-8"?>
<unit xmlns="http://www.srcML.org/srcML/src"
      xmlns:diff="http://www.srcML.org/srcDiff"><unit filename="example.cpp"><expr_stmt><name>keep</name>;</expr_stmt><diff:delete><expr_stmt><name>old</name>;</expr_stmt></diff:delete><diff:insert><expr_stmt><name>new</name>;</expr_stmt></diff:insert></unit></unit>
"""
    revision_files = (
        RevisionFile(
            unit_id=1,
            filename="example.cpp",
            revision_0_filename="before/example.cpp",
            revision_1_filename="after/example.cpp",
            language="C++",
            revision_0_source_code="",
            revision_1_source_code="",
        ),
    )

    rendered_files = build_pruned_revision_files(
        moved_srcdiff_xml=moved_srcdiff_xml,
        revision_files=revision_files,
        include_skipped_tags=False,
    )

    rendered = rendered_files[0]

    assert rendered.revision_file.revision_0_source_code == "keep;old;"
    assert rendered.revision_file.revision_1_source_code == "keep;new;"
    assert rendered.revision_0_spans_by_path["/src:unit[1]/expr_stmt[1]"] == SourceSpan(
        start_line=1,
        start_col=1,
        end_line=1,
        end_col=5,
    )
    assert rendered.revision_1_spans_by_path["/src:unit[1]/diff:insert[1]"] == SourceSpan(
        start_line=1,
        start_col=6,
        end_line=1,
        end_col=9,
    )


def test_offset_to_line_col_uses_line_starts_correctly() -> None:
    line_starts = _compute_line_starts("abc\ndef\n")

    assert _offset_to_line_col(0, line_starts) == (1, 1)
    assert _offset_to_line_col(3, line_starts) == (1, 4)
    assert _offset_to_line_col(4, line_starts) == (2, 1)
    assert _offset_to_line_col(7, line_starts) == (2, 4)
