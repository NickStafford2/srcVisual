from flask import Blueprint, request, current_app

from srcdiffvisual.artifacts.models import ArtifactProvenance
from srcdiffvisual.artifacts.projections import read_artifact_manifest
from srcdiffvisual.core.commands import BackendCommandError
from srcdiffvisual.srcmove.retained_annotations import annotate_retained_results
from srcdiffvisual.workflow.payload import build_visualization_artifact

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


@benchmark_browser_api.post("/bigmovebench/runs/<run_id>/cases/<category>/<case_id>/visualize")
def visualize_benchmark_case(run_id, category, case_id):
    try:
        _source = read_benchmark("show-source", run_id, category, case_id)
        _xml = annotate_retained_results(_source["srcdiff_xml"], _source["results"])
        _published = build_visualization_artifact(
            filename=f"bigmovebench-{category}-{_source['case']['ordinal']}.xml",
            payload=_xml.encode("utf-8"),
            artifact_root=current_app.config["ARTIFACT_ROOT"],
            provenance=ArtifactProvenance(
                origin="benchmark", move_results_source="provided",
                benchmark_case={"run_id": run_id, **_source["case"]},
                producer_tool_sha256=_source["tool_sha256"],
            ),
            producer_move_results=_source["results"],
        )
        return read_artifact_manifest(artifact_root=current_app.config["ARTIFACT_ROOT"], artifact_id=_published.artifact_id), 200
    except FileNotFoundError as _error:
        return {"error": str(_error)}, 404
    except (ValueError, AssertionError, OSError) as _error:
        return {"error": str(_error)}, 400
    except RuntimeError as _error:
        return {"error": str(_error)}, 503
    except BackendCommandError as _error:
        return {"error": f"Unable to prepare benchmark Source view: {_error}"}, 503
