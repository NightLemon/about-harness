from __future__ import annotations

import threading
import time
import uuid
from collections.abc import Callable
from dataclasses import dataclass, field

from about_harness.acceptance import (
    AcceptanceResult,
    AcceptanceValidator,
    JsonSubsetAcceptanceValidator,
)
from about_harness.adapters.base import Adapter
from about_harness.contracts import (
    Action,
    ContractError,
    JsonValue,
    RunCheckpoint,
    RunResult,
    RunStatus,
    StopReason,
    TaskSpec,
)
from about_harness.policies import PermissionPolicy
from about_harness.retry import RetryPolicy
from about_harness.tools import ToolError, ToolRegistry
from about_harness.trace import TraceRecorder

Clock = Callable[[], float]


def _require_action(value: object) -> Action:
    if not isinstance(value, Action):
        raise ContractError(f"adapter returned {type(value).__name__}, expected Action")
    return value


def _require_acceptance_result(value: object) -> AcceptanceResult:
    if not isinstance(value, AcceptanceResult):
        raise ContractError(
            f"acceptance validator returned {type(value).__name__}, expected AcceptanceResult"
        )
    return value


def _require_validator_name(value: object) -> str:
    name = getattr(value, "name", None)
    if not isinstance(name, str) or not name.strip():
        raise ContractError("acceptance validator must contain a non-empty name")
    return name


@dataclass(slots=True)
class CancellationToken:
    _event: threading.Event = field(default_factory=threading.Event)

    def cancel(self) -> None:
        self._event.set()

    @property
    def cancelled(self) -> bool:
        return self._event.is_set()


@dataclass(slots=True)
class HarnessRunner:
    adapter: Adapter
    tools: ToolRegistry
    policy: PermissionPolicy = field(default_factory=PermissionPolicy)
    retry: RetryPolicy = field(default_factory=RetryPolicy)
    cancellation: CancellationToken = field(default_factory=CancellationToken)
    clock: Clock = time.monotonic
    acceptance_validator: AcceptanceValidator = field(
        default_factory=JsonSubsetAcceptanceValidator
    )

    def run(
        self,
        task: TaskSpec,
        *,
        checkpoint: RunCheckpoint | None = None,
        run_id: str | None = None,
    ) -> RunResult:
        identifier = run_id or f"run-{uuid.uuid4().hex}"
        started = self.clock()
        recorder = TraceRecorder(self.clock)
        step = checkpoint.step if checkpoint else 0
        model_calls = checkpoint.model_calls if checkpoint else 0
        tool_calls = checkpoint.tool_calls if checkpoint else 0
        reused_tool_calls = checkpoint.reused_tool_calls if checkpoint else 0
        cost_usd = checkpoint.cost_usd if checkpoint else 0.0
        current_checkpoint = checkpoint
        if checkpoint:
            self.adapter.restore(checkpoint.adapter_state)
        recorder.record(
            "run_started",
            {
                "task_id": task.task_id,
                "adapter": self.adapter.name,
                "resumed": checkpoint is not None,
                "offline": True,
            },
        )

        while step < task.budgets.max_steps:
            stop = self._preflight_stop(task, started, model_calls)
            if stop:
                return self._result(
                    identifier,
                    task,
                    recorder,
                    started,
                    RunStatus.STOPPED,
                    stop,
                    None,
                    step,
                    model_calls,
                    tool_calls,
                    reused_tool_calls,
                    cost_usd,
                    current_checkpoint,
                )
            try:
                action = _require_action(self.adapter.next_action(task, recorder.events))
            except Exception as exc:  # adapter is an explicit trust boundary
                return self._result(
                    identifier,
                    task,
                    recorder,
                    started,
                    RunStatus.FAILED,
                    StopReason.INVALID_ACTION,
                    None,
                    step,
                    model_calls,
                    tool_calls,
                    reused_tool_calls,
                    cost_usd,
                    current_checkpoint,
                    error=f"adapter error: {type(exc).__name__}: {exc}",
                )

            model_calls += 1
            cost_usd += action.cost_usd
            recorder.record(
                "model_action",
                {"kind": action.kind, "model_calls": model_calls, "cost_usd": cost_usd},
            )
            stop = self._post_action_stop(task, started, cost_usd)
            if stop:
                return self._result(
                    identifier,
                    task,
                    recorder,
                    started,
                    RunStatus.STOPPED,
                    stop,
                    None,
                    step,
                    model_calls,
                    tool_calls,
                    reused_tool_calls,
                    cost_usd,
                    current_checkpoint,
                )

            if action.kind == "complete":
                try:
                    validator_name = _require_validator_name(self.acceptance_validator)
                    acceptance = _require_acceptance_result(
                        self.acceptance_validator.validate(task, action.output)
                    )
                except Exception as exc:  # validator is an explicit trust boundary
                    validator_name = type(self.acceptance_validator).__name__
                    recorder.record(
                        "acceptance_result",
                        {
                            "validator": validator_name,
                            "accepted": False,
                            "feedback": "acceptance validator failed",
                            "evidence": {"error_type": type(exc).__name__},
                        },
                    )
                    return self._result(
                        identifier,
                        task,
                        recorder,
                        started,
                        RunStatus.FAILED,
                        StopReason.INVALID_ACTION,
                        None,
                        step,
                        model_calls,
                        tool_calls,
                        reused_tool_calls,
                        cost_usd,
                        current_checkpoint,
                        error=f"acceptance validator error: {type(exc).__name__}",
                    )
                recorder.record(
                    "acceptance_result",
                    {
                        "validator": validator_name,
                        "accepted": acceptance.accepted,
                        "feedback": acceptance.feedback,
                        "evidence": acceptance.evidence,
                    },
                )
                stop = self._post_action_stop(task, started, cost_usd)
                if stop:
                    return self._result(
                        identifier,
                        task,
                        recorder,
                        started,
                        RunStatus.STOPPED,
                        stop,
                        None,
                        step,
                        model_calls,
                        tool_calls,
                        reused_tool_calls,
                        cost_usd,
                        current_checkpoint,
                    )
                if not acceptance.accepted:
                    current_checkpoint = RunCheckpoint(
                        step=step,
                        model_calls=model_calls,
                        tool_calls=tool_calls,
                        reused_tool_calls=reused_tool_calls,
                        cost_usd=cost_usd,
                        adapter_state=self.adapter.snapshot(),
                    )
                    recorder.record("checkpoint", current_checkpoint.to_dict())
                    continue
                return self._result(
                    identifier,
                    task,
                    recorder,
                    started,
                    RunStatus.COMPLETED,
                    StopReason.COMPLETED,
                    action.output,
                    step + 1,
                    model_calls,
                    tool_calls,
                    reused_tool_calls,
                    cost_usd,
                    current_checkpoint,
                )
            if action.kind != "tool" or action.tool_call is None:
                return self._result(
                    identifier,
                    task,
                    recorder,
                    started,
                    RunStatus.FAILED,
                    StopReason.INVALID_ACTION,
                    None,
                    step,
                    model_calls,
                    tool_calls,
                    reused_tool_calls,
                    cost_usd,
                    current_checkpoint,
                    error="adapter returned an action without a valid tool call or completion",
                )

            decision = self.policy.decide(task, action.tool_call)
            if not decision.allowed:
                recorder.record(
                    "policy_denied",
                    {
                        "tool": action.tool_call.name,
                        "reason": decision.reason,
                        "requires_approval": decision.requires_approval,
                    },
                )
                return self._result(
                    identifier,
                    task,
                    recorder,
                    started,
                    RunStatus.STOPPED,
                    StopReason.PERMISSION_DENIED,
                    None,
                    step,
                    model_calls,
                    tool_calls,
                    reused_tool_calls,
                    cost_usd,
                    current_checkpoint,
                    error=decision.reason,
                )

            try:

                def on_retry(attempt: int, delay: int, error: str) -> None:
                    recorder.record(
                        "retry", {"attempt": attempt, "delay_ms": delay, "error": error}
                    )

                execution = self.tools.execute(
                    action.tool_call,
                    retry=self.retry,
                    on_retry=on_retry,
                )
            except Exception as exc:  # tools are another explicit trust boundary
                reason = StopReason.TOOL_ERROR
                return self._result(
                    identifier,
                    task,
                    recorder,
                    started,
                    RunStatus.FAILED,
                    reason,
                    None,
                    step,
                    model_calls,
                    tool_calls,
                    reused_tool_calls,
                    cost_usd,
                    current_checkpoint,
                    error=f"tool error: {type(exc).__name__}: {exc}",
                )

            if not execution.reused:
                tool_calls += 1
            else:
                reused_tool_calls += 1
            step += 1
            recorder.record(
                "tool_result",
                {
                    "call_id": action.tool_call.call_id,
                    "tool": action.tool_call.name,
                    "value": execution.value,
                    "reused": execution.reused,
                    "attempts": execution.attempts,
                },
            )
            current_checkpoint = RunCheckpoint(
                step=step,
                model_calls=model_calls,
                tool_calls=tool_calls,
                reused_tool_calls=reused_tool_calls,
                cost_usd=cost_usd,
                adapter_state=self.adapter.snapshot(),
            )
            recorder.record("checkpoint", current_checkpoint.to_dict())

        return self._result(
            identifier,
            task,
            recorder,
            started,
            RunStatus.STOPPED,
            StopReason.MAX_STEPS,
            None,
            step,
            model_calls,
            tool_calls,
            reused_tool_calls,
            cost_usd,
            current_checkpoint,
        )

    def _preflight_stop(
        self, task: TaskSpec, started: float, model_calls: int
    ) -> StopReason | None:
        if self.cancellation.cancelled:
            return StopReason.CANCELLED
        if (self.clock() - started) * 1_000 >= task.budgets.timeout_ms:
            return StopReason.TIMEOUT
        if model_calls >= task.budgets.max_model_calls:
            return StopReason.MODEL_BUDGET
        return None

    def _post_action_stop(
        self, task: TaskSpec, started: float, cost_usd: float
    ) -> StopReason | None:
        if self.cancellation.cancelled:
            return StopReason.CANCELLED
        if (self.clock() - started) * 1_000 >= task.budgets.timeout_ms:
            return StopReason.TIMEOUT
        if cost_usd > task.budgets.max_cost_usd:
            return StopReason.MODEL_BUDGET
        return None

    def _result(
        self,
        run_id: str,
        task: TaskSpec,
        recorder: TraceRecorder,
        started: float,
        status: RunStatus,
        reason: StopReason,
        output: JsonValue,
        steps: int,
        model_calls: int,
        tool_calls: int,
        reused_tool_calls: int,
        cost_usd: float,
        checkpoint: RunCheckpoint | None,
        *,
        error: str | None = None,
    ) -> RunResult:
        duration_ms = max(0.0, (self.clock() - started) * 1_000)
        recorder.record(
            "run_stopped",
            {"status": status.value, "reason": reason.value, "error": error},
        )
        return RunResult(
            run_id=run_id,
            task_id=task.task_id,
            status=status,
            stop_reason=reason,
            output=output,
            metrics={
                "steps": steps,
                "model_calls": model_calls,
                "tool_calls": tool_calls,
                "reused_tool_calls": reused_tool_calls,
                "duration_ms": duration_ms,
                "cost_usd": cost_usd,
            },
            trace=recorder.events,
            checkpoint=checkpoint,
            error=error,
        )


__all__ = ["CancellationToken", "HarnessRunner", "ToolError"]
