from __future__ import annotations

import pytest

from scripts import warm_history_cache as warmer


def _manifest() -> dict:
    return {
        "schema_version": 5,
        "projection_schema_version": 2,
        "artifact_id": "artifact",
        "focus_profiles": ["moves"],
        "files": [
            {"file_id": "f-one", "filename": "one.cpp"},
            {"file_id": "f-two", "filename": "two.cpp"},
        ],
        "moves": {
            "items": [
                {
                    "from_node_ids": ["f-one:n00000001"],
                    "to_node_ids": ["f-one:n00000002"],
                }
            ]
        },
    }


def _run(status: str = "completed") -> dict:
    return {
        "schema_version": 1,
        "reuse": "artifact",
        "run": {
            "run_id": "run",
            "repository_id": "repository",
            "history_pair": 7,
            "kind": "history-visualization",
            "status": status,
            "artifact_id": "artifact",
        },
    }


def test_selects_endpoint_files_and_rejects_unknown_endpoints() -> None:
    _value = _manifest()
    assert [
        item["file_id"] for item in warmer._selected_files(_value, "artifact", False)
    ] == ["f-one"]
    assert len(warmer._selected_files(_value, "artifact", True)) == 2
    _value["moves"]["items"][0]["to_node_ids"] = ["f-unknown:n00000002"]
    with pytest.raises(ValueError, match="unknown artifact file"):
        warmer._selected_files(_value, "artifact", False)


def test_warms_source_and_polls_durable_run(monkeypatch: pytest.MonkeyPatch) -> None:
    _calls = []
    _responses = iter(
        [
            {**_run("queued"), "reuse": "new"},
            _run(),
            _manifest(),
            {
                "schema_version": 1,
                "artifact_id": "artifact",
                "file_id": "f-one",
                "focus_profile": "moves",
                "blocks": [],
            },
        ]
    )

    def _request(
        base_url: str, path: str, deadline: float, *, method: str = "GET"
    ) -> dict:
        _calls.append((path, method))
        return next(_responses)

    monkeypatch.setattr(warmer, "_request", _request)
    monkeypatch.setattr(warmer.time, "sleep", lambda _: None)
    _result = warmer.warm_pair(
        base_url="http://localhost", repository="repository", pair=7, timeout=10
    )
    assert _result["reuse"] == "new"
    assert _result["files"][0]["filename"] == "one.cpp"
    assert _calls == [
        ("/api/history/pairs/7/runs?repository=repository", "POST"),
        ("/api/runs/run", "GET"),
        ("/api/artifacts/artifact", "GET"),
        ("/api/artifacts/artifact/files/f-one/source?focus=moves&context=3", "GET"),
    ]


def test_failed_runs_and_mismatched_contracts_are_errors(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setattr(warmer, "_request", lambda *args, **kwargs: _run("failed"))
    with pytest.raises(RuntimeError, match="failed"):
        warmer.warm_pair(
            base_url="http://localhost", repository="repository", pair=7, timeout=10
        )
    with pytest.raises(ValueError, match="mismatched"):
        warmer._assert_run(_run(), "another-repository", 7)
    with pytest.raises(ValueError, match="mismatched"):
        warmer._selected_files({**_manifest(), "schema_version": 4}, "artifact", False)


def test_cli_continues_pairs_and_returns_nonzero_on_failure(
    monkeypatch: pytest.MonkeyPatch, capsys: pytest.CaptureFixture[str]
) -> None:
    monkeypatch.setattr(
        warmer.sys,
        "argv",
        ["warm", "--repository", "repository", "--pairs", "7", "8", "8"],
    )

    def _warm_pair(**kwargs: object) -> dict:
        if kwargs["pair"] == 7:
            raise TimeoutError("timed out")
        return {"pair": kwargs["pair"]}

    monkeypatch.setattr(warmer, "warm_pair", _warm_pair)
    assert warmer.main() == 1
    _captured = capsys.readouterr()
    assert "pair 7: timed out" in _captured.err
    assert _captured.out.count('"pair": 8') == 1
