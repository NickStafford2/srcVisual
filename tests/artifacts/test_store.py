from __future__ import annotations

import os
import sqlite3

import pytest

from srcdiffvisual.artifacts.models import ArtifactProvenance
from srcdiffvisual.artifacts.store import (
    ArtifactIntegrityError,
    check_artifact_integrity,
    cleanup_stale_staging,
    publish_artifact,
    read_artifact,
    validate_artifact,
)
from srcdiffvisual.files.models import RevisionFile, VisualizedFile
from srcdiffvisual.workflow.models import VisualizationPayload


def test_publish_and_read_artifact_round_trip(tmp_path) -> None:
    _payload = build_payload()

    _published = publish_artifact(
        artifact_root=tmp_path,
        canonical_payload=_payload,
        input_payload=b"original input",
        provenance=ArtifactProvenance(origin="upload"),
        artifact_id="a" * 32,
    )

    assert _published.artifact_id == "a" * 32
    assert _published.path == tmp_path / _published.artifact_id
    assert sorted(_path.name for _path in _published.path.iterdir()) == [
        "annotated.xml",
        "artifact.json",
        "index.sqlite",
        "sources",
    ]
    assert list((tmp_path / ".staging").iterdir()) == []

    _stored = read_artifact(
        artifact_root=tmp_path,
        artifact_id=_published.artifact_id,
    )

    assert _stored.payload == _payload
    assert _stored.manifest["checksums"]["input_sha256"] == (
        "f8fd1168a69398d64b6108eca26054bbf7e721235fadf996524a980fa947bbf1"
    )
    _file_manifest = _stored.manifest["files"][0]
    assert _file_manifest["file_id"].startswith("f-")
    assert _file_manifest["root_node_id"].startswith(f"{_file_manifest['file_id']}:n")

    with sqlite3.connect(_published.path / "index.sqlite") as _database:
        _nodes = _database.execute(
            "SELECT node_ordinal, child_count FROM nodes ORDER BY node_ordinal"
        ).fetchall()
    assert _nodes == [(0, 1), (1, 0)]


def test_read_artifact_rejects_modified_published_content(tmp_path) -> None:
    _published = publish_artifact(
        artifact_root=tmp_path,
        canonical_payload=build_payload(),
        input_payload=b"input",
        provenance=ArtifactProvenance(origin="upload"),
    )
    (_published.path / "annotated.xml").write_text("tampered", encoding="utf-8")

    with pytest.raises(ArtifactIntegrityError, match="checksum mismatch"):
        read_artifact(
            artifact_root=tmp_path,
            artifact_id=_published.artifact_id,
        )
    assert not _published.path.exists()
    assert len(list((tmp_path / ".quarantine").iterdir())) == 1


def test_validate_artifact_checks_integrity_without_loading_payload(tmp_path) -> None:
    _published = publish_artifact(
        artifact_root=tmp_path,
        canonical_payload=build_payload(),
        input_payload=b"input",
        provenance=ArtifactProvenance(origin="upload"),
    )

    assert (
        validate_artifact(
            artifact_root=tmp_path,
            artifact_id=_published.artifact_id,
        )
        is None
    )

    (_published.path / "annotated.xml").write_text("tampered", encoding="utf-8")
    with pytest.raises(ArtifactIntegrityError, match="checksum mismatch"):
        validate_artifact(
            artifact_root=tmp_path,
            artifact_id=_published.artifact_id,
        )
    assert not _published.path.exists()


def test_integrity_check_reports_corruption_without_quarantining(tmp_path) -> None:
    _published = publish_artifact(
        artifact_root=tmp_path,
        canonical_payload=build_payload(),
        input_payload=b"input",
        provenance=ArtifactProvenance(origin="upload"),
    )
    (_published.path / "annotated.xml").write_text("tampered", encoding="utf-8")

    with pytest.raises(ArtifactIntegrityError, match="checksum mismatch"):
        check_artifact_integrity(
            artifact_root=tmp_path,
            artifact_id=_published.artifact_id,
        )

    assert _published.path.is_dir()
    assert not (tmp_path / ".quarantine").exists()


def test_failed_publication_removes_staging_data(tmp_path) -> None:
    _payload = build_payload()
    _invalid_payload = VisualizationPayload(
        source_filename=_payload.source_filename,
        moved_srcdiff_xml=_payload.moved_srcdiff_xml,
        move_results={"moves": [{"move_id": "missing-node", "from_node_ids": ["x"]}]},
        has_position_data=_payload.has_position_data,
        files=_payload.files,
    )

    with pytest.raises(KeyError):
        publish_artifact(
            artifact_root=tmp_path,
            canonical_payload=_invalid_payload,
            input_payload=b"input",
            provenance=ArtifactProvenance(origin="upload"),
        )

    assert list((tmp_path / ".staging").iterdir()) == []
    assert [_path for _path in tmp_path.iterdir() if _path.name != ".staging"] == []


def test_cleanup_stale_staging_preserves_recent_and_unrecognized_entries(
    tmp_path,
) -> None:
    _staging = tmp_path / ".staging"
    _stale = _staging / ("a" * 32)
    _recent = _staging / ("b" * 32)
    _unrecognized = _staging / "keep-me"
    _stale.mkdir(parents=True)
    _recent.mkdir()
    _unrecognized.mkdir()
    os.utime(_stale, (1, 1))

    assert cleanup_stale_staging(tmp_path, older_than_seconds=60) == 1
    assert not _stale.exists()
    assert _recent.is_dir()
    assert _unrecognized.is_dir()


def build_payload() -> VisualizationPayload:
    _child = {
        "id": "/src:unit[1]/name[1]",
        "path": "/src:unit[1]/name[1]",
        "tag": "name",
        "label": "name: value",
        "kind": "plain",
        "move_id": None,
        "srcdiff_attributes": {},
        "xml_span": None,
        "revision_0_span": None,
        "revision_1_span": None,
        "children": [],
    }
    _tree = {
        "id": "/src:unit[1]",
        "path": "/src:unit[1]",
        "tag": "unit",
        "label": "unit: example.cpp",
        "kind": "plain",
        "move_id": None,
        "srcdiff_attributes": {},
        "xml_span": None,
        "revision_0_span": None,
        "revision_1_span": None,
        "children": [_child],
    }
    _revision_file = RevisionFile(
        unit_id=1,
        filename="example.cpp",
        revision_0_filename="before/example.cpp",
        revision_1_filename="after/example.cpp",
        language="C++",
        revision_0_source_code="int before;\n",
        revision_1_source_code="int after;\n",
    )
    return VisualizationPayload(
        source_filename="example.srcmove.xml",
        moved_srcdiff_xml='<unit filename="example.cpp" />\n',
        move_results={"move_count": 0, "moves": []},
        has_position_data=False,
        files=(VisualizedFile(revision_file=_revision_file, tree=_tree),),
    )


def test_incompatible_artifact_is_preserved_and_excluded_from_collection(tmp_path):
    import json
    from datetime import datetime, timezone
    from srcdiffvisual.artifacts.lifecycle import (
        inventory_artifacts,
        plan_artifact_collection,
        ArtifactRetentionPolicy,
    )
    from srcdiffvisual.artifacts.store import ArtifactCompatibilityError
    from srcdiffvisual.artifacts.projections import read_artifact_manifest

    _published = publish_artifact(
        artifact_root=tmp_path,
        canonical_payload=build_payload(),
        input_payload=b"input",
        provenance=ArtifactProvenance(origin="upload"),
    )
    _manifest_path = _published.path / "artifact.json"
    _manifest = json.loads(_manifest_path.read_text())
    _manifest["schema_version"] = 3
    _manifest_path.write_text(json.dumps(_manifest))
    _before = {
        str(_path.relative_to(_published.path)): _path.read_bytes()
        for _path in _published.path.rglob("*")
        if _path.is_file()
    }
    for _read in (read_artifact, validate_artifact, read_artifact_manifest):
        with pytest.raises(ArtifactCompatibilityError, match="regenerate"):
            _read(artifact_root=tmp_path, artifact_id=_published.artifact_id)
    assert _before == {
        str(_path.relative_to(_published.path)): _path.read_bytes()
        for _path in _published.path.rglob("*")
        if _path.is_file()
    }
    _inventory = inventory_artifacts(artifact_root=tmp_path)
    assert _inventory.to_dict()["incompatible_count"] == 1
    _plan = plan_artifact_collection(
        inventory=_inventory,
        policy=ArtifactRetentionPolicy(max_artifacts=0),
        now=datetime.now(timezone.utc),
    )
    assert _plan.candidates == ()


@pytest.mark.parametrize(
    "results",
    [
        {"moves": [], "results_schema_version": 1},
        {"moves": [], "producer_metadata": {"match_kinds": {"type2": 1}}},
    ],
)
def test_publication_rejects_legacy_results_before_writing(tmp_path, results):
    from dataclasses import replace

    _payload = replace(build_payload(), move_results=results)
    with pytest.raises(
        (ValueError, ArtifactIntegrityError), match="(Unsupported|legacy)"
    ):
        publish_artifact(
            artifact_root=tmp_path,
            canonical_payload=_payload,
            input_payload=b"input",
            provenance=ArtifactProvenance(origin="upload"),
        )
    assert list(tmp_path.iterdir()) == []
