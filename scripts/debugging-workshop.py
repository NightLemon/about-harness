from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path
from typing import cast

ROOT = Path(__file__).parents[1]
sys.path.insert(0, str(ROOT / "lab" / "src"))

from about_harness.adapters.fake import FakeAdapter  # noqa: E402
from about_harness.contracts import (  # noqa: E402
    Action,
    Budgets,
    JsonValue,
    RunStatus,
    StopReason,
    TaskSpec,
    ToolCall,
    TraceEvent,
)
from about_harness.loop import HarnessRunner  # noqa: E402
from about_harness.policies import PermissionPolicy  # noqa: E402
from about_harness.retry import RetryableError, RetryPolicy  # noqa: E402
from about_harness.tools import ToolRegistry  # noqa: E402


def _task(*, tools: tuple[str, ...] = ("echo",)) -> TaskSpec:
    return TaskSpec(
        "debug-workshop",
        "locate the first divergent harness boundary",
        tools,
        Budgets(max_steps=4, max_model_calls=4, timeout_ms=1_000),
        metadata={"evidence": "E1", "offline": True},
    )


def _call(*, name: str, key: str) -> ToolCall:
    return ToolCall("call-1", name, {"value": "synthetic"}, key)


class WrongTypeAdapter:
    name = "wrong-type"

    def next_action(self, task: TaskSpec, trace: tuple[TraceEvent, ...]) -> Action:
        del task, trace
        return cast(Action, {"kind": "complete"})

    def snapshot(self) -> dict[str, JsonValue]:
        return {}

    def restore(self, state: dict[str, JsonValue]) -> None:
        if state != {}:
            raise ValueError("wrong-type workshop adapter only accepts an empty state")


def _adapter_case(expected_reason: str) -> dict[str, object]:
    result = HarnessRunner(WrongTypeAdapter(), ToolRegistry()).run(
        _task(), run_id="debug-adapter"
    )
    observed = result.stop_reason.value
    passed = (
        result.status is RunStatus.FAILED
        and observed == expected_reason
        and result.error is not None
        and "expected Action" in result.error
    )
    return {
        "case_id": "adapter-contract",
        "symptom": "adapter returned a value outside the Action contract",
        "expected_status": RunStatus.FAILED.value,
        "observed_status": result.status.value,
        "expected_stop_reason": expected_reason,
        "observed_stop_reason": observed,
        "first_divergence": "adapter_return",
        "handler_executions": 0,
        "trace_kinds": [event.kind for event in result.trace],
        "passed": passed,
    }


def _permission_case() -> dict[str, object]:
    executions = [0]

    def dangerous(arguments: dict[str, JsonValue]) -> JsonValue:
        executions[0] += 1
        return arguments

    registry = ToolRegistry()
    registry.register("dangerous", dangerous)
    adapter = FakeAdapter((Action.tool(_call(name="dangerous", key="dangerous-once")),))
    result = HarnessRunner(adapter, registry, PermissionPolicy()).run(
        _task(), run_id="debug-permission"
    )
    passed = (
        result.status is RunStatus.STOPPED
        and result.stop_reason is StopReason.PERMISSION_DENIED
        and executions[0] == 0
        and any(event.kind == "policy_denied" for event in result.trace)
    )
    return {
        "case_id": "permission-boundary",
        "symptom": "a registered tool was requested outside the Task allowlist",
        "expected_status": RunStatus.STOPPED.value,
        "observed_status": result.status.value,
        "expected_stop_reason": StopReason.PERMISSION_DENIED.value,
        "observed_stop_reason": result.stop_reason.value,
        "first_divergence": "policy_decision",
        "handler_executions": executions[0],
        "trace_kinds": [event.kind for event in result.trace],
        "passed": passed,
    }


def _retry_case() -> dict[str, object]:
    attempts = [0]
    side_effects = [0]
    sleeps: list[float] = []

    def flaky(arguments: dict[str, JsonValue]) -> JsonValue:
        attempts[0] += 1
        if attempts[0] < 3:
            raise RetryableError("synthetic temporary failure")
        side_effects[0] += 1
        return arguments["value"]

    registry = ToolRegistry(sleeper=sleeps.append)
    registry.register("flaky", flaky)
    duplicate = _call(name="flaky", key="stable-key")
    adapter = FakeAdapter(
        (Action.tool(duplicate), Action.tool(duplicate), Action.complete("done"))
    )
    result = HarnessRunner(
        adapter,
        registry,
        retry=RetryPolicy(max_attempts=3, base_backoff_ms=10),
    ).run(_task(tools=("flaky",)), run_id="debug-retry")
    retry_events = sum(event.kind == "retry" for event in result.trace)
    reused_flags = [
        event.data.get("reused") for event in result.trace if event.kind == "tool_result"
    ]
    passed = (
        result.status is RunStatus.COMPLETED
        and result.stop_reason is StopReason.COMPLETED
        and attempts[0] == 3
        and side_effects[0] == 1
        and result.metrics["tool_calls"] == 1
        and result.metrics["reused_tool_calls"] == 1
        and retry_events == 2
        and reused_flags == [False, True]
        and sleeps == [0.01, 0.02]
    )
    return {
        "case_id": "retry-idempotency",
        "symptom": "a tool failed twice before a successful side effect and duplicate request",
        "expected_status": RunStatus.COMPLETED.value,
        "observed_status": result.status.value,
        "expected_stop_reason": StopReason.COMPLETED.value,
        "observed_stop_reason": result.stop_reason.value,
        "first_divergence": "tool_attempt",
        "attempts": attempts[0],
        "retry_events": retry_events,
        "backoff_seconds": sleeps,
        "side_effects": side_effects[0],
        "tool_calls": result.metrics["tool_calls"],
        "reused_tool_calls": result.metrics["reused_tool_calls"],
        "reused_flags": reused_flags,
        "trace_kinds": [event.kind for event in result.trace],
        "passed": passed,
    }


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Run deterministic offline cases for the debugging workshop"
    )
    parser.add_argument(
        "--inject-failure",
        action="store_true",
        help="replace one expected oracle value so the workshop must exit non-zero",
    )
    args = parser.parse_args()

    adapter_expected = (
        StopReason.COMPLETED.value if args.inject_failure else StopReason.INVALID_ACTION.value
    )
    cases: list[dict[str, object]] = [
        _adapter_case(adapter_expected),
        _permission_case(),
        _retry_case(),
    ]
    passed = all(item["passed"] is True for item in cases)
    summary: dict[str, object] = {
        "schema_version": "1.0",
        "evidence": "E1",
        "offline": True,
        "injected_failure": args.inject_failure,
        "passed": passed,
        "cases": cases,
        "limits": [
            "The cases use fixed adapters and in-memory tools, not a live model or provider.",
            "A passing workshop does not prove distributed retries or external "
            "side effects are safe.",
        ],
    }
    print(json.dumps(summary, ensure_ascii=False, sort_keys=True))
    return 0 if passed else 1


if __name__ == "__main__":
    raise SystemExit(main())
