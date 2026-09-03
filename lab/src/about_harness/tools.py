from __future__ import annotations

import hashlib
import json
import time
from collections.abc import Callable
from dataclasses import dataclass, field

from about_harness.contracts import JsonValue, ToolCall
from about_harness.retry import RetryPolicy, run_with_retry

ToolHandler = Callable[[dict[str, JsonValue]], JsonValue]
RetryObserver = Callable[[int, int, str], None]
Sleeper = Callable[[float], None]


class ToolError(RuntimeError):
    """A non-retryable tool failure."""


class IdempotencyConflictError(ToolError):
    """Raised when one idempotency key identifies different logical calls."""


@dataclass(frozen=True, slots=True)
class ToolExecution:
    value: JsonValue
    reused: bool
    attempts: int


@dataclass(frozen=True, slots=True)
class _CachedToolResult:
    call_fingerprint: str
    value: JsonValue


def _new_handlers() -> dict[str, ToolHandler]:
    return {}


def _new_cache() -> dict[str, _CachedToolResult]:
    return {}


@dataclass(slots=True)
class ToolRegistry:
    handlers: dict[str, ToolHandler] = field(default_factory=_new_handlers)
    _cache: dict[str, _CachedToolResult] = field(default_factory=_new_cache)
    sleeper: Sleeper = time.sleep

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
        call_fingerprint = _fingerprint_call(call)
        cached = self._cache.get(call.idempotency_key)
        if cached is not None:
            if cached.call_fingerprint != call_fingerprint:
                raise IdempotencyConflictError(
                    "idempotency key conflict: tool name or arguments changed"
                )
            return ToolExecution(cached.value, True, 0)
        handler = self.handlers.get(call.name)
        if handler is None:
            raise ToolError(f"tool is not registered: {call.name}")
        value, attempts = run_with_retry(
            lambda: handler(call.arguments),
            retry,
            on_retry=on_retry,
            sleep=self.sleeper,
        )
        self._cache[call.idempotency_key] = _CachedToolResult(call_fingerprint, value)
        return ToolExecution(value, False, attempts)

    @classmethod
    def with_safe_defaults(cls) -> ToolRegistry:
        registry = cls()
        registry.register("echo", lambda arguments: arguments.get("value"))
        registry.register("sum", _sum_numbers)
        return registry


def _fingerprint_call(call: ToolCall) -> str:
    try:
        canonical = json.dumps(
            {"tool": call.name, "arguments": call.arguments},
            allow_nan=False,
            ensure_ascii=False,
            separators=(",", ":"),
            sort_keys=True,
        )
    except (TypeError, ValueError, RecursionError) as exc:
        raise ToolError("tool arguments must be finite JSON before execution") from exc
    return hashlib.sha256(canonical.encode("utf-8")).hexdigest()


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
