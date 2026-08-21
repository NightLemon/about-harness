from __future__ import annotations

import math
from dataclasses import asdict, dataclass, field
from enum import StrEnum
from typing import TypeAlias

JsonScalar: TypeAlias = str | int | float | bool | None
JsonValue: TypeAlias = JsonScalar | list["JsonValue"] | dict[str, "JsonValue"]

SCHEMA_VERSION = "1.0"


def _new_json_object() -> dict[str, JsonValue]:
    return {}


def _is_positive_int(value: object) -> bool:
    return isinstance(value, int) and not isinstance(value, bool) and value >= 1


def _is_non_negative_int(value: object) -> bool:
    return isinstance(value, int) and not isinstance(value, bool) and value >= 0


def _is_finite_non_negative_number(value: object) -> bool:
    return (
        isinstance(value, (int, float))
        and not isinstance(value, bool)
        and math.isfinite(float(value))
        and value >= 0
    )


def _is_json_object(value: object) -> bool:
    return isinstance(value, dict)


class ContractError(ValueError):
    """Raised when an input cannot satisfy the public harness contract."""


class RunStatus(StrEnum):
    COMPLETED = "completed"
    STOPPED = "stopped"
    FAILED = "failed"


class StopReason(StrEnum):
    COMPLETED = "completed"
    MAX_STEPS = "max_steps"
    MODEL_BUDGET = "model_budget"
    TIMEOUT = "timeout"
    CANCELLED = "cancelled"
    PERMISSION_DENIED = "permission_denied"
    TOOL_ERROR = "tool_error"
    INVALID_ACTION = "invalid_action"


@dataclass(frozen=True, slots=True)
class Budgets:
    max_steps: int = 12
    max_model_calls: int = 12
    timeout_ms: int = 30_000
    max_cost_usd: float = 0.0

    def __post_init__(self) -> None:
        counters = (self.max_steps, self.max_model_calls, self.timeout_ms)
        if any(not _is_positive_int(value) for value in counters):
            raise ContractError("step, model-call, and timeout budgets must be positive")
        if not _is_finite_non_negative_number(self.max_cost_usd):
            raise ContractError("cost budget must be finite and non-negative")


@dataclass(frozen=True, slots=True)
class TaskSpec:
    task_id: str
    goal: str
    allowed_tools: tuple[str, ...]
    budgets: Budgets = field(default_factory=Budgets)
    input: dict[str, JsonValue] = field(default_factory=_new_json_object)
    acceptance: dict[str, JsonValue] = field(default_factory=_new_json_object)
    metadata: dict[str, JsonValue] = field(default_factory=_new_json_object)
    schema_version: str = SCHEMA_VERSION

    def __post_init__(self) -> None:
        if self.schema_version != SCHEMA_VERSION:
            raise ContractError(f"unsupported task schema: {self.schema_version}")
        if not self.task_id or len(self.task_id) > 128:
            raise ContractError("task_id must contain 1-128 characters")
        if not self.goal.strip():
            raise ContractError("goal cannot be empty")
        if len(set(self.allowed_tools)) != len(self.allowed_tools):
            raise ContractError("allowed_tools must be unique")

    @classmethod
    def from_dict(cls, data: dict[str, JsonValue]) -> TaskSpec:
        required = {"schema_version", "task_id", "goal", "allowed_tools", "budgets"}
        missing = required.difference(data)
        if missing:
            raise ContractError(f"missing task fields: {sorted(missing)}")
        allowed = data["allowed_tools"]
        budget_data = data["budgets"]
        if not isinstance(allowed, list) or not all(isinstance(item, str) for item in allowed):
            raise ContractError("allowed_tools must be a string array")
        allowed_tools = tuple(item for item in allowed if isinstance(item, str))
        if not isinstance(budget_data, dict):
            raise ContractError("budgets must be an object")
        try:
            budgets = Budgets(
                max_steps=_required_int(budget_data, "max_steps"),
                max_model_calls=_required_int(budget_data, "max_model_calls"),
                timeout_ms=_required_int(budget_data, "timeout_ms"),
                max_cost_usd=_optional_number(budget_data, "max_cost_usd", 0.0),
            )
            return cls(
                task_id=_required_str(data, "task_id"),
                goal=_required_str(data, "goal"),
                allowed_tools=allowed_tools,
                budgets=budgets,
                input=_optional_object(data, "input"),
                acceptance=_optional_object(data, "acceptance"),
                metadata=_optional_object(data, "metadata"),
                schema_version=_required_str(data, "schema_version"),
            )
        except (TypeError, ValueError) as exc:
            if isinstance(exc, ContractError):
                raise
            raise ContractError(str(exc)) from exc


@dataclass(frozen=True, slots=True)
class ToolCall:
    call_id: str
    name: str
    arguments: dict[str, JsonValue]
    idempotency_key: str

    def __post_init__(self) -> None:
        if not self.call_id or not self.name or not self.idempotency_key:
            raise ContractError("tool call ID, name, and idempotency key are required")


@dataclass(frozen=True, slots=True)
class Action:
    kind: str
    tool_call: ToolCall | None = None
    output: JsonValue = None
    cost_usd: float = 0.0

    def __post_init__(self) -> None:
        if self.kind not in {"tool", "complete"}:
            raise ContractError(f"unsupported action kind: {self.kind}")
        if self.kind == "tool" and self.tool_call is None:
            raise ContractError("tool action requires a tool call")
        if self.kind == "complete" and self.tool_call is not None:
            raise ContractError("complete action cannot contain a tool call")
        if not _is_finite_non_negative_number(self.cost_usd):
            raise ContractError("action cost must be finite and non-negative")

    @classmethod
    def tool(cls, call: ToolCall, *, cost_usd: float = 0.0) -> Action:
        return cls(kind="tool", tool_call=call, cost_usd=cost_usd)

    @classmethod
    def complete(cls, output: JsonValue, *, cost_usd: float = 0.0) -> Action:
        return cls(kind="complete", output=output, cost_usd=cost_usd)


@dataclass(frozen=True, slots=True)
class TraceEvent:
    sequence: int
    kind: str
    timestamp_ms: float
    data: dict[str, JsonValue]


@dataclass(frozen=True, slots=True)
class RunCheckpoint:
    step: int
    model_calls: int
    tool_calls: int
    reused_tool_calls: int
    cost_usd: float
    adapter_state: dict[str, JsonValue]

    def __post_init__(self) -> None:
        counters = (self.step, self.model_calls, self.tool_calls, self.reused_tool_calls)
        if any(not _is_non_negative_int(value) for value in counters):
            raise ContractError("checkpoint counters must be non-negative integers")
        if self.tool_calls + self.reused_tool_calls != self.step:
            raise ContractError("checkpoint tool counters must equal completed steps")
        if self.model_calls < self.step:
            raise ContractError("checkpoint model calls cannot be lower than completed steps")
        if not _is_finite_non_negative_number(self.cost_usd):
            raise ContractError("checkpoint cost must be finite and non-negative")
        if not _is_json_object(self.adapter_state):
            raise ContractError("checkpoint adapter_state must be an object")

    def to_dict(self) -> dict[str, JsonValue]:
        return dict(asdict(self))


@dataclass(frozen=True, slots=True)
class RunResult:
    run_id: str
    task_id: str
    status: RunStatus
    stop_reason: StopReason
    output: JsonValue
    metrics: dict[str, JsonValue]
    trace: tuple[TraceEvent, ...]
    checkpoint: RunCheckpoint | None = None
    error: str | None = None
    schema_version: str = SCHEMA_VERSION

    def to_dict(self) -> dict[str, JsonValue]:
        return {
            "schema_version": self.schema_version,
            "run_id": self.run_id,
            "task_id": self.task_id,
            "status": self.status.value,
            "stop_reason": self.stop_reason.value,
            "output": self.output,
            "metrics": self.metrics,
            "trace": [dict(asdict(event)) for event in self.trace],
            "checkpoint": self.checkpoint.to_dict() if self.checkpoint else None,
            "error": self.error,
        }


def _required_str(data: dict[str, JsonValue], key: str) -> str:
    value = data.get(key)
    if not isinstance(value, str):
        raise ContractError(f"{key} must be a string")
    return value


def _required_int(data: dict[str, JsonValue], key: str) -> int:
    value = data.get(key)
    if not isinstance(value, int) or isinstance(value, bool):
        raise ContractError(f"{key} must be an integer")
    return value


def _optional_number(data: dict[str, JsonValue], key: str, default: float) -> float:
    value = data.get(key, default)
    if not isinstance(value, (int, float)) or isinstance(value, bool):
        raise ContractError(f"{key} must be numeric")
    return float(value)


def _optional_object(data: dict[str, JsonValue], key: str) -> dict[str, JsonValue]:
    value = data.get(key, {})
    if not isinstance(value, dict):
        raise ContractError(f"{key} must be an object with string keys")
    return value
