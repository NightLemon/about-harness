from __future__ import annotations

from dataclasses import dataclass, field

from about_harness.contracts import JsonValue


def _new_working_values() -> dict[str, JsonValue]:
    return {}


def _new_records() -> dict[str, MemoryRecord]:
    return {}


@dataclass(slots=True)
class WorkingMemory:
    _values: dict[str, JsonValue] = field(default_factory=_new_working_values)

    def set(self, key: str, value: JsonValue) -> None:
        if not key:
            raise ValueError("memory key cannot be empty")
        self._values[key] = value

    def get(self, key: str) -> JsonValue:
        return self._values.get(key)

    def delete(self, key: str) -> bool:
        return self._values.pop(key, None) is not None

    def clear(self) -> None:
        self._values.clear()


@dataclass(frozen=True, slots=True)
class MemoryRecord:
    record_id: str
    content: str
    source: str
    trusted: bool
    created_at_ms: int
    expires_at_ms: int | None = None

    def is_expired(self, now_ms: int) -> bool:
        return self.expires_at_ms is not None and now_ms >= self.expires_at_ms


@dataclass(slots=True)
class LongTermMemory:
    _records: dict[str, MemoryRecord] = field(default_factory=_new_records)

    def put(self, record: MemoryRecord) -> None:
        if not record.record_id or not record.source:
            raise ValueError("long-term memory requires ID and source")
        self._records[record.record_id] = record

    def search(
        self,
        query: str,
        *,
        now_ms: int,
        trusted_only: bool = True,
    ) -> tuple[MemoryRecord, ...]:
        normalized = query.casefold()
        return tuple(
            record
            for record in sorted(self._records.values(), key=lambda item: item.record_id)
            if not record.is_expired(now_ms)
            and (record.trusted or not trusted_only)
            and normalized in record.content.casefold()
        )

    def purge_expired(self, *, now_ms: int) -> int:
        expired = [key for key, value in self._records.items() if value.is_expired(now_ms)]
        for key in expired:
            del self._records[key]
        return len(expired)

    def delete(self, record_id: str) -> bool:
        return self._records.pop(record_id, None) is not None

    def get(self, record_id: str, *, now_ms: int) -> MemoryRecord | None:
        record = self._records.get(record_id)
        if record is None or record.is_expired(now_ms):
            return None
        return record
