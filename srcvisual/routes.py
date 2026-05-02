from __future__ import annotations

from dataclasses import dataclass

from flask import Blueprint, request
from werkzeug.datastructures import FileStorage

from .core.models import BackendCommandError
from .services import build_visualization_payload

api = Blueprint("api", __name__)


@dataclass(frozen=True)
class VisualizationRequest:
    filename: str
    payload: bytes
    include_skipped_tags: bool


@api.get("/health")
def health() -> tuple[dict[str, str], int]:
    return {"status": "ok"}, 200


@api.post("/visualize")
def visualize() -> tuple[dict[str, object], int]:
    try:
        visualization_request = parse_visualization_request()
    except ValueError as exc:
        return {"error": str(exc)}, 400

    try:
        result = build_visualization_payload(
            filename=visualization_request.filename,
            payload=visualization_request.payload,
            include_skipped_tags=visualization_request.include_skipped_tags,
        )
    except BackendCommandError as exc:
        return {"error": exc.user_message()}, 500
    except ValueError as exc:
        return {"error": str(exc)}, 400

    return result.to_dict(), 200


def parse_visualization_request() -> VisualizationRequest:
    uploaded = request.files.get("srcdiff")
    xml_text = request.form.get("srcdiff_xml", "").strip()

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
    )


def get_request_filename(uploaded: FileStorage | None) -> str:
    if uploaded is None:
        return "pasted.srcdiff.xml"

    return uploaded.filename or "uploaded.srcdiff.xml"


def get_request_payload(uploaded: FileStorage | None, xml_text: str) -> bytes:
    if uploaded is not None:
        return uploaded.read()

    return xml_text.encode("utf-8")
