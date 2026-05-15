from __future__ import annotations

from srcvisual.files.models import RevisionFile
from srcvisual.workflow._visualized_file_builder import build_visualized_files


def test_build_visualized_files_uses_unit_order_when_filenames_repeat() -> None:
    moved_srcdiff_xml = """<?xml version="1.0" encoding="UTF-8"?>
<unit xmlns="http://www.srcML.org/srcML/src" revision="1.0.0">
  <unit filename="dup.py" language="Python" />
  <unit filename="dup.py" language="Python" />
</unit>
"""
    revision_files = (
        RevisionFile(
            unit_id=1,
            filename="dup.py",
            revision_0_filename="before/first.py",
            revision_1_filename="after/first.py",
            language="Python",
            revision_0_source_code="before first\n",
            revision_1_source_code="after first\n",
        ),
        RevisionFile(
            unit_id=2,
            filename="dup.py",
            revision_0_filename="before/second.py",
            revision_1_filename="after/second.py",
            language="Python",
            revision_0_source_code="before second\n",
            revision_1_source_code="after second\n",
        ),
    )

    visualized_files = build_visualized_files(
        moved_srcdiff_xml=moved_srcdiff_xml,
        revision_files=revision_files,
        tree_by_unit={},
    )

    assert [file.revision_file.filename for file in visualized_files] == [
        "dup.py",
        "dup.py",
    ]
    assert [
        file.revision_file.revision_0_filename for file in visualized_files
    ] == [
        "before/first.py",
        "before/second.py",
    ]
    assert [
        file.revision_file.revision_1_filename for file in visualized_files
    ] == [
        "after/first.py",
        "after/second.py",
    ]
    assert [file.revision_file.revision_0_source_code for file in visualized_files] == [
        "before first\n",
        "before second\n",
    ]
    assert [file.revision_file.revision_1_source_code for file in visualized_files] == [
        "after first\n",
        "after second\n",
    ]
