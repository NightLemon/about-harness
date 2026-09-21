"""Versioned usage observations: missing measurements are never numeric zero."""

from __future__ import annotations

import math
from dataclasses import dataclass
from typing import cast

from about_harness.contracts import ContractError, JsonValue


@dataclass(frozen=True, slots=True)
class UsageObservation:
    input_tokens: int | None
    output_tokens: int | None
    cost_usd: float | None
    source: str

    def __post_init__(self) -> None:
        for value in (self.input_tokens, self.output_tokens):
            if value is not None and (type(value) is not int or not 0 <= value <= 2**53 - 1):
                raise ContractError("usage tokens must be non-negative integers or unknown")
        if (self.input_tokens is None) != (self.output_tokens is None):
            raise ContractError("incomplete token usage must remain unknown")
        raw_cost = cast(object, self.cost_usd)
        if raw_cost is not None and (
            isinstance(raw_cost, bool)
            or not isinstance(raw_cost, (int, float))
            or not math.isfinite(raw_cost)
            or raw_cost < 0
        ):
            raise ContractError("usage cost must be finite and non-negative or unknown")
        if not isinstance(cast(object, self.source), str) or self.source not in {
            "fixture",
            "provider",
            "price-estimate",
        }:
            raise ContractError("unknown usage source")

    def to_dict(self) -> dict[str, JsonValue]:
        return {
            "schema_version": "1.0",
            "token_status": "known" if self.input_tokens is not None else "unknown",
            "input_tokens": self.input_tokens,
            "output_tokens": self.output_tokens,
            "cost_status": "known" if self.cost_usd is not None else "unknown",
            "cost_usd": self.cost_usd,
            "source": self.source,
        }

    @classmethod
    def from_dict(cls, value: dict[str, JsonValue]) -> UsageObservation:
        fields = {
            "schema_version",
            "token_status",
            "input_tokens",
            "output_tokens",
            "cost_status",
            "cost_usd",
            "source",
        }
        if set(value) != fields or value["schema_version"] != "1.0":
            raise ContractError("invalid usage envelope")
        instance = cls(
            cast(int | None, value["input_tokens"]),
            cast(int | None, value["output_tokens"]),
            cast(float | None, value["cost_usd"]),
            cast(str, value["source"]),
        )
        if instance.to_dict() != value:
            raise ContractError("usage status contradicts observed values")
        return instance
