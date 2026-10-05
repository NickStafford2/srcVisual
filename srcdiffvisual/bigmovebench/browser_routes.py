from flask import Blueprint, request

from srcdiffvisual.bigmovebench._browser import read_benchmark

benchmark_browser_api = Blueprint("benchmark_browser_api", __name__)


def _response(command, *arguments):
    try:
        return read_benchmark(command, *arguments), 200
    except FileNotFoundError as _error:
        return {"error": str(_error)}, 404
    except ValueError as _error:
        return {"error": str(_error)}, 400
    except RuntimeError as _error:
        return {"error": str(_error)}, 503


@benchmark_browser_api.get("/bigmovebench/runs")
def benchmark_runs():
    return _response("list-runs")


@benchmark_browser_api.get("/bigmovebench/runs/<run_id>")
def benchmark_run(run_id):
    return _response("show-run", run_id)


@benchmark_browser_api.get("/bigmovebench/runs/<run_id>/cases")
def benchmark_cases(run_id):
    _arguments = []
    for _key in ("category", "outcome", "basis", "offset", "limit", "query"):
        if _key in request.args:
            _arguments.extend(["--" + _key, request.args[_key]])
    return _response("list-cases", run_id, *_arguments)


@benchmark_browser_api.get("/bigmovebench/runs/<run_id>/cases/<category>/<case_id>")
def benchmark_case(run_id, category, case_id):
    return _response("show-case", run_id, category, case_id)
