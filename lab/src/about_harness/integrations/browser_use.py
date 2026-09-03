from __future__ import annotations

from urllib.parse import urlparse

from about_harness.contracts import JsonValue
from about_harness.integrations.base import (
    IntegrationBoundary,
    IntegrationContractError,
    require_list,
    require_object,
    require_string,
)

BOUNDARY = IntegrationBoundary(
    name="Browser Use",
    distribution="browser-use",
    import_name="browser_use",
    representative_domain="browser",
)

_ALLOWED_ORIGIN = "http://lab.local"
_ALLOWED_PATH = "/catalog"
_ALLOWED_FIELDS = {"sku", "name"}
_TASK_FIELDS = {
    "task_id",
    "allowed_origin",
    "allowed_path",
    "allowed_fields",
    "max_records",
}
_OBSERVATION_FIELDS = {
    "session_id",
    "observation_id",
    "document_id",
    "url",
    "redirect_chain",
    "rows",
    "untrusted_requests",
}
_REQUEST_FIELDS = {"operation", "observation_id", "document_id", "fields"}
_ROW_FIELDS = {"element_id", "sku", "name"}
_UNTRUSTED_REQUEST_FIELDS = {
    "element_id",
    "text",
    "requested_capabilities",
}


def _require_exact_fields(
    value: dict[str, JsonValue], expected: set[str], label: str
) -> None:
    missing = expected.difference(value)
    unknown = set(value).difference(expected)
    if missing or unknown:
        problems: list[str] = []
        if missing:
            problems.append(f"missing {sorted(missing)}")
        if unknown:
            problems.append(f"unknown {sorted(unknown)}")
        raise IntegrationContractError(f"{label} has schema drift: {', '.join(problems)}")


def _require_non_blank(value: JsonValue, label: str) -> str:
    text = require_string(value, label)
    if not text.strip():
        raise IntegrationContractError(f"{label} must be a non-blank string")
    return text


def _require_unique_strings(value: JsonValue, label: str) -> list[str]:
    raw_values = require_list(value, label)
    values: list[str] = []
    seen: set[str] = set()
    for index, raw in enumerate(raw_values):
        item = _require_non_blank(raw, f"{label}[{index}]")
        if item in seen:
            raise IntegrationContractError(f"{label} contains duplicate value: {item}")
        seen.add(item)
        values.append(item)
    return values


def _validate_local_url(value: JsonValue, label: str) -> str:
    url = _require_non_blank(value, label)
    parsed = urlparse(url)
    try:
        port = parsed.port
    except ValueError as error:
        raise IntegrationContractError(f"{label} has an invalid port") from error
    if (
        url != f"{_ALLOWED_ORIGIN}{_ALLOWED_PATH}"
        or parsed.scheme != "http"
        or parsed.hostname != "lab.local"
        or port is not None
        or parsed.username is not None
        or parsed.password is not None
        or parsed.path != _ALLOWED_PATH
        or parsed.params
        or parsed.query
        or parsed.fragment
    ):
        raise IntegrationContractError(
            f"{label} must be the exact local catalog URL {_ALLOWED_ORIGIN}{_ALLOWED_PATH}"
        )
    return url


def extract_local_catalog(payload: dict[str, JsonValue]) -> dict[str, JsonValue]:
    """Validate a synthetic page snapshot without starting a browser or importing Browser Use."""

    _require_exact_fields(payload, {"task", "observation", "request"}, "payload")
    task = require_object(payload.get("task"), "task")
    observation = require_object(payload.get("observation"), "observation")
    request = require_object(payload.get("request"), "request")
    _require_exact_fields(task, _TASK_FIELDS, "task")
    _require_exact_fields(observation, _OBSERVATION_FIELDS, "observation")
    _require_exact_fields(request, _REQUEST_FIELDS, "request")

    task_id = _require_non_blank(task.get("task_id"), "task.task_id")
    allowed_origin = _require_non_blank(
        task.get("allowed_origin"), "task.allowed_origin"
    )
    allowed_path = _require_non_blank(task.get("allowed_path"), "task.allowed_path")
    if allowed_origin != _ALLOWED_ORIGIN or allowed_path != _ALLOWED_PATH:
        raise IntegrationContractError("task navigation policy is not the locked lab policy")
    allowed_fields = _require_unique_strings(
        task.get("allowed_fields"), "task.allowed_fields"
    )
    if set(allowed_fields) != _ALLOWED_FIELDS:
        raise IntegrationContractError("task.allowed_fields must be sku and name")
    max_records_value = task.get("max_records")
    if (
        not isinstance(max_records_value, int)
        or isinstance(max_records_value, bool)
        or max_records_value < 1
        or max_records_value > 10
    ):
        raise IntegrationContractError("task.max_records must be an integer from 1 to 10")

    session_id = _require_non_blank(
        observation.get("session_id"), "observation.session_id"
    )
    observation_id = _require_non_blank(
        observation.get("observation_id"), "observation.observation_id"
    )
    document_id = _require_non_blank(
        observation.get("document_id"), "observation.document_id"
    )
    url = _validate_local_url(observation.get("url"), "observation.url")
    redirect_chain = _require_unique_strings(
        observation.get("redirect_chain"), "observation.redirect_chain"
    )
    for index, redirect_url in enumerate(redirect_chain):
        _validate_local_url(redirect_url, f"observation.redirect_chain[{index}]")

    operation = _require_non_blank(request.get("operation"), "request.operation")
    if operation != "extract":
        raise IntegrationContractError("request.operation must be extract")
    if request.get("observation_id") != observation_id:
        raise IntegrationContractError("request references a stale observation_id")
    if request.get("document_id") != document_id:
        raise IntegrationContractError("request references a stale document_id")
    requested_fields = _require_unique_strings(request.get("fields"), "request.fields")
    if not set(requested_fields).issubset(_ALLOWED_FIELDS):
        raise IntegrationContractError("request.fields exceed the task allowlist")
    if not requested_fields:
        raise IntegrationContractError("request.fields must not be empty")

    rows = require_list(observation.get("rows"), "observation.rows")
    if len(rows) > max_records_value:
        raise IntegrationContractError("observation.rows exceed task.max_records")
    records: list[JsonValue] = []
    seen_elements: set[str] = set()
    seen_skus: set[str] = set()
    for index, raw in enumerate(rows):
        label = f"observation.rows[{index}]"
        row = require_object(raw, label)
        _require_exact_fields(row, _ROW_FIELDS, label)
        element_id = _require_non_blank(row.get("element_id"), f"{label}.element_id")
        sku = _require_non_blank(row.get("sku"), f"{label}.sku")
        name = _require_non_blank(row.get("name"), f"{label}.name")
        if element_id in seen_elements:
            raise IntegrationContractError(f"duplicate element_id: {element_id}")
        if sku in seen_skus:
            raise IntegrationContractError(f"duplicate sku: {sku}")
        seen_elements.add(element_id)
        seen_skus.add(sku)
        values = {"sku": sku, "name": name}
        record: dict[str, JsonValue] = {
            field: values[field] for field in requested_fields
        }
        record["source"] = {
            "observation_id": observation_id,
            "document_id": document_id,
            "element_id": element_id,
        }
        records.append(record)

    raw_untrusted_requests = require_list(
        observation.get("untrusted_requests"), "observation.untrusted_requests"
    )
    seen_request_elements: set[str] = set()
    for index, raw in enumerate(raw_untrusted_requests):
        label = f"observation.untrusted_requests[{index}]"
        untrusted_request = require_object(raw, label)
        _require_exact_fields(untrusted_request, _UNTRUSTED_REQUEST_FIELDS, label)
        element_id = _require_non_blank(
            untrusted_request.get("element_id"), f"{label}.element_id"
        )
        if element_id in seen_request_elements:
            raise IntegrationContractError(
                f"duplicate untrusted request element_id: {element_id}"
            )
        seen_request_elements.add(element_id)
        _require_non_blank(untrusted_request.get("text"), f"{label}.text")
        capabilities = _require_unique_strings(
            untrusted_request.get("requested_capabilities"),
            f"{label}.requested_capabilities",
        )
        if not capabilities:
            raise IntegrationContractError(
                f"{label}.requested_capabilities must not be empty"
            )

    rejected_requests = len(raw_untrusted_requests)
    requested_fields_output: list[JsonValue] = [field for field in requested_fields]
    return {
        "task_id": task_id,
        "observation": {
            "session_id": session_id,
            "observation_id": observation_id,
            "document_id": document_id,
            "url": url,
            "redirects_observed": len(redirect_chain),
        },
        "requested_fields": requested_fields_output,
        "records": records,
        "injection_refused": rejected_requests > 0,
        "security": {
            "untrusted_requests": rejected_requests,
            "policy_rejections": rejected_requests,
            "executed_actions": 0,
        },
        "side_effects": 0,
        "integration": BOUNDARY.name,
        "mode": BOUNDARY.execution_mode,
    }
