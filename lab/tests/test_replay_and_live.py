from __future__ import annotations

import pytest
from about_harness.adapters.live import LiveAdapter, LiveAdapterDisabled
from about_harness.adapters.replay import ReplayAdapter
from about_harness.contracts import Budgets, RunStatus, TaskSpec
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


def test_live_adapter_is_hard_disabled() -> None:
    adapter = LiveAdapter()
    with pytest.raises(LiveAdapterDisabled):
        adapter.next_action(TaskSpec("live", "must remain disabled", (), Budgets()), ())
