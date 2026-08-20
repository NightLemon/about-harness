from __future__ import annotations

from dataclasses import dataclass


@dataclass(frozen=True, slots=True)
class ContextItem:
    item_id: str
    content: str
    source: str
    tokens: int
    trusted: bool = False
    required: bool = False
    priority: int = 0

    def __post_init__(self) -> None:
        if not self.item_id or not self.source or self.tokens < 0:
            raise ValueError("context items require an ID, source, and non-negative token count")


@dataclass(frozen=True, slots=True)
class ContextSelection:
    selected: tuple[ContextItem, ...]
    dropped: tuple[ContextItem, ...]
    used_tokens: int
    warnings: tuple[str, ...]


class ContextBudget:
    def __init__(self, max_tokens: int) -> None:
        if max_tokens < 1:
            raise ValueError("context budget must be positive")
        self.max_tokens = max_tokens

    def select(self, items: list[ContextItem]) -> ContextSelection:
        ordered = sorted(
            items,
            key=lambda item: (not item.required, not item.trusted, -item.priority, item.item_id),
        )
        selected: list[ContextItem] = []
        dropped: list[ContextItem] = []
        warnings: list[str] = []
        used = 0
        for item in ordered:
            if used + item.tokens <= self.max_tokens:
                selected.append(item)
                used += item.tokens
                if not item.trusted:
                    warnings.append(
                        f"untrusted context retained: {item.item_id} from {item.source}"
                    )
                continue
            if item.required:
                raise ValueError(f"required context exceeds budget: {item.item_id}")
            dropped.append(item)
        return ContextSelection(tuple(selected), tuple(dropped), used, tuple(warnings))
