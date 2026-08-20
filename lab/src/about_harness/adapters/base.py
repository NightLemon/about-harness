from __future__ import annotations

from typing import Protocol

from about_harness.contracts import Action, JsonValue, TaskSpec, TraceEvent


class Adapter(Protocol):
    name: str

    def next_action(self, task: TaskSpec, trace: tuple[TraceEvent, ...]) -> Action: ...

    def snapshot(self) -> dict[str, JsonValue]: ...

    def restore(self, state: dict[str, JsonValue]) -> None: ...
