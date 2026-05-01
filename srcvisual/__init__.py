from __future__ import annotations

import json
import os
import subprocess
import tempfile
from dataclasses import dataclass
from pathlib import Path

from flask import Flask, jsonify, request


@dataclass(frozen=True)
class CommandResult:
    stdout: str
    stderr: str


def create_app() -> Flask:
    app = Flask(__name__)
    app.config["MAX_CONTENT_LENGTH"] = 8 * 1024 * 1024

    @app.get("/api/health")
    def health() -> tuple[dict[str, str], int]:
        return {"status": "ok"}, 200

    @app.post("/api/visualize")
    def visualize() -> tuple[dict[str, object], int]:
        uploaded = request.files.get("srcdiff")
        xml_text = request.form.get("srcdiff_xml", "").strip()

        if uploaded is None and not xml_text:
            return {"error": "Expected a srcdiff upload in 'srcdiff' or raw XML in 'srcdiff_xml'."}, 400

        filename = uploaded.filename or "uploaded.srcdiff.xml" if uploaded else "pasted.srcdiff.xml"
        if uploaded is not None:
            payload = uploaded.read()
        else:
            payload = xml_text.encode("utf-8")

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

    return app


def build_visualization_payload(*, filename: str, payload: bytes) -> dict[str, object]:
    with tempfile.TemporaryDirectory(prefix="srcvisual-") as tmpdir_name:
        tmpdir = Path(tmpdir_name)
        input_path = tmpdir / sanitize_filename(filename)
        annotated_path = tmpdir / "annotated.srcdiff.xml"
        input_path.write_bytes(payload)

        run_command(["srcMove", str(input_path), str(annotated_path)])

        archive_info = json.loads(run_command(["archive_reader", "--info", str(annotated_path)]).stdout)
        unit_count = int(archive_info["units"])
        files: list[dict[str, object]] = []

        for unit in range(1, unit_count + 1):
            unit_info = json.loads(
                run_command(["archive_reader", "--info", f"--unit={unit}", str(annotated_path)]).stdout
            )
            files.append(
                {
                    "unit": unit,
                    "filename": unit_info.get("filename", f"unit-{unit}"),
                    "language": unit_info.get("language"),
                    "before_source": run_command(
                        ["archive_reader", f"--unit={unit}", "--revision=0", "--output-src", str(annotated_path)]
                    ).stdout,
                    "after_source": run_command(
                        ["archive_reader", f"--unit={unit}", "--revision=1", "--output-src", str(annotated_path)]
                    ).stdout,
                }
            )

        if not files:
            raise ValueError("No units were found in the uploaded srcdiff file.")

        return {
            "source_filename": filename,
            "annotated_srcdiff_xml": annotated_path.read_text(encoding="utf-8"),
            "units": archive_info["units"],
            "files": files,
        }


def run_command(argv: list[str]) -> CommandResult:
    completed = subprocess.run(argv, check=True, capture_output=True, text=True)
    return CommandResult(stdout=completed.stdout, stderr=completed.stderr)


def sanitize_filename(filename: str) -> str:
    candidate = Path(filename).name
    if not candidate:
        return "uploaded.srcdiff.xml"
    return candidate


app = create_app()


def main() -> None:
    app.run(host="127.0.0.1", port=int(os.environ.get("PORT", "5000")), debug=True)
