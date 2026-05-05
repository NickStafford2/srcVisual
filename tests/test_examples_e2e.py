from __future__ import annotations

import json
from pathlib import Path
import re

import pytest

from srcvisual.app import create_app
from srcvisual.core.validation import (
    build_filename_to_unit_index,
    parse_srcmove_result_moves,
)

EXAMPLES_DIR = Path(__file__).resolve().parents[1] / "examples"
SRCMOVE_FIXTURES_DIR = (
    Path(__file__).resolve().parents[2] / "srcMove" / "test" / "e2e_generated"
)
EXAMPLE_PATHS = sorted(
    path
    for path in EXAMPLES_DIR.iterdir()
    if path.is_file() and path.suffix in {".xml", ".srcdiff"}
) if EXAMPLES_DIR.is_dir() else []
FILENAME_XPATH_PATTERN = re.compile(
    r"^/src:unit\[@filename=(?P<quote>['\"])(?P<filename>.*?)(?P=quote)\]"
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
        error_message = payload["error"] if isinstance(payload, dict) and "error" in payload else response.get_data(as_text=True)
        pytest.fail(f"{example_path.name} failed with status {response.status_code}: {error_message}")


def test_to_new_file_example_matches_srcmove_results_and_tree_ownership() -> None:
    client = create_app().test_client()
    example_path = EXAMPLES_DIR / "e2e_generated_to_new_file_diff.xml"
    expected_results_path = SRCMOVE_FIXTURES_DIR / "to_new_file" / "results.json"

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

    filename_to_unit_index = build_filename_to_unit_index(
        payload["annotated_srcdiff_xml"]
    )
    expected_results = json.loads(expected_results_path.read_text(encoding="utf-8"))
    actual_moves = parse_srcmove_result_moves(
        payload["move_results"],
        filename_to_unit_index=filename_to_unit_index,
    )
    expected_moves = parse_srcmove_result_moves(
        expected_results,
        filename_to_unit_index=filename_to_unit_index,
    )

    assert [
        (move.move_id, move.from_xpaths, move.to_xpaths)
        for move in actual_moves
    ] == [
        (move.move_id, move.from_xpaths, move.to_xpaths)
        for move in expected_moves
    ]

    for file_payload in payload["files"]:
        assert isinstance(file_payload, dict)
        assert file_payload["tree"]["path"] == f"/src:unit[{file_payload['unit_id']}]"
        assert file_payload["tree"]["label"] == f"unit: {file_payload['filename']}"

    expected_tree_records = sorted(
        build_expected_tree_records(expected_results, expected_moves)
    )
    actual_tree_records = sorted(build_actual_tree_records(payload["files"]))

    assert actual_tree_records == expected_tree_records


def build_expected_tree_records(
    expected_results: dict[str, object],
    expected_moves,
) -> list[tuple[str, str, str, str]]:
    moves = expected_results["moves"]
    assert isinstance(moves, list)
    records: list[tuple[str, str, str, str]] = []

    for raw_move, parsed_move in zip(moves, expected_moves, strict=True):
        assert isinstance(raw_move, dict)
        move_id = raw_move["move_id"]
        assert isinstance(move_id, str)

        raw_from_xpaths = raw_move["from_xpaths"]
        raw_to_xpaths = raw_move["to_xpaths"]
        assert isinstance(raw_from_xpaths, list)
        assert isinstance(raw_to_xpaths, list)

        for raw_xpath, normalized_xpath in zip(
            raw_from_xpaths,
            parsed_move.from_xpaths,
            strict=True,
        ):
            assert isinstance(raw_xpath, str)
            records.append(
                (
                    move_id,
                    extract_filename_from_xpath(raw_xpath),
                    normalized_xpath,
                    "move",
                )
            )

        for raw_xpath, normalized_xpath in zip(
            raw_to_xpaths,
            parsed_move.to_xpaths,
            strict=True,
        ):
            assert isinstance(raw_xpath, str)
            records.append(
                (
                    move_id,
                    extract_filename_from_xpath(raw_xpath),
                    normalized_xpath,
                    "move",
                )
            )

    return records


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


def extract_filename_from_xpath(xpath: str) -> str:
    match = FILENAME_XPATH_PATTERN.match(xpath)
    assert match is not None, f"Expected filename-based srcMove xpath, got {xpath!r}."
    return match.group("filename")
