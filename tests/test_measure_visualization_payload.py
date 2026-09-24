from __future__ import annotations

from pathlib import Path

from scripts.measure_visualization_payload import (
    _artifact_storage_metrics,
    _encoded_size,
    _summarize_source_projections,
    _summarize_tree_projections,
)


def test_source_projection_summary_counts_rows_bytes_and_truncation() -> None:
    _projections = [
        {
            "filename": "large.cpp",
            "truncated": True,
            "blocks": [
                {"type": "hunk", "rows": [{"kind": "context"}] * 3},
                {"type": "gap"},
            ],
        },
        {
            "filename": "small.cpp",
            "truncated": False,
            "blocks": [{"type": "hunk", "rows": [{"kind": "insert"}]}],
        },
    ]

    _summary = _summarize_source_projections(_projections)

    assert _summary["encoded_bytes"] == sum(map(_encoded_size, _projections))
    assert _summary["row_count"] == 4
    assert _summary["truncated_files"] == 1
    assert [_file["filename"] for _file in _summary["largest_files"]] == [
        "large.cpp",
        "small.cpp",
    ]


def test_tree_projection_summary_counts_returned_nodes() -> None:
    _projections = [
        {"file_id": "f-large", "node_count": 500, "truncated": True},
        {"file_id": "f-small", "node_count": 7, "truncated": False},
    ]

    _summary = _summarize_tree_projections(_projections)

    assert _summary["encoded_bytes"] == sum(map(_encoded_size, _projections))
    assert _summary["node_count"] == 507
    assert _summary["truncated_files"] == 1
    assert {_file["file_id"] for _file in _summary["largest_files"]} == {
        "f-large",
        "f-small",
    }


def test_artifact_storage_summary_separates_persisted_components(
    tmp_path: Path,
) -> None:
    _artifact_path = tmp_path / "artifact"
    _source_path = _artifact_path / "sources" / "f-one"
    _source_path.mkdir(parents=True)
    (_artifact_path / "artifact.json").write_bytes(b"manifest")
    (_artifact_path / "annotated.xml").write_bytes(b"xml")
    (_artifact_path / "index.sqlite").write_bytes(b"index")
    (_source_path / "revision-0.txt").write_bytes(b"left")
    (_source_path / "revision-1.txt").write_bytes(b"right")

    assert _artifact_storage_metrics(_artifact_path) == {
        "total_bytes": 25,
        "manifest_bytes": 8,
        "xml_bytes": 3,
        "index_bytes": 5,
        "source_bytes": 9,
    }
