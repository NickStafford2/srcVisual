from __future__ import annotations

from srcvisual.validation.move_regions import expect_optional_span_dict
from srcvisual.workflow.models import VisualizationPayload


def validate_visualization_payload(payload: VisualizationPayload) -> None:
    _payload_dict = payload.to_dict()

    assert isinstance(_payload_dict["source_filename"], str)
    assert _payload_dict["source_filename"]

    assert isinstance(_payload_dict["moved_srcdiff_xml"], str)
    assert _payload_dict["moved_srcdiff_xml"].strip()

    assert isinstance(_payload_dict["move_results"], dict)
    assert isinstance(_payload_dict["has_position_data"], bool)
    assert isinstance(_payload_dict["unit_count"], int)
    assert _payload_dict["unit_count"] == len(payload.files)
    assert isinstance(_payload_dict["files"], list)
    assert len(_payload_dict["files"]) == _payload_dict["unit_count"]

    for _file_index, _file_payload in enumerate(_payload_dict["files"]):
        assert isinstance(_file_payload, dict), (
            f"files[{_file_index}] must be a dictionary."
        )

        assert isinstance(_file_payload.get("unit_id"), int), (
            f"files[{_file_index}].unit_id must be an integer."
        )

        assert _file_payload["unit_id"] == _file_index + 1, (
            f"files[{_file_index}].unit_id must be {_file_index + 1}; "
            f"got {_file_payload['unit_id']}."
        )

        assert isinstance(_file_payload.get("filename"), str), (
            f"files[{_file_index}].filename must be a string."
        )

        assert isinstance(_file_payload.get("revision_0_source_code"), str), (
            f"files[{_file_index}].revision_0_source_code must be a string."
        )

        assert isinstance(_file_payload.get("revision_1_source_code"), str), (
            f"files[{_file_index}].revision_1_source_code must be a string."
        )

        _tree = _file_payload.get("tree")
        assert _tree is None or isinstance(_tree, dict), (
            f"files[{_file_index}].tree must be a dictionary or None."
        )

        if _tree is not None:
            validate_tree_payload_node(_tree)


def validate_tree_payload_node(node: dict[str, object]) -> None:
    _required_keys = {
        "id",
        "path",
        "tag",
        "label",
        "kind",
        "move_id",
        "srcdiff_attributes",
        "xml_span",
        "revision_0_span",
        "revision_1_span",
        "children",
    }

    assert set(node) == _required_keys, (
        f"Unexpected tree node keys at {node.get('path')!r}: "
        f"expected {sorted(_required_keys)}, got {sorted(node)}."
    )

    _path = node["path"]

    assert isinstance(node["id"], str)
    assert isinstance(_path, str)
    assert node["id"] == _path

    assert isinstance(node["tag"], str)
    assert isinstance(node["label"], str)
    assert node["kind"] in {"plain", "insert", "delete", "move"}
    assert node["move_id"] is None or isinstance(node["move_id"], str)
    assert isinstance(node["srcdiff_attributes"], dict)

    expect_optional_span_dict(node["xml_span"], _path, "xml_span")
    expect_optional_span_dict(node["revision_0_span"], _path, "revision_0_span")
    expect_optional_span_dict(node["revision_1_span"], _path, "revision_1_span")

    _children = node["children"]
    assert isinstance(_children, list)

    for _child in _children:
        assert isinstance(_child, dict), f"Tree node at {_path} has non-dict child."
        validate_tree_payload_node(_child)
