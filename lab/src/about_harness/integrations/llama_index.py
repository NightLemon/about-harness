from __future__ import annotations

import re

from about_harness.contracts import JsonValue
from about_harness.integrations.base import (
    IntegrationBoundary,
    IntegrationContractError,
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


def _require_non_blank(value: JsonValue, label: str) -> str:
    text = require_string(value, label)
    if not text.strip():
        raise IntegrationContractError(f"{label} must be a non-empty string")
    return text


def answer_from_latest(payload: dict[str, JsonValue]) -> dict[str, JsonValue]:
    """Filter versioned blocks before deterministic offline retrieval."""

    query = _require_non_blank(payload.get("query"), "query").casefold()
    query_terms = set(re.findall(r"\w+", query))
    if not query_terms:
        raise IntegrationContractError("query must contain at least one searchable term")
    documents = require_list(payload.get("documents"), "documents")
    latest: dict[str, tuple[int, str, str, list[tuple[str, str]]]] = {}
    seen_versions: set[tuple[str, int]] = set()
    for index, raw in enumerate(documents):
        document = require_object(raw, f"documents[{index}]")
        doc_id = _require_non_blank(
            document.get("doc_id"), f"documents[{index}].doc_id"
        )
        version_value = document.get("version")
        if (
            not isinstance(version_value, int)
            or isinstance(version_value, bool)
            or version_value < 1
        ):
            raise IntegrationContractError(
                f"documents[{index}].version must be a positive integer"
            )
        identity = (doc_id, version_value)
        if identity in seen_versions:
            raise IntegrationContractError(
                f"duplicate document version: {doc_id}@v{version_value}"
            )
        seen_versions.add(identity)

        access = _require_non_blank(
            document.get("access"), f"documents[{index}].access"
        )
        if access not in {"allowed", "denied"}:
            raise IntegrationContractError(
                f"documents[{index}].access must be allowed or denied"
            )
        parse_status = _require_non_blank(
            document.get("parse_status"), f"documents[{index}].parse_status"
        )
        if parse_status not in {"parsed", "failed", "not_attempted"}:
            raise IntegrationContractError(
                f"documents[{index}].parse_status is invalid"
            )
        raw_blocks = require_list(document.get("blocks"), f"documents[{index}].blocks")
        if access == "denied":
            if parse_status != "not_attempted" or raw_blocks:
                raise IntegrationContractError(
                    f"documents[{index}] denied content must not be parsed or exposed"
                )
        elif parse_status == "failed":
            if raw_blocks:
                raise IntegrationContractError(
                    f"documents[{index}] failed parse must not expose blocks"
                )
        elif parse_status == "not_attempted":
            raise IntegrationContractError(
                f"documents[{index}] allowed content must be parsed or failed"
            )

        blocks: list[tuple[str, str]] = []
        seen_block_ids: set[str] = set()
        for block_index, raw_block in enumerate(raw_blocks):
            block = require_object(
                raw_block, f"documents[{index}].blocks[{block_index}]"
            )
            block_id = _require_non_blank(
                block.get("block_id"),
                f"documents[{index}].blocks[{block_index}].block_id",
            )
            if block_id in seen_block_ids:
                raise IntegrationContractError(
                    f"duplicate block id in {doc_id}@v{version_value}: {block_id}"
                )
            seen_block_ids.add(block_id)
            text = _require_non_blank(
                block.get("text"), f"documents[{index}].blocks[{block_index}].text"
            )
            blocks.append((block_id, text))
        if access == "allowed" and parse_status == "parsed" and not blocks:
            raise IntegrationContractError(
                f"documents[{index}] parsed content must contain at least one block"
            )

        previous = latest.get(doc_id)
        if previous is None or version_value > previous[0]:
            latest[doc_id] = (version_value, access, parse_status, blocks)

    candidates: list[tuple[str, int, str, str]] = []
    access_denied_documents = 0
    parse_failed_documents = 0
    readable_documents = 0
    for doc_id, (version, access, parse_status, blocks) in latest.items():
        if access == "denied":
            access_denied_documents += 1
            continue
        if parse_status == "failed":
            parse_failed_documents += 1
            continue
        readable_documents += 1
        for block_id, text in blocks:
            block_terms = set(re.findall(r"\w+", text.casefold()))
            if query_terms <= block_terms:
                candidates.append((doc_id, version, block_id, text))
    candidates.sort()
    stale_versions_ignored = len(documents) - len(latest)
    if not candidates:
        status = (
            "access_denied"
            if readable_documents == 0 and access_denied_documents > 0
            else "parse_failed"
            if readable_documents == 0 and parse_failed_documents > 0
            else "insufficient"
        )
        return {
            "status": status,
            "answer": None,
            "citations": [],
            "stale_versions_ignored": stale_versions_ignored,
            "access_denied_documents": access_denied_documents,
            "parse_failed_documents": parse_failed_documents,
            "integration": BOUNDARY.name,
            "mode": BOUNDARY.execution_mode,
        }
    doc_id, version, block_id, text = candidates[0]
    return {
        "status": "answered",
        "answer": text,
        "citations": [
            {
                "doc_id": doc_id,
                "version": version,
                "block_id": block_id,
                "quote": text,
            }
        ],
        "stale_versions_ignored": stale_versions_ignored,
        "access_denied_documents": access_denied_documents,
        "parse_failed_documents": parse_failed_documents,
        "integration": BOUNDARY.name,
        "mode": BOUNDARY.execution_mode,
    }
