import json

from srcdiffvisual.artifacts.store import ARTIFACT_SCHEMA_VERSION
from srcdiffvisual.runs.store import RunStore
from srcdiffvisual.web._history_cache import annotate_cached_pairs
from srcdiffvisual.workflow._source_renderer import SOURCE_PROJECTION_VERSION


def test_cache_indicator_requires_matching_present_current_artifact(tmp_path):
    _store = RunStore(tmp_path / "runs.sqlite3")
    _store.initialize()
    _run = _store.acquire_history_run(13, "f" * 64, repository_id="notepadpp").run
    _store.mark_running(_run.run_id)
    _store.complete(_run.run_id, "a" * 32)
    _path = tmp_path / ("a" * 32)
    _path.mkdir()
    (_path / "annotated.xml").write_text("<unit/>")
    (_path / "index.sqlite").touch()
    _source = _path / "sources" / "f-one"
    _source.mkdir(parents=True)
    for _revision in (0, 1):
        (_source / f"revision-{_revision}.txt").write_text("source")
    _manifest = {
        "artifact_id": "a" * 32, "schema_version": ARTIFACT_SCHEMA_VERSION,
        "analysis_configuration": {"source_projection_version": SOURCE_PROJECTION_VERSION, "include_skipped_tags": True},
        "provenance": {"history_analysis": {"repository_id": "notepadpp", "pair": {"old_commit": "old", "new_commit": "new"}}},
        "files": [{"file_id": "f-one"}],
    }
    (_path / "artifact.json").write_text(json.dumps(_manifest))
    _document = {"pairs": {"items": [{"number": 13, "old_commit": "old", "new_commit": "new"}, {"number": 14}], "next_after": None}}

    def _check(_repository="notepadpp"):
        return annotate_cached_pairs(_document, store=_store, artifact_root=tmp_path, repository_id=_repository)["pairs"]["items"]

    assert [_item["cached"] for _item in _check()] == [True, False]
    assert not _check("sqlite")[0]["cached"]
    _document["pairs"]["items"][0]["new_commit"] = "different"
    assert not _check()[0]["cached"]
    _document["pairs"]["items"][0]["new_commit"] = "new"
    (_source / "revision-0.txt").unlink()
    assert not _check()[0]["cached"]
    (_source / "revision-0.txt").write_text("source")
    _manifest["schema_version"] = 0
    (_path / "artifact.json").write_text(json.dumps(_manifest))
    assert not _check()[0]["cached"]


def test_cache_indicator_ignores_running_and_failed_runs(tmp_path):
    _store = RunStore(tmp_path / "runs.sqlite3")
    _store.initialize()
    _run = _store.acquire_history_run(13, "f" * 64, repository_id="notepadpp").run
    _store.mark_running(_run.run_id)
    assert _store.completed_artifacts_for_pairs("notepadpp", (13,)) == ()
    _store.fail(_run.run_id, code="failed", message="failed")
    assert _store.completed_artifacts_for_pairs("notepadpp", (13,)) == ()
