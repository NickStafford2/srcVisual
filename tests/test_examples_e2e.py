from __future__ import annotations

from pathlib import Path
import xml.etree.ElementTree as ET

import pytest

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
        data={"srcdiff_xml": example_path.read_text(encoding="utf-8")},
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
    assert payload["schema_version"] == 2
    assert payload["projection_schema_version"] == 1
    assert isinstance(payload["artifact_id"], str)
    assert isinstance(payload["files"], list)


def test_artifact_interface_serves_real_bounded_projections(
    monkeypatch, tmp_path: Path
) -> None:
    monkeypatch.setenv("SRCVISUAL_ARTIFACT_ROOT", str(tmp_path))
    client = create_app().test_client()
    example_path = EXAMPLES_DIR / "e2e_generated_to_new_file_diff.xml"

    response = client.post(
        "/api/visualize",
        data={"srcdiff_xml": example_path.read_text(encoding="utf-8")},
    )

    assert response.status_code == 200
    manifest = response.get_json()
    assert manifest["schema_version"] == 2
    assert manifest["projection_schema_version"] == 1
    assert manifest["focus_profiles"] == [
        "changes-and-moves",
        "moves",
        "changes",
        "complete-file",
    ]
    assert "moved_srcdiff_xml" not in manifest
    assert "revision_0_source_code" not in manifest["files"][0]

    artifact_id = manifest["artifact_id"]
    move_node_id = manifest["moves"]["items"][0]["from_node_ids"][0]
    file_id = move_node_id.split(":n", 1)[0]
    file_manifest = next(
        file for file in manifest["files"] if file["file_id"] == file_id
    )
    source = client.get(
        f"/api/artifacts/{artifact_id}/files/{file_id}/source?focus=moves"
    )
    assert source.status_code == 200
    source_payload = source.get_json()
    assert source_payload["file_id"] == file_id
    assert any(block["type"] == "hunk" for block in source_payload["blocks"])
    assert any(
        anchor["node_id"] == move_node_id and anchor["kind"] == "move"
        for block in source_payload["blocks"]
        for row in block.get("rows", [])
        for line in (row["left"], row["right"])
        if line is not None
        for anchor in line["anchors"]
    )
    assert sum(
        len(block.get("rows", [])) for block in source_payload["blocks"]
    ) <= 2_000

    tree = client.get(
        f"/api/artifacts/{artifact_id}/files/{file_id}/tree?focus=moves&limit=5"
    )
    assert tree.status_code == 200
    tree_payload = tree.get_json()
    assert tree_payload["node_count"] <= 5
    assert tree_payload["root"]["node_id"] == file_manifest["root_node_id"]

    xml = client.get(f"/api/artifacts/{artifact_id}/xml")
    assert xml.status_code == 200
    assert "mv:id" in xml.get_json()["xml"]
    assert_artifact_projection_identities(client, manifest)


def test_blocks_swapped_example_accepts_single_root_artifact_inputs(
    monkeypatch, tmp_path: Path
) -> None:
    monkeypatch.setenv("SRCVISUAL_ARTIFACT_ROOT", str(tmp_path))
    client = create_app().test_client()
    example_path = EXAMPLES_DIR / "e2e_generated_blocks_swapped_diff.xml"
    original_root = ET.fromstring(example_path.read_text(encoding="utf-8"))
    original_filename = original_root.attrib.get("filename")
    assert isinstance(original_filename, str)

    response = client.post(
        "/api/visualize",
        data={"srcdiff_xml": example_path.read_text(encoding="utf-8")},
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

    manifest = response.get_json()
    assert isinstance(manifest, dict)
    assert [_file["filename"] for _file in manifest["files"]] == [
        original_filename
    ]

    _artifact_id = manifest["artifact_id"]
    _xml_response = client.get(f"/api/artifacts/{_artifact_id}/xml")
    assert _xml_response.status_code == 200
    moved_root = ET.fromstring(_xml_response.get_json()["xml"])
    assert moved_root.attrib.get("filename") == original_filename
    assert_artifact_projection_identities(client, manifest)


def assert_artifact_projection_identities(client, manifest: dict[str, object]) -> None:
    artifact_id = manifest["artifact_id"]
    moves = manifest["moves"]
    files = manifest["files"]
    assert isinstance(artifact_id, str)
    assert isinstance(moves, dict)
    assert isinstance(files, list)
    move_items = moves["items"]
    assert isinstance(move_items, list)
    assert move_items

    summary_node_ids = {
        node_id
        for move in move_items
        for key in ("from_node_ids", "to_node_ids")
        for node_id in move[key]
    }
    source_node_ids: set[str] = set()
    tree_node_ids: set[str] = set()
    for file_payload in files:
        assert isinstance(file_payload, dict)
        file_id = file_payload["file_id"]
        source_response = client.get(
            f"/api/artifacts/{artifact_id}/files/{file_id}/source"
            "?focus=moves&context=0"
        )
        tree_response = client.get(
            f"/api/artifacts/{artifact_id}/files/{file_id}/tree?focus=moves"
        )
        assert source_response.status_code == 200
        assert tree_response.status_code == 200
        collect_artifact_source_move_ids(source_response.get_json(), source_node_ids)
        collect_artifact_tree_move_ids(tree_response.get_json()["root"], tree_node_ids)

    xml_response = client.get(f"/api/artifacts/{artifact_id}/xml")
    assert xml_response.status_code == 200
    xml_node_ids = {
        anchor["node_id"]
        for anchor in xml_response.get_json()["anchors"]
        if anchor["kind"] == "move"
    }
    node_info_ids = set()
    for node_id in summary_node_ids:
        node_response = client.get(
            f"/api/artifacts/{artifact_id}/tree/nodes/{node_id}"
        )
        assert node_response.status_code == 200
        node_info_ids.add(node_response.get_json()["node"]["node_id"])

    assert source_node_ids == summary_node_ids
    assert tree_node_ids == summary_node_ids
    assert xml_node_ids == summary_node_ids
    assert node_info_ids == summary_node_ids


def collect_artifact_source_move_ids(
    projection: dict[str, object],
    node_ids: set[str],
) -> None:
    blocks = projection["blocks"]
    assert isinstance(blocks, list)
    for block in blocks:
        assert isinstance(block, dict)
        for row in block.get("rows", []):
            for line in (row["left"], row["right"]):
                if line is None:
                    continue
                node_ids.update(
                    anchor["node_id"]
                    for anchor in line["anchors"]
                    if anchor["kind"] == "move"
                )


def collect_artifact_tree_move_ids(
    node: dict[str, object] | None,
    node_ids: set[str],
) -> None:
    assert node is not None
    if node["kind"] == "move":
        node_id = node["node_id"]
        assert isinstance(node_id, str)
        node_ids.add(node_id)
    children = node["children"]
    assert isinstance(children, list)
    for child in children:
        assert isinstance(child, dict)
        collect_artifact_tree_move_ids(child, node_ids)
