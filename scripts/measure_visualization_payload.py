from __future__ import annotations

import argparse
import json
from pathlib import Path
import time

from srcvisual.workflow.payload import build_visualization_payload


def main() -> None:
    _arguments = _parse_arguments()
    _input_path = _arguments.input.resolve(strict=True)
    _started_at = time.perf_counter()
    _payload = build_visualization_payload(
        filename=_input_path.name,
        payload=_input_path.read_bytes(),
        include_skipped_tags=_arguments.include_skipped_tags,
        pruning_level=_arguments.pruning_level,
    )
    _build_seconds = time.perf_counter() - _started_at
    _document = _payload.to_dict()
    _encoding_started_at = time.perf_counter()
    _encoded_payload = json.dumps(
        _document,
        separators=(",", ":"),
    ).encode("utf-8")
    _json_encode_seconds = time.perf_counter() - _encoding_started_at
    _encoded_sections = {
        _key: len(json.dumps(_value, separators=(",", ":")).encode("utf-8"))
        for _key, _value in _document.items()
    }
    _tree_bytes = sum(
        _encoded_size(_file.tree)
        for _file in _payload.files
        if _file.tree is not None
    )
    _file_tree_metrics = sorted(
        (
            {
                "filename": _file.revision_file.filename,
                "tree_bytes": _encoded_size(_file.tree),
                "tree_nodes": _count_tree_nodes(_file.tree),
            }
            for _file in _payload.files
            if _file.tree is not None
        ),
        key=lambda _metrics: int(_metrics["tree_bytes"]),
        reverse=True,
    )
    _file_metadata_bytes = sum(
        _encoded_size(
            {
                "unit_id": _file.revision_file.unit_id,
                "filename": _file.revision_file.filename,
                "revision_0_filename": _file.revision_file.revision_0_filename,
                "revision_1_filename": _file.revision_file.revision_1_filename,
                "language": _file.revision_file.language,
            }
        )
        for _file in _payload.files
    )

    print(
        json.dumps(
            {
                "build_seconds": round(_build_seconds, 3),
                "json_encode_seconds": round(_json_encode_seconds, 3),
                "encoded_payload_bytes": len(_encoded_payload),
                "encoded_section_bytes": _encoded_sections,
                "encoded_tree_bytes": _tree_bytes,
                "encoded_file_metadata_bytes": _file_metadata_bytes,
                "largest_file_trees": _file_tree_metrics[:5],
                "file_count": len(_payload.files),
                "tree_node_count": sum(
                    _count_tree_nodes(_file.tree)
                    for _file in _payload.files
                    if _file.tree is not None
                ),
                "revision_0_source_bytes": sum(
                    len(_file.revision_file.revision_0_source_code.encode("utf-8"))
                    for _file in _payload.files
                ),
                "revision_1_source_bytes": sum(
                    len(_file.revision_file.revision_1_source_code.encode("utf-8"))
                    for _file in _payload.files
                ),
            },
            indent=2,
            sort_keys=True,
        )
    )


def _encoded_size(_value: object) -> int:
    return len(json.dumps(_value, separators=(",", ":")).encode("utf-8"))


def _count_tree_nodes(_node: dict[str, object]) -> int:
    _children = _node["children"]
    assert isinstance(_children, list)
    return 1 + sum(
        _count_tree_nodes(_child)
        for _child in _children
        if isinstance(_child, dict)
    )


def _parse_arguments() -> argparse.Namespace:
    _parser = argparse.ArgumentParser(
        description="Measure the current monolithic visualization payload.",
    )
    _parser.add_argument("input", type=Path)
    _parser.add_argument(
        "--pruning-level",
        choices=("none", "file-only", "file-and-tree", "move-only"),
        default="none",
    )
    _parser.add_argument("--include-skipped-tags", action="store_true")
    return _parser.parse_args()


if __name__ == "__main__":
    main()
