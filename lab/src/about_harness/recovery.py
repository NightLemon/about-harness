from __future__ import annotations

import hashlib
import json
from dataclasses import dataclass, field

from about_harness.contracts import JsonValue, ToolCall


class UnknownOutcomeError(RuntimeError):
    """The external write may have committed, but its response was lost."""


class ReceiptConflictError(RuntimeError):
    """One idempotency key was observed with different write semantics."""


@dataclass(frozen=True, slots=True)
class WriteIntent:
    call: ToolCall

    @property
    def fingerprint(self) -> str:
        canonical = json.dumps(
            {"tool": self.call.name, "arguments": self.call.arguments},
            allow_nan=False,
            ensure_ascii=False,
            separators=(",", ":"),
            sort_keys=True,
        )
        return hashlib.sha256(canonical.encode("utf-8")).hexdigest()

    def to_dict(self) -> dict[str, JsonValue]:
        return {
            "call_id": self.call.call_id,
            "tool": self.call.name,
            "idempotency_key": self.call.idempotency_key,
            "fingerprint": self.fingerprint,
        }


@dataclass(frozen=True, slots=True)
class WriteReceipt:
    idempotency_key: str
    fingerprint: str
    external_id: str

    def to_dict(self) -> dict[str, JsonValue]:
        return {
            "idempotency_key": self.idempotency_key,
            "fingerprint": self.fingerprint,
            "external_id": self.external_id,
        }


def _new_receipts() -> dict[str, WriteReceipt]:
    return {}


@dataclass(slots=True)
class SyntheticWriteService:
    """A deterministic external ledger that survives coordinator recovery in one process."""

    drop_first_response_after_commit: bool = False
    attempts: int = 0
    lookups: int = 0
    side_effects: int = 0
    _response_dropped: bool = False
    _receipts: dict[str, WriteReceipt] = field(default_factory=_new_receipts)

    def write(self, intent: WriteIntent) -> tuple[WriteReceipt, bool]:
        self.attempts += 1
        key = intent.call.idempotency_key
        existing = self._receipts.get(key)
        if existing is not None:
            if existing.fingerprint != intent.fingerprint:
                raise ReceiptConflictError(
                    "idempotency key conflict: stored receipt fingerprint differs"
                )
            return existing, True

        self.side_effects += 1
        receipt = WriteReceipt(
            idempotency_key=key,
            fingerprint=intent.fingerprint,
            external_id=f"external-write-{self.side_effects:03d}",
        )
        self._receipts[key] = receipt
        if self.drop_first_response_after_commit and not self._response_dropped:
            self._response_dropped = True
            raise UnknownOutcomeError("response lost after the external write committed")
        return receipt, False

    def lookup(self, idempotency_key: str) -> WriteReceipt | None:
        self.lookups += 1
        return self._receipts.get(idempotency_key)


@dataclass(frozen=True, slots=True)
class RecoveryResult:
    status: str
    reason: str
    receipt: WriteReceipt | None
    events: tuple[dict[str, JsonValue], ...]
    attempts: int
    lookups: int
    side_effects: int

    def to_dict(self) -> dict[str, JsonValue]:
        event_items: list[JsonValue] = [event for event in self.events]
        return {
            "status": self.status,
            "reason": self.reason,
            "receipt": self.receipt.to_dict() if self.receipt is not None else None,
            "attempts": self.attempts,
            "lookups": self.lookups,
            "side_effects": self.side_effects,
            "events": event_items,
        }


def _event(kind: str, data: dict[str, JsonValue]) -> dict[str, JsonValue]:
    return {"kind": kind, "data": data}


def _finish(
    service: SyntheticWriteService,
    events: list[dict[str, JsonValue]],
    *,
    status: str,
    reason: str,
    receipt: WriteReceipt | None,
) -> RecoveryResult:
    events.append(_event("run_stopped", {"status": status, "reason": reason}))
    return RecoveryResult(
        status=status,
        reason=reason,
        receipt=receipt,
        events=tuple(events),
        attempts=service.attempts,
        lookups=service.lookups,
        side_effects=service.side_effects,
    )


def execute_with_reconciliation(
    service: SyntheticWriteService,
    intent: WriteIntent,
    *,
    reconcile_unknown: bool = True,
) -> RecoveryResult:
    """Execute one write and reconcile an ambiguous outcome before any retry."""

    events = [_event("intent_checkpointed", intent.to_dict())]
    try:
        receipt, reused = service.write(intent)
    except UnknownOutcomeError as error:
        events.append(
            _event(
                "external_outcome_unknown",
                {
                    "error_type": type(error).__name__,
                    "safe_to_retry": False,
                },
            )
        )
        if not reconcile_unknown:
            return _finish(
                service,
                events,
                status="stopped",
                reason="unknown_outcome",
                receipt=None,
            )
        receipt = service.lookup(intent.call.idempotency_key)
        events.append(
            _event(
                "receipt_lookup",
                {
                    "idempotency_key": intent.call.idempotency_key,
                    "found": receipt is not None,
                },
            )
        )
        if receipt is None:
            return _finish(
                service,
                events,
                status="stopped",
                reason="receipt_not_found",
                receipt=None,
            )
        if receipt.fingerprint != intent.fingerprint:
            events.append(
                _event(
                    "receipt_conflict",
                    {"idempotency_key": intent.call.idempotency_key},
                )
            )
            return _finish(
                service,
                events,
                status="stopped",
                reason="receipt_conflict",
                receipt=None,
            )
        events.append(_event("write_reconciled", receipt.to_dict()))
        return _finish(
            service,
            events,
            status="completed",
            reason="reconciled",
            receipt=receipt,
        )
    except ReceiptConflictError as error:
        events.append(
            _event(
                "receipt_conflict",
                {
                    "idempotency_key": intent.call.idempotency_key,
                    "error_type": type(error).__name__,
                },
            )
        )
        return _finish(
            service,
            events,
            status="stopped",
            reason="receipt_conflict",
            receipt=None,
        )

    events.append(
        _event(
            "write_acknowledged",
            {**receipt.to_dict(), "reused": reused},
        )
    )
    return _finish(
        service,
        events,
        status="completed",
        reason="acknowledged",
        receipt=receipt,
    )


def demonstrate_unsafe_new_key_retry(
    service: SyntheticWriteService,
    intent: WriteIntent,
    *,
    replacement_call_id: str,
    replacement_key: str,
) -> dict[str, JsonValue]:
    """Show why treating an unknown outcome as a failed write can duplicate effects."""

    if replacement_key == intent.call.idempotency_key:
        raise ValueError("the unsafe demonstration requires a different idempotency key")
    try:
        service.write(intent)
    except UnknownOutcomeError:
        pass
    else:
        raise ValueError("the unsafe demonstration requires a lost first response")

    replacement = WriteIntent(
        ToolCall(
            call_id=replacement_call_id,
            name=intent.call.name,
            arguments=intent.call.arguments,
            idempotency_key=replacement_key,
        )
    )
    second_receipt, reused = service.write(replacement)
    return {
        "status": "unsafe",
        "reason": "new_key_after_unknown_outcome",
        "first_key": intent.call.idempotency_key,
        "replacement_key": replacement_key,
        "second_receipt": second_receipt.to_dict(),
        "second_reused": reused,
        "attempts": service.attempts,
        "lookups": service.lookups,
        "side_effects": service.side_effects,
        "duplicate_effect_observed": service.side_effects > 1,
    }


__all__ = [
    "ReceiptConflictError",
    "RecoveryResult",
    "SyntheticWriteService",
    "UnknownOutcomeError",
    "WriteIntent",
    "WriteReceipt",
    "demonstrate_unsafe_new_key_retry",
    "execute_with_reconciliation",
]
