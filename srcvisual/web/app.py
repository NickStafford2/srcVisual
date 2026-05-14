# srcvisual/app.py

from __future__ import annotations

import os
from pathlib import Path

from flask import Flask, abort, send_from_directory
from flask.typing import ResponseReturnValue
from werkzeug.exceptions import RequestEntityTooLarge

from ..core.commands import get_command_timeout_seconds
from .routes import api

DEFAULT_MAX_CONTENT_LENGTH_MB = 64
DEFAULT_DEV_HOST = "127.0.0.1"
DEFAULT_DEV_PORT = 5000


def create_app() -> Flask:
    app = Flask(__name__)
    app.config["MAX_CONTENT_LENGTH"] = get_max_content_length_bytes()
    app.config["COMMAND_TIMEOUT_SECONDS"] = get_command_timeout_seconds()
    app.config["EXAMPLES_DIR"] = get_examples_dir()
    app.register_blueprint(api, url_prefix="/api")
    register_frontend_routes(app, get_frontend_dist())

    @app.errorhandler(RequestEntityTooLarge)
    def handle_request_entity_too_large(
        error: RequestEntityTooLarge,
    ) -> tuple[dict[str, str], int]:
        del error

        limit_bytes = int(app.config["MAX_CONTENT_LENGTH"])
        limit_mb = limit_bytes // (1024 * 1024)

        return {
            "error": (
                "The uploaded srcdiff payload is too large. "
                f"Current limit: {limit_mb} MB."
            )
        }, 413

    return app


def register_frontend_routes(app: Flask, frontend_dist: Path | None) -> None:
    if frontend_dist is None:
        return

    @app.get("/")
    def frontend_index() -> ResponseReturnValue:
        return send_from_directory(frontend_dist, "index.html")

    @app.get("/<path:path>")
    def frontend_assets(path: str) -> ResponseReturnValue:
        if path.startswith("api/"):
            abort(404)

        candidate = frontend_dist / path
        if candidate.is_file():
            return send_from_directory(frontend_dist, path)

        return send_from_directory(frontend_dist, "index.html")


def get_max_content_length_bytes() -> int:
    raw_limit_mb = os.environ.get(
        "SRCVISUAL_MAX_CONTENT_LENGTH_MB",
        str(DEFAULT_MAX_CONTENT_LENGTH_MB),
    )

    try:
        limit_mb = int(raw_limit_mb)
    except ValueError as exc:
        raise ValueError(
            "SRCVISUAL_MAX_CONTENT_LENGTH_MB must be an integer number of megabytes."
        ) from exc

    if limit_mb <= 0:
        raise ValueError("SRCVISUAL_MAX_CONTENT_LENGTH_MB must be greater than zero.")

    return limit_mb * 1024 * 1024


def get_frontend_dist() -> Path | None:
    raw_frontend_dist = os.environ.get("SRCVISUAL_FRONTEND_DIST")

    if raw_frontend_dist:
        frontend_dist = Path(raw_frontend_dist).expanduser().resolve()
        index_path = frontend_dist / "index.html"

        if not frontend_dist.is_dir():
            raise ValueError(
                "SRCVISUAL_FRONTEND_DIST must point to an existing directory."
            )

        if not index_path.is_file():
            raise ValueError(
                "SRCVISUAL_FRONTEND_DIST must contain an index.html file."
            )

        return frontend_dist

    candidate = Path(__file__).resolve().parents[1] / "frontend" / "dist"
    if (candidate / "index.html").is_file():
        return candidate

    return None


def get_examples_dir() -> Path:
    raw_examples_dir = os.environ.get("SRCVISUAL_EXAMPLES_DIR")

    if raw_examples_dir:
        examples_dir = Path(raw_examples_dir).expanduser().resolve()
        if not examples_dir.is_dir():
            raise ValueError(
                "SRCVISUAL_EXAMPLES_DIR must point to an existing directory."
            )
        return examples_dir

    return Path(__file__).resolve().parents[1] / "examples"


def get_dev_host() -> str:
    return os.environ.get("SRCVISUAL_HOST", DEFAULT_DEV_HOST)


def get_dev_port() -> int:
    return int(os.environ.get("PORT", str(DEFAULT_DEV_PORT)))


def get_dev_debug() -> bool:
    return os.environ.get("SRCVISUAL_DEBUG", "").lower() in {"1", "true", "yes", "on"}


def main() -> None:
    app = create_app()
    app.run(
        host=get_dev_host(),
        port=get_dev_port(),
        debug=get_dev_debug(),
    )


app = create_app()
