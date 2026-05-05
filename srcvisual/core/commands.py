from __future__ import annotations

import os
import subprocess

from .models import BackendCommandError, CommandResult

DEFAULT_COMMAND_TIMEOUT_SECONDS = 30.0


def _coerce_command_output(value: str | bytes | None) -> str:
    if value is None:
        return ""

    if isinstance(value, bytes):
        return value.decode("utf-8", errors="replace")

    return value


def get_command_timeout_seconds() -> float:
    raw_timeout = os.environ.get(
        "SRCVISUAL_COMMAND_TIMEOUT_SECONDS",
        str(DEFAULT_COMMAND_TIMEOUT_SECONDS),
    )

    try:
        timeout_seconds = float(raw_timeout)
    except ValueError as exc:
        raise ValueError(
            "SRCVISUAL_COMMAND_TIMEOUT_SECONDS must be a positive number."
        ) from exc

    if timeout_seconds <= 0:
        raise ValueError("SRCVISUAL_COMMAND_TIMEOUT_SECONDS must be greater than zero.")

    return timeout_seconds


def run_command(argv: list[str]) -> CommandResult:
    timeout_seconds = get_command_timeout_seconds()

    try:
        completed = subprocess.run(
            argv,
            check=True,
            capture_output=True,
            text=True,
            timeout=timeout_seconds,
        )
    except FileNotFoundError as exc:
        raise BackendCommandError(
            argv=tuple(argv),
            returncode=None,
            stdout="",
            stderr=str(exc),
            missing_command=argv[0] if argv else None,
        ) from exc
    except subprocess.TimeoutExpired as exc:
        raise BackendCommandError(
            argv=tuple(argv),
            returncode=None,
            stdout=_coerce_command_output(exc.stdout),
            stderr=_coerce_command_output(exc.stderr),
            timed_out=True,
            timeout_seconds=timeout_seconds,
        ) from exc
    except subprocess.CalledProcessError as exc:
        raise BackendCommandError(
            argv=tuple(argv),
            returncode=exc.returncode,
            stdout=exc.stdout or "",
            stderr=exc.stderr or "",
        ) from exc

    return CommandResult(stdout=completed.stdout, stderr=completed.stderr)
