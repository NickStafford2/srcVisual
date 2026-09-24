from __future__ import annotations

from contextlib import closing
from datetime import datetime, timezone
from functools import cache
import hashlib
import json
import os
from pathlib import Path
import shutil
import sqlite3
import time
from typing import Any, Iterable
from uuid import uuid4
import zlib

from srcvisual.artifacts.models import (
    ArtifactProvenance,
    PublishedArtifact,
    StoredArtifact,
)
from srcvisual.files.models import RevisionFile, VisualizedFile
from srcvisual.workflow.models import VisualizationPayload

ARTIFACT_SCHEMA_VERSION = 2
DEFAULT_ARTIFACT_ROOT = Path("/tmp/srcvisual-artifacts")


class ArtifactIntegrityError(RuntimeError):
    """A stored artifact does not satisfy its published manifest."""


def get_artifact_root() -> Path:
    _raw_root = os.environ.get("SRCVISUAL_ARTIFACT_ROOT", "").strip()
    if not _raw_root:
        return DEFAULT_ARTIFACT_ROOT
    if "\0" in _raw_root:
        raise ValueError("SRCVISUAL_ARTIFACT_ROOT contains an invalid null byte.")
    return Path(_raw_root).expanduser().absolute()


def cleanup_stale_staging(
    artifact_root: Path,
    *,
    older_than_seconds: int = 24 * 60 * 60,
) -> int:
    _staging_root = artifact_root / ".staging"
    if not _staging_root.is_dir():
        return 0

    _cutoff = time.time() - older_than_seconds
    _removed = 0
    for _candidate in _staging_root.iterdir():
        try:
            _is_stale_artifact_directory = (
                len(_candidate.name) == 32
                and all(
                    _character in "0123456789abcdef" for _character in _candidate.name
                )
                and _candidate.is_dir()
                and _candidate.stat().st_mtime < _cutoff
            )
        except FileNotFoundError:
            continue
        if not _is_stale_artifact_directory:
            continue
        try:
            shutil.rmtree(_candidate)
        except FileNotFoundError:
            continue
        _removed += 1
    return _removed


def publish_artifact(
    *,
    artifact_root: Path,
    canonical_payload: VisualizationPayload,
    input_payload: bytes,
    provenance: ArtifactProvenance,
    artifact_id: str | None = None,
) -> PublishedArtifact:
    _artifact_id = artifact_id or uuid4().hex
    if len(_artifact_id) != 32 or any(
        _character not in "0123456789abcdef" for _character in _artifact_id
    ):
        raise ValueError("Artifact ID must be a 32-character lowercase hex string.")
    _staging_root = artifact_root / ".staging"
    _staging_path = _staging_root / _artifact_id
    _published_path = artifact_root / _artifact_id

    artifact_root.mkdir(parents=True, exist_ok=True)
    _staging_root.mkdir(exist_ok=True)
    _staging_path.mkdir()

    try:
        _manifest = _write_artifact(
            artifact_id=_artifact_id,
            artifact_path=_staging_path,
            canonical_payload=canonical_payload,
            input_payload=input_payload,
            provenance=provenance,
        )
        _validate_artifact_path(_staging_path, _manifest)
        _validate_index(_staging_path / "index.sqlite", _manifest)
        os.replace(_staging_path, _published_path)
    except Exception:
        shutil.rmtree(_staging_path, ignore_errors=True)
        raise

    return PublishedArtifact(
        artifact_id=_artifact_id,
        path=_published_path,
        manifest=_manifest,
    )


def read_artifact(*, artifact_root: Path, artifact_id: str) -> StoredArtifact:
    _artifact_path = _resolve_artifact_path(artifact_root, artifact_id)
    try:
        _manifest = _read_manifest(_artifact_path)
        _validate_artifact_path(_artifact_path, _manifest)
        _validate_index(_artifact_path / "index.sqlite", _manifest)
        _payload = _read_payload(_artifact_path)
    except ArtifactIntegrityError:
        _quarantine_artifact(artifact_root, _artifact_path)
        raise
    except (OSError, KeyError, json.JSONDecodeError, sqlite3.DatabaseError) as _error:
        _quarantine_artifact(artifact_root, _artifact_path)
        raise ArtifactIntegrityError("Artifact index is unreadable.") from _error
    return StoredArtifact(
        artifact_id=artifact_id,
        manifest=_manifest,
        payload=_payload,
    )


def validate_artifact(*, artifact_root: Path, artifact_id: str) -> None:
    """Validate a published artifact without materializing its full payload."""
    _artifact_path = _resolve_artifact_path(artifact_root, artifact_id)
    try:
        _manifest = _read_manifest(_artifact_path)
        _validate_artifact_path(_artifact_path, _manifest)
        _validate_index(_artifact_path / "index.sqlite", _manifest)
    except ArtifactIntegrityError:
        _quarantine_artifact(artifact_root, _artifact_path)
        raise
    except (OSError, KeyError, json.JSONDecodeError, sqlite3.DatabaseError) as _error:
        _quarantine_artifact(artifact_root, _artifact_path)
        raise ArtifactIntegrityError("Artifact index is unreadable.") from _error


def _write_artifact(
    *,
    artifact_id: str,
    artifact_path: Path,
    canonical_payload: VisualizationPayload,
    input_payload: bytes,
    provenance: ArtifactProvenance,
) -> dict[str, Any]:
    _xml_path = artifact_path / "annotated.xml"
    _index_path = artifact_path / "index.sqlite"
    _sources_path = artifact_path / "sources"
    _sources_path.mkdir()
    _xml_path.write_text(canonical_payload.moved_srcdiff_xml, encoding="utf-8")

    _file_records, _node_records, _path_to_node_id = _build_index_records(
        canonical_payload.files
    )
    _write_index(
        artifact_id=artifact_id,
        index_path=_index_path,
        canonical_payload=canonical_payload,
        file_records=_file_records,
        node_records=_node_records,
    )

    _file_summaries = []
    for _file, _record in zip(
        canonical_payload.files,
        _file_records,
        strict=True,
    ):
        _file_source_path = _sources_path / _record[0]
        _file_source_path.mkdir()
        _revision_0_path = _file_source_path / "revision-0.txt"
        _revision_1_path = _file_source_path / "revision-1.txt"
        _revision_file = _file.revision_file
        _revision_0_path.write_text(
            _revision_file.revision_0_source_code,
            encoding="utf-8",
        )
        _revision_1_path.write_text(
            _revision_file.revision_1_source_code,
            encoding="utf-8",
        )
        _file_summaries.append(
            {
                "file_id": _record[0],
                "root_node_id": (
                    None if _record[7] is None else f"{_record[0]}:n{_record[7]:08x}"
                ),
                "filename": _revision_file.filename,
                "revision_0_filename": _revision_file.revision_0_filename,
                "revision_1_filename": _revision_file.revision_1_filename,
                "language": _revision_file.language,
                "revision_0_lines": _line_count(_revision_file.revision_0_source_code),
                "revision_1_lines": _line_count(_revision_file.revision_1_source_code),
                "revision_0_sha256": _sha256_file(_revision_0_path),
                "revision_1_sha256": _sha256_file(_revision_1_path),
            }
        )

    _tool_provenance = _build_tool_provenance(provenance)
    _manifest = {
        "schema_version": ARTIFACT_SCHEMA_VERSION,
        "artifact_id": artifact_id,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "source_filename": Path(canonical_payload.source_filename).name,
        "provenance": provenance.to_dict(),
        "fingerprint": _build_fingerprint(
            input_payload=input_payload,
            provenance=provenance,
            move_results=canonical_payload.move_results,
            tool_provenance=_tool_provenance,
        ),
        "tools": _tool_provenance,
        "analysis_configuration": {
            "include_skipped_tags": True,
        },
        "checksums": {
            "input_sha256": _sha256_bytes(input_payload),
            "annotated_xml_sha256": _sha256_file(_xml_path),
            "index_sha256": _sha256_file(_index_path),
        },
        "capabilities": {
            "complete_xml": True,
            "revision_sources": True,
            "structural_index": True,
            "move_metadata": True,
        },
        "has_position_data": canonical_payload.has_position_data,
        "file_count": len(_file_summaries),
        "node_count": len(_node_records),
        "files": _file_summaries,
        "moves": _build_move_summaries(
            canonical_payload.move_results,
            _path_to_node_id,
        ),
    }
    _manifest_path = artifact_path / "artifact.json"
    _manifest_path.write_text(
        json.dumps(_manifest, indent=2, sort_keys=True) + "\n",
        encoding="utf-8",
    )
    return _manifest


def _build_index_records(
    files: tuple[VisualizedFile, ...],
) -> tuple[list[tuple[Any, ...]], list[tuple[Any, ...]], dict[str, str]]:
    _file_records: list[tuple[Any, ...]] = []
    _node_records: list[tuple[Any, ...]] = []
    _path_to_node_id: dict[str, str] = {}
    _used_file_ids: set[str] = set()

    for _file in files:
        _revision_file = _file.revision_file
        _file_id = _build_file_id(_revision_file, _used_file_ids)
        _used_file_ids.add(_file_id)
        _root_node_ordinal = None
        if _file.tree is not None:
            _root_node_ordinal = 0
            _append_node_records(
                node=_file.tree,
                file_id=_file_id,
                parent_ordinal=None,
                sibling_index=0,
                records=_node_records,
                path_to_node_id=_path_to_node_id,
                next_ordinal=[0],
            )
        _file_records.append(
            (
                _file_id,
                _revision_file.unit_id,
                _revision_file.filename,
                _revision_file.revision_0_filename,
                _revision_file.revision_1_filename,
                _revision_file.language,
                f"sources/{_file_id}",
                _root_node_ordinal,
            )
        )

    return _file_records, _node_records, _path_to_node_id


def _append_node_records(
    *,
    node: dict[str, Any],
    file_id: str,
    parent_ordinal: int | None,
    sibling_index: int,
    records: list[tuple[Any, ...]],
    path_to_node_id: dict[str, str],
    next_ordinal: list[int],
) -> None:
    _node_ordinal = next_ordinal[0]
    _node_id = f"{file_id}:n{_node_ordinal:08x}"
    next_ordinal[0] += 1
    _children = node["children"]
    _payload = {**node, "children": []}
    _path = node["path"]
    path_to_node_id[_path] = _node_id
    records.append(
        (
            file_id,
            _node_ordinal,
            parent_ordinal,
            sibling_index,
            len(_children),
            node["kind"],
            node.get("move_id"),
            _span_line(node.get("revision_0_span"), "start_line"),
            _span_line(node.get("revision_0_span"), "end_line"),
            _span_line(node.get("revision_1_span"), "start_line"),
            _span_line(node.get("revision_1_span"), "end_line"),
            zlib.compress(json.dumps(_payload, separators=(",", ":")).encode("utf-8")),
        )
    )
    for _child_index, _child in enumerate(_children):
        _append_node_records(
            node=_child,
            file_id=file_id,
            parent_ordinal=_node_ordinal,
            sibling_index=_child_index,
            records=records,
            path_to_node_id=path_to_node_id,
            next_ordinal=next_ordinal,
        )


def _span_line(span: object, key: str) -> int | None:
    if not isinstance(span, dict):
        return None
    value = span.get(key)
    return value if isinstance(value, int) else None


def _write_index(
    *,
    artifact_id: str,
    index_path: Path,
    canonical_payload: VisualizationPayload,
    file_records: list[tuple[Any, ...]],
    node_records: list[tuple[Any, ...]],
) -> None:
    with closing(sqlite3.connect(index_path)) as _database:
        _database.executescript(
            """
            PRAGMA journal_mode = OFF;
            PRAGMA synchronous = OFF;
            CREATE TABLE metadata (
                key TEXT PRIMARY KEY,
                value TEXT NOT NULL
            ) WITHOUT ROWID;
            CREATE TABLE files (
                file_id TEXT PRIMARY KEY,
                unit_id INTEGER NOT NULL,
                filename TEXT NOT NULL,
                revision_0_filename TEXT NOT NULL,
                revision_1_filename TEXT NOT NULL,
                language TEXT,
                source_directory TEXT NOT NULL,
                root_node_ordinal INTEGER
            ) WITHOUT ROWID;
            CREATE TABLE nodes (
                file_id TEXT NOT NULL,
                node_ordinal INTEGER NOT NULL,
                parent_ordinal INTEGER,
                sibling_index INTEGER NOT NULL,
                child_count INTEGER NOT NULL,
                kind TEXT NOT NULL,
                move_id TEXT,
                revision_0_start_line INTEGER,
                revision_0_end_line INTEGER,
                revision_1_start_line INTEGER,
                revision_1_end_line INTEGER,
                payload BLOB NOT NULL,
                PRIMARY KEY (file_id, node_ordinal)
            ) WITHOUT ROWID;
            CREATE INDEX nodes_by_parent
                ON nodes(file_id, parent_ordinal, sibling_index);
            CREATE INDEX nodes_by_focus
                ON nodes(file_id, kind, node_ordinal);
            """
        )
        _database.executemany(
            "INSERT INTO metadata(key, value) VALUES (?, ?)",
            (
                ("artifact_id", artifact_id),
                ("artifact_schema_version", str(ARTIFACT_SCHEMA_VERSION)),
                ("source_filename", canonical_payload.source_filename),
                (
                    "has_position_data",
                    json.dumps(canonical_payload.has_position_data),
                ),
                (
                    "move_results",
                    json.dumps(canonical_payload.move_results, separators=(",", ":")),
                ),
            ),
        )
        _database.executemany(
            "INSERT INTO files VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
            file_records,
        )
        _database.executemany(
            "INSERT INTO nodes VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
            node_records,
        )
        _database.commit()


def _read_payload(
    artifact_path: Path,
) -> VisualizationPayload:
    _index_path = artifact_path / "index.sqlite"
    with closing(_connect_readonly(_index_path)) as _database:
        _metadata = dict(_database.execute("SELECT key, value FROM metadata"))
        _file_rows = _database.execute(
            """
            SELECT file_id, unit_id, filename, revision_0_filename,
                   revision_1_filename, language, source_directory,
                   root_node_ordinal
              FROM files
             ORDER BY unit_id
            """
        ).fetchall()
        _node_rows = _database.execute(
            """
            SELECT file_id, node_ordinal, parent_ordinal, sibling_index, payload
              FROM nodes
             ORDER BY file_id, parent_ordinal, sibling_index
            """
        )
        _trees = _rebuild_trees(_node_rows)
    _files = []
    for _row in _file_rows:
        (
            _file_id,
            _unit_id,
            _filename,
            _revision_0_filename,
            _revision_1_filename,
            _language,
            _source_directory,
            _root_node_id,
        ) = _row
        _source_path = artifact_path / _source_directory
        _revision_file = RevisionFile(
            unit_id=_unit_id,
            filename=_filename,
            revision_0_filename=_revision_0_filename,
            revision_1_filename=_revision_1_filename,
            language=_language,
            revision_0_source_code=(_source_path / "revision-0.txt").read_text(
                encoding="utf-8"
            ),
            revision_1_source_code=(_source_path / "revision-1.txt").read_text(
                encoding="utf-8"
            ),
        )
        _files.append(
            VisualizedFile(
                revision_file=_revision_file,
                tree=_trees.get((_file_id, _root_node_id)),
            )
        )

    return VisualizationPayload(
        source_filename=_metadata["source_filename"],
        moved_srcdiff_xml=(artifact_path / "annotated.xml").read_text(encoding="utf-8"),
        move_results=json.loads(_metadata["move_results"]),
        has_position_data=json.loads(_metadata["has_position_data"]),
        files=tuple(_files),
    )


def _rebuild_trees(
    node_rows: Iterable[tuple[Any, ...]],
) -> dict[tuple[str, int], dict[str, Any]]:
    _nodes: dict[tuple[str, int], dict[str, Any]] = {}
    _children_by_parent: dict[tuple[str, int], list[tuple[int, tuple[str, int]]]] = {}

    for (
        _file_id,
        _node_ordinal,
        _parent_ordinal,
        _sibling_index,
        _payload,
    ) in node_rows:
        _node_key = (_file_id, _node_ordinal)
        _nodes[_node_key] = json.loads(zlib.decompress(_payload))
        if _parent_ordinal is not None:
            _parent_key = (_file_id, _parent_ordinal)
            _children_by_parent.setdefault(_parent_key, []).append(
                (_sibling_index, _node_key)
            )

    for _parent_key, _children in _children_by_parent.items():
        _nodes[_parent_key]["children"] = [
            _nodes[_child_key] for _, _child_key in sorted(_children)
        ]
    return _nodes


def _validate_artifact_path(
    artifact_path: Path,
    manifest: dict[str, Any],
) -> None:
    if manifest.get("schema_version") != ARTIFACT_SCHEMA_VERSION:
        raise ArtifactIntegrityError("Unsupported artifact schema version.")
    if manifest.get("artifact_id") != artifact_path.name:
        raise ArtifactIntegrityError("Artifact id does not match its directory.")

    _checksums = manifest.get("checksums")
    if not isinstance(_checksums, dict):
        raise ArtifactIntegrityError("Artifact manifest has no checksums.")
    _assert_checksum(
        artifact_path / "annotated.xml",
        _checksums.get("annotated_xml_sha256"),
    )
    _assert_checksum(
        artifact_path / "index.sqlite",
        _checksums.get("index_sha256"),
    )

    _files = manifest.get("files")
    if not isinstance(_files, list):
        raise ArtifactIntegrityError("Artifact manifest has no file list.")
    for _file in _files:
        if not isinstance(_file, dict) or not isinstance(_file.get("file_id"), str):
            raise ArtifactIntegrityError("Artifact manifest has an invalid file entry.")
        _source_path = artifact_path / "sources" / _file["file_id"]
        _assert_checksum(
            _source_path / "revision-0.txt",
            _file.get("revision_0_sha256"),
        )
        _assert_checksum(
            _source_path / "revision-1.txt",
            _file.get("revision_1_sha256"),
        )


def _validate_index(index_path: Path, manifest: dict[str, Any]) -> None:
    with closing(_connect_readonly(index_path)) as _database:
        _integrity = _database.execute("PRAGMA integrity_check").fetchone()
        _metadata = dict(_database.execute("SELECT key, value FROM metadata"))
        _file_count = _database.execute("SELECT count(*) FROM files").fetchone()
        _node_count = _database.execute("SELECT count(*) FROM nodes").fetchone()
        _missing_roots = _database.execute(
            """
            SELECT count(*)
              FROM files
         LEFT JOIN nodes
                ON nodes.file_id = files.file_id
               AND nodes.node_ordinal = files.root_node_ordinal
             WHERE files.root_node_ordinal IS NOT NULL
               AND nodes.node_ordinal IS NULL
            """
        ).fetchone()

    if _integrity != ("ok",):
        raise ArtifactIntegrityError("Artifact index failed SQLite integrity check.")
    if _metadata.get("artifact_id") != manifest.get("artifact_id"):
        raise ArtifactIntegrityError("Artifact index id is inconsistent.")
    if _metadata.get("artifact_schema_version") != str(ARTIFACT_SCHEMA_VERSION):
        raise ArtifactIntegrityError("Artifact index schema is inconsistent.")
    if _file_count != (manifest.get("file_count"),):
        raise ArtifactIntegrityError("Artifact index file count is inconsistent.")
    if _node_count != (manifest.get("node_count"),):
        raise ArtifactIntegrityError("Artifact index node count is inconsistent.")
    if _missing_roots != (0,):
        raise ArtifactIntegrityError("Artifact index contains a missing tree root.")


def _assert_checksum(path: Path, expected: object) -> None:
    if not isinstance(expected, str) or not path.is_file():
        raise ArtifactIntegrityError(f"Artifact file is missing: {path.name}.")
    if _sha256_file(path) != expected:
        raise ArtifactIntegrityError(f"Artifact checksum mismatch: {path.name}.")


def _read_manifest(artifact_path: Path) -> dict[str, Any]:
    _manifest_path = artifact_path / "artifact.json"
    if not _manifest_path.is_file():
        raise ArtifactIntegrityError("Artifact manifest is missing.")
    try:
        _manifest = json.loads(_manifest_path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as _error:
        raise ArtifactIntegrityError("Artifact manifest is unreadable.") from _error
    if not isinstance(_manifest, dict):
        raise ArtifactIntegrityError("Artifact manifest must contain an object.")
    return _manifest


def _resolve_artifact_path(artifact_root: Path, artifact_id: str) -> Path:
    if len(artifact_id) != 32 or any(
        _character not in "0123456789abcdef" for _character in artifact_id
    ):
        raise FileNotFoundError("Artifact does not exist.")
    _artifact_path = artifact_root / artifact_id
    if not _artifact_path.is_dir():
        raise FileNotFoundError("Artifact does not exist.")
    return _artifact_path


def _connect_readonly(path: Path) -> sqlite3.Connection:
    return sqlite3.connect(f"{path.resolve().as_uri()}?mode=ro", uri=True)


def _build_file_id(revision_file: RevisionFile, used_ids: set[str]) -> str:
    _identity = "\0".join(
        (
            revision_file.filename,
            revision_file.revision_0_filename,
            revision_file.revision_1_filename,
            revision_file.revision_0_source_code,
            revision_file.revision_1_source_code,
        )
    ).encode("utf-8")
    _base_id = f"f-{_sha256_bytes(_identity)[:16]}"
    _file_id = _base_id
    _suffix = 2
    while _file_id in used_ids:
        _file_id = f"{_base_id}-{_suffix}"
        _suffix += 1
    return _file_id


def _build_move_summaries(
    move_results: dict[str, Any],
    path_to_node_id: dict[str, str],
) -> dict[str, object]:
    _moves = move_results.get("moves")
    if not isinstance(_moves, list):
        raise ValueError("Canonical move results must contain a moves list.")

    _summaries = []
    for _move in _moves:
        if not isinstance(_move, dict) or not isinstance(_move.get("move_id"), str):
            raise ValueError("Canonical move results contain an invalid move.")
        _from_paths = _move.get("from_node_ids", [])
        _to_paths = _move.get("to_node_ids", [])
        _summaries.append(
            {
                "move_id": _move["move_id"],
                "match_kind": _move.get("match_kind"),
                "from_node_ids": [path_to_node_id[_path] for _path in _from_paths],
                "to_node_ids": [path_to_node_id[_path] for _path in _to_paths],
            }
        )
    return {"move_count": len(_summaries), "items": _summaries}


def _build_fingerprint(
    *,
    input_payload: bytes,
    provenance: ArtifactProvenance,
    move_results: dict[str, Any],
    tool_provenance: dict[str, object],
) -> str:
    _document = json.dumps(
        {
            "artifact_schema_version": ARTIFACT_SCHEMA_VERSION,
            "input_sha256": _sha256_bytes(input_payload),
            "move_results_sha256": _sha256_bytes(
                json.dumps(
                    move_results,
                    sort_keys=True,
                    separators=(",", ":"),
                ).encode("utf-8")
            ),
            "provenance": provenance.to_dict(),
            "tools": tool_provenance,
        },
        sort_keys=True,
        separators=(",", ":"),
    ).encode("utf-8")
    return _sha256_bytes(_document)


def _build_tool_provenance(
    provenance: ArtifactProvenance,
) -> dict[str, object]:
    if provenance.move_results_source != "generated":
        return {
            "identity_status": "producer-not-observed",
            "srcdiff_sha256": None,
            "srcmove_sha256": None,
        }

    return {
        "identity_status": "observed-runtime-binaries",
        "srcdiff_sha256": _executable_checksum("srcdiff"),
        "srcmove_sha256": _executable_checksum("srcMove"),
    }


@cache
def _executable_checksum(name: str) -> str | None:
    _executable = shutil.which(name)
    if _executable is None:
        return None
    return _sha256_file(Path(_executable))


def _quarantine_artifact(artifact_root: Path, artifact_path: Path) -> None:
    if not artifact_path.exists():
        return
    _quarantine_root = artifact_root / ".quarantine"
    _quarantine_root.mkdir(exist_ok=True)
    os.replace(
        artifact_path,
        _quarantine_root / f"{artifact_path.name}-{uuid4().hex}",
    )


def _line_count(source: str) -> int:
    return len(source.splitlines())


def _sha256_file(path: Path) -> str:
    _digest = hashlib.sha256()
    with path.open("rb") as _file:
        for _chunk in iter(lambda: _file.read(1024 * 1024), b""):
            _digest.update(_chunk)
    return _digest.hexdigest()


def _sha256_bytes(payload: bytes) -> str:
    return hashlib.sha256(payload).hexdigest()
