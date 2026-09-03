from __future__ import annotations

from about_harness.contracts import JsonValue
from about_harness.integrations.base import (
    IntegrationBoundary,
    IntegrationContractError,
    optional_string,
    require_list,
    require_number,
    require_object,
    require_string,
)

BOUNDARY = IntegrationBoundary(
    name="PydanticAI",
    distribution="pydantic-ai",
    import_name="pydantic_ai",
    representative_domain="data",
)

_DATASET_FIELDS = {"dataset_id", "snapshot_id", "schema_version", "score_unit"}
_ROW_FIELDS = {"user_id", "score", "email"}
_SCORE_UNIT = "points_0_10"
_SCHEMA_VERSION = "1.1"


def _require_exact_fields(
    value: dict[str, JsonValue], expected: set[str], label: str
) -> None:
    missing = expected.difference(value)
    unknown = set(value).difference(expected)
    if missing or unknown:
        problems: list[str] = []
        if missing:
            problems.append(f"missing {sorted(missing)}")
        if unknown:
            problems.append(f"unknown {sorted(unknown)}")
        raise IntegrationContractError(f"{label} has schema drift: {', '.join(problems)}")


def _require_non_blank(value: JsonValue, label: str) -> str:
    text = require_string(value, label)
    if not text.strip():
        raise IntegrationContractError(f"{label} must be a non-blank string")
    return text


def _count_sensitive_values(value: JsonValue, sensitive: set[str]) -> int:
    if isinstance(value, str):
        return int(value in sensitive)
    if isinstance(value, list):
        return sum(_count_sensitive_values(item, sensitive) for item in value)
    if isinstance(value, dict):
        return sum(_count_sensitive_values(item, sensitive) for item in value.values())
    return 0


def normalize_rows(payload: dict[str, JsonValue]) -> dict[str, JsonValue]:
    """Apply the schema contract represented by the PydanticAI lab without importing it."""

    _require_exact_fields(payload, {"dataset", "rows"}, "payload")
    dataset = require_object(payload.get("dataset"), "dataset")
    _require_exact_fields(dataset, _DATASET_FIELDS, "dataset")
    dataset_id = _require_non_blank(dataset.get("dataset_id"), "dataset.dataset_id")
    snapshot_id = _require_non_blank(
        dataset.get("snapshot_id"), "dataset.snapshot_id"
    )
    schema_version = _require_non_blank(
        dataset.get("schema_version"), "dataset.schema_version"
    )
    if schema_version != _SCHEMA_VERSION:
        raise IntegrationContractError(
            f"dataset.schema_version must be {_SCHEMA_VERSION}"
        )
    score_unit = _require_non_blank(dataset.get("score_unit"), "dataset.score_unit")
    if score_unit != _SCORE_UNIT:
        raise IntegrationContractError(f"dataset.score_unit must be {_SCORE_UNIT}")

    rows = require_list(payload.get("rows"), "rows")
    normalized: list[JsonValue] = []
    seen_user_ids: set[str] = set()
    sensitive_values: set[str] = set()
    redacted_fields = 0
    for index, raw in enumerate(rows):
        row = require_object(raw, f"rows[{index}]")
        unknown = set(row).difference(_ROW_FIELDS)
        if unknown:
            raise IntegrationContractError(f"rows[{index}] has schema drift: {sorted(unknown)}")
        user_id = _require_non_blank(row.get("user_id"), f"rows[{index}].user_id")
        if user_id in seen_user_ids:
            raise IntegrationContractError(f"duplicate user_id: {user_id}")
        seen_user_ids.add(user_id)

        if "score" not in row:
            score: JsonValue = None
            score_state = "missing"
        elif row["score"] is None:
            score = None
            score_state = "null"
        else:
            score = require_number(row["score"], f"rows[{index}].score")
            if score < 0 or score > 10:
                raise IntegrationContractError(
                    f"rows[{index}].score must be between 0 and 10 points"
                )
            score_state = "value"

        email = optional_string(row.get("email"), f"rows[{index}].email")
        if email is not None:
            if not email.strip():
                raise IntegrationContractError(
                    f"rows[{index}].email must be a non-blank string"
                )
            sensitive_values.add(email)
            redacted_fields += 1
        normalized.append(
            {
                "user_id": user_id,
                "score": score,
                "score_state": score_state,
                "email": "[REDACTED]" if email is not None else None,
            }
        )
    sensitive_values_exposed = _count_sensitive_values(normalized, sensitive_values)
    if sensitive_values_exposed:
        raise IntegrationContractError(
            "redaction failed: a sensitive source value remains in output"
        )

    return {
        "dataset": {
            "dataset_id": dataset_id,
            "snapshot_id": snapshot_id,
            "schema_version": schema_version,
            "score_unit": score_unit,
        },
        "rows": normalized,
        "row_count": len(normalized),
        "population": {
            "input_rows": len(rows),
            "output_rows": len(normalized),
            "rejected_rows": 0,
        },
        "redacted_fields": redacted_fields,
        "sensitive_values_exposed": sensitive_values_exposed,
        "integration": BOUNDARY.name,
        "mode": BOUNDARY.execution_mode,
    }
