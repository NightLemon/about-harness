from __future__ import annotations

from dataclasses import dataclass

from about_harness.contracts import JsonValue


class IntegrationContractError(ValueError):
    """Raised when an offline integration fixture violates its contract."""


@dataclass(frozen=True, slots=True)
class IntegrationBoundary:
    name: str
    distribution: str
    import_name: str
    representative_domain: str
    execution_mode: str = "offline-contract-seam"
    live_enabled: bool = False


def require_object(value: JsonValue, label: str) -> dict[str, JsonValue]:
    if not isinstance(value, dict):
        raise IntegrationContractError(f"{label} must be an object")
    return value


def require_list(value: JsonValue, label: str) -> list[JsonValue]:
    if not isinstance(value, list):
        raise IntegrationContractError(f"{label} must be an array")
    return value


def require_string(value: JsonValue, label: str) -> str:
    if not isinstance(value, str) or not value:
        raise IntegrationContractError(f"{label} must be a non-empty string")
    return value


def optional_string(value: JsonValue, label: str) -> str | None:
    if value is None:
        return None
    return require_string(value, label)


def require_number(value: JsonValue, label: str) -> float:
    if not isinstance(value, (int, float)) or isinstance(value, bool):
        raise IntegrationContractError(f"{label} must be a number")
    return float(value)
