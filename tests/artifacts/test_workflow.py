from pathlib import Path

import pytest

from srcdiffvisual.artifacts.models import ArtifactProvenance
from srcdiffvisual.artifacts.store import read_artifact
from srcdiffvisual.workflow.payload import build_visualization_artifact
from srcdiffvisual.artifacts.projections import read_artifact_move
from srcdiffvisual.srcmove.existing_annotations import (
    build_move_results_from_moved_srcdiff,
)

EXAMPLES_DIR = Path(__file__).resolve().parents[2] / "examples"


@pytest.mark.parametrize("content_relationship", ["type1", "type2c", "type3"])
@pytest.mark.parametrize("archive", [False, True], ids=["single-root", "archive"])
def test_supplied_type2_categories_survive_artifact_pipeline(
    tmp_path: Path, content_relationship: str, archive: bool
) -> None:
    _xml = (EXAMPLES_DIR / "e2e_custom_pre_marked_move_small.xml").read_text()
    if archive:
        _xml = _xml[_xml.index("<unit"):]
        _xml = f'<unit xmlns="http://www.srcML.org/srcML/src">{_xml}</unit>'
    _results = build_move_results_from_moved_srcdiff(
        moved_srcdiff_xml=_xml, include_skipped_tags=True
    )
    _results["results_schema_version"] = 2
    _results["moves"][0]["content_relationship"] = content_relationship
    _results["content_relationships"] = {"type1": 0, "type2c": 0, "type3": 0}
    _results["content_relationships"][content_relationship] = 1
    _results["diagnostics"] = {
        "schema_version": 4,
        "candidates": [],
        "correspondences": [],
        "type2b_groups": [],
    }
    _published = build_visualization_artifact(
        filename="supplied-results.xml",
        payload=_xml.encode(),
        artifact_root=tmp_path,
        producer_move_results=_results,
    )
    _stored = read_artifact(artifact_root=tmp_path, artifact_id=_published.artifact_id)
    assert _stored.manifest["moves"]["items"][0]["content_relationship"] == content_relationship
    _move = read_artifact_move(
        artifact_root=tmp_path,
        artifact_id=_published.artifact_id,
        move_id=_results["moves"][0]["move_id"],
    )
    assert _move["move"]["content_relationship"] == content_relationship
    assert (
        _stored.payload.move_results["producer_metadata"]["content_relationships"]
        == _results["content_relationships"]
    )
    assert (
        _stored.payload.move_results["producer_metadata"]["diagnostics"]
        == _results["diagnostics"]
    )


def test_native_type2c_move_and_diagnostics_survive_pipeline(tmp_path: Path) -> None:
    from srcdiffvisual.artifacts.correspondences import read_correspondences

    _xml = (EXAMPLES_DIR / "e2e_generated_to_new_file_diff.xml").read_text()
    _xml = _xml.replace("<name>changed_function</name>", "<name>renamed_function</name>", 1)
    _published = build_visualization_artifact(
        filename="renamed-cross-file.xml",
        payload=_xml.encode(),
        artifact_root=tmp_path,
        diagnostics=True,
    )
    assert any(
        _move["content_relationship"] == "type2c"
        for _move in _published.manifest["moves"]["items"]
    )
    _page = read_correspondences(
        artifact_root=tmp_path, artifact_id=_published.artifact_id, kind="type2c"
    )
    assert _page["matched"] > 0
    assert all(_pair["kind"] == "type2c" for _pair in _page["items"])


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
    assert _stored.payload.move_results["moves"][0]["content_relationship"] == "type1"


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
