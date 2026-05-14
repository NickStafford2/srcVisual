from __future__ import annotations

from pathlib import Path

from srcvisual.core.archive import (
    detect_archive_kind,
    resolve_revision_output_paths,
    resolve_srcdiff_inputs,
)


def test_resolve_srcdiff_inputs_uses_files_for_single_file_archives() -> None:
    revision_0_dir = Path("/tmp/revision_0")
    revision_1_dir = Path("/tmp/revision_1")

    revision_0_input, revision_1_input = resolve_srcdiff_inputs(
        archive_info={"filename": "/abs/original.cpp|/abs/modified.cpp"},
        revision_0_dir=revision_0_dir,
        revision_1_dir=revision_1_dir,
    )

    assert revision_0_input == revision_0_dir / "original.cpp"
    assert revision_1_input == revision_1_dir / "modified.cpp"


def test_resolve_srcdiff_inputs_uses_directories_for_directory_archives() -> None:
    revision_0_dir = Path("/tmp/revision_0")
    revision_1_dir = Path("/tmp/revision_1")

    revision_0_input, revision_1_input = resolve_srcdiff_inputs(
        archive_info={"url": "/old|/new"},
        revision_0_dir=revision_0_dir,
        revision_1_dir=revision_1_dir,
    )

    assert revision_0_input == revision_0_dir
    assert revision_1_input == revision_1_dir


def test_resolve_revision_output_paths_skips_missing_side_for_directory_archives() -> None:
    revision_0_output, revision_1_output = resolve_revision_output_paths(
        archive_kind="directory",
        unit_info={"filename": "|foo.hpp"},
        unit=1,
        revision_0_dir=Path("/tmp/revision_0"),
        revision_1_dir=Path("/tmp/revision_1"),
        revision_0_input=Path("/tmp/revision_0"),
        revision_1_input=Path("/tmp/revision_1"),
    )

    assert revision_0_output is None
    assert revision_1_output == Path("/tmp/revision_1/foo.hpp")


def test_detect_archive_kind_prefers_directory_when_url_is_present() -> None:
    assert detect_archive_kind({"url": "/old|/new"}) == "directory"
    assert detect_archive_kind({"filename": "original.cpp|modified.cpp"}) == "file"
