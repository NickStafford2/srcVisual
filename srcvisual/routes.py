from __future__ import annotations

import subprocess

from flask import Blueprint, request

from .services import build_visualization_payload

api = Blueprint("api", __name__)


@api.get("/health")
def health() -> tuple[dict[str, str], int]:
    return {"status": "ok"}, 200


@api.post("/visualize")
def visualize() -> tuple[dict[str, object], int]:
    uploaded = request.files.get("srcdiff")
    xml_text = request.form.get("srcdiff_xml", "").strip()

    if uploaded is None and not xml_text:
        return {"error": "Expected a srcdiff upload in 'srcdiff' or raw XML in 'srcdiff_xml'."}, 400

    filename = (uploaded.filename or "uploaded.srcdiff.xml") if uploaded else "pasted.srcdiff.xml"
    payload = uploaded.read() if uploaded is not None else xml_text.encode("utf-8")

    if not payload:
        return {"error": "The uploaded srcdiff payload is empty."}, 400

    try:
        result = build_visualization_payload(filename=filename, payload=payload)
    except FileNotFoundError as exc:
        return {"error": f"Required command not found on PATH: {exc.filename}"}, 500
    except subprocess.CalledProcessError as exc:
        stderr = exc.stderr.strip() if exc.stderr else ""
        stdout = exc.stdout.strip() if exc.stdout else ""
        details = stderr or stdout or str(exc)
        return {"error": f"Backend command failed: {details}"}, 500
    except ValueError as exc:
        return {"error": str(exc)}, 400

    return result, 200
