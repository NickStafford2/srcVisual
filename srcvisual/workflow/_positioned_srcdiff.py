from __future__ import annotations

import xml.etree.ElementTree as ET
from pathlib import Path

from ..core.commands import run_command
from ..srcdiff.namespaces import POS_END, POS_START
from ..srcdiff.restore import restore_original_srcdiff_metadata
from ._notify import ProgressCallback, notify_progress


def run_srcdiff_with_positions(
    *,
    revision_0_dir: Path,
    revision_1_dir: Path,
    revision_0_input: Path,
    revision_1_input: Path,
    tmpdir: Path,
    progress: ProgressCallback | None = None,
) -> Path:
    _ = revision_0_dir
    _ = revision_1_dir
    positioned_path = tmpdir / "positioned.srcdiff.xml"

    notify_progress(progress, "Running srcdiff with position data.")
    result = run_command(
        [
            "srcdiff",
            "--position",
            str(revision_0_input),
            str(revision_1_input),
            "-o",
            str(positioned_path),
        ]
    )

    if not positioned_path.is_file():
        print("srcdiff stdout:")
        print(result.stdout)
        print("srcdiff stderr:")
        print(result.stderr)
        print("tmpdir contents:")
        for candidate in sorted(tmpdir.rglob("*")):
            print(candidate)

    assert positioned_path.is_file(), (
        f"srcdiff did not create expected positioned output: {positioned_path}"
    )

    if not positioned_path.read_text(encoding="utf-8").strip():
        print("srcdiff stdout:")
        print(result.stdout)
        print("srcdiff stderr:")
        print(result.stderr)
        print("tmpdir contents:")
        for candidate in sorted(tmpdir.rglob("*")):
            print(candidate)

    assert positioned_path.read_text(encoding="utf-8").strip(), (
        f"srcdiff created an empty positioned output: {positioned_path}"
    )

    return positioned_path


def has_position_annotations(srcdiff_xml: str) -> bool:
    root = ET.fromstring(srcdiff_xml)

    return any(
        POS_START in element.attrib and POS_END in element.attrib
        for element in root.iter()
    )


def restore_original_metadata_on_path(
    *,
    original_srcdiff_xml: str,
    generated_path: Path,
) -> None:
    restored_xml = restore_original_srcdiff_metadata(
        original_xml=original_srcdiff_xml,
        generated_xml=generated_path.read_text(encoding="utf-8"),
    )
    generated_path.write_text(restored_xml, encoding="utf-8")
