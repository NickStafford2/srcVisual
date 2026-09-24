from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path
from typing import Literal

import pytest

from srcvisual.artifacts.models import ArtifactProvenance
from srcvisual.artifacts.projections import (
    read_artifact_manifest,
    read_artifact_node,
    read_artifact_xml,
    read_source_projection,
    read_tree_projection,
)
from srcvisual.artifacts.store import publish_artifact
from srcvisual.files.models import RevisionFile, VisualizedFile
from srcvisual.workflow.models import VisualizationPayload


@dataclass(frozen=True)
class _FileCase:
    filename: str
    revision_0_filename: str
    revision_1_filename: str
    revision_0_source: str
    revision_1_source: str
    endpoint_roles: tuple[Literal["from", "to"], ...]


@dataclass(frozen=True)
class _ParityCase:
    name: str
    shape: Literal["archive", "single-root"]
    files: tuple[_FileCase, ...]
    from_filename: str
    to_filename: str


_PARITY_CASES = (
    _ParityCase(
        name="same-file",
        shape="single-root",
        files=(
            _FileCase(
                filename="original.cpp|modified.cpp",
                revision_0_filename="original.cpp",
                revision_1_filename="modified.cpp",
                revision_0_source="moved();\nkeep();\n",
                revision_1_source="keep();\nmoved();\n",
                endpoint_roles=("from", "to"),
            ),
        ),
        from_filename="original.cpp|modified.cpp",
        to_filename="original.cpp|modified.cpp",
    ),
    _ParityCase(
        name="cross-file",
        shape="archive",
        files=(
            _FileCase(
                filename="a.cpp",
                revision_0_filename="a.cpp",
                revision_1_filename="a.cpp",
                revision_0_source="moved();\n",
                revision_1_source="",
                endpoint_roles=("from",),
            ),
            _FileCase(
                filename="b.cpp",
                revision_0_filename="b.cpp",
                revision_1_filename="b.cpp",
                revision_0_source="",
                revision_1_source="moved();\n",
                endpoint_roles=("to",),
            ),
        ),
        from_filename="a.cpp",
        to_filename="b.cpp",
    ),
    _ParityCase(
        name="new-file",
        shape="archive",
        files=(
            _FileCase(
                filename="main.cpp",
                revision_0_filename="main.cpp",
                revision_1_filename="main.cpp",
                revision_0_source="moved();\n",
                revision_1_source="",
                endpoint_roles=("from",),
            ),
            _FileCase(
                filename="|new.hpp",
                revision_0_filename="",
                revision_1_filename="new.hpp",
                revision_0_source="",
                revision_1_source="moved();\n",
                endpoint_roles=("to",),
            ),
        ),
        from_filename="main.cpp",
        to_filename="|new.hpp",
    ),
    _ParityCase(
        name="deleted-file",
        shape="archive",
        files=(
            _FileCase(
                filename="old.hpp|",
                revision_0_filename="old.hpp",
                revision_1_filename="",
                revision_0_source="moved();\n",
                revision_1_source="",
                endpoint_roles=("from",),
            ),
            _FileCase(
                filename="main.cpp",
                revision_0_filename="main.cpp",
                revision_1_filename="main.cpp",
                revision_0_source="",
                revision_1_source="moved();\n",
                endpoint_roles=("to",),
            ),
        ),
        from_filename="old.hpp|",
        to_filename="main.cpp",
    ),
)


@pytest.mark.parametrize("case", _PARITY_CASES, ids=lambda _case: _case.name)
def test_move_projections_share_canonical_identities(
    tmp_path: Path,
    case: _ParityCase,
) -> None:
    _published = _publish_case(tmp_path, case)
    _artifact_id = _published.artifact_id
    _manifest = read_artifact_manifest(
        artifact_root=tmp_path,
        artifact_id=_artifact_id,
    )
    _move = _manifest["moves"]["items"][0]
    _from_ids = set(_move["from_node_ids"])
    _to_ids = set(_move["to_node_ids"])
    _endpoint_ids = _from_ids | _to_ids
    _files_by_id = {_file["file_id"]: _file for _file in _manifest["files"]}

    assert _manifest["provenance"]["origin"] == "upload"
    assert len(_endpoint_ids) == 2
    assert {_files_by_id[_file_id(_node_id)]["filename"] for _node_id in _from_ids} == {
        case.from_filename
    }
    assert {_files_by_id[_file_id(_node_id)]["filename"] for _node_id in _to_ids} == {
        case.to_filename
    }

    _source_ids: set[str] = set()
    _tree_ids: set[str] = set()
    for _file in _manifest["files"]:
        _file_case = next(
            _candidate
            for _candidate in case.files
            if _candidate.filename == _file["filename"]
        )
        _source = read_source_projection(
            artifact_root=tmp_path,
            artifact_id=_artifact_id,
            file_id=_file["file_id"],
            focus_profile="moves",
            context_lines=0,
        )
        assert _source["revision_0_line_count"] == len(
            _file_case.revision_0_source.splitlines()
        )
        assert _source["revision_1_line_count"] == len(
            _file_case.revision_1_source.splitlines()
        )
        _source_ids.update(_source_move_node_ids(_source))

        _tree = read_tree_projection(
            artifact_root=tmp_path,
            artifact_id=_artifact_id,
            file_id=_file["file_id"],
            focus_profile="moves",
        )
        assert _tree["root"]["node_id"] == _file["root_node_id"]
        _tree_ids.update(_tree_move_node_ids(_tree["root"]))

    _xml = read_artifact_xml(artifact_root=tmp_path, artifact_id=_artifact_id)
    _xml_ids = {
        _anchor["node_id"]
        for _anchor in _xml["anchors"]
        if _anchor["kind"] == "move"
    }
    _node_info_ids = {
        read_artifact_node(
            artifact_root=tmp_path,
            artifact_id=_artifact_id,
            node_id=_node_id,
        )["node"]["node_id"]
        for _node_id in _endpoint_ids
    }

    assert _source_ids == _endpoint_ids
    assert _tree_ids == _endpoint_ids
    assert _xml_ids == _endpoint_ids
    assert _node_info_ids == _endpoint_ids


def test_file_and_node_identities_survive_reordered_archive_units(
    tmp_path: Path,
) -> None:
    _files = _PARITY_CASES[1].files
    _first = _publish_case(
        tmp_path / "first",
        _ParityCase("first-order", "archive", _files, "a.cpp", "b.cpp"),
    )
    _second = _publish_case(
        tmp_path / "second",
        _ParityCase(
            "second-order",
            "archive",
            tuple(reversed(_files)),
            "a.cpp",
            "b.cpp",
        ),
    )

    _first_files = {
        _file["filename"]: _file["file_id"] for _file in _first.manifest["files"]
    }
    _second_files = {
        _file["filename"]: _file["file_id"] for _file in _second.manifest["files"]
    }
    _first_move = _first.manifest["moves"]["items"][0]
    _second_move = _second.manifest["moves"]["items"][0]

    assert [_file["filename"] for _file in _first.manifest["files"]] == [
        "a.cpp",
        "b.cpp",
    ]
    assert [_file["filename"] for _file in _second.manifest["files"]] == [
        "b.cpp",
        "a.cpp",
    ]
    assert _first_files == _second_files
    assert _first_move["from_node_ids"] == _second_move["from_node_ids"]
    assert _first_move["to_node_ids"] == _second_move["to_node_ids"]


def _publish_case(artifact_root: Path, case: _ParityCase):
    _files: list[VisualizedFile] = []
    _from_paths: list[str] = []
    _to_paths: list[str] = []
    _xml_units: list[str] = []

    for _unit_id, _file_case in enumerate(case.files, start=1):
        _root_path = "/src:unit" if case.shape == "single-root" else f"/src:unit[{_unit_id}]"
        _children = []
        _xml_children = []
        for _endpoint_index, _role in enumerate(_file_case.endpoint_roles, start=1):
            _path = f"{_root_path}/mv:{_role}[{_endpoint_index}]"
            if _role == "from":
                _from_paths.append(_path)
                _revision_0_span = _source_span(1)
                _revision_1_span = None
            else:
                _to_paths.append(_path)
                _revision_0_span = None
                _revision_1_span = _source_span(
                    1 if len(_file_case.endpoint_roles) == 1 else 2
                )
            _children.append(
                _tree_node(
                    path=_path,
                    label=_role,
                    kind="move",
                    move_id="move-1",
                    xml_span=_source_span(_endpoint_index + 1),
                    revision_0_span=_revision_0_span,
                    revision_1_span=_revision_1_span,
                )
            )
            _xml_children.append(f'<expr_stmt mv:id="move-1">{_role}</expr_stmt>')

        _tree = _tree_node(
            path=_root_path,
            label=f"unit: {_file_case.filename}",
            kind="plain",
            children=tuple(_children),
        )
        _files.append(
            VisualizedFile(
                revision_file=RevisionFile(
                    unit_id=_unit_id,
                    filename=_file_case.filename,
                    revision_0_filename=_file_case.revision_0_filename,
                    revision_1_filename=_file_case.revision_1_filename,
                    language="C++",
                    revision_0_source_code=_file_case.revision_0_source,
                    revision_1_source_code=_file_case.revision_1_source,
                ),
                tree=_tree,
            )
        )
        _xml_units.append(
            f'<unit filename="{_file_case.filename}">' + "".join(_xml_children) + "</unit>"
        )

    _xml = (
        _xml_units[0]
        if case.shape == "single-root"
        else '<unit url="before|after">' + "".join(_xml_units) + "</unit>"
    )
    _payload = VisualizationPayload(
        source_filename=f"{case.name}.srcmove.xml",
        moved_srcdiff_xml=_xml,
        move_results={
            "move_count": 1,
            "moves": [
                {
                    "move_id": "move-1",
                    "match_kind": "exact",
                    "from_node_ids": _from_paths,
                    "to_node_ids": _to_paths,
                }
            ],
        },
        has_position_data=True,
        files=tuple(_files),
    )
    return publish_artifact(
        artifact_root=artifact_root,
        canonical_payload=_payload,
        input_payload=_xml.encode(),
        provenance=ArtifactProvenance(origin="upload"),
    )


def _tree_node(
    *,
    path: str,
    label: str,
    kind: Literal["plain", "move"],
    move_id: str | None = None,
    xml_span: dict[str, int] | None = None,
    revision_0_span: dict[str, int] | None = None,
    revision_1_span: dict[str, int] | None = None,
    children: tuple[dict[str, object], ...] = (),
) -> dict[str, object]:
    return {
        "id": path,
        "path": path,
        "tag": "unit" if kind == "plain" else "expr_stmt",
        "label": label,
        "kind": kind,
        "move_id": move_id,
        "srcdiff_attributes": {},
        "xml_span": xml_span,
        "revision_0_span": revision_0_span,
        "revision_1_span": revision_1_span,
        "children": list(children),
    }


def _source_span(line: int) -> dict[str, int]:
    return {"start_line": line, "start_col": 1, "end_line": line, "end_col": 8}


def _file_id(node_id: str) -> str:
    return node_id.split(":n", 1)[0]


def _source_move_node_ids(projection: dict[str, object]) -> set[str]:
    _ids: set[str] = set()
    for _block in projection["blocks"]:  # type: ignore[union-attr]
        for _row in _block.get("rows", []):
            for _line in (_row["left"], _row["right"]):
                if _line is None:
                    continue
                _ids.update(
                    _anchor["node_id"]
                    for _anchor in _line["anchors"]
                    if _anchor["kind"] == "move"
                )
    return _ids


def _tree_move_node_ids(node: dict[str, object]) -> set[str]:
    _ids = {node["node_id"]} if node["kind"] == "move" else set()
    for _child in node["children"]:  # type: ignore[union-attr]
        _ids.update(_tree_move_node_ids(_child))
    return _ids
