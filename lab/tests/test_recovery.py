from __future__ import annotations

from about_harness.contracts import ToolCall
from about_harness.recovery import (
    SyntheticWriteService,
    WriteIntent,
    demonstrate_unsafe_new_key_retry,
    execute_with_reconciliation,
)


def intent(
    *,
    key: str = "task-42:write-report:v1",
    content: str = "synthetic report",
) -> WriteIntent:
    return WriteIntent(
        ToolCall(
            call_id="call-write",
            name="report.write",
            arguments={"document_id": "report-42", "content": content},
            idempotency_key=key,
        )
    )


def test_acknowledged_write_needs_no_reconciliation() -> None:
    result = execute_with_reconciliation(SyntheticWriteService(), intent())

    assert result.status == "completed"
    assert result.reason == "acknowledged"
    assert result.attempts == 1
    assert result.lookups == 0
    assert result.side_effects == 1


def test_lost_response_reconciles_receipt_without_duplicate_write() -> None:
    service = SyntheticWriteService(drop_first_response_after_commit=True)
    result = execute_with_reconciliation(service, intent())

    assert result.status == "completed"
    assert result.reason == "reconciled"
    assert result.attempts == 1
    assert result.lookups == 1
    assert result.side_effects == 1
    assert [event["kind"] for event in result.events] == [
        "intent_checkpointed",
        "external_outcome_unknown",
        "receipt_lookup",
        "write_reconciled",
        "run_stopped",
    ]


def test_same_key_with_changed_payload_stops_before_second_effect() -> None:
    service = SyntheticWriteService()
    service.write(intent())

    result = execute_with_reconciliation(service, intent(content="changed payload"))

    assert result.status == "stopped"
    assert result.reason == "receipt_conflict"
    assert result.side_effects == 1


def test_new_key_retry_after_unknown_outcome_demonstrates_duplicate_effect() -> None:
    service = SyntheticWriteService(drop_first_response_after_commit=True)
    output = demonstrate_unsafe_new_key_retry(
        service,
        intent(),
        replacement_call_id="call-unsafe-retry",
        replacement_key="task-42:write-report:retry-2",
    )

    assert output["status"] == "unsafe"
    assert output["duplicate_effect_observed"] is True
    assert output["attempts"] == 2
    assert output["lookups"] == 0
    assert output["side_effects"] == 2
