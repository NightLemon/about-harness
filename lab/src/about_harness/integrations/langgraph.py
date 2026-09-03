from __future__ import annotations

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


def resolve_versioned_claims(payload: dict[str, JsonValue]) -> dict[str, JsonValue]:
    """Execute the deterministic state transition used by the research fixture."""

    require_string(payload.get("query"), "query")
    sources = require_list(payload.get("sources"), "sources")
    claims: dict[str, list[tuple[str, str]]] = defaultdict(list)
    seen_source_ids: set[str] = set()
    for index, raw in enumerate(sources):
        source = require_object(raw, f"sources[{index}]")
        source_id = require_string(source.get("id"), f"sources[{index}].id")
        if source_id in seen_source_ids:
            raise IntegrationContractError(f"duplicate source id: {source_id}")
        seen_source_ids.add(source_id)
        claim = require_string(source.get("claim"), f"sources[{index}].claim")
        value = require_string(source.get("value"), f"sources[{index}].value")
        claims[claim].append((source_id, value))

    resolved: list[JsonValue] = []
    for claim, evidence in sorted(claims.items()):
        values = sorted({value for _, value in evidence})
        value_items: list[JsonValue] = [value for value in values]
        citation_items: list[JsonValue] = [source_id for source_id, _ in sorted(evidence)]
        entry: dict[str, JsonValue] = {
            "claim": claim,
            "status": "supported" if len(values) == 1 else "conflict",
            "values": value_items,
            "citations": citation_items,
        }
        resolved.append(entry)
    return {
        "claims": resolved,
        "unsupported_claims": 0,
        "integration": BOUNDARY.name,
        "mode": BOUNDARY.execution_mode,
    }
