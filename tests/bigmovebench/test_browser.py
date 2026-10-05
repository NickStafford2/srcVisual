import json

import srcdiffvisual.bigmovebench.browser_routes as routes
from srcdiffvisual.bigmovebench._browser import read_benchmark
from srcdiffvisual.core.commands import CommandResult
from srcdiffvisual.web.app import create_app


def test_browser_forwards_only_run_case_and_filter_arguments(monkeypatch):
    _calls = []

    def _read(command, *arguments):
        _calls.append((command, arguments))
        return {"schema_version": 2, "items": []}

    monkeypatch.setattr(routes, "read_benchmark", _read)
    _client = create_app().test_client()
    assert _client.get("/api/bigmovebench/runs").status_code == 200
    assert _client.get("/api/bigmovebench/runs/saved").status_code == 200
    assert _client.get("/api/bigmovebench/runs/saved/cases?category=type2b&outcome=srcmove_miss&offset=50&limit=50&path=/tmp/other").status_code == 200
    assert _client.get("/api/bigmovebench/runs/saved/cases/type2b/case-one").status_code == 200
    assert _calls == [
        ("list-runs", ()), ("show-run", ("saved",)),
        ("list-cases", ("saved", "--category", "type2b", "--outcome", "srcmove_miss", "--offset", "50", "--limit", "50")),
        ("show-case", ("saved", "type2b", "case-one")),
    ]


def test_browser_unconfigured_and_unavailable_responses(monkeypatch):
    monkeypatch.delenv("SRCDIFFVISUAL_BIGMOVEBENCH_RESULTS_ROOT", raising=False)
    monkeypatch.delenv("SRCDIFFVISUAL_BIGMOVEBENCH_CACHE_ROOT", raising=False)
    _client = create_app().test_client()
    assert _client.get("/api/bigmovebench/runs").get_json()["items"] == []
    assert _client.get("/api/bigmovebench/runs/unknown").status_code == 400

    def _missing(*_args):
        raise FileNotFoundError("Case is unavailable.")

    monkeypatch.setattr(routes, "read_benchmark", _missing)
    _response = _client.get("/api/bigmovebench/runs/saved/cases/type2b/missing")
    assert _response.status_code == 404
    assert _response.get_json()["error"] == "Case is unavailable."


def test_browser_calls_versioned_cli_with_configured_roots(monkeypatch):
    import srcdiffvisual.bigmovebench._browser as browser

    monkeypatch.setenv("SRCDIFFVISUAL_BIGMOVEBENCH_RESULTS_ROOT", "/results")
    monkeypatch.setenv("SRCDIFFVISUAL_BIGMOVEBENCH_CACHE_ROOT", "/cache")
    _calls = []

    def _command(argv):
        _calls.append(argv)
        return CommandResult(json.dumps({"schema_version": 2, "items": []}), "")

    monkeypatch.setattr(browser, "run_command", _command)
    assert read_benchmark("list-runs")["schema_version"] == 2
    assert _calls[0][1:] == ["-m", "bigMoveBench.browser", "--results-root", "/results", "--cache-root", "/cache", "list-runs"]
