from __future__ import annotations

import os


def _get_int(name: str, default: int) -> int:
    raw_value = os.environ.get(name, str(default))

    try:
        value = int(raw_value)
    except ValueError as exc:
        raise ValueError(f"{name} must be an integer.") from exc

    if value <= 0:
        raise ValueError(f"{name} must be greater than zero.")

    return value


bind = f"0.0.0.0:{os.environ.get('PORT', '5000')}"
workers = _get_int("SRCVISUAL_GUNICORN_WORKERS", 2)
threads = _get_int("SRCVISUAL_GUNICORN_THREADS", 4)
timeout = _get_int("SRCVISUAL_GUNICORN_TIMEOUT_SECONDS", 120)
graceful_timeout = _get_int("SRCVISUAL_GUNICORN_GRACEFUL_TIMEOUT_SECONDS", 30)
accesslog = "-"
errorlog = "-"
worker_tmp_dir = "/dev/shm"
