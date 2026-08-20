from __future__ import annotations

from collections.abc import Callable
from dataclasses import dataclass, field

from about_harness.contracts import JsonValue, ToolCall
from about_harness.retry import RetryPolicy, run_with_retry

ToolHandler = Callable[[dict[str, JsonValue]], JsonValue]
RetryObserver = Callable[[int, int, str], None]


class ToolError(RuntimeError):
    """A non-retryable tool failure."""


@dataclass(frozen=True, slots=True)
class ToolExecution:
    value: JsonValue
    reused: bool
    attempts: int


def _new_handlers() -> dict[str, ToolHandler]:
    return {}


def _new_cache() -> dict[str, JsonValue]:
    return {}


@dataclass(slots=True)
class ToolRegistry:
    handlers: dict[str, ToolHandler] = field(default_factory=_new_handlers)
    _cache: dict[str, JsonValue] = field(default_factory=_new_cache)

    def register(self, name: str, handler: ToolHandler) -> None:
        if not name or name in self.handlers:
            raise ValueError(f"tool name is empty or already registered: {name}")
        self.handlers[name] = handler

    def execute(
        self,
        call: ToolCall,
        *,
        retry: RetryPolicy,
        on_retry: RetryObserver | None = None,
    ) -> ToolExecution:
        if call.idempotency_key in self._cache:
            return ToolExecution(self._cache[call.idempotency_key], True, 0)
        handler = self.handlers.get(call.name)
        if handler is None:
            raise ToolError(f"tool is not registered: {call.name}")
        value, attempts = run_with_retry(lambda: handler(call.arguments), retry, on_retry=on_retry)
        self._cache[call.idempotency_key] = value
        return ToolExecution(value, False, attempts)

    @classmethod
    def with_safe_defaults(cls) -> ToolRegistry:
        registry = cls()
        registry.register("echo", lambda arguments: arguments.get("value"))
        registry.register("sum", _sum_numbers)
        return registry


def _sum_numbers(arguments: dict[str, JsonValue]) -> JsonValue:
    values = arguments.get("values")
    if not isinstance(values, list) or not all(
        isinstance(value, (int, float)) and not isinstance(value, bool) for value in values
    ):
        raise ToolError("sum.values must be a numeric array")
    total = 0.0
    for value in values:
        if isinstance(value, (int, float)) and not isinstance(value, bool):
            total += float(value)
    return total
