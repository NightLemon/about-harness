from __future__ import annotations

# pyright: reportUnknownMemberType=false
import copy
import json
import shutil
import subprocess
import sys
from pathlib import Path
from typing import Any

import pytest
from about_harness.contracts import JsonValue
from about_harness.integrations.base import IntegrationContractError
from about_harness.integrations.browser_use import extract_local_catalog
from about_harness.integrations.langgraph import resolve_versioned_claims
from about_harness.integrations.llama_index import answer_from_latest
from about_harness.integrations.pydantic_ai import normalize_rows
from about_harness.labs import (
    LAB_NAMES,
    FixtureError,
    evaluate_coding,
    evaluate_migration,
    execute_fixture,
    load_fixture,
)
from jsonschema import Draft202012Validator

ROOT = Path(__file__).parents[1]
FIXTURES = ROOT / "fixtures"
SCHEMAS = ROOT / "schemas"


def test_all_six_fixed_fixtures_pass_offline() -> None:
    results = [execute_fixture(load_fixture(FIXTURES, name)) for name in LAB_NAMES]
    assert len(results) == 6
    assert all(result["passed"] is True for result in results)
    assert all(result["negative_rejected"] is True for result in results)
    assert all(result["evidence"] == "E1" and result["offline"] is True for result in results)


def test_fixture_hash_tampering_is_rejected(tmp_path: Path) -> None:
    target = tmp_path / "coding"
    target.mkdir()
    for filename in ("manifest.json", "input.json", "expected.json", "negative.json"):
        (target / filename).write_bytes((FIXTURES / "coding" / filename).read_bytes())
    (target / "input.json").write_text('{"tampered":true}', encoding="utf-8")
    with pytest.raises(FixtureError, match="hash mismatch"):
        load_fixture(tmp_path, "coding")


def test_coding_fixture_executes_baseline_and_candidate_assertions() -> None:
    bundle = load_fixture(FIXTURES, "coding")
    result = evaluate_coding(bundle.input)
    assert result["baseline_failures"] == ["single", "multiple"]
    assert result["test_results"] == {"empty": True, "single": True, "multiple": True}
    assert result["tests_passed"] == 3
    assert result["patch_applied"] is True


def test_coding_fixture_does_not_count_named_but_failing_tests() -> None:
    bundle = load_fixture(FIXTURES, "coding")
    payload = copy.deepcopy(bundle.input)
    payload["candidate_patch"] = payload["before"]
    result = evaluate_coding(payload)
    assert result["test_results"] == {"empty": True, "single": False, "multiple": False}
    assert result["tests_passed"] == 1
    assert result["patch_applied"] is False


def test_coding_fixture_rejects_source_outside_fixed_ast_allowlist() -> None:
    bundle = load_fixture(FIXTURES, "coding")
    payload = copy.deepcopy(bundle.input)
    payload["candidate_patch"] = "import os\n\ndef collect(items):\n    return items\n"
    with pytest.raises(FixtureError, match="fixed AST allowlist"):
        evaluate_coding(payload)


def test_cli_accepts_isolated_fixture_root_and_rejects_tampering(tmp_path: Path) -> None:
    target = tmp_path / "coding"
    shutil.copytree(FIXTURES / "coding", target)
    command = [
        sys.executable,
        str(ROOT.parent / "scripts" / "run-labs.py"),
        "coding",
        "--fixtures-root",
        str(tmp_path),
    ]
    good = subprocess.run(command, cwd=ROOT.parent, capture_output=True, text=True, check=False)
    assert good.returncode == 0
    assert '"passed": true' in good.stdout

    (target / "input.json").write_text('{"tampered":true}', encoding="utf-8")
    bad = subprocess.run(command, cwd=ROOT.parent, capture_output=True, text=True, check=False)
    assert bad.returncode != 0
    assert "hash mismatch" in bad.stderr


def test_browser_external_navigation_negative_case_is_rejected() -> None:
    bundle = load_fixture(FIXTURES, "browser")
    payload = copy.deepcopy(bundle.input)
    observation = payload["observation"]
    assert isinstance(observation, dict)
    observation["url"] = "https://evil.invalid/collect"
    with pytest.raises(IntegrationContractError, match="exact local catalog URL"):
        extract_local_catalog(payload)

    redirect = copy.deepcopy(bundle.input)
    observation = redirect["observation"]
    assert isinstance(observation, dict)
    observation["redirect_chain"] = ["https://evil.invalid/collect"]
    with pytest.raises(IntegrationContractError, match="redirect_chain"):
        extract_local_catalog(redirect)


def test_browser_fixture_binds_records_to_current_observation() -> None:
    bundle = load_fixture(FIXTURES, "browser")
    result = extract_local_catalog(bundle.input)
    assert result["task_id"] == "catalog-readonly"
    assert result["observation"] == {
        "session_id": "session-browser-01",
        "observation_id": "obs-catalog-01",
        "document_id": "doc-catalog-01",
        "url": "http://lab.local/catalog",
        "redirects_observed": 0,
    }
    assert result["records"] == [
        {
            "sku": "A-1",
            "name": "Alpha",
            "source": {
                "observation_id": "obs-catalog-01",
                "document_id": "doc-catalog-01",
                "element_id": "row-a",
            },
        },
        {
            "sku": "B-2",
            "name": "Beta",
            "source": {
                "observation_id": "obs-catalog-01",
                "document_id": "doc-catalog-01",
                "element_id": "row-b",
            },
        },
    ]
    assert result["injection_refused"] is True
    assert result["security"] == {
        "untrusted_requests": 1,
        "policy_rejections": 1,
        "executed_actions": 0,
    }
    assert result["side_effects"] == 0


def test_browser_rejects_stale_observation_and_document() -> None:
    bundle = load_fixture(FIXTURES, "browser")
    stale_observation = copy.deepcopy(bundle.input)
    request = stale_observation["request"]
    assert isinstance(request, dict)
    request["observation_id"] = "obs-stale"
    with pytest.raises(IntegrationContractError, match="stale observation_id"):
        extract_local_catalog(stale_observation)

    stale_document = copy.deepcopy(bundle.input)
    request = stale_document["request"]
    assert isinstance(request, dict)
    request["document_id"] = "doc-stale"
    with pytest.raises(IntegrationContractError, match="stale document_id"):
        extract_local_catalog(stale_document)


def test_browser_rejects_field_expansion_and_record_budget_overflow() -> None:
    bundle = load_fixture(FIXTURES, "browser")
    expanded = copy.deepcopy(bundle.input)
    request = expanded["request"]
    assert isinstance(request, dict)
    request["fields"] = ["sku", "name", "price"]
    with pytest.raises(IntegrationContractError, match="exceed the task allowlist"):
        extract_local_catalog(expanded)

    overflow = copy.deepcopy(bundle.input)
    observation = overflow["observation"]
    assert isinstance(observation, dict)
    rows = observation["rows"]
    assert isinstance(rows, list)
    rows.append({"element_id": "row-c", "sku": "C-3", "name": "Gamma"})
    with pytest.raises(IntegrationContractError, match=r"exceed task\.max_records"):
        extract_local_catalog(overflow)


def test_browser_rejects_duplicate_element_and_business_identity() -> None:
    bundle = load_fixture(FIXTURES, "browser")
    duplicate_element = copy.deepcopy(bundle.input)
    observation = duplicate_element["observation"]
    assert isinstance(observation, dict)
    rows = observation["rows"]
    assert isinstance(rows, list)
    second = rows[1]
    assert isinstance(second, dict)
    second["element_id"] = "row-a"
    with pytest.raises(IntegrationContractError, match="duplicate element_id"):
        extract_local_catalog(duplicate_element)

    duplicate_sku = copy.deepcopy(bundle.input)
    observation = duplicate_sku["observation"]
    assert isinstance(observation, dict)
    rows = observation["rows"]
    assert isinstance(rows, list)
    second = rows[1]
    assert isinstance(second, dict)
    second["sku"] = "A-1"
    with pytest.raises(IntegrationContractError, match="duplicate sku"):
        extract_local_catalog(duplicate_sku)


@pytest.mark.parametrize(
    "url",
    [
        "http://user@lab.local/catalog",
        "http://lab.local:80/catalog",
        "http://lab.local/catalog?next=evil",
        "http://lab.local/catalog#fragment",
    ],
)
def test_browser_rejects_ambiguous_local_urls(url: str) -> None:
    bundle = load_fixture(FIXTURES, "browser")
    payload = copy.deepcopy(bundle.input)
    observation = payload["observation"]
    assert isinstance(observation, dict)
    observation["url"] = url
    with pytest.raises(IntegrationContractError, match="exact local catalog URL"):
        extract_local_catalog(payload)


def test_research_fixture_preserves_conflict_and_claim_citations() -> None:
    bundle = load_fixture(FIXTURES, "research")
    result = resolve_versioned_claims(bundle.input)
    assert result["claims"] == [
        {
            "claim": "deletion_process",
            "status": "insufficient",
            "values": [],
            "citations": [],
        },
        {
            "claim": "retention_days",
            "status": "conflict",
            "values": ["30", "45"],
            "citations": [
                {
                    "source_id": "policy-v1",
                    "value": "30",
                    "locator": "line:2",
                    "quote": "Records are retained for 30 days.",
                    "relation": "supports",
                },
                {
                    "source_id": "policy-v2",
                    "value": "45",
                    "locator": "line:2",
                    "quote": "Records are retained for 45 days.",
                    "relation": "supports",
                },
            ],
        },
        {
            "claim": "review_required",
            "status": "supported",
            "values": ["yes"],
            "citations": [
                {
                    "source_id": "legal-note",
                    "value": "yes",
                    "locator": "line:2",
                    "quote": "A review is required: yes.",
                    "relation": "supports",
                }
            ],
        },
    ]
    assert result["unsupported_claims"] == 1
    assert result["integration"] == "LangGraph"
    assert result["mode"] == "offline-contract-seam"


def test_research_rejects_duplicate_source_identity() -> None:
    payload: dict[str, JsonValue] = {
        "query": "Which policy is current?",
        "required_claims": ["retention_days"],
        "sources": [
            {
                "id": "policy",
                "opened": True,
                "snapshot": "Records are retained for 30 days.",
                "claim": "retention_days",
                "value": "30",
                "locator": "line:1",
                "quote": "Records are retained for 30 days.",
                "relation": "supports",
            },
            {"id": "policy", "claim": "retention_days", "value": "45"},
        ],
    }
    with pytest.raises(IntegrationContractError, match="duplicate source id"):
        resolve_versioned_claims(payload)


@pytest.mark.parametrize("query", ["", "   "])
def test_research_requires_non_empty_query(query: str) -> None:
    with pytest.raises(IntegrationContractError, match="query must be a non-empty string"):
        resolve_versioned_claims({"query": query, "sources": []})


def test_research_requires_at_least_one_required_claim() -> None:
    with pytest.raises(IntegrationContractError, match="at least one claim"):
        resolve_versioned_claims(
            {"query": "Which policy applies?", "required_claims": [], "sources": []}
        )


def test_research_rejects_quote_outside_declared_locator() -> None:
    bundle = load_fixture(FIXTURES, "research")
    payload = copy.deepcopy(bundle.input)
    sources = payload["sources"]
    assert isinstance(sources, list)
    source = sources[0]
    assert isinstance(source, dict)
    source["locator"] = "line:1"
    with pytest.raises(IntegrationContractError, match="quote is not present at locator"):
        resolve_versioned_claims(payload)


def test_research_rejects_quote_without_structured_value() -> None:
    bundle = load_fixture(FIXTURES, "research")
    payload = copy.deepcopy(bundle.input)
    sources = payload["sources"]
    assert isinstance(sources, list)
    source = sources[0]
    assert isinstance(source, dict)
    source["value"] = "31"
    with pytest.raises(IntegrationContractError, match="quote does not contain"):
        resolve_versioned_claims(payload)


def test_research_rejects_unopened_source() -> None:
    bundle = load_fixture(FIXTURES, "research")
    payload = copy.deepcopy(bundle.input)
    sources = payload["sources"]
    assert isinstance(sources, list)
    source = sources[0]
    assert isinstance(source, dict)
    source["opened"] = False
    with pytest.raises(IntegrationContractError, match="must be opened"):
        resolve_versioned_claims(payload)


def test_document_fixture_filters_stale_version_and_cites_latest() -> None:
    bundle = load_fixture(FIXTURES, "document")
    result = answer_from_latest(bundle.input)
    assert result["status"] == "answered"
    assert result["answer"] == "The retention policy keeps records for 45 days."
    assert result["citations"] == [
        {
            "doc_id": "handbook",
            "version": 2,
            "block_id": "retention",
            "quote": "The retention policy keeps records for 45 days.",
        }
    ]
    assert result["stale_versions_ignored"] == 1
    assert result["access_denied_documents"] == 0
    assert result["parse_failed_documents"] == 0
    assert result["integration"] == "LlamaIndex"
    assert result["mode"] == "offline-contract-seam"


def test_document_returns_auditable_insufficient_result_without_match() -> None:
    bundle = load_fixture(FIXTURES, "document")
    payload = copy.deepcopy(bundle.input)
    payload["query"] = "vacation allowance"
    result = answer_from_latest(payload)
    assert result == {
        "status": "insufficient",
        "answer": None,
        "citations": [],
        "stale_versions_ignored": 1,
        "access_denied_documents": 0,
        "parse_failed_documents": 0,
        "integration": "LlamaIndex",
        "mode": "offline-contract-seam",
    }


def test_document_requires_all_query_terms_in_one_block() -> None:
    bundle = load_fixture(FIXTURES, "document")
    payload = copy.deepcopy(bundle.input)
    payload["query"] = "retention nonsense"
    result = answer_from_latest(payload)
    assert result["status"] == "insufficient"
    assert result["answer"] is None
    assert result["citations"] == []


def test_document_rejects_duplicate_document_version_identity() -> None:
    bundle = load_fixture(FIXTURES, "document")
    payload = copy.deepcopy(bundle.input)
    documents = payload["documents"]
    assert isinstance(documents, list)
    documents.append({"doc_id": "handbook", "version": 2})
    with pytest.raises(IntegrationContractError, match="duplicate document version"):
        answer_from_latest(payload)


def test_document_does_not_fall_back_from_denied_latest_version() -> None:
    payload: dict[str, JsonValue] = {
        "query": "retention policy",
        "documents": [
            {
                "doc_id": "handbook",
                "version": 1,
                "access": "allowed",
                "parse_status": "parsed",
                "blocks": [
                    {
                        "block_id": "retention",
                        "text": "The retention policy keeps records for 30 days.",
                    }
                ],
            },
            {
                "doc_id": "handbook",
                "version": 2,
                "access": "denied",
                "parse_status": "not_attempted",
                "blocks": [],
            },
        ],
    }
    result = answer_from_latest(payload)
    assert result["status"] == "access_denied"
    assert result["answer"] is None
    assert result["citations"] == []
    assert result["stale_versions_ignored"] == 1
    assert result["access_denied_documents"] == 1


def test_document_reports_parse_failure_without_exposing_blocks() -> None:
    payload: dict[str, JsonValue] = {
        "query": "retention policy",
        "documents": [
            {
                "doc_id": "handbook",
                "version": 2,
                "access": "allowed",
                "parse_status": "failed",
                "blocks": [],
            }
        ],
    }
    result = answer_from_latest(payload)
    assert result["status"] == "parse_failed"
    assert result["answer"] is None
    assert result["parse_failed_documents"] == 1


def test_document_rejects_non_positive_versions_and_exposed_denied_content() -> None:
    bundle = load_fixture(FIXTURES, "document")
    payload = copy.deepcopy(bundle.input)
    documents = payload["documents"]
    assert isinstance(documents, list)
    first = documents[0]
    assert isinstance(first, dict)
    first["version"] = 0
    with pytest.raises(IntegrationContractError, match="positive integer"):
        answer_from_latest(payload)

    denied = copy.deepcopy(bundle.input)
    denied_documents = denied["documents"]
    assert isinstance(denied_documents, list)
    latest = denied_documents[1]
    assert isinstance(latest, dict)
    latest["access"] = "denied"
    latest["parse_status"] = "not_attempted"
    with pytest.raises(IntegrationContractError, match="must not be parsed or exposed"):
        answer_from_latest(denied)


def test_document_rejects_duplicate_block_identity() -> None:
    bundle = load_fixture(FIXTURES, "document")
    payload = copy.deepcopy(bundle.input)
    documents = payload["documents"]
    assert isinstance(documents, list)
    latest = documents[1]
    assert isinstance(latest, dict)
    blocks = latest["blocks"]
    assert isinstance(blocks, list)
    blocks.append(
        {
            "block_id": "retention",
            "text": "Duplicate block identities must not depend on input order.",
        }
    )
    with pytest.raises(IntegrationContractError, match="duplicate block id"):
        answer_from_latest(payload)


def test_data_schema_drift_negative_case_is_rejected() -> None:
    bundle = load_fixture(FIXTURES, "data")
    payload = copy.deepcopy(bundle.input)
    payload["rows"] = [{"userId": "u-4", "score": 9}]
    with pytest.raises(IntegrationContractError, match="schema drift"):
        normalize_rows(payload)


def test_data_fixture_preserves_identity_missing_null_and_redacts_email() -> None:
    bundle = load_fixture(FIXTURES, "data")
    result = normalize_rows(bundle.input)
    assert result["dataset"] == {
        "dataset_id": "training-scores",
        "snapshot_id": "synthetic-2026-09-04",
        "schema_version": "1.1",
        "score_unit": "points_0_10",
    }
    assert result["rows"] == [
        {
            "user_id": "u-1",
            "score": 7.5,
            "score_state": "value",
            "email": "[REDACTED]",
        },
        {
            "user_id": "u-2",
            "score": None,
            "score_state": "null",
            "email": "[REDACTED]",
        },
        {
            "user_id": "u-3",
            "score": None,
            "score_state": "missing",
            "email": None,
        },
    ]
    assert result["row_count"] == 3
    assert result["population"] == {
        "input_rows": 3,
        "output_rows": 3,
        "rejected_rows": 0,
    }
    assert result["redacted_fields"] == 2
    assert result["sensitive_values_exposed"] == 0
    assert result["integration"] == "PydanticAI"
    assert result["mode"] == "offline-contract-seam"


@pytest.mark.parametrize(
    "score", [float("nan"), float("inf"), float("-inf"), 10**400]
)
def test_data_rejects_non_finite_scores(score: float | int) -> None:
    bundle = load_fixture(FIXTURES, "data")
    payload = copy.deepcopy(bundle.input)
    payload["rows"] = [{"user_id": "u-4", "score": score, "email": None}]
    with pytest.raises(IntegrationContractError, match="finite number"):
        normalize_rows(payload)


def test_data_rejects_duplicate_keys_range_and_unit_drift() -> None:
    bundle = load_fixture(FIXTURES, "data")

    duplicate = copy.deepcopy(bundle.input)
    duplicate["rows"] = [
        {"user_id": "u-4", "score": 4},
        {"user_id": "u-4", "score": 5},
    ]
    with pytest.raises(IntegrationContractError, match="duplicate user_id"):
        normalize_rows(duplicate)

    out_of_range = copy.deepcopy(bundle.input)
    out_of_range["rows"] = [{"user_id": "u-4", "score": 11}]
    with pytest.raises(IntegrationContractError, match="between 0 and 10 points"):
        normalize_rows(out_of_range)

    unit_drift = copy.deepcopy(bundle.input)
    dataset = unit_drift["dataset"]
    assert isinstance(dataset, dict)
    dataset["score_unit"] = "percent"
    with pytest.raises(IntegrationContractError, match="score_unit"):
        normalize_rows(unit_drift)


def test_data_fails_if_sensitive_value_reappears_in_an_output_field() -> None:
    bundle = load_fixture(FIXTURES, "data")
    payload = copy.deepcopy(bundle.input)
    rows = payload["rows"]
    assert isinstance(rows, list)
    first = rows[0]
    assert isinstance(first, dict)
    email = first["email"]
    assert isinstance(email, str)
    first["user_id"] = email
    with pytest.raises(IntegrationContractError, match="redaction failed"):
        normalize_rows(payload)


def test_configs_and_eval_examples_match_formal_schemas() -> None:
    config_schema: dict[str, Any] = json.loads(
        (SCHEMAS / "config.json").read_text(encoding="utf-8")
    )
    for path in sorted((ROOT / "configs").glob("*.json")):
        Draft202012Validator(config_schema).validate(json.loads(path.read_text(encoding="utf-8")))

    eval_schema: dict[str, Any] = json.loads(
        (SCHEMAS / "eval-run.json").read_text(encoding="utf-8")
    )
    eval_file = ROOT.parent / "evals" / "runs.example.jsonl"
    rows = [json.loads(line) for line in eval_file.read_text(encoding="utf-8").splitlines()]
    for row in rows:
        Draft202012Validator(eval_schema).validate(row)

    task_schema: dict[str, Any] = json.loads(
        (SCHEMAS / "task.json").read_text(encoding="utf-8")
    )
    task_file = ROOT.parent / "evals" / "tasks.example.jsonl"
    tasks = [json.loads(line) for line in task_file.read_text(encoding="utf-8").splitlines()]
    for task in tasks:
        Draft202012Validator(task_schema).validate(task)


def test_negative_fixture_exists_for_every_case() -> None:
    for name in LAB_NAMES:
        bundle = load_fixture(FIXTURES, name)
        assert bundle.negative.get("case")


def test_migration_covers_all_harness_paths_domains_and_control_boundaries() -> None:
    bundle = load_fixture(FIXTURES, "migration")
    output = execute_fixture(bundle)
    assert output["passed"] is True
    result = output["output"]
    assert isinstance(result, dict)
    assert result["target_harnesses"] == ["Pi", "Claude Code"]
    assert result["paths_checked"] == 2
    assert result["mapped_responsibilities"] == 12
    assert result["domains_checked"] == 5
    assert result["control_boundaries_preserved"] is True
    assert result["config_copied_verbatim"] is False


def test_migration_rejects_unknown_empty_and_broader_control_mappings() -> None:
    with pytest.raises(FixtureError, match="unknown source_harness"):
        evaluate_migration(
            {
                "source_harness": "Unknown",
                "target_harnesses": ["Pi", "Claude Code"],
                "requirements": list(),
                "mappings": {},
                "domain_checklists": {},
            }
        )

    bundle = load_fixture(FIXTURES, "migration")
    payload = copy.deepcopy(bundle.input)
    mappings = payload["mappings"]
    assert isinstance(mappings, dict)
    pi = mappings["Pi"]
    assert isinstance(pi, dict)
    network = pi["network"]
    assert isinstance(network, dict)
    network["target_semantics"] = ""
    with pytest.raises(FixtureError, match="semantic fields must be non-empty"):
        evaluate_migration(payload)

    payload = copy.deepcopy(bundle.input)
    mappings = payload["mappings"]
    assert isinstance(mappings, dict)
    pi = mappings["Pi"]
    assert isinstance(pi, dict)
    network = pi["network"]
    assert isinstance(network, dict)
    network["target_semantics"] = "unrestricted outbound network"
    network["compensating_control"] = "none"
    network["preserves_boundary"] = False
    with pytest.raises(FixtureError, match=r"uncompensated gap.*boundary violation"):
        evaluate_migration(payload)


def test_public_summary_matches_current_fixture_results() -> None:
    summary_path = ROOT / "results" / "public" / "m5-offline-summary.json"
    summary = json.loads(summary_path.read_text(encoding="utf-8"))
    recorded = {case["case_id"]: case for case in summary["cases"]}
    for name in LAB_NAMES:
        result = execute_fixture(load_fixture(FIXTURES, name))
        assert recorded[name]["fixture_hash"] == result["fixture_hash"]
        assert recorded[name]["passed"] is result["passed"] is True
        assert recorded[name]["negative_rejected"] is result["negative_rejected"] is True
