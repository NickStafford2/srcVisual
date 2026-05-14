from __future__ import annotations

import sys

import pytest

from srcvisual.workflow._commands import BackendCommandError, run_command


def test_run_command_returns_stdout_and_stderr(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("SRCVISUAL_COMMAND_TIMEOUT_SECONDS", "2")

    result = run_command(
        [
            sys.executable,
            "-c",
            "import sys; print('hello'); print('warn', file=sys.stderr)",
        ]
    )

    assert result.stdout == "hello\n"
    assert result.stderr == "warn\n"


def test_run_command_raises_backend_error_when_timed_out(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setenv("SRCVISUAL_COMMAND_TIMEOUT_SECONDS", "0.01")

    with pytest.raises(BackendCommandError) as exc_info:
        run_command([sys.executable, "-c", "import time; time.sleep(0.2)"])

    assert exc_info.value.timed_out is True
    assert exc_info.value.timeout_seconds == 0.01
