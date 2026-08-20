from __future__ import annotations

import re
from collections.abc import Callable
from dataclasses import dataclass, field

from about_harness.contracts import JsonValue, TraceEvent

Clock = Callable[[], float]


def _new_events() -> list[TraceEvent]:
    return []


_SECRET_PATTERNS = (
    re.compile(r"(?i)(api[_-]?key|password|secret|token)\s*[:=]\s*[^\s,;]+"),
    re.compile(r"(?i)bearer\s+[a-z0-9._~+/-]+"),
    re.compile(r"sk-[a-zA-Z0-9_-]{8,}"),
    re.compile(r"[A-Za-z]:\\Users\\[^\\\s]+"),
)


def redact_text(value: str) -> str:
    redacted = value
    for pattern in _SECRET_PATTERNS:
        redacted = pattern.sub("[REDACTED]", redacted)
    return redacted


def redact(value: JsonValue) -> JsonValue:
    if isinstance(value, str):
        return redact_text(value)
    if isinstance(value, list):
        return [redact(item) for item in value]
    if isinstance(value, dict):
        return {
            key: ("[REDACTED]" if _sensitive_key(key) else redact(item))
            for key, item in value.items()
        }
    return value


def _sensitive_key(key: str) -> bool:
    return key.casefold() in {"api_key", "apikey", "password", "secret", "token", "authorization"}


@dataclass(slots=True)
class TraceRecorder:
    clock: Clock
    started_at: float = field(init=False)
    _events: list[TraceEvent] = field(default_factory=_new_events)

    def __post_init__(self) -> None:
        self.started_at = self.clock()

    def record(self, kind: str, data: dict[str, JsonValue]) -> TraceEvent:
        event = TraceEvent(
            sequence=len(self._events),
            kind=kind,
            timestamp_ms=max(0.0, (self.clock() - self.started_at) * 1_000),
            data={key: redact(value) for key, value in data.items()},
        )
        self._events.append(event)
        return event

    @property
    def events(self) -> tuple[TraceEvent, ...]:
        return tuple(self._events)
