from __future__ import annotations

import json
import sys
from pathlib import Path

ROOT = Path(__file__).parents[1]
sys.path.insert(0, str(ROOT / "lab" / "src"))

from about_harness.adapters.fake import FakeAdapter  # noqa: E402
from about_harness.contracts import Action, Budgets, RunStatus, TaskSpec, ToolCall  # noqa: E402
from about_harness.loop import HarnessRunner  # noqa: E402
from about_harness.tools import ToolRegistry  # noqa: E402


def main() -> int:
    task = TaskSpec(
        "offline-smoke",
        "prove deterministic offline execution",
        ("echo",),
        Budgets(max_steps=3, max_model_calls=3, timeout_ms=1000),
        acceptance={"accepted": True},
        metadata={"evidence": "E1", "network": "disabled"},
    )
    adapter = FakeAdapter(
        (
            Action.tool(ToolCall("echo-1", "echo", {"value": "offline"}, "echo-once")),
            Action.complete({"accepted": True}),
        )
    )
    result = HarnessRunner(adapter, ToolRegistry.with_safe_defaults()).run(
        task, run_id="run-offline-smoke"
    )
    if result.status is not RunStatus.COMPLETED:
        print(json.dumps(result.to_dict(), ensure_ascii=False, indent=2))
        return 1
    print(json.dumps(result.to_dict(), ensure_ascii=False, sort_keys=True))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
