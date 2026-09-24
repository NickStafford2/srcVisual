from __future__ import annotations

from contextlib import closing
from difflib import SequenceMatcher
import json
from pathlib import Path
from typing import Any, Literal
import zlib

from srcvisual.artifacts.store import (
    ARTIFACT_SCHEMA_VERSION,
    ArtifactIntegrityError,
    _connect_readonly,
    _read_manifest,
    _resolve_artifact_path,
)

FocusProfile = Literal["changes-and-moves", "moves", "changes", "complete-file"]
FOCUS_PROFILES: tuple[FocusProfile, ...] = (
    "changes-and-moves",
    "moves",
    "changes",
    "complete-file",
)
MAX_SOURCE_ROWS = 2_000
MAX_TREE_NODES = 500
MAX_CHILDREN = 100


def read_artifact_manifest(*, artifact_root: Path, artifact_id: str) -> dict[str, Any]:
    artifact_path, manifest = _open_artifact(artifact_root, artifact_id)
    del artifact_path
    return {
        **manifest,
        "projection_schema_version": 1,
        "focus_profiles": list(FOCUS_PROFILES),
    }


def read_artifact_xml(*, artifact_root: Path, artifact_id: str) -> dict[str, Any]:
    artifact_path, _ = _open_artifact(artifact_root, artifact_id)
    return {
        "schema_version": 1,
        "artifact_id": artifact_id,
        "xml": (artifact_path / "annotated.xml").read_text(encoding="utf-8"),
    }


def read_source_projection(
    *,
    artifact_root: Path,
    artifact_id: str,
    file_id: str,
    focus_profile: FocusProfile = "changes-and-moves",
    context_lines: int = 3,
    left_range: tuple[int, int] | None = None,
    right_range: tuple[int, int] | None = None,
    expanded_ranges: tuple[
        tuple[tuple[int, int] | None, tuple[int, int] | None], ...
    ] = (),
) -> dict[str, Any]:
    if focus_profile not in FOCUS_PROFILES:
        raise ValueError(f"Unsupported focus profile: {focus_profile!r}.")
    if not 0 <= context_lines <= 100:
        raise ValueError("context must be between 0 and 100.")
    artifact_path, _ = _open_artifact(artifact_root, artifact_id)
    file_row = _read_file_row(artifact_path, file_id)
    left_lines = _read_source_lines(artifact_path, file_id, revision=0)
    right_lines = _read_source_lines(artifact_path, file_id, revision=1)
    rows = _align_lines(left_lines, right_lines)
    anchors = _read_focus_anchors(artifact_path, file_id)
    _attach_anchors(rows, anchors)

    if left_range is not None or right_range is not None:
        selected = _range_row_indexes(rows, left_range, right_range)
    else:
        selected = _focus_row_indexes(rows, anchors, focus_profile, context_lines)
        for expanded_left, expanded_right in expanded_ranges:
            selected.extend(_range_row_indexes(rows, expanded_left, expanded_right))
        selected = sorted(set(selected))
    selected_count = len(selected)
    selected = selected[:MAX_SOURCE_ROWS]
    blocks = _build_source_blocks(rows, selected)

    return {
        "schema_version": 1,
        "artifact_id": artifact_id,
        "file_id": file_id,
        "filename": file_row[0],
        "revision_0_filename": file_row[1],
        "revision_1_filename": file_row[2],
        "focus_profile": focus_profile,
        "context_lines": context_lines,
        "truncated": selected_count > len(selected),
        "revision_0_line_count": len(left_lines),
        "revision_1_line_count": len(right_lines),
        "blocks": blocks,
    }


def read_tree_projection(
    *,
    artifact_root: Path,
    artifact_id: str,
    file_id: str,
    focus_profile: FocusProfile = "changes-and-moves",
    node_limit: int = MAX_TREE_NODES,
) -> dict[str, Any]:
    if focus_profile not in FOCUS_PROFILES:
        raise ValueError(f"Unsupported focus profile: {focus_profile!r}.")
    if not 1 <= node_limit <= MAX_TREE_NODES:
        raise ValueError(f"limit must be between 1 and {MAX_TREE_NODES}.")
    artifact_path, _ = _open_artifact(artifact_root, artifact_id)
    _read_file_row(artifact_path, file_id)
    with closing(_connect_readonly(artifact_path / "index.sqlite")) as database:
        rows = database.execute(
            """
            SELECT node_ordinal, parent_ordinal, sibling_index, child_count,
                   kind, payload
              FROM nodes
             WHERE file_id = ?
             ORDER BY node_ordinal
            """,
            (file_id,),
        ).fetchall()

    if not rows:
        return {
            "schema_version": 1,
            "artifact_id": artifact_id,
            "file_id": file_id,
            "focus_profile": focus_profile,
            "root": None,
            "node_count": 0,
            "truncated": False,
        }

    by_ordinal = {row[0]: row for row in rows}
    included = _focused_tree_ordinals(rows, focus_profile, node_limit)
    children: dict[int, list[int]] = {}
    for ordinal in sorted(included):
        parent = by_ordinal[ordinal][1]
        if parent in included:
            children.setdefault(parent, []).append(ordinal)
    root_ordinal = rows[0][0]
    root = _project_tree_node(file_id, by_ordinal, children, root_ordinal)
    return {
        "schema_version": 1,
        "artifact_id": artifact_id,
        "file_id": file_id,
        "focus_profile": focus_profile,
        "root": root,
        "node_count": len(included),
        "truncated": len(included) < len(rows),
    }


def read_node_children(
    *,
    artifact_root: Path,
    artifact_id: str,
    node_id: str,
    offset: int = 0,
    limit: int = 50,
) -> dict[str, Any]:
    if offset < 0:
        raise ValueError("offset must not be negative.")
    if not 1 <= limit <= MAX_CHILDREN:
        raise ValueError(f"limit must be between 1 and {MAX_CHILDREN}.")
    artifact_path, _ = _open_artifact(artifact_root, artifact_id)
    file_id, ordinal = _parse_node_id(node_id)
    _read_file_row(artifact_path, file_id)
    with closing(_connect_readonly(artifact_path / "index.sqlite")) as database:
        parent = database.execute(
            "SELECT child_count FROM nodes WHERE file_id = ? AND node_ordinal = ?",
            (file_id, ordinal),
        ).fetchone()
        if parent is None:
            raise FileNotFoundError("Artifact node does not exist.")
        rows = database.execute(
            """
            SELECT node_ordinal, child_count, payload
              FROM nodes
             WHERE file_id = ? AND parent_ordinal = ?
             ORDER BY sibling_index
             LIMIT ? OFFSET ?
            """,
            (file_id, ordinal, limit, offset),
        ).fetchall()
    children = [_project_flat_node(file_id, row[0], row[1], row[2]) for row in rows]
    next_offset = offset + len(children)
    return {
        "schema_version": 1,
        "artifact_id": artifact_id,
        "node_id": node_id,
        "child_count": parent[0],
        "children": children,
        "next_offset": next_offset if next_offset < parent[0] else None,
    }


def _open_artifact(
    artifact_root: Path, artifact_id: str
) -> tuple[Path, dict[str, Any]]:
    artifact_path = _resolve_artifact_path(artifact_root, artifact_id)
    manifest = _read_manifest(artifact_path)
    if manifest.get("schema_version") != ARTIFACT_SCHEMA_VERSION:
        raise ArtifactIntegrityError("Unsupported artifact schema version.")
    if manifest.get("artifact_id") != artifact_id:
        raise ArtifactIntegrityError("Artifact id does not match its directory.")
    return artifact_path, manifest


def _read_file_row(artifact_path: Path, file_id: str) -> tuple[str, str, str]:
    with closing(_connect_readonly(artifact_path / "index.sqlite")) as database:
        row = database.execute(
            """
            SELECT filename, revision_0_filename, revision_1_filename
              FROM files WHERE file_id = ?
            """,
            (file_id,),
        ).fetchone()
    if row is None:
        raise FileNotFoundError("Artifact file does not exist.")
    return row


def _read_source_lines(
    artifact_path: Path, file_id: str, *, revision: int
) -> list[str]:
    return (
        (artifact_path / "sources" / file_id / f"revision-{revision}.txt")
        .read_text(encoding="utf-8")
        .splitlines()
    )


def _align_lines(left: list[str], right: list[str]) -> list[dict[str, Any]]:
    rows: list[dict[str, Any]] = []
    matcher = SequenceMatcher(None, left, right, autojunk=False)
    for tag, left_start, left_end, right_start, right_end in matcher.get_opcodes():
        kind = {"equal": "context", "delete": "delete", "insert": "insert"}.get(
            tag, "replace"
        )
        count = max(left_end - left_start, right_end - right_start)
        for index in range(count):
            left_index = left_start + index
            right_index = right_start + index
            rows.append(
                {
                    "kind": kind,
                    "left": (
                        _line_record(left_index + 1, left[left_index])
                        if left_index < left_end
                        else None
                    ),
                    "right": (
                        _line_record(right_index + 1, right[right_index])
                        if right_index < right_end
                        else None
                    ),
                }
            )
    return rows


def _line_record(line_number: int, text: str) -> dict[str, Any]:
    return {"line_number": line_number, "text": text, "anchors": []}


def _read_focus_anchors(artifact_path: Path, file_id: str) -> list[dict[str, Any]]:
    with closing(_connect_readonly(artifact_path / "index.sqlite")) as database:
        rows = database.execute(
            """
            SELECT node_ordinal, kind, move_id,
                   revision_0_start_line, revision_0_end_line,
                   revision_1_start_line, revision_1_end_line
              FROM nodes
             WHERE file_id = ? AND kind != 'plain'
             ORDER BY node_ordinal
            """,
            (file_id,),
        ).fetchall()
    return [
        {
            "node_id": _node_id(file_id, row[0]),
            "kind": row[1],
            "move_id": row[2],
            "left": (row[3], row[4]),
            "right": (row[5], row[6]),
        }
        for row in rows
    ]


def _attach_anchors(rows: list[dict[str, Any]], anchors: list[dict[str, Any]]) -> None:
    left_rows = {row["left"]["line_number"]: row["left"] for row in rows if row["left"]}
    right_rows = {
        row["right"]["line_number"]: row["right"] for row in rows if row["right"]
    }
    for anchor in anchors:
        public = {
            "node_id": anchor["node_id"],
            "kind": anchor["kind"],
            "move_id": anchor["move_id"],
        }
        for side, line_rows in (("left", left_rows), ("right", right_rows)):
            start, end = anchor[side]
            if start is None or end is None:
                continue
            if start in line_rows:
                line_rows[start]["anchors"].append(public)


def _focus_row_indexes(
    rows: list[dict[str, Any]],
    anchors: list[dict[str, Any]],
    profile: FocusProfile,
    context: int,
) -> list[int]:
    if profile == "complete-file":
        return list(range(len(rows)))
    move_lines = {"left": set(), "right": set()}
    for anchor in anchors:
        if anchor["kind"] != "move":
            continue
        for side in ("left", "right"):
            start, end = anchor[side]
            if start is not None and end is not None:
                move_lines[side].update(range(start, end + 1))

    interesting: set[int] = set()
    for index, row in enumerate(rows):
        has_move = any(
            side_record is not None
            and side_record["line_number"] in move_lines[side_name]
            for side_name, side_record in (
                ("left", row["left"]),
                ("right", row["right"]),
            )
        )
        has_change = row["kind"] != "context"
        if (
            profile == "moves"
            and has_move
            or profile == "changes"
            and has_change
            or profile == "changes-and-moves"
            and (has_move or has_change)
        ):
            interesting.add(index)
    selected: set[int] = set()
    for index in interesting:
        selected.update(
            range(max(0, index - context), min(len(rows), index + context + 1))
        )
    return sorted(selected)


def _range_row_indexes(
    rows: list[dict[str, Any]],
    left_range: tuple[int, int] | None,
    right_range: tuple[int, int] | None,
) -> list[int]:
    selected = []
    for index, row in enumerate(rows):
        left_number = row["left"]["line_number"] if row["left"] else None
        right_number = row["right"]["line_number"] if row["right"] else None
        if _line_in_range(left_number, left_range) or _line_in_range(
            right_number, right_range
        ):
            selected.append(index)
    return selected


def _line_in_range(number: int | None, bounds: tuple[int, int] | None) -> bool:
    return (
        number is not None and bounds is not None and bounds[0] <= number <= bounds[1]
    )


def _build_source_blocks(
    rows: list[dict[str, Any]], selected_indexes: list[int]
) -> list[dict[str, Any]]:
    windows: list[tuple[int, int]] = []
    for index in selected_indexes:
        if windows and index == windows[-1][1]:
            windows[-1] = (windows[-1][0], index + 1)
        else:
            windows.append((index, index + 1))
    blocks: list[dict[str, Any]] = []
    cursor = 0
    for start, end in windows:
        if start > cursor:
            blocks.append(_gap_block(rows, cursor, start))
        blocks.append(
            {
                "type": "hunk",
                "block_id": f"h-{start}-{end}",
                "left": _row_range(rows[start:end], "left"),
                "right": _row_range(rows[start:end], "right"),
                "rows": rows[start:end],
            }
        )
        cursor = end
    if cursor < len(rows):
        blocks.append(_gap_block(rows, cursor, len(rows)))
    return blocks


def _gap_block(rows: list[dict[str, Any]], start: int, end: int) -> dict[str, Any]:
    left = _row_range(rows[start:end], "left")
    right = _row_range(rows[start:end], "right")
    return {
        "type": "gap",
        "block_id": f"g-{start}-{end}",
        "left": {
            **left,
            "line_count": sum(row["left"] is not None for row in rows[start:end]),
        },
        "right": {
            **right,
            "line_count": sum(row["right"] is not None for row in rows[start:end]),
        },
    }


def _row_range(rows: list[dict[str, Any]], side: str) -> dict[str, int | None]:
    numbers = [row[side]["line_number"] for row in rows if row[side] is not None]
    return {
        "start_line": numbers[0] if numbers else None,
        "end_line": numbers[-1] if numbers else None,
    }


def _focused_tree_ordinals(
    rows: list[tuple[Any, ...]], profile: FocusProfile, limit: int
) -> set[int]:
    by_ordinal = {row[0]: row for row in rows}
    included = {rows[0][0]}
    if profile == "complete-file":
        focus = [row[0] for row in rows[1:]]
    else:
        focus = [
            row[0]
            for row in rows[1:]
            if profile == "moves"
            and row[4] == "move"
            or profile == "changes"
            and row[4] in {"insert", "delete"}
            or profile == "changes-and-moves"
            and row[4] != "plain"
        ]
    for ordinal in focus:
        chain = []
        current: int | None = ordinal
        while current is not None and current not in included:
            chain.append(current)
            current = by_ordinal[current][1]
        if len(included) + len(chain) > limit:
            continue
        included.update(chain)
        if len(included) == limit:
            break
    return included


def _project_tree_node(
    file_id: str,
    by_ordinal: dict[int, tuple[Any, ...]],
    children: dict[int, list[int]],
    ordinal: int,
) -> dict[str, Any]:
    row = by_ordinal[ordinal]
    node = _project_flat_node(file_id, ordinal, row[3], row[5])
    node["children"] = [
        _project_tree_node(file_id, by_ordinal, children, child)
        for child in children.get(ordinal, [])
    ]
    node["children_complete"] = len(node["children"]) == row[3]
    return node


def _project_flat_node(
    file_id: str, ordinal: int, child_count: int, compressed_payload: bytes
) -> dict[str, Any]:
    payload = json.loads(zlib.decompress(compressed_payload))
    payload.pop("id", None)
    payload.pop("children", None)
    return {
        "node_id": _node_id(file_id, ordinal),
        **payload,
        "child_count": child_count,
        "children": [],
        "children_complete": child_count == 0,
    }


def _parse_node_id(node_id: str) -> tuple[str, int]:
    try:
        file_id, raw_ordinal = node_id.rsplit(":n", 1)
        ordinal = int(raw_ordinal, 16)
    except ValueError as error:
        raise FileNotFoundError("Artifact node does not exist.") from error
    if not file_id.startswith("f-") or len(raw_ordinal) != 8 or ordinal < 0:
        raise FileNotFoundError("Artifact node does not exist.")
    return file_id, ordinal


def _node_id(file_id: str, ordinal: int) -> str:
    return f"{file_id}:n{ordinal:08x}"
