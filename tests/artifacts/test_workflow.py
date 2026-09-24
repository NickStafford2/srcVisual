from pathlib import Path

from srcvisual.artifacts.models import ArtifactProvenance
from srcvisual.artifacts.store import read_artifact
from srcvisual.workflow.payload import build_visualization_artifact

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
    assert _stored.payload.move_results["moves"][0]["match_kind"] == "exact"


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
