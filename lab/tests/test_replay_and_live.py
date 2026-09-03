from __future__ import annotations

import pytest
from about_harness.adapters.fake import FakeAdapter
from about_harness.adapters.live import LiveAdapter, LiveAdapterDisabled
from about_harness.adapters.replay import ReplayAdapter
from about_harness.contracts import Action, Budgets, ContractError, JsonValue, RunStatus, TaskSpec
from about_harness.loop import HarnessRunner
from about_harness.tools import ToolRegistry


def test_replay_adapter_runs_without_network_or_credentials() -> None:
    adapter = ReplayAdapter.from_records(
        [
            {
                "kind": "tool",
                "tool_call": {
                    "call_id": "sum-1",
                    "name": "sum",
                    "arguments": {"values": [1, 2, 3]},
                    "idempotency_key": "sum-stable",
                },
            },
            {"kind": "complete", "output": {"answer": 6}},
        ]
    )
    task = TaskSpec("replay", "sum offline", ("sum",), Budgets())
    result = HarnessRunner(adapter, ToolRegistry.with_safe_defaults()).run(task)
    assert result.status is RunStatus.COMPLETED
    assert result.output == {"answer": 6}


@pytest.mark.parametrize(
    "record",
    [
        {"kind": "complete", "output": None, "unexpected": True},
        {
            "kind": "tool",
            "tool_call": {
                "call_id": "sum-1",
                "name": "sum",
                "arguments": {"values": [1, 2, 3]},
                "idempotency_key": "sum-stable",
                "unexpected": True,
            },
        },
    ],
)
def test_replay_adapter_rejects_unknown_fields(record: dict[str, JsonValue]) -> None:
    with pytest.raises(ContractError, match="unknown fields"):
        ReplayAdapter.from_records([record])


def test_fake_adapter_rejects_invalid_checkpoint_state() -> None:
    adapter = FakeAdapter((Action.complete("done"),))
    with pytest.raises(ValueError, match="only index"):
        adapter.restore({"index": 0, "unexpected": True})
    with pytest.raises(ValueError, match="index is invalid"):
        adapter.restore({"index": 2})


def test_live_adapter_is_hard_disabled() -> None:
    adapter = LiveAdapter()
    with pytest.raises(LiveAdapterDisabled):
        adapter.next_action(TaskSpec("live", "must remain disabled", (), Budgets()), ())
