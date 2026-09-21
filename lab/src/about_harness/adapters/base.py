from __future__ import annotations

from dataclasses import dataclass
from typing import Protocol, runtime_checkable

from about_harness.contracts import Action, JsonValue, TaskSpec, TraceEvent


class Adapter(Protocol):
    name: str

    def next_action(self, task: TaskSpec, trace: tuple[TraceEvent, ...]) -> Action: ...

    def snapshot(self) -> dict[str, JsonValue]: ...

    def restore(self, state: dict[str, JsonValue]) -> None: ...


@dataclass(frozen=True, slots=True)
class ToolObservation:
    """Execution data for the protocol, separate from the redacted display trace."""

    call_id: str
    name: str
    value: JsonValue


@runtime_checkable
class ToolResultReceiver(Protocol):
    def receive_tool_result(self, observation: ToolObservation) -> None: ...
