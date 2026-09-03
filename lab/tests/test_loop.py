from __future__ import annotations

import threading
from dataclasses import dataclass
from typing import cast

from about_harness.acceptance import AcceptanceResult
from about_harness.adapters.fake import FakeAdapter
from about_harness.contracts import (
    Action,
    Budgets,
    JsonValue,
    RunResult,
    RunStatus,
    StopReason,
    TaskSpec,
    ToolCall,
    TraceEvent,
)
from about_harness.loop import CancellationToken, HarnessRunner
from about_harness.policies import PermissionPolicy
from about_harness.retry import RetryableError, RetryPolicy
from about_harness.tools import ToolRegistry


def call(
    call_id: str = "call-1",
    *,
    name: str = "echo",
    key: str = "echo-1",
) -> ToolCall:
    return ToolCall(call_id, name, {"value": "hello"}, key)


def task(
    *,
    budgets: Budgets | None = None,
    tools: tuple[str, ...] = ("echo",),
    acceptance: dict[str, JsonValue] | None = None,
) -> TaskSpec:
    return TaskSpec(
        "loop-test",
        "exercise loop controls",
        tools,
        budgets or Budgets(),
        acceptance=acceptance or {},
    )


def test_normal_completion_and_structured_trace() -> None:
    adapter = FakeAdapter((Action.tool(call()), Action.complete({"ok": True})))
    result = HarnessRunner(adapter, ToolRegistry.with_safe_defaults()).run(
        task(acceptance={"ok": True}), run_id="run-fixed"
    )
    assert result.status is RunStatus.COMPLETED
    assert result.stop_reason is StopReason.COMPLETED
    assert result.output == {"ok": True}
    assert result.metrics["tool_calls"] == 1
    acceptance_events = [event for event in result.trace if event.kind == "acceptance_result"]
    assert [event.data["accepted"] for event in acceptance_events] == [True]
    assert [event.sequence for event in result.trace] == list(range(len(result.trace)))


def test_acceptance_rejection_returns_feedback_and_allows_repair() -> None:
    adapter = FakeAdapter(
        (
            Action.complete({"passed": False, "details": {"count": 1}}),
            Action.complete({"passed": True, "details": {"count": 2}, "extra": "allowed"}),
        )
    )
    result = HarnessRunner(adapter, ToolRegistry()).run(
        task(acceptance={"passed": True, "details": {"count": 2}})
    )
    assert result.status is RunStatus.COMPLETED
    assert result.output == {"passed": True, "details": {"count": 2}, "extra": "allowed"}
    acceptance_events = [event for event in result.trace if event.kind == "acceptance_result"]
    assert [event.data["accepted"] for event in acceptance_events] == [False, True]
    assert acceptance_events[0].data["evidence"] == {
        "validator": "json-subset-v1",
        "top_level_criteria": 2,
        "failed_paths": ["/passed", "/details/count"],
    }
    assert result.metrics["model_calls"] == 2
    assert result.metrics["tool_calls"] == 0


def test_repeated_acceptance_rejection_stops_at_model_budget() -> None:
    adapter = FakeAdapter((Action.complete({"passed": False}),), repeat_last=True)
    result = HarnessRunner(adapter, ToolRegistry()).run(
        task(
            budgets=Budgets(max_steps=2, max_model_calls=2, timeout_ms=1000),
            acceptance={"passed": True},
        )
    )
    assert result.status is RunStatus.STOPPED
    assert result.stop_reason is StopReason.MODEL_BUDGET
    assert result.output is None
    acceptance_events = [event for event in result.trace if event.kind == "acceptance_result"]
    assert [event.data["accepted"] for event in acceptance_events] == [False, False]
    assert result.checkpoint is not None
    assert result.checkpoint.model_calls == 2


@dataclass(slots=True)
class BrokenAcceptanceValidator:
    name: str = "broken-validator"

    def validate(self, task: TaskSpec, output: JsonValue) -> AcceptanceResult:
        del task, output
        raise RuntimeError("synthetic validator failure")


def test_validator_failure_cannot_be_reported_as_completed() -> None:
    result = HarnessRunner(
        FakeAdapter((Action.complete({"passed": True}),)),
        ToolRegistry(),
        acceptance_validator=BrokenAcceptanceValidator(),
    ).run(task(acceptance={"passed": True}))
    assert result.status is RunStatus.FAILED
    assert result.stop_reason is StopReason.INVALID_ACTION
    assert result.output is None
    assert result.error == "acceptance validator error: RuntimeError"
    acceptance_event = next(
        event for event in result.trace if event.kind == "acceptance_result"
    )
    assert acceptance_event.data["accepted"] is False
    assert acceptance_event.data["evidence"] == {"error_type": "RuntimeError"}


def test_model_budget_stops_before_an_extra_adapter_call() -> None:
    adapter = FakeAdapter((Action.tool(call()), Action.complete("too late")))
    result = HarnessRunner(adapter, ToolRegistry.with_safe_defaults()).run(
        task(budgets=Budgets(max_steps=3, max_model_calls=1, timeout_ms=1000))
    )
    assert result.stop_reason is StopReason.MODEL_BUDGET
    assert adapter.index == 1


def test_max_steps_breaks_infinite_tool_loop() -> None:
    adapter = FakeAdapter((Action.tool(call()),), repeat_last=True)
    result = HarnessRunner(adapter, ToolRegistry.with_safe_defaults()).run(
        task(budgets=Budgets(max_steps=3, max_model_calls=10, timeout_ms=1000))
    )
    assert result.stop_reason is StopReason.MAX_STEPS
    assert result.metrics["steps"] == 3
    assert result.metrics["reused_tool_calls"] == 2


def test_permission_denial_stops_before_tool_execution() -> None:
    executed = False

    def dangerous(arguments: dict[str, JsonValue]) -> JsonValue:
        nonlocal executed
        executed = True
        return arguments

    registry = ToolRegistry()
    registry.register("dangerous", dangerous)
    adapter = FakeAdapter((Action.tool(call(name="dangerous")),))
    result = HarnessRunner(adapter, registry, PermissionPolicy()).run(task())
    assert result.stop_reason is StopReason.PERMISSION_DENIED
    assert not executed


def test_retry_and_idempotency_prevent_duplicate_side_effects() -> None:
    attempts = 0
    sleeps: list[float] = []

    def flaky(arguments: dict[str, JsonValue]) -> JsonValue:
        nonlocal attempts
        attempts += 1
        if attempts < 3:
            raise RetryableError("temporary")
        return arguments["value"]

    registry = ToolRegistry(sleeper=sleeps.append)
    registry.register("flaky", flaky)
    duplicate = call(name="flaky", key="stable-key")
    adapter = FakeAdapter((Action.tool(duplicate), Action.tool(duplicate), Action.complete("done")))
    runner = HarnessRunner(adapter, registry, retry=RetryPolicy(max_attempts=3, base_backoff_ms=10))
    result = runner.run(task(tools=("flaky",)))
    assert result.status is RunStatus.COMPLETED
    assert attempts == 3
    assert result.metrics["tool_calls"] == 1
    assert result.metrics["reused_tool_calls"] == 1
    assert len([event for event in result.trace if event.kind == "retry"]) == 2
    assert sleeps == [0.01, 0.02]


@dataclass(slots=True)
class WrongTypeAdapter:
    name: str = "wrong-type"

    def next_action(self, task: TaskSpec, trace: tuple[TraceEvent, ...]) -> Action:
        del task, trace
        return cast(Action, {"kind": "complete"})

    def snapshot(self) -> dict[str, JsonValue]:
        return {}

    def restore(self, state: dict[str, JsonValue]) -> None:
        assert state == {}


def test_wrong_adapter_return_is_classified_as_invalid_action() -> None:
    result = HarnessRunner(WrongTypeAdapter(), ToolRegistry()).run(task())
    assert result.status is RunStatus.FAILED
    assert result.stop_reason is StopReason.INVALID_ACTION
    assert result.error is not None
    assert "expected Action" in result.error


def test_checkpoint_restores_adapter_position() -> None:
    actions = (Action.tool(call()), Action.complete("resumed"))
    first = HarnessRunner(FakeAdapter(actions), ToolRegistry.with_safe_defaults()).run(
        task(budgets=Budgets(max_steps=1, max_model_calls=3, timeout_ms=1000))
    )
    assert first.stop_reason is StopReason.MAX_STEPS
    assert first.checkpoint is not None
    second = HarnessRunner(FakeAdapter(actions), ToolRegistry.with_safe_defaults()).run(
        task(budgets=Budgets(max_steps=3, max_model_calls=3, timeout_ms=1000)),
        checkpoint=first.checkpoint,
    )
    assert second.status is RunStatus.COMPLETED
    assert second.output == "resumed"


@dataclass(slots=True)
class BlockingAdapter:
    entered: threading.Event
    release: threading.Event
    name: str = "blocking-fake"

    def next_action(self, task: TaskSpec, trace: tuple[TraceEvent, ...]) -> Action:
        del task, trace
        self.entered.set()
        assert self.release.wait(timeout=2)
        return Action.complete("should be cancelled")

    def snapshot(self) -> dict[str, JsonValue]:
        return {}

    def restore(self, state: dict[str, JsonValue]) -> None:
        assert state == {}


def test_concurrent_cancellation_propagates_after_adapter_returns() -> None:
    entered = threading.Event()
    release = threading.Event()
    token = CancellationToken()
    runner = HarnessRunner(BlockingAdapter(entered, release), ToolRegistry(), cancellation=token)
    result_holder: list[RunResult] = []
    thread = threading.Thread(target=lambda: result_holder.append(runner.run(task())))
    thread.start()
    assert entered.wait(timeout=2)
    token.cancel()
    release.set()
    thread.join(timeout=2)
    assert not thread.is_alive()
    result = result_holder[0]
    assert result.stop_reason is StopReason.CANCELLED


class MutableClock:
    def __init__(self) -> None:
        self.value = 0.0

    def __call__(self) -> float:
        return self.value


@dataclass(slots=True)
class AdvancingAcceptanceValidator:
    clock: MutableClock
    name: str = "advancing-validator"

    def validate(self, task: TaskSpec, output: JsonValue) -> AcceptanceResult:
        del task, output
        self.clock.value = 2.0
        return AcceptanceResult(True, "synthetic acceptance passed")


def test_timeout_during_acceptance_cannot_complete() -> None:
    clock = MutableClock()
    result = HarnessRunner(
        FakeAdapter((Action.complete({"passed": True}),)),
        ToolRegistry(),
        clock=clock,
        acceptance_validator=AdvancingAcceptanceValidator(clock),
    ).run(
        task(
            budgets=Budgets(max_steps=2, max_model_calls=2, timeout_ms=1000),
            acceptance={"passed": True},
        )
    )
    assert result.status is RunStatus.STOPPED
    assert result.stop_reason is StopReason.TIMEOUT
    assert result.output is None


@dataclass(slots=True)
class AdvancingAdapter(FakeAdapter):
    clock: MutableClock | None = None

    def next_action(self, task: TaskSpec, trace: tuple[TraceEvent, ...]) -> Action:
        action = FakeAdapter.next_action(self, task, trace)
        assert self.clock is not None
        self.clock.value = 2.0
        return action


def test_timeout_stops_before_completing_late_action() -> None:
    clock = MutableClock()
    adapter = AdvancingAdapter((Action.complete("late"),), clock=clock)
    result = HarnessRunner(adapter, ToolRegistry(), clock=clock).run(
        task(budgets=Budgets(max_steps=2, max_model_calls=2, timeout_ms=1000))
    )
    assert result.stop_reason is StopReason.TIMEOUT
