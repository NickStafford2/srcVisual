from __future__ import annotations

import argparse
import json
from pathlib import Path
from tempfile import TemporaryDirectory
import time
from typing import Any, Callable

from srcvisual.artifacts.projections import (
    FOCUS_PROFILES,
    MAX_TREE_NODES,
    FocusProfile,
    read_artifact_manifest,
    read_artifact_xml,
    read_source_projection,
    read_tree_projection,
)
from srcvisual.workflow.payload import build_visualization_artifact


def main() -> None:
    _arguments = _parse_arguments()
    _input_path = _arguments.input.resolve(strict=True)
    _payload = _input_path.read_bytes()

    if _arguments.artifact_root is not None:
        _artifact_root = _arguments.artifact_root.resolve()
        _artifact_root.mkdir(parents=True, exist_ok=True)
        _report = measure_artifact(
            input_path=_input_path,
            payload=_payload,
            artifact_root=_artifact_root,
            focus_profile=_arguments.focus,
            context_lines=_arguments.context,
            tree_node_limit=_arguments.tree_node_limit,
        )
    else:
        with TemporaryDirectory(prefix="srcvisual-measure-") as _temporary_root:
            _report = measure_artifact(
                input_path=_input_path,
                payload=_payload,
                artifact_root=Path(_temporary_root),
                focus_profile=_arguments.focus,
                context_lines=_arguments.context,
                tree_node_limit=_arguments.tree_node_limit,
            )

    print(json.dumps(_report, indent=2, sort_keys=True))


def measure_artifact(
    *,
    input_path: Path,
    payload: bytes,
    artifact_root: Path,
    focus_profile: FocusProfile,
    context_lines: int,
    tree_node_limit: int,
) -> dict[str, object]:
    _started_at = time.perf_counter()
    _published = build_visualization_artifact(
        filename=input_path.name,
        payload=payload,
        artifact_root=artifact_root,
    )
    _build_seconds = time.perf_counter() - _started_at
    _artifact_id = _published.artifact_id

    _manifest, _manifest_seconds = _timed(
        lambda: read_artifact_manifest(
            artifact_root=artifact_root,
            artifact_id=_artifact_id,
        )
    )
    _xml, _xml_seconds = _timed(
        lambda: read_artifact_xml(
            artifact_root=artifact_root,
            artifact_id=_artifact_id,
        )
    )
    _source_projections, _source_seconds = _timed(
        lambda: [
            read_source_projection(
                artifact_root=artifact_root,
                artifact_id=_artifact_id,
                file_id=_file["file_id"],
                focus_profile=focus_profile,
                context_lines=context_lines,
            )
            for _file in _manifest["files"]
        ]
    )
    _tree_projections, _tree_seconds = _timed(
        lambda: [
            read_tree_projection(
                artifact_root=artifact_root,
                artifact_id=_artifact_id,
                file_id=_file["file_id"],
                focus_profile=focus_profile,
                node_limit=tree_node_limit,
            )
            for _file in _manifest["files"]
        ]
    )

    return {
        "artifact_schema_version": _manifest["schema_version"],
        "projection_schema_version": _manifest["projection_schema_version"],
        "build_seconds": round(_build_seconds, 3),
        "file_count": _manifest["file_count"],
        "canonical_node_count": _manifest["node_count"],
        "storage": _artifact_storage_metrics(_published.path),
        "projections": {
            "focus_profile": focus_profile,
            "context_lines": context_lines,
            "tree_node_limit": tree_node_limit,
            "manifest": {
                "read_seconds": round(_manifest_seconds, 3),
                "encoded_bytes": _encoded_size(_manifest),
            },
            "xml": {
                "read_seconds": round(_xml_seconds, 3),
                "encoded_bytes": _encoded_size(_xml),
                "document_bytes": len(_xml["xml"].encode("utf-8")),
                "anchor_count": len(_xml["anchors"]),
            },
            "sources": {
                "read_seconds": round(_source_seconds, 3),
                **_summarize_source_projections(_source_projections),
            },
            "trees": {
                "read_seconds": round(_tree_seconds, 3),
                **_summarize_tree_projections(_tree_projections),
            },
        },
    }


def _timed(_operation: Callable[[], Any]) -> tuple[Any, float]:
    _started_at = time.perf_counter()
    _result = _operation()
    return _result, time.perf_counter() - _started_at


def _artifact_storage_metrics(artifact_path: Path) -> dict[str, int]:
    _source_root = artifact_path / "sources"
    return {
        "total_bytes": sum(
            _path.stat().st_size for _path in artifact_path.rglob("*") if _path.is_file()
        ),
        "manifest_bytes": (artifact_path / "artifact.json").stat().st_size,
        "xml_bytes": (artifact_path / "annotated.xml").stat().st_size,
        "index_bytes": (artifact_path / "index.sqlite").stat().st_size,
        "source_bytes": sum(
            _path.stat().st_size for _path in _source_root.rglob("*") if _path.is_file()
        ),
    }


def _summarize_source_projections(
    projections: list[dict[str, Any]],
) -> dict[str, object]:
    _files = [
        {
            "filename": _projection["filename"],
            "encoded_bytes": _encoded_size(_projection),
            "row_count": sum(
                len(_block.get("rows", [])) for _block in _projection["blocks"]
            ),
            "truncated": _projection["truncated"],
        }
        for _projection in projections
    ]
    return {
        "encoded_bytes": sum(_file["encoded_bytes"] for _file in _files),
        "row_count": sum(_file["row_count"] for _file in _files),
        "truncated_files": sum(bool(_file["truncated"]) for _file in _files),
        "largest_files": sorted(
            _files,
            key=lambda _file: int(_file["encoded_bytes"]),
            reverse=True,
        )[:5],
    }


def _summarize_tree_projections(
    projections: list[dict[str, Any]],
) -> dict[str, object]:
    _files = [
        {
            "file_id": _projection["file_id"],
            "encoded_bytes": _encoded_size(_projection),
            "node_count": _projection["node_count"],
            "truncated": _projection["truncated"],
        }
        for _projection in projections
    ]
    return {
        "encoded_bytes": sum(_file["encoded_bytes"] for _file in _files),
        "node_count": sum(_file["node_count"] for _file in _files),
        "truncated_files": sum(bool(_file["truncated"]) for _file in _files),
        "largest_files": sorted(
            _files,
            key=lambda _file: int(_file["encoded_bytes"]),
            reverse=True,
        )[:5],
    }


def _encoded_size(_value: object) -> int:
    return len(json.dumps(_value, separators=(",", ":")).encode("utf-8"))


def _parse_arguments() -> argparse.Namespace:
    _parser = argparse.ArgumentParser(
        description="Measure an immutable artifact and its lazy projections.",
    )
    _parser.add_argument("input", type=Path)
    _parser.add_argument("--artifact-root", type=Path)
    _parser.add_argument("--focus", choices=FOCUS_PROFILES, default="changes-and-moves")
    _parser.add_argument("--context", type=_context_lines, default=3)
    _parser.add_argument("--tree-node-limit", type=_tree_node_limit, default=500)
    return _parser.parse_args()


def _context_lines(raw_value: str) -> int:
    _value = int(raw_value)
    if not 0 <= _value <= 100:
        raise argparse.ArgumentTypeError("context must be between 0 and 100")
    return _value


def _tree_node_limit(raw_value: str) -> int:
    _value = int(raw_value)
    if not 1 <= _value <= MAX_TREE_NODES:
        raise argparse.ArgumentTypeError(
            f"tree node limit must be between 1 and {MAX_TREE_NODES}"
        )
    return _value


if __name__ == "__main__":
    main()
