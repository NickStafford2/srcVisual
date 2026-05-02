from __future__ import annotations

import os

from flask import Flask
from werkzeug.exceptions import RequestEntityTooLarge

from .routes import api

DEFAULT_MAX_CONTENT_LENGTH_MB = 64


def create_app() -> Flask:
    app = Flask(__name__)
    app.config["MAX_CONTENT_LENGTH"] = get_max_content_length_bytes()
    app.register_blueprint(api, url_prefix="/api")

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
        raise ValueError(
            "SRCVISUAL_MAX_CONTENT_LENGTH_MB must be greater than zero."
        )

    return limit_mb * 1024 * 1024


def main() -> None:
    app = create_app()
    app.run(host="127.0.0.1", port=int(os.environ.get("PORT", "5000")), debug=True)


app = create_app()
