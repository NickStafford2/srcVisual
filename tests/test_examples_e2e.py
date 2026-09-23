from __future__ import annotations

from pathlib import Path
import xml.etree.ElementTree as ET

import pytest

from srcvisual.core.units import get_srcdiff_file_unit_elements
from srcvisual.web.app import create_app

EXAMPLES_DIR = Path(__file__).resolve().parents[1] / "examples"
EXAMPLE_PATHS = (
    sorted(
        path
        for path in EXAMPLES_DIR.iterdir()
        if path.is_file() and path.suffix in {".xml", ".srcdiff"}
    )
    if EXAMPLES_DIR.is_dir()
    else []
)


@pytest.mark.skipif(
    not EXAMPLE_PATHS,
    reason="No example files found in srcVisual/examples.",
)
@pytest.mark.parametrize("example_path", EXAMPLE_PATHS, ids=lambda path: path.name)
def test_visualize_endpoint_accepts_example_file(example_path: Path) -> None:
    client = create_app().test_client()

    response = client.post(
        "/api/visualize",
        data={
            "srcdiff_xml": example_path.read_text(encoding="utf-8"),
            "include_skipped_tags": "false",
        },
    )

    if response.status_code != 200:
        payload = response.get_json(silent=True)
        error_message = (
            payload["error"]
            if isinstance(payload, dict) and "error" in payload
            else response.get_data(as_text=True)
        )
        pytest.fail(
            f"{example_path.name} failed with status {response.status_code}: {error_message}"
        )

    payload = response.get_json()
    assert isinstance(payload, dict)
    assert_move_node_ids_exist_in_tree(payload)


def test_to_new_file_example_matches_srcmove_results_and_tree_ownership() -> None:
    client = create_app().test_client()
    example_path = EXAMPLES_DIR / "e2e_generated_to_new_file_diff.xml"
    response = client.post(
        "/api/visualize",
        data={
            "srcdiff_xml": example_path.read_text(encoding="utf-8"),
            "include_skipped_tags": "false",
        },
    )

    if response.status_code != 200:
        payload = response.get_json(silent=True)
        error_message = (
            payload["error"]
            if isinstance(payload, dict) and "error" in payload
            else response.get_data(as_text=True)
        )
        pytest.fail(
            "e2e_generated_to_new_file_diff.xml failed with status "
            f"{response.status_code}: {error_message}"
        )

    payload = response.get_json()
    assert isinstance(payload, dict)

    moves = payload["move_results"]["moves"]
    assert isinstance(moves, list)
    assert len(moves) == 1
    move = moves[0]
    assert isinstance(move, dict)
    move_id = move["move_id"]
    assert isinstance(move_id, str)
    assert move["match_kind"] == "exact"
    assert move["from_node_ids"] == [
        "/src:unit[2]/diff:delete[1]/function[1]"
    ]
    assert move["to_node_ids"] == [
        "/src:unit[1]/diff:insert[1]/function[1]"
    ]

    for file_payload in payload["files"]:
        assert isinstance(file_payload, dict)
        assert file_payload["tree"]["path"] == f"/src:unit[{file_payload['unit_id']}]"
        assert file_payload["tree"]["label"] == f"unit: {file_payload['filename']}"

    files_by_filename = {
        file_payload["filename"]: file_payload for file_payload in payload["files"]
    }

    assert files_by_filename["main.cpp"]["revision_0_source_code"].startswith(
        "int changed_function() {"
    )
    assert "int main(int argc, char **argv)" not in files_by_filename["main.cpp"][
        "revision_0_source_code"
    ]
    assert files_by_filename["main.cpp"]["revision_1_source_code"] == (
        '#include "foo.hpp"\n\n\n'
    )
    assert files_by_filename["|foo.hpp"]["revision_0_source_code"] == ""
    assert files_by_filename["|foo.hpp"]["revision_1_source_code"].startswith(
        "int changed_function() {"
    )

    actual_tree_records = sorted(build_actual_tree_records(payload["files"]))

    assert actual_tree_records == [
        (
            move_id,
            "main.cpp",
            "/src:unit[2]/diff:delete[1]/function[1]",
            "move",
        ),
        (
            move_id,
            "|foo.hpp",
            "/src:unit[1]/diff:insert[1]/function[1]",
            "move",
        ),
    ]


def test_blocks_swapped_example_accepts_single_file_srcdiff_inputs() -> None:
    client = create_app().test_client()
    example_path = EXAMPLES_DIR / "e2e_generated_blocks_swapped_diff.xml"
    original_root = ET.fromstring(example_path.read_text(encoding="utf-8"))
    original_filename = original_root.attrib.get("filename")
    assert isinstance(original_filename, str)

    response = client.post(
        "/api/visualize",
        data={
            "srcdiff_xml": example_path.read_text(encoding="utf-8"),
            "include_skipped_tags": "false",
        },
    )

    if response.status_code != 200:
        payload = response.get_json(silent=True)
        error_message = (
            payload["error"]
            if isinstance(payload, dict) and "error" in payload
            else response.get_data(as_text=True)
        )
        pytest.fail(
            "e2e_generated_blocks_swapped_diff.xml failed with status "
            f"{response.status_code}: {error_message}"
        )

    payload = response.get_json()
    assert isinstance(payload, dict)
    assert [file_payload["filename"] for file_payload in payload["files"]] == [
        original_filename
    ]

    moved_root = ET.fromstring(payload["moved_srcdiff_xml"])
    assert moved_root.attrib.get("filename") == original_filename


def test_noop_single_file_srcdiff_keeps_file_tree_and_source_when_pruned() -> None:
    client = create_app().test_client()
    xml = """<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<unit xmlns="http://www.srcML.org/srcML/src" xmlns:diff="http://www.srcML.org/srcDiff" revision="1.0.0" language="C++" filename="original.cpp|modified.cpp"><function><type><name>int</name></type> <name>foo</name><parameter_list>()</parameter_list> <block>{<block_content/>}</block></function>

<function><type><name>int</name></type> <name>main</name><parameter_list>()</parameter_list> <block>{<block_content>
  <decl_stmt><decl><type><name>int</name></type> <name>first</name>  <init>= <expr><literal type="number">123</literal></expr></init></decl>;</decl_stmt>
  <decl_stmt><decl><type><name>int</name></type> <name>second</name> <init>= <expr><literal type="number">456</literal></expr></init></decl>;</decl_stmt>
  <return>return <expr><literal type="number">0</literal></expr>;</return>
</block_content>}</block></function>
</unit>"""

    response = client.post(
        "/api/visualize",
        data={
            "srcdiff_xml": xml,
            "include_skipped_tags": "false",
            "pruning_level": "file-and-tree",
        },
    )

    if response.status_code != 200:
        payload = response.get_json(silent=True)
        error_message = (
            payload["error"]
            if isinstance(payload, dict) and "error" in payload
            else response.get_data(as_text=True)
        )
        pytest.fail(
            "No-op single-file srcdiff failed with status "
            f"{response.status_code}: {error_message}"
        )

    payload = response.get_json()
    assert isinstance(payload, dict)
    assert payload["unit_count"] == 0
    assert len(payload["files"]) == 0
    assert "<unit" not in payload["moved_srcdiff_xml"]
    assert "<srcdiff" in payload["moved_srcdiff_xml"]

    moved_root = ET.fromstring(payload["moved_srcdiff_xml"])
    assert list(get_srcdiff_file_unit_elements(moved_root)) == []


def build_actual_tree_records(
    files: list[dict[str, object]],
) -> list[tuple[str, str, str, str]]:
    records: list[tuple[str, str, str, str]] = []

    for file_payload in files:
        filename = file_payload["filename"]
        tree = file_payload["tree"]
        assert isinstance(filename, str)
        assert isinstance(tree, dict)
        collect_tree_records(tree, filename, records)

    return records


def assert_move_node_ids_exist_in_tree(payload: dict[str, object]) -> None:
    files = payload["files"]
    move_results = payload["move_results"]
    assert isinstance(files, list)
    assert isinstance(move_results, dict)

    tree_paths: set[str] = set()

    for file_payload in files:
        assert isinstance(file_payload, dict)
        tree = file_payload.get("tree")
        assert isinstance(tree, dict)
        collect_tree_paths(tree, tree_paths)

    moves = move_results.get("moves")
    assert isinstance(moves, list)

    for move in moves:
        assert isinstance(move, dict)

        for key in ("from_node_ids", "to_node_ids"):
            node_ids = move.get(key)
            assert isinstance(node_ids, list)

            for node_id in node_ids:
                assert isinstance(node_id, str)
                assert node_id in tree_paths, (
                    f"Move node id from {key} is missing from tree paths: {node_id}"
                )


def collect_tree_records(
    node: dict[str, object],
    filename: str,
    records: list[tuple[str, str, str, str]],
) -> None:
    move_id = node.get("move_id")
    path = node.get("path")
    kind = node.get("kind")

    if move_id is not None:
        assert isinstance(move_id, str)
        assert isinstance(path, str)
        assert isinstance(kind, str)
        records.append((move_id, filename, path, kind))

    children = node.get("children")
    assert isinstance(children, list)

    for child in children:
        assert isinstance(child, dict)
        collect_tree_records(child, filename, records)


def collect_tree_paths(node: dict[str, object], tree_paths: set[str]) -> None:
    path = node.get("path")
    children = node.get("children")

    assert isinstance(path, str)
    assert isinstance(children, list)

    tree_paths.add(path)

    for child in children:
        assert isinstance(child, dict)
        collect_tree_paths(child, tree_paths)
