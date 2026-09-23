from __future__ import annotations

import os
import sqlite3

import pytest

from srcvisual.artifacts.models import ArtifactProvenance
from srcvisual.artifacts.store import (
    ArtifactIntegrityError,
    cleanup_stale_staging,
    publish_artifact,
    read_artifact,
)
from srcvisual.files.models import RevisionFile, VisualizedFile
from srcvisual.workflow.models import VisualizationPayload


def test_publish_and_read_artifact_round_trip(tmp_path) -> None:
    _payload = build_payload()

    _published = publish_artifact(
        artifact_root=tmp_path,
        canonical_payload=_payload,
        input_payload=b"original input",
        provenance=ArtifactProvenance(origin="upload"),
    )

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
