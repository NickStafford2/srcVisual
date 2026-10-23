"""Cheap saved-artifact availability; opening still verifies exact run identity."""
from pathlib import Path
import json
from typing import Any

from srcdiffvisual.artifacts.store import ARTIFACT_SCHEMA_VERSION
from srcdiffvisual.runs.store import RunStore
from srcdiffvisual.workflow._source_renderer import SOURCE_PROJECTION_VERSION


def annotate_cached_pairs(
    document: dict[str, Any], *, store: RunStore, artifact_root: Path, repository_id: str,
) -> dict[str, Any]:
    _items = document["pairs"]["items"]
    _pairs = {_item["number"]: _item for _item in _items}
    _cached = set()
    for _number, _artifact_id in store.completed_artifacts_for_pairs(repository_id, tuple(_pairs)):
        if _number in _cached:
            continue
        try:
            _path = artifact_root / _artifact_id
            _manifest = json.loads((_path / "artifact.json").read_text(encoding="utf-8"))
            _analysis = _manifest.get("provenance", {}).get("history_analysis", {})
            _pair = _analysis.get("pair", {})
            _config = _manifest.get("analysis_configuration", {})
            _files = _manifest.get("files", [])
            if (
                _manifest.get("schema_version") == ARTIFACT_SCHEMA_VERSION
                and _manifest.get("artifact_id") == _artifact_id
                and _analysis.get("repository_id") == repository_id
                and _config.get("source_projection_version") == SOURCE_PROJECTION_VERSION
                and _config.get("include_skipped_tags") is True
                and isinstance(_pair.get("old_commit"), str)
                and isinstance(_pair.get("new_commit"), str)
                and _pair.get("old_commit") == _pairs[_number].get("old_commit")
                and _pair.get("new_commit") == _pairs[_number].get("new_commit")
                and (_path / "annotated.xml").is_file()
                and (_path / "index.sqlite").is_file()
                and all((_path / "sources" / _file["file_id"] / f"revision-{_revision}.txt").is_file()
                        for _file in _files for _revision in (0, 1))
            ):
                _cached.add(_number)
        except (OSError, ValueError, KeyError, TypeError, AttributeError):
            # Availability is a hint. Corrupt/incompatible candidates never
            # bypass the authoritative fingerprint and integrity checks on open.
            continue
    return {**document, "pairs": {**document["pairs"], "items": [
        {**_item, "cached": _item["number"] in _cached} for _item in _items
    ]}}
