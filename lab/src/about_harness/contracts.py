from __future__ import annotations

import math
import re
from dataclasses import asdict, dataclass, field
from enum import StrEnum
from typing import TypeAlias, cast

JsonScalar: TypeAlias = str | int | float | bool | None
JsonValue: TypeAlias = JsonScalar | list["JsonValue"] | dict[str, "JsonValue"]

SCHEMA_VERSION = "1.0"
RESULT_SCHEMA_VERSION = "1.1"


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


TRACE_KINDS = {
    "run_started",
    "model_action",
    "acceptance_result",
    "tool_result",
    "policy_denied",
    "retry",
    "checkpoint",
    "run_stopped",
}


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
        if self.max_steps > 10_000 or self.max_model_calls > 10_000:
            raise ContractError("step and model-call budgets cannot exceed 10000")
        if self.timeout_ms > 86_400_000:
            raise ContractError("timeout budget cannot exceed 86400000 ms")
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
        if re.fullmatch(r"[a-zA-Z0-9][a-zA-Z0-9._-]{0,127}", self.task_id) is None:
            raise ContractError("task_id must match the public task schema")
        if not self.goal.strip() or len(self.goal) > 4_000:
            raise ContractError("goal must contain 1-4000 characters")
        if any(not tool for tool in self.allowed_tools):
            raise ContractError("allowed_tools cannot contain an empty name")
        if len(set(self.allowed_tools)) != len(self.allowed_tools):
            raise ContractError("allowed_tools must be unique")

    @classmethod
    def from_dict(cls, data: dict[str, JsonValue]) -> TaskSpec:
        required = {"schema_version", "task_id", "goal", "allowed_tools", "budgets"}
        allowed_fields = required | {"input", "acceptance", "metadata"}
        missing = required.difference(data)
        if missing:
            raise ContractError(f"missing task fields: {sorted(missing)}")
        unknown = set(data).difference(allowed_fields)
        if unknown:
            raise ContractError(f"unknown task fields: {sorted(unknown)}")
        allowed = data["allowed_tools"]
        budget_data = data["budgets"]
        if not isinstance(allowed, list) or not all(isinstance(item, str) for item in allowed):
            raise ContractError("allowed_tools must be a string array")
        allowed_tools = tuple(item for item in allowed if isinstance(item, str))
        if not isinstance(budget_data, dict):
            raise ContractError("budgets must be an object")
        unknown_budgets = set(budget_data).difference(
            {"max_steps", "max_model_calls", "timeout_ms", "max_cost_usd"}
        )
        if unknown_budgets:
            raise ContractError(f"unknown budget fields: {sorted(unknown_budgets)}")
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

    @classmethod
    def from_dict(cls, data: dict[str, JsonValue]) -> ToolCall:
        _require_exact_fields(
            data,
            {"call_id", "name", "arguments", "idempotency_key"},
            "tool_call",
        )
        return cls(
            call_id=_required_str(data, "call_id"),
            name=_required_str(data, "name"),
            arguments=_required_object(data, "arguments"),
            idempotency_key=_required_str(data, "idempotency_key"),
        )


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
        if self.kind == "tool" and self.output is not None:
            raise ContractError("tool action cannot contain completion output")
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

    @classmethod
    def from_dict(cls, data: dict[str, JsonValue]) -> Action:
        kind = _required_str(data, "kind")
        if kind == "complete":
            _require_exact_fields(data, {"kind", "output", "cost_usd"}, "complete action")
            return cls.complete(
                _required_json_value(data, "output"),
                cost_usd=_required_number(data, "cost_usd"),
            )
        if kind == "tool":
            _require_exact_fields(data, {"kind", "tool_call", "cost_usd"}, "tool action")
            tool_call = data.get("tool_call")
            if not isinstance(tool_call, dict):
                raise ContractError("tool_call must be an object")
            return cls.tool(
                ToolCall.from_dict(tool_call),
                cost_usd=_required_number(data, "cost_usd"),
            )
        raise ContractError(f"unsupported action kind: {kind}")


@dataclass(frozen=True, slots=True)
class TraceEvent:
    sequence: int
    kind: str
    timestamp_ms: float
    data: dict[str, JsonValue]

    def __post_init__(self) -> None:
        if not _is_non_negative_int(self.sequence):
            raise ContractError("trace sequence must be a non-negative integer")
        if self.kind not in TRACE_KINDS:
            raise ContractError(f"unsupported trace kind: {self.kind}")
        if not _is_finite_non_negative_number(self.timestamp_ms):
            raise ContractError("trace timestamp must be finite and non-negative")
        if not isinstance(cast(object, self.data), dict) or not _is_json_tree(
            self.data, set()
        ):
            raise ContractError("trace data must be a finite JSON object")

    @classmethod
    def from_dict(cls, data: dict[str, JsonValue]) -> TraceEvent:
        _require_exact_fields(data, {"sequence", "kind", "timestamp_ms", "data"}, "trace")
        return cls(
            sequence=_required_non_negative_int(data, "sequence"),
            kind=_required_str(data, "kind"),
            timestamp_ms=_required_number(data, "timestamp_ms"),
            data=_required_object(data, "data"),
        )


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
        if not isinstance(cast(object, self.adapter_state), dict) or not _is_json_tree(
            self.adapter_state, set()
        ):
            raise ContractError("checkpoint adapter_state must be a finite JSON object")

    @classmethod
    def from_dict(cls, data: dict[str, JsonValue]) -> RunCheckpoint:
        _require_exact_fields(
            data,
            {
                "step",
                "model_calls",
                "tool_calls",
                "reused_tool_calls",
                "cost_usd",
                "adapter_state",
            },
            "checkpoint",
        )
        return cls(
            step=_required_non_negative_int(data, "step"),
            model_calls=_required_non_negative_int(data, "model_calls"),
            tool_calls=_required_non_negative_int(data, "tool_calls"),
            reused_tool_calls=_required_non_negative_int(data, "reused_tool_calls"),
            cost_usd=_required_number(data, "cost_usd"),
            adapter_state=_required_object(data, "adapter_state"),
        )

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
    schema_version: str = RESULT_SCHEMA_VERSION

    def __post_init__(self) -> None:
        if self.schema_version != RESULT_SCHEMA_VERSION:
            raise ContractError(f"unsupported result schema: {self.schema_version}")
        if not self.run_id:
            raise ContractError("run_id is required")
        if re.fullmatch(r"[a-zA-Z0-9][a-zA-Z0-9._-]{0,127}", self.task_id) is None:
            raise ContractError("result task_id must match the public task schema")
        _validate_result_terminal_state(self.status, self.stop_reason, self.output)
        metric_values = _validate_result_metrics(self.metrics)
        if self.error is not None and not self.error:
            raise ContractError("result error must be null or a non-empty string")
        if self.status is RunStatus.COMPLETED and self.error is not None:
            raise ContractError("completed result error must be null")
        if self.status is RunStatus.FAILED and self.error is None:
            raise ContractError("failed result requires an error")
        if not _is_json_tree(self.output, set()):
            raise ContractError("result output must be a finite JSON value")
        if any(event.sequence != index for index, event in enumerate(self.trace)):
            raise ContractError("result trace sequence must be contiguous from zero")
        if not self.trace or self.trace[0].kind != "run_started":
            raise ContractError("result trace must start with run_started")
        if self.trace[-1].kind != "run_stopped":
            raise ContractError("result trace must end with run_stopped")
        if self.trace[-1].data.get("status") != self.status.value:
            raise ContractError("run_stopped status must match result status")
        if self.trace[-1].data.get("reason") != self.stop_reason.value:
            raise ContractError("run_stopped reason must match result stop_reason")
        if self.checkpoint is not None:
            steps, model_calls, tool_calls, reused_tool_calls, _, cost_usd = metric_values
            if self.checkpoint.step > steps:
                raise ContractError("checkpoint step cannot exceed result metrics.steps")
            if self.checkpoint.model_calls > model_calls:
                raise ContractError(
                    "checkpoint model_calls cannot exceed result metrics.model_calls"
                )
            if self.checkpoint.tool_calls > tool_calls:
                raise ContractError("checkpoint tool_calls cannot exceed result metrics.tool_calls")
            if self.checkpoint.reused_tool_calls > reused_tool_calls:
                raise ContractError(
                    "checkpoint reused_tool_calls cannot exceed result metrics.reused_tool_calls"
                )
            if self.checkpoint.cost_usd > cost_usd:
                raise ContractError("checkpoint cost_usd cannot exceed result metrics.cost_usd")

    @classmethod
    def from_dict(cls, data: dict[str, JsonValue]) -> RunResult:
        _require_exact_fields(
            data,
            {
                "schema_version",
                "run_id",
                "task_id",
                "status",
                "stop_reason",
                "output",
                "metrics",
                "trace",
                "checkpoint",
                "error",
            },
            "result",
        )
        metrics = _required_object(data, "metrics")
        trace_data = data.get("trace")
        if not isinstance(trace_data, list):
            raise ContractError("trace must be an array")
        trace: list[TraceEvent] = []
        for item in trace_data:
            if not isinstance(item, dict):
                raise ContractError("trace entries must be objects")
            trace.append(TraceEvent.from_dict(item))
        checkpoint_data = data.get("checkpoint")
        if checkpoint_data is not None and not isinstance(checkpoint_data, dict):
            raise ContractError("checkpoint must be an object or null")
        try:
            status = RunStatus(_required_str(data, "status"))
            reason = StopReason(_required_str(data, "stop_reason"))
        except ValueError as exc:
            raise ContractError(str(exc)) from exc
        error = data.get("error")
        if error is not None and not isinstance(error, str):
            raise ContractError("error must be a string or null")
        return cls(
            schema_version=_required_str(data, "schema_version"),
            run_id=_required_str(data, "run_id"),
            task_id=_required_str(data, "task_id"),
            status=status,
            stop_reason=reason,
            output=_required_json_value(data, "output"),
            metrics=metrics,
            trace=tuple(trace),
            checkpoint=(
                RunCheckpoint.from_dict(checkpoint_data)
                if isinstance(checkpoint_data, dict)
                else None
            ),
            error=error,
        )

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


def _required_non_negative_int(data: dict[str, JsonValue], key: str) -> int:
    value = data.get(key)
    if not _is_non_negative_int(value):
        raise ContractError(f"{key} must be a non-negative integer")
    return cast(int, value)


def _optional_number(data: dict[str, JsonValue], key: str, default: float) -> float:
    value = data.get(key, default)
    if not isinstance(value, (int, float)) or isinstance(value, bool):
        raise ContractError(f"{key} must be numeric")
    return float(value)


def _required_number(data: dict[str, JsonValue], key: str) -> float:
    if key not in data:
        raise ContractError(f"{key} is required")
    value = data[key]
    if not _is_finite_non_negative_number(value):
        raise ContractError(f"{key} must be finite and non-negative")
    return float(cast(int | float, value))


def _require_exact_fields(
    data: dict[str, JsonValue], required: set[str], label: str
) -> None:
    missing = required.difference(data)
    if missing:
        raise ContractError(f"missing {label} fields: {sorted(missing)}")
    unknown = set(data).difference(required)
    if unknown:
        raise ContractError(f"unknown {label} fields: {sorted(unknown)}")


def _required_json_value(data: dict[str, JsonValue], key: str) -> JsonValue:
    if key not in data:
        raise ContractError(f"{key} is required")
    value = data[key]
    if not _is_json_tree(cast(object, value), set()):
        raise ContractError(f"{key} must be a finite JSON value")
    return value


def _required_object(data: dict[str, JsonValue], key: str) -> dict[str, JsonValue]:
    value = data.get(key)
    if not isinstance(value, dict) or not _is_json_tree(cast(object, value), set()):
        raise ContractError(f"{key} must be a finite JSON object")
    return value


def _optional_object(data: dict[str, JsonValue], key: str) -> dict[str, JsonValue]:
    value = data.get(key, {})
    if not isinstance(value, dict) or not _is_json_tree(cast(object, value), set()):
        raise ContractError(f"{key} must be a finite JSON object with string keys")
    return value


def _is_json_tree(value: object, seen: set[int]) -> bool:
    if value is None or isinstance(value, (str, bool, int)):
        return True
    if isinstance(value, float):
        return math.isfinite(value)
    if isinstance(value, (list, dict)):
        collection = cast(list[object] | dict[object, object], value)
        identity = id(collection)
        if identity in seen:
            return False
        seen.add(identity)
        try:
            if isinstance(collection, list):
                return all(_is_json_tree(item, seen) for item in collection)
            return all(
                isinstance(key, str) and _is_json_tree(item, seen)
                for key, item in collection.items()
            )
        finally:
            seen.remove(identity)
    return False


def _validate_result_terminal_state(
    status: RunStatus, reason: StopReason, output: JsonValue
) -> None:
    allowed = {
        RunStatus.COMPLETED: {StopReason.COMPLETED},
        RunStatus.STOPPED: {
            StopReason.MAX_STEPS,
            StopReason.MODEL_BUDGET,
            StopReason.TIMEOUT,
            StopReason.CANCELLED,
            StopReason.PERMISSION_DENIED,
        },
        RunStatus.FAILED: {StopReason.TOOL_ERROR, StopReason.INVALID_ACTION},
    }
    if reason not in allowed[status]:
        raise ContractError(f"stop_reason {reason.value} is invalid for status {status.value}")
    if status is not RunStatus.COMPLETED and output is not None:
        raise ContractError("non-completed result output must be null")


def _validate_result_metrics(
    metrics: dict[str, JsonValue],
) -> tuple[int, int, int, int, float, float]:
    expected = {
        "steps",
        "model_calls",
        "tool_calls",
        "reused_tool_calls",
        "duration_ms",
        "cost_usd",
    }
    _require_exact_fields(metrics, expected, "metrics")
    steps = _required_non_negative_int(metrics, "steps")
    model_calls = _required_non_negative_int(metrics, "model_calls")
    tool_calls = _required_non_negative_int(metrics, "tool_calls")
    reused_tool_calls = _required_non_negative_int(metrics, "reused_tool_calls")
    duration_ms = _required_number(metrics, "duration_ms")
    cost_usd = _required_number(metrics, "cost_usd")
    if steps != tool_calls + reused_tool_calls:
        raise ContractError("metrics.steps must equal tool_calls + reused_tool_calls")
    if model_calls < steps:
        raise ContractError("metrics.model_calls cannot be lower than steps")
    return steps, model_calls, tool_calls, reused_tool_calls, duration_ms, cost_usd
