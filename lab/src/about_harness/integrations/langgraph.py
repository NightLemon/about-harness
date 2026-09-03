from __future__ import annotations

import re
from collections import defaultdict

from about_harness.contracts import JsonValue
from about_harness.integrations.base import (
    IntegrationBoundary,
    IntegrationContractError,
    require_list,
    require_object,
    require_string,
)

BOUNDARY = IntegrationBoundary(
    name="LangGraph",
    distribution="langgraph",
    import_name="langgraph",
    representative_domain="research",
)


def _require_non_blank(value: JsonValue, label: str) -> str:
    text = require_string(value, label)
    if not text.strip():
        raise IntegrationContractError(f"{label} must be a non-empty string")
    return text


def resolve_versioned_claims(payload: dict[str, JsonValue]) -> dict[str, JsonValue]:
    """Execute the deterministic state transition used by the research fixture."""

    _require_non_blank(payload.get("query"), "query")
    required_claim_values = require_list(payload.get("required_claims"), "required_claims")
    if not required_claim_values:
        raise IntegrationContractError("required_claims must contain at least one claim")
    required_claims: set[str] = set()
    for index, raw_claim in enumerate(required_claim_values):
        claim = _require_non_blank(raw_claim, f"required_claims[{index}]")
        if claim in required_claims:
            raise IntegrationContractError(f"duplicate required claim: {claim}")
        required_claims.add(claim)

    sources = require_list(payload.get("sources"), "sources")
    claims: dict[str, list[tuple[str, str, str, str, str]]] = defaultdict(list)
    seen_source_ids: set[str] = set()
    for index, raw in enumerate(sources):
        source = require_object(raw, f"sources[{index}]")
        source_id = _require_non_blank(source.get("id"), f"sources[{index}].id")
        if source_id in seen_source_ids:
            raise IntegrationContractError(f"duplicate source id: {source_id}")
        seen_source_ids.add(source_id)
        claim = _require_non_blank(source.get("claim"), f"sources[{index}].claim")
        value = _require_non_blank(source.get("value"), f"sources[{index}].value")
        if source.get("opened") is not True:
            raise IntegrationContractError(f"sources[{index}] must be opened")
        snapshot = _require_non_blank(source.get("snapshot"), f"sources[{index}].snapshot")
        locator = _require_non_blank(source.get("locator"), f"sources[{index}].locator")
        quote = _require_non_blank(source.get("quote"), f"sources[{index}].quote")
        relation = _require_non_blank(source.get("relation"), f"sources[{index}].relation")
        if relation != "supports":
            raise IntegrationContractError(
                f"sources[{index}].relation must be supports"
            )
        locator_match = re.fullmatch(r"line:([1-9][0-9]*)", locator)
        if locator_match is None:
            raise IntegrationContractError(
                f"sources[{index}].locator must use line:<positive-integer>"
            )
        lines = snapshot.splitlines()
        line_number = int(locator_match.group(1))
        if line_number > len(lines) or quote not in lines[line_number - 1]:
            raise IntegrationContractError(
                f"sources[{index}] quote is not present at locator"
            )
        if value.casefold() not in quote.casefold():
            raise IntegrationContractError(
                f"sources[{index}] quote does not contain the structured value"
            )
        claims[claim].append((source_id, value, locator, quote, relation))

    resolved: list[JsonValue] = []
    all_claims = sorted(required_claims | set(claims))
    for claim in all_claims:
        evidence = claims.get(claim, [])
        values = sorted({item[1] for item in evidence})
        value_items: list[JsonValue] = [value for value in values]
        citation_items: list[JsonValue] = [
            {
                "source_id": source_id,
                "value": value,
                "locator": locator,
                "quote": quote,
                "relation": relation,
            }
            for source_id, value, locator, quote, relation in sorted(evidence)
        ]
        entry: dict[str, JsonValue] = {
            "claim": claim,
            "status": (
                "insufficient"
                if not values
                else "supported"
                if len(values) == 1
                else "conflict"
            ),
            "values": value_items,
            "citations": citation_items,
        }
        resolved.append(entry)
    return {
        "claims": resolved,
        "unsupported_claims": sum(
            1
            for claim in resolved
            if isinstance(claim, dict) and claim.get("status") == "insufficient"
        ),
        "integration": BOUNDARY.name,
        "mode": BOUNDARY.execution_mode,
    }
