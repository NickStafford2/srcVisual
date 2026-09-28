from pathlib import Path

import pytest

from srcdiffvisual.artifacts.models import ArtifactProvenance
from srcdiffvisual.artifacts.store import read_artifact
from srcdiffvisual.workflow.payload import build_visualization_artifact

EXAMPLES_DIR = Path(__file__).resolve().parents[2] / "examples"


def test_archive_input_publishes_canonical_artifact(
    tmp_path: Path,
) -> None:
    _example = EXAMPLES_DIR / "e2e_generated_to_new_file_diff.xml"
    _input = _example.read_bytes()

    _published = build_visualization_artifact(
        filename=_example.name,
        payload=_input,
        artifact_root=tmp_path,
        provenance=ArtifactProvenance(origin="upload"),
    )
    _stored = read_artifact(
        artifact_root=tmp_path,
        artifact_id=_published.artifact_id,
    )

    assert "<diff:ws" in _stored.payload.moved_srcdiff_xml
    assert _stored.manifest["provenance"]["move_results_source"] == "generated"
    assert _stored.payload.move_results["moves"][0]["match_kind"] == "type1"


def test_single_root_input_round_trips_through_artifact(tmp_path: Path) -> None:
    _example = EXAMPLES_DIR / "e2e_generated_blocks_swapped_diff.xml"

    _published = build_visualization_artifact(
        filename=_example.name,
        payload=_example.read_bytes(),
        artifact_root=tmp_path,
    )
    _stored = read_artifact(
        artifact_root=tmp_path,
        artifact_id=_published.artifact_id,
    )

    assert len(_stored.payload.files) == 1
    assert _stored.payload.files[0].revision_file.filename == (
        "original.cpp|modified.cpp"
    )
    assert _stored.payload.files[0].tree is not None


@pytest.mark.parametrize(
    "example",
    ["e2e_generated_blocks_swapped_diff.xml", "e2e_generated_to_new_file_diff.xml"],
)
def test_diagnostics_survive_real_srcmove_run(tmp_path: Path, example: str) -> None:
    from srcdiffvisual.artifacts.correspondences import (
        read_correspondences,
        read_correspondence,
    )

    _example = EXAMPLES_DIR / example
    _published = build_visualization_artifact(
        filename=_example.name,
        payload=_example.read_bytes(),
        artifact_root=tmp_path,
        diagnostics=True,
    )
    _page = read_correspondences(
        artifact_root=tmp_path, artifact_id=_published.artifact_id
    )
    assert _page["available"] is True
    assert _page["total"] > 0
    _detail = read_correspondence(
        artifact_root=tmp_path,
        artifact_id=_published.artifact_id,
        index=_page["items"][0]["id"],
    )
    assert _detail["before"]["raw_text"].strip()
    assert _detail["after"]["raw_text"].strip()

    _stored = read_artifact(artifact_root=tmp_path, artifact_id=_published.artifact_id)
    for _pair in _page["items"]:
        _detail = read_correspondence(
            artifact_root=tmp_path,
            artifact_id=_published.artifact_id,
            index=_pair["id"],
        )
        for _side, _revision in (("before", 0), ("after", 1)):
            _endpoint = _detail[_side]
            _location = _endpoint["source_location"]
            assert _location["span"], _location
            assert _location["file_id"]
            _file = _stored.payload.files[_location["unit_id"] - 1].revision_file
            _text = getattr(_file, f"revision_{_revision}_source_code")
            _span = _location["span"]
            _lines = _text.splitlines(keepends=True)
            _start = (
                sum(map(len, _lines[: _span["start_line"] - 1]))
                + _span["start_col"]
                - 1
            )
            _end = sum(map(len, _lines[: _span["end_line"] - 1])) + _span["end_col"]
            assert _text[_start:_end] == _endpoint["raw_text"]
