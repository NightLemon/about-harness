from __future__ import annotations

from about_harness.contracts import Action, JsonValue, TaskSpec, TraceEvent


class LiveAdapterDisabled(RuntimeError):
    pass


class LiveAdapter:
    """A hard-disabled placeholder; no provider client or credential reader exists."""

    name = "live-disabled"

    def next_action(self, task: TaskSpec, trace: tuple[TraceEvent, ...]) -> Action:
        del task, trace
        raise LiveAdapterDisabled(
            "live adapters require separate API, credential, and fee authorization"
        )

    def snapshot(self) -> dict[str, JsonValue]:
        return {}

    def restore(self, state: dict[str, JsonValue]) -> None:
        if state:
            raise LiveAdapterDisabled("live adapter cannot restore while disabled")
