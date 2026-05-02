from __future__ import annotations

import subprocess

from .models import CommandResult


def run_command(argv: list[str]) -> CommandResult:
    completed = subprocess.run(argv, check=True, capture_output=True, text=True)
    return CommandResult(stdout=completed.stdout, stderr=completed.stderr)
