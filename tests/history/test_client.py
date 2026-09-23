from __future__ import annotations

import json
from pathlib import Path

import pytest

import srcvisual.history.client as history_client
from srcvisual.core.commands import CommandResult
from srcvisual.history.client import (
    HistoryConfigurationError,
    HistoryResponseError,
    materialize_history_pair,
    read_materialized_move_results,
    read_history_pair,
    read_history_pairs,
    read_history_status,
)


def _repository(tmp_path: Path) -> Path:
    repository = tmp_path / "repository"
    analysis = repository / ".srcmove"
    analysis.mkdir(parents=True)
    (analysis / "analysis.sqlite3").touch()
    return repository


def test_read_status_uses_versioned_json_command(
    monkeypatch: pytest.MonkeyPatch,
    tmp_path: Path,
) -> None:
    repository = _repository(tmp_path)
    captured: list[str] = []

    def fake_run_command(argv: list[str]) -> CommandResult:
        captured.extend(argv)
        return CommandResult(
            stdout=json.dumps({"schema_version": 2, "state": "idle"}),
            stderr="",
        )

    monkeypatch.setattr(history_client, "run_command", fake_run_command)

    document = read_history_status(repository)

    assert document["state"] == "idle"
    assert captured == [
        "srcmove-history",
        "-C",
        str(repository),
        "status",
        "--format",
        "json",
    ]


def test_read_pairs_builds_bounded_filter_and_cursor_command(
    monkeypatch: pytest.MonkeyPatch,
    tmp_path: Path,
) -> None:
    repository = _repository(tmp_path)
    captured: list[str] = []

    def fake_run_command(argv: list[str]) -> CommandResult:
        captured.extend(argv)
        return CommandResult(
            stdout=json.dumps({"schema_version": 1, "pairs": {"items": []}}),
            stderr="",
        )

    monkeypatch.setattr(history_client, "run_command", fake_run_command)

    read_history_pairs(
        repository,
        selection="moves",
        limit=25,
        after=40,
        oldest_first=True,
    )

    assert captured[-9:] == [
        "list",
        "--moves",
        "--limit",
        "25",
        "--after",
        "40",
        "--oldest-first",
        "--format",
        "json",
    ]


def test_read_pair_rejects_unexpected_schema(
    monkeypatch: pytest.MonkeyPatch,
    tmp_path: Path,
) -> None:
    repository = _repository(tmp_path)
    monkeypatch.setattr(
        history_client,
        "run_command",
        lambda argv: CommandResult(
            stdout=json.dumps({"schema_version": 99}),
            stderr="",
        ),
    )

    with pytest.raises(HistoryResponseError, match="Unsupported"):
        read_history_pair(repository, 1)


def test_read_status_requires_analysis_database(tmp_path: Path) -> None:
    repository = tmp_path / "repository"
    repository.mkdir()

    with pytest.raises(HistoryConfigurationError, match="analysis.sqlite3"):
        read_history_status(repository)


def test_materialize_pair_returns_confined_srcmove_artifact(
    monkeypatch: pytest.MonkeyPatch,
    tmp_path: Path,
) -> None:
    repository = _repository(tmp_path)
    comparison = repository / ".srcmove" / "comparisons" / "old-to-new"
    comparison.mkdir(parents=True)
    artifact = comparison / "srcmove.xml"
    artifact.write_text("<unit />", encoding="utf-8")
    captured: list[str] = []

    def fake_run_command(argv: list[str]) -> CommandResult:
        captured.extend(argv)
        return CommandResult(
            stdout=json.dumps(
                {
                    "schema_version": 1,
                    "comparison": {
                        "status": "completed",
                        "saved_paths": [str(artifact)],
                    },
                }
            ),
            stderr="",
        )

    monkeypatch.setattr(history_client, "run_command", fake_run_command)

    assert materialize_history_pair(repository, 13) == artifact
    assert captured[-7:] == [
        "compare",
        "--pair",
        "13",
        "--save",
        "all",
        "--format",
        "json",
    ]


def test_materialize_pair_rejects_artifact_outside_analysis(
    monkeypatch: pytest.MonkeyPatch,
    tmp_path: Path,
) -> None:
    repository = _repository(tmp_path)
    artifact = tmp_path / "srcmove.xml"
    artifact.write_text("<unit />", encoding="utf-8")
    monkeypatch.setattr(
        history_client,
        "run_command",
        lambda argv: CommandResult(
            stdout=json.dumps(
                {
                    "schema_version": 1,
                    "comparison": {
                        "status": "completed",
                        "saved_paths": [str(artifact)],
                    },
                }
            ),
            stderr="",
        ),
    )

    with pytest.raises(HistoryResponseError, match="outside"):
        materialize_history_pair(repository, 1)


def test_read_materialized_move_results_preserves_producer_metadata(
    tmp_path: Path,
) -> None:
    _artifact = tmp_path / "srcmove.xml"
    _artifact.touch()
    _results = {
        "move_count": 1,
        "moves": [{"move_id": "move-1", "match_kind": "type3"}],
        "group_kinds": {"move_1_to_1": 1},
    }
    (_artifact.with_name("results.json")).write_text(
        json.dumps(_results),
        encoding="utf-8",
    )

    assert read_materialized_move_results(_artifact) == _results


def test_read_materialized_move_results_allows_xml_only_history_artifact(
    tmp_path: Path,
) -> None:
    assert read_materialized_move_results(tmp_path / "srcmove.xml") is None
