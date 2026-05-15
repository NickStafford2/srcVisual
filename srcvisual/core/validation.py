from __future__ import annotations

import os


class SrcVisualValidationError(AssertionError):
    """Raised when srcVisual generated payloads fail internal consistency checks."""


def require(condition: bool, message: str) -> None:
    if not condition:
        raise SrcVisualValidationError(message)


def _env_flag(name: str, *, default: bool) -> bool:
    raw_value = os.environ.get(name)

    if raw_value is None:
        return default

    normalized = raw_value.strip().lower()

    if normalized in {"1", "true", "yes", "on"}:
        return True

    if normalized in {"0", "false", "no", "off"}:
        return False

    raise ValueError(
        f"{name} must be one of: 1, true, yes, on, 0, false, no, off."
    )


def is_payload_validation_enabled() -> bool:
    return _env_flag("SRCVISUAL_PAYLOAD_VALIDATION", default=True)
