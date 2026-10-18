from __future__ import annotations

from contextlib import closing
from functools import lru_cache
import json
from pathlib import Path
from typing import Any
import xml.etree.ElementTree as ET
import zlib

from srcdiffvisual.artifacts.store import _connect_readonly
from srcdiffvisual.core.namespaces import SKIPPED_TREE_TAGS, prefixed_name
from srcdiffvisual.core.units import get_srcdiff_file_unit_elements
from srcdiffvisual.srcmove.attributes import MV_ID


def read_secondary_srcdiff_moves(_artifact_path: Path) -> dict[str, dict[str, Any]]:
    _xml_path = _artifact_path / "annotated.xml"
    _stat = _xml_path.stat()
    return _secondary_srcdiff_moves(str(_artifact_path), _stat.st_mtime_ns, _stat.st_size)


@lru_cache(maxsize=8)
def _secondary_srcdiff_moves(
    _artifact_path: str, _mtime_ns: int, _size: int,
) -> dict[str, dict[str, Any]]:
    """Recover upstream identities hidden by the legacy one-move-per-node index."""
    _root = ET.parse(Path(_artifact_path) / "annotated.xml").getroot()
    _dual_ids = {
        _element.get("move") for _element in _root.iter()
        if _element.get(MV_ID) is not None and _element.get("move") is not None
    }
    if not _dual_ids:
        return {}
    with closing(_connect_readonly(Path(_artifact_path) / "index.sqlite")) as _database:
        _rows = _database.execute(
            "SELECT file_id, node_ordinal, payload FROM nodes WHERE move_id IS NOT NULL"
        ).fetchall()
    _by_path = {}
    for _file_id, _ordinal, _compressed in _rows:
        _payload = json.loads(zlib.decompress(_compressed))
        _by_path[_payload["path"]] = {
            "node_id": f"{_file_id}:n{_ordinal:08x}", **_payload,
        }
    _moves: dict[str, dict[str, Any]] = {}

    def _visit(_element: ET.Element, _path: str) -> None:
        _move_id = _element.get("move")
        if _move_id in _dual_ids:
            _node = _by_path.get(_path)
            if _node is None:
                raise ValueError(f"Upstream move endpoint is missing from artifact index: {_path}")
            _tag = prefixed_name(_element.tag)
            if _tag not in {"diff:delete", "diff:insert"}:
                raise ValueError(f"Upstream move annotation is not on a diff wrapper: {_path}")
            _record = _moves.setdefault(_move_id, {
                "move_id": _move_id, "move_origin": "srcdiff",
                "result_provenance": "xml-annotation",
                "from_node_ids": [], "to_node_ids": [],
                "from_xpaths": [], "to_xpaths": [],
                "from_raw_texts": [], "to_raw_texts": [],
                "annotations": [],
            })
            _side = "from" if _tag == "diff:delete" else "to"
            _record[f"{_side}_node_ids"].append(_node["node_id"])
            _record[f"{_side}_xpaths"].append(_path)
            _record[f"{_side}_raw_texts"].append("".join(_element.itertext()))
            if _element.get(MV_ID) is not None:
                _record["annotations"].append({
                    "node_id": _node["node_id"], "move_id": _move_id,
                    "move_origin": "srcdiff",
                })
        _counts: dict[str, int] = {}
        for _child in _element:
            if _child.tag in SKIPPED_TREE_TAGS:
                continue
            _name = prefixed_name(_child.tag)
            _counts[_name] = _counts.get(_name, 0) + 1
            _visit(_child, f"{_path}/{_name}[{_counts[_name]}]")

    for _number, _unit in enumerate(get_srcdiff_file_unit_elements(_root), start=1):
        _visit(_unit, f"/src:unit[{_number}]")
    return _moves
