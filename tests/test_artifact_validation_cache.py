from __future__ import annotations

import os
from unittest.mock import Mock

import pytest

from srcdiffvisual.artifacts.models import ArtifactProvenance
from srcdiffvisual.artifacts.store import (
    ArtifactIntegrityError,
    publish_artifact,
    validate_artifact,
)
from srcdiffvisual.web._validate_artifact import ArtifactValidationCache
from srcdiffvisual.web import _routes
from srcdiffvisual.web.app import create_app
from tests.artifacts.test_store import build_payload


@pytest.fixture
def published(tmp_path):
    return publish_artifact(
        artifact_root=tmp_path,
        canonical_payload=build_payload(),
        input_payload=b"input",
        provenance=ArtifactProvenance(origin="upload"),
    )


def test_unchanged_artifact_is_fully_validated_once(tmp_path, published):
    _cache = ArtifactValidationCache()
    _validate = Mock(wraps=validate_artifact)
    for _ in range(3):
        _cache.validate(
            artifact_root=tmp_path,
            artifact_id=published.artifact_id,
            validator=_validate,
        )
    assert _validate.call_count == 1


@pytest.mark.parametrize("target", ["artifact.json", "annotated.xml", "index.sqlite", "source"])
def test_changed_validated_file_is_rechecked_and_corruption_rejected(
    tmp_path, published, target,
):
    _cache = ArtifactValidationCache()
    _validate = Mock(wraps=validate_artifact)
    _arguments = dict(
        artifact_root=tmp_path, artifact_id=published.artifact_id, validator=_validate,
    )
    _cache.validate(**_arguments)
    _path = (
        next((published.path / "sources").glob("*/revision-0.txt"))
        if target == "source" else published.path / target
    )
    _stat = _path.stat()
    _bytes = _path.read_bytes()
    # Same length and restored mtime still invalidates through ctime.
    _path.write_bytes(bytes([_bytes[0] ^ 1]) + _bytes[1:])
    os.utime(_path, ns=(_stat.st_atime_ns, _stat.st_mtime_ns))
    with pytest.raises(ArtifactIntegrityError):
        _cache.validate(**_arguments)
    assert _validate.call_count == 2
    assert not published.path.exists()


def test_deleted_source_invalidates_validation(tmp_path, published):
    _cache = ArtifactValidationCache()
    _arguments = dict(
        artifact_root=tmp_path, artifact_id=published.artifact_id,
        validator=validate_artifact,
    )
    _cache.validate(**_arguments)
    next((published.path / "sources").glob("*/revision-0.txt")).unlink()
    with pytest.raises(ArtifactIntegrityError):
        _cache.validate(**_arguments)


def test_sidecar_creation_invalidates_validation(tmp_path, published):
    _cache = ArtifactValidationCache()
    _validate = Mock(wraps=validate_artifact)
    _arguments = dict(
        artifact_root=tmp_path, artifact_id=published.artifact_id, validator=_validate,
    )
    _cache.validate(**_arguments)
    (published.path / "index.sqlite-wal").write_bytes(b"")
    _cache.validate(**_arguments)
    assert _validate.call_count == 2


def test_evicted_artifact_is_fully_revalidated(tmp_path, published):
    _other = publish_artifact(
        artifact_root=tmp_path,
        canonical_payload=build_payload(),
        input_payload=b"other input",
        provenance=ArtifactProvenance(origin="upload"),
    )
    _cache = ArtifactValidationCache(max_entries=1)
    _validate = Mock(wraps=validate_artifact)
    for _artifact in (published, _other, published):
        _cache.validate(
            artifact_root=tmp_path, artifact_id=_artifact.artifact_id,
            validator=_validate,
        )
    assert _validate.call_count == 3


def test_oversized_manifest_is_validated_without_retaining_paths(tmp_path, published):
    _cache = ArtifactValidationCache(max_paths=1)
    _validate = Mock(wraps=validate_artifact)
    for _ in range(2):
        _cache.validate(
            artifact_root=tmp_path, artifact_id=published.artifact_id,
            validator=_validate,
        )
    assert _validate.call_count == 2


def test_mutation_during_validation_does_not_cache_success(tmp_path, published):
    _cache = ArtifactValidationCache()

    def _mutating_validator(**_kwargs):
        validate_artifact(**_kwargs)
        (published.path / "annotated.xml").write_bytes(b"changed during validation")

    _cache.validate(
        artifact_root=tmp_path, artifact_id=published.artifact_id,
        validator=_mutating_validator,
    )
    with pytest.raises(ArtifactIntegrityError):
        _cache.validate(
            artifact_root=tmp_path, artifact_id=published.artifact_id,
            validator=validate_artifact,
        )


def test_history_reopen_reuses_validation_and_queues_fresh_run_after_corruption(
    monkeypatch, tmp_path, published,
):
    monkeypatch.setenv("SRCDIFFVISUAL_ARTIFACT_ROOT", str(tmp_path))
    monkeypatch.setenv("SRCDIFFVISUAL_HISTORY_REPOSITORY", str(tmp_path / "repository"))
    monkeypatch.setattr(
        _routes, "build_history_artifact_fingerprint", lambda *args, **kwargs: "f" * 64,
    )
    monkeypatch.setattr(_routes, "artifact_validation_cache", ArtifactValidationCache())
    _validate = Mock(wraps=validate_artifact)
    monkeypatch.setattr(_routes, "validate_artifact", _validate)
    _app = create_app()
    _store = _app.config["RUN_STORE"]
    _run = _store.acquire_history_run(13, "f" * 64).run
    _store.mark_running(_run.run_id)
    _store.complete(_run.run_id, published.artifact_id)
    _client = _app.test_client()
    for _ in range(2):
        _response = _client.post("/api/history/pairs/13/runs")
        assert _response.status_code == 200
        assert _response.get_json()["reuse"] == "artifact"
    assert _validate.call_count == 1

    (published.path / "annotated.xml").write_bytes(b"corrupt")
    _response = _client.post("/api/history/pairs/13/runs")
    assert _response.status_code == 202
    assert _response.get_json()["reuse"] == "new"
    assert _validate.call_count == 2
