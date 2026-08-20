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


def normalize_rows(payload: dict[str, JsonValue]) -> dict[str, JsonValue]:
    """Apply the schema contract represented by the PydanticAI lab without importing it."""

    rows = require_list(payload.get("rows"), "rows")
    normalized: list[JsonValue] = []
    for index, raw in enumerate(rows):
        row = require_object(raw, f"rows[{index}]")
        unknown = set(row).difference({"user_id", "score", "email"})
        if unknown:
            raise IntegrationContractError(f"rows[{index}] has schema drift: {sorted(unknown)}")
        score_value = row.get("score")
        score: JsonValue = None if score_value is None else require_number(
            score_value, f"rows[{index}].score"
        )
        email = optional_string(row.get("email"), f"rows[{index}].email")
        normalized.append(
            {
                "user_id": require_string(row.get("user_id"), f"rows[{index}].user_id"),
                "score": score,
                "email": "[REDACTED]" if email is not None else None,
            }
        )
    return {
        "rows": normalized,
        "row_count": len(normalized),
        "sensitive_values_exposed": 0,
        "integration": BOUNDARY.name,
        "mode": BOUNDARY.execution_mode,
    }
