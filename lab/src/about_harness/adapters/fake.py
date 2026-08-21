from __future__ import annotations

from dataclasses import dataclass

from about_harness.contracts import Action, JsonValue, TaskSpec, TraceEvent


@dataclass(slots=True)
class FakeAdapter:
    actions: tuple[Action, ...]
    repeat_last: bool = False
    index: int = 0
    name: str = "fake"

    def next_action(self, task: TaskSpec, trace: tuple[TraceEvent, ...]) -> Action:
        del task, trace
        if self.index < len(self.actions):
            action = self.actions[self.index]
            self.index += 1
            return action
        if self.repeat_last and self.actions:
            return self.actions[-1]
        raise ValueError("fake adapter exhausted without a completion action")

    def snapshot(self) -> dict[str, JsonValue]:
        return {"index": self.index}

    def restore(self, state: dict[str, JsonValue]) -> None:
        index = state.get("index")
        if not isinstance(index, int) or isinstance(index, bool) or index < 0:
            raise ValueError("fake adapter checkpoint index is invalid")
        self.index = index
