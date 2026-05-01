from __future__ import annotations

import os

from flask import Flask

from .routes import api


def create_app() -> Flask:
    app = Flask(__name__)
    app.config["MAX_CONTENT_LENGTH"] = 8 * 1024 * 1024
    app.register_blueprint(api, url_prefix="/api")
    return app


def main() -> None:
    app = create_app()
    app.run(host="127.0.0.1", port=int(os.environ.get("PORT", "5000")), debug=True)


app = create_app()
