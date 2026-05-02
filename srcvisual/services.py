# srcvisual/services.py

from __future__ import annotations

import tempfile
from pathlib import Path

from .core.archive import extract_revision_files
from .core.commands import run_command
from .core.filenames import sanitize_filename
from .core.tree_builder import build_tree_index


def build_visualization_payload(
    *,
    filename: str,
    payload: bytes,
    include_skipped_tags: bool = False,
) -> dict[str, object]:
    with tempfile.TemporaryDirectory(prefix="srcvisual-") as tmpdir_name:
        tmpdir = Path(tmpdir_name)
        input_path = tmpdir / sanitize_filename(filename)
        input_path.write_bytes(payload)

        revision_zero_dir = tmpdir / "revision_0"
        revision_one_dir = tmpdir / "revision_1"
        revision_zero_dir.mkdir()
        revision_one_dir.mkdir()

        original_files = extract_revision_files(
            input_path=input_path,
            revision_zero_dir=revision_zero_dir,
            revision_one_dir=revision_one_dir,
        )

        if not original_files:
            raise ValueError("No units were found in the uploaded srcdiff file.")

        positioned_path = tmpdir / "positioned.srcdiff.xml"
        annotated_path = tmpdir / "annotated.srcdiff.xml"

        run_command(
            [
                "srcdiff",
                "--position",
                str(revision_zero_dir),
                str(revision_one_dir),
                "-o",
                str(positioned_path),
            ]
        )

        run_command(["srcMove", str(positioned_path), str(annotated_path)])

        annotated_srcdiff_xml = annotated_path.read_text(encoding="utf-8")

        tree_by_filename, has_position_data = build_tree_index(
            annotated_srcdiff_xml,
            include_skipped_tags=include_skipped_tags,
        )

        files: list[dict[str, object]] = []
        for file_info in original_files:
            tree = tree_by_filename.get(file_info["filename"])
            files.append(
                {
                    **file_info,
                    "tree": tree,
                }
            )

        return {
            "source_filename": filename,
            "annotated_srcdiff_xml": annotated_srcdiff_xml,
            "units": str(len(files)),
            "has_position_data": has_position_data,
            "files": files,
        }
