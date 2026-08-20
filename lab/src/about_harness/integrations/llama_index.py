from __future__ import annotations

from about_harness.contracts import JsonValue
from about_harness.integrations.base import (
    IntegrationBoundary,
    require_list,
    require_object,
    require_string,
)

BOUNDARY = IntegrationBoundary(
    name="LlamaIndex",
    distribution="llama-index",
    import_name="llama_index",
    representative_domain="document",
)


def answer_from_latest(payload: dict[str, JsonValue]) -> dict[str, JsonValue]:
    """Filter versioned chunks before deterministic retrieval."""

    query = require_string(payload.get("query"), "query").casefold()
    documents = require_list(payload.get("documents"), "documents")
    latest: dict[str, tuple[int, dict[str, JsonValue]]] = {}
    for index, raw in enumerate(documents):
        document = require_object(raw, f"documents[{index}]")
        doc_id = require_string(document.get("doc_id"), f"documents[{index}].doc_id")
        version_value = document.get("version")
        if not isinstance(version_value, int) or isinstance(version_value, bool):
            raise ValueError(f"documents[{index}].version must be an integer")
        previous = latest.get(doc_id)
        if previous is None or version_value > previous[0]:
            latest[doc_id] = (version_value, document)

    candidates: list[tuple[str, int, str]] = []
    for doc_id, (version, document) in latest.items():
        text = require_string(document.get("text"), f"{doc_id}.text")
        if any(term in text.casefold() for term in query.split()):
            candidates.append((doc_id, version, text))
    candidates.sort()
    if not candidates:
        return {"status": "insufficient", "answer": None, "citations": []}
    doc_id, version, text = candidates[0]
    return {
        "status": "answered",
        "answer": text,
        "citations": [f"{doc_id}@v{version}"],
        "stale_versions_ignored": len(documents) - len(latest),
        "integration": BOUNDARY.name,
        "mode": BOUNDARY.execution_mode,
    }
