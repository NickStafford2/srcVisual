from __future__ import annotations


def assert_optional_span_dict(
    value: object,
    path: str,
    field_name: str,
) -> dict[str, int] | None:
    if value is None:
        return None

    assert isinstance(value, dict), (
        f"Tree node at {path} has invalid {field_name}: expected dict or None."
    )

    expected_keys = {"start_line", "start_col", "end_line", "end_col"}

    assert set(value) == expected_keys, (
        f"Tree node at {path} has invalid {field_name} keys: "
        f"expected {sorted(expected_keys)}, got {sorted(value)}."
    )

    for key in expected_keys:
        assert isinstance(value[key], int), (
            f"Tree node at {path} has non-integer {field_name}.{key}: {value[key]!r}."
        )

    assert_span_order(value, path, field_name)

    return value


def assert_span_order(span: dict[str, int], path: str, field_name: str) -> None:
    start = (span["start_line"], span["start_col"])
    end = (span["end_line"], span["end_col"])

    assert start <= end, (
        f"Tree node at {path} has invalid {field_name}: "
        f"start {start} is after end {end}."
    )
