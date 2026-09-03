from __future__ import annotations

from dataclasses import dataclass

from about_harness.adapters.fake import FakeAdapter
from about_harness.contracts import Action, ContractError, JsonValue, ToolCall


@dataclass(slots=True)
class ReplayAdapter(FakeAdapter):
    name: str = "replay"

    @classmethod
    def from_records(cls, records: list[dict[str, JsonValue]]) -> ReplayAdapter:
        return cls(tuple(_action_from_record(record) for record in records))


def _action_from_record(record: dict[str, JsonValue]) -> Action:
    kind = record.get("kind")
    if kind == "complete":
        _require_fields(
            record,
            {"kind", "output", "cost_usd"},
            {"kind"},
            "complete action",
        )
        return Action.complete(record.get("output"), cost_usd=_cost(record))
    if kind == "tool":
        _require_fields(
            record,
            {"kind", "tool_call", "cost_usd"},
            {"kind", "tool_call"},
            "tool action",
        )
        raw_call = record.get("tool_call")
        if not isinstance(raw_call, dict):
            raise ContractError("replay tool action requires tool_call")
        _require_fields(
            raw_call,
            {"call_id", "name", "arguments", "idempotency_key"},
            {"call_id", "name", "arguments", "idempotency_key"},
            "tool_call",
        )
        arguments = raw_call.get("arguments")
        if not isinstance(arguments, dict):
            raise ContractError("replay tool arguments must be an object")
        call = ToolCall(
            call_id=_string(raw_call, "call_id"),
            name=_string(raw_call, "name"),
            arguments=arguments,
            idempotency_key=_string(raw_call, "idempotency_key"),
        )
        return Action.tool(call, cost_usd=_cost(record))
    raise ContractError(f"unsupported replay action: {kind}")


def _require_fields(
    record: dict[str, JsonValue],
    allowed: set[str],
    required: set[str],
    label: str,
) -> None:
    missing = required.difference(record)
    if missing:
        raise ContractError(f"{label} missing fields: {sorted(missing)}")
    unknown = set(record).difference(allowed)
    if unknown:
        raise ContractError(f"{label} contains unknown fields: {sorted(unknown)}")


def _string(record: dict[str, JsonValue], key: str) -> str:
    value = record.get(key)
    if not isinstance(value, str):
        raise ContractError(f"{key} must be a string")
    return value


def _cost(record: dict[str, JsonValue]) -> float:
    value = record.get("cost_usd", 0.0)
    if not isinstance(value, (int, float)) or isinstance(value, bool) or value < 0:
        raise ContractError("cost_usd must be a non-negative number")
    return float(value)
