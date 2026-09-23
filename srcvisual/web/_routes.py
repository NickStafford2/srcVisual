from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path

from flask import Blueprint, Response, current_app, request
from werkzeug.datastructures import FileStorage

from srcvisual.artifacts.models import ArtifactProvenance
from srcvisual.core.commands import BackendCommandError
from srcvisual.workflow._tree_pruning import PruningLevel, parse_tree_pruning_level
from srcvisual.workflow.payload import build_visualization_payload
from srcvisual.history.client import (
    HistoryConfigurationError,
    HistoryResponseError,
    history_error_response,
    materialize_history_pair,
    read_materialized_move_results,
    read_history_pair,
    read_history_pairs,
    read_history_status,
)
from srcvisual.web._examples import list_example_filenames, read_example_file
from srcvisual.web._progress import progress_broker

api = Blueprint("api", __name__)


@dataclass(frozen=True)
class VisualizationRequest:
    filename: str
    payload: bytes
    include_skipped_tags: bool
    pruning_level: PruningLevel | None
    progress_token: str | None


@api.get("/health")
def health() -> tuple[dict[str, str], int]:
    return {"status": "ok"}, 200


@api.get("/examples")
def list_examples() -> tuple[dict[str, list[str]], int]:
    return {"examples": list_example_filenames()}, 200


@api.get("/examples/<path:filename>")
def get_example(filename: str) -> tuple[dict[str, str], int]:
    try:
        content = read_example_file(filename)
    except ValueError as exc:
        return {"error": str(exc)}, 404

    return {"filename": filename, "content": content}, 200


@api.get("/history/status")
def history_status() -> tuple[dict[str, object], int]:
    try:
        result = read_history_status(_history_repository())
    except Exception as error:
        return history_error_response(error)
    return result, 200


@api.get("/history/pairs")
def history_pairs() -> tuple[dict[str, object], int]:
    try:
        selection = request.args.get("selection", "all")
        limit = _positive_integer_query("limit", default=50, maximum=100)
        after = _optional_positive_integer_query("after")
        oldest_first = _boolean_query("oldest_first")
        result = read_history_pairs(
            _history_repository(),
            selection=selection,
            limit=limit,
            after=after,
            oldest_first=oldest_first,
        )
    except ValueError as error:
        return {"error": str(error)}, 400
    except Exception as error:
        return history_error_response(error)
    return result, 200


@api.get("/history/pairs/<int:pair_number>")
def history_pair(pair_number: int) -> tuple[dict[str, object], int]:
    try:
        result = read_history_pair(_history_repository(), pair_number)
    except ValueError as error:
        return {"error": str(error)}, 400
    except Exception as error:
        return history_error_response(error)
    return result, 200


@api.post("/history/pairs/<int:pair_number>/visualize")
def visualize_history_pair(pair_number: int) -> tuple[dict[str, object], int]:
    progress_token = get_progress_token()
    try:
        if progress_token is not None:
            progress_broker.publish_progress(
                progress_token,
                f"Regenerating commit pair {pair_number} with its frozen tools.",
            )
        artifact = materialize_history_pair(_history_repository(), pair_number)
        producer_move_results = read_materialized_move_results(artifact)
        if progress_token is not None:
            progress_broker.publish_progress(
                progress_token,
                "Building the synchronized visualization.",
            )
        result = build_visualization_payload(
            filename=f"history-pair-{pair_number}.srcmove.xml",
            payload=artifact.read_bytes(),
            include_skipped_tags=request.form.get("include_skipped_tags") == "true",
            pruning_level=get_pruning_level(),
            artifact_root=current_app.config["ARTIFACT_ROOT"],
            provenance=ArtifactProvenance(
                origin="history",
                history_pair=pair_number,
                move_results_source=(
                    "provided" if producer_move_results is not None else "reconstructed"
                ),
            ),
            producer_move_results=producer_move_results,
            progress=(
                None
                if progress_token is None
                else lambda message: progress_broker.publish_progress(
                    progress_token,
                    message,
                )
            ),
        )
    except (
        HistoryConfigurationError,
        BackendCommandError,
        HistoryResponseError,
    ) as error:
        payload, status = history_error_response(error)
        if progress_token is not None:
            progress_broker.publish_error(progress_token, payload["error"])
        return payload, status
    if progress_token is not None:
        progress_broker.publish_complete(progress_token, "Visualization complete.")
    return result.to_dict(), 200


@api.get("/visualize/events")
def visualize_events() -> Response | tuple[dict[str, str], int]:
    token = request.args.get("token", "").strip()
    if not token:
        return {
            "error": "Expected progress stream token in 'token' query parameter."
        }, 400

    return Response(
        progress_broker.stream(token),
        mimetype="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
        },
    )


@api.post("/visualize")
def visualize() -> tuple[dict[str, object], int]:
    print("POST /api/visualize received", flush=True)

    visualization_request = parse_visualization_request()
    progress_token = visualization_request.progress_token

    print(
        "visualize request parsed:",
        {
            "filename": visualization_request.filename,
            "payload_bytes": len(visualization_request.payload),
            "include_skipped_tags": visualization_request.include_skipped_tags,
            "pruning_level": visualization_request.pruning_level,
            "has_progress_token": progress_token is not None,
        },
        flush=True,
    )

    try:
        result = build_visualization_payload(
            filename=visualization_request.filename,
            payload=visualization_request.payload,
            include_skipped_tags=visualization_request.include_skipped_tags,
            pruning_level=visualization_request.pruning_level,
            artifact_root=current_app.config["ARTIFACT_ROOT"],
            provenance=ArtifactProvenance(origin="upload"),
            progress=(
                None
                if progress_token is None
                else lambda message: progress_broker.publish_progress(
                    progress_token,
                    message,
                )
            ),
        )
    except Exception as exc:
        if progress_token is not None:
            progress_broker.publish_error(
                progress_token, f"{type(exc).__name__}: {exc}"
            )

        print("POST /api/visualize crashed; re-raising for Flask debugger", flush=True)
        raise

    if progress_token is not None:
        progress_broker.publish_complete(progress_token, "Visualization complete.")

    return result.to_dict(), 200


def parse_visualization_request() -> VisualizationRequest:
    uploaded = request.files.get("srcdiff")
    xml_text = request.form.get("srcdiff_xml", "").strip()

    print(
        "incoming form:",
        {
            "file_keys": list(request.files.keys()),
            "form_keys": list(request.form.keys()),
            "has_srcdiff_file": uploaded is not None,
            "srcdiff_xml_length": len(xml_text),
        },
        flush=True,
    )

    if uploaded is None and not xml_text:
        raise ValueError(
            "Expected a srcdiff upload in 'srcdiff' or raw XML in 'srcdiff_xml'."
        )

    filename = get_request_filename(uploaded)
    payload = get_request_payload(uploaded, xml_text)

    if not payload:
        raise ValueError("The uploaded srcdiff payload is empty.")

    return VisualizationRequest(
        filename=filename,
        payload=payload,
        include_skipped_tags=request.form.get("include_skipped_tags") == "true",
        pruning_level=get_pruning_level(),
        progress_token=get_progress_token(),
    )


def get_request_filename(uploaded: FileStorage | None) -> str:
    if uploaded is None:
        return "pasted.srcdiff.xml"

    return uploaded.filename or "uploaded.srcdiff.xml"


def get_request_payload(uploaded: FileStorage | None, xml_text: str) -> bytes:
    if uploaded is not None:
        return uploaded.read()

    return xml_text.encode("utf-8")


def get_progress_token() -> str | None:
    token = request.form.get("progress_token", "").strip()

    if not token:
        return None

    return token


def get_pruning_level() -> PruningLevel | None:
    raw_level = request.form.get("pruning_level", "").strip()

    if not raw_level:
        return None

    return parse_tree_pruning_level(raw_level)


def _history_repository() -> Path:
    repository = current_app.config.get("HISTORY_REPOSITORY")
    if repository is None:
        raise HistoryConfigurationError(
            "History browsing is not configured. Set "
            "SRCVISUAL_HISTORY_REPOSITORY when starting srcVisual."
        )
    return repository


def _positive_integer_query(name: str, *, default: int, maximum: int) -> int:
    raw_value = request.args.get(name)
    if raw_value is None:
        return default
    try:
        value = int(raw_value)
    except ValueError as error:
        raise ValueError(f"{name} must be an integer.") from error
    if not 1 <= value <= maximum:
        raise ValueError(f"{name} must be between 1 and {maximum}.")
    return value


def _optional_positive_integer_query(name: str) -> int | None:
    raw_value = request.args.get(name)
    if raw_value is None:
        return None
    try:
        value = int(raw_value)
    except ValueError as error:
        raise ValueError(f"{name} must be an integer.") from error
    if value <= 0:
        raise ValueError(f"{name} must be positive.")
    return value


def _boolean_query(name: str) -> bool:
    raw_value = request.args.get(name, "false")
    if raw_value not in {"true", "false"}:
        raise ValueError(f"{name} must be true or false.")
    return raw_value == "true"
