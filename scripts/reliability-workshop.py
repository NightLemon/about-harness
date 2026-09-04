from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

ROOT = Path(__file__).parents[1]
sys.path.insert(0, str(ROOT / "lab" / "src"))

from about_harness.contracts import JsonValue, ToolCall  # noqa: E402
from about_harness.recovery import (  # noqa: E402
    SyntheticWriteService,
    WriteIntent,
    demonstrate_unsafe_new_key_retry,
    execute_with_reconciliation,
)


def _intent(
    *,
    call_id: str = "call-write-1",
    key: str = "task-42:write-report:v1",
    content: str = "synthetic report",
) -> WriteIntent:
    return WriteIntent(
        ToolCall(
            call_id=call_id,
            name="report.write",
            arguments={"document_id": "report-42", "content": content},
            idempotency_key=key,
        )
    )


def _acknowledged_case() -> dict[str, JsonValue]:
    result = execute_with_reconciliation(SyntheticWriteService(), _intent())
    output = result.to_dict()
    output["case_id"] = "acknowledged-write"
    output["passed"] = (
        result.status == "completed"
        and result.reason == "acknowledged"
        and result.attempts == 1
        and result.lookups == 0
        and result.side_effects == 1
    )
    return output


def _lost_response_case() -> dict[str, JsonValue]:
    service = SyntheticWriteService(drop_first_response_after_commit=True)
    result = execute_with_reconciliation(service, _intent())
    output = result.to_dict()
    output["case_id"] = "lost-response-reconciled"
    output["passed"] = (
        result.status == "completed"
        and result.reason == "reconciled"
        and result.attempts == 1
        and result.lookups == 1
        and result.side_effects == 1
        and [event["kind"] for event in result.events]
        == [
            "intent_checkpointed",
            "external_outcome_unknown",
            "receipt_lookup",
            "write_reconciled",
            "run_stopped",
        ]
    )
    return output


def _conflict_case() -> dict[str, JsonValue]:
    service = SyntheticWriteService()
    service.write(_intent())
    changed = _intent(call_id="call-write-2", content="changed after checkpoint")
    result = execute_with_reconciliation(service, changed)
    output = result.to_dict()
    output["case_id"] = "same-key-changed-payload-denied"
    output["passed"] = (
        result.status == "stopped"
        and result.reason == "receipt_conflict"
        and result.attempts == 2
        and result.lookups == 0
        and result.side_effects == 1
    )
    return output


def _unsafe_case() -> dict[str, JsonValue]:
    service = SyntheticWriteService(drop_first_response_after_commit=True)
    output = demonstrate_unsafe_new_key_retry(
        service,
        _intent(),
        replacement_call_id="call-write-unsafe-retry",
        replacement_key="task-42:write-report:retry-2",
    )
    output["case_id"] = "unsafe-new-key-retry"
    output["passed"] = False
    return output


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Run deterministic unknown-outcome and receipt-reconciliation cases"
    )
    parser.add_argument(
        "--unsafe-retry-demo",
        action="store_true",
        help="retry an ambiguous write with a new key; intentionally exits non-zero",
    )
    args = parser.parse_args()

    cases = (
        [_unsafe_case()]
        if args.unsafe_retry_demo
        else [_acknowledged_case(), _lost_response_case(), _conflict_case()]
    )
    passed = all(case["passed"] is True for case in cases)
    case_items: list[JsonValue] = [case for case in cases]
    summary: dict[str, JsonValue] = {
        "schema_version": "1.0",
        "evidence": "E1",
        "offline": True,
        "unsafe_retry_demo": args.unsafe_retry_demo,
        "passed": passed,
        "cases": case_items,
        "limits": [
            "The receipt ledger is an in-memory deterministic fake, not an external API.",
            "Intent and receipt durability across process or region failure is not proven.",
            "No live model, provider, network, credential, fee, or production write is used.",
        ],
    }
    print(json.dumps(summary, ensure_ascii=False, sort_keys=True))
    return 0 if passed else 1


if __name__ == "__main__":
    raise SystemExit(main())
