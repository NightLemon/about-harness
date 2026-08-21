from __future__ import annotations

import time
from collections.abc import Callable
from dataclasses import dataclass
from typing import TypeVar

T = TypeVar("T")


class RetryableError(RuntimeError):
    """An operation may succeed if retried within the declared budget."""


@dataclass(frozen=True, slots=True)
class RetryPolicy:
    max_attempts: int = 3
    base_backoff_ms: int = 10
    max_backoff_ms: int = 1_000

    def __post_init__(self) -> None:
        if self.max_attempts < 1 or self.base_backoff_ms < 0 or self.max_backoff_ms < 0:
            raise ValueError("retry limits must be non-negative and attempts must be positive")

    def delay_ms(self, attempt: int) -> int:
        return min(self.base_backoff_ms * (2 ** max(0, attempt - 1)), self.max_backoff_ms)


def run_with_retry(
    operation: Callable[[], T],
    policy: RetryPolicy,
    *,
    on_retry: Callable[[int, int, str], None] | None = None,
    sleep: Callable[[float], None] = time.sleep,
) -> tuple[T, int]:
    for attempt in range(1, policy.max_attempts + 1):
        try:
            return operation(), attempt
        except RetryableError as exc:
            if attempt >= policy.max_attempts:
                raise
            delay = policy.delay_ms(attempt)
            if on_retry:
                on_retry(attempt, delay, str(exc))
            sleep(delay / 1_000)
    raise AssertionError("retry loop exhausted without returning or raising")
