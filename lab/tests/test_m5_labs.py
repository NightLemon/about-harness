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
    with pytest.raises(IntegrationContractError, match=r"lab\.local"):
        extract_local_catalog({"url": "https://evil.invalid", "page_text": "x", "rows": []})


def test_document_fixture_filters_stale_version_and_cites_latest() -> None:
    bundle = load_fixture(FIXTURES, "document")
    result = answer_from_latest(bundle.input)
    assert result["status"] == "answered"
    assert result["answer"] == "The retention policy keeps records for 45 days."
    assert result["citations"] == ["handbook@v2"]
    assert result["stale_versions_ignored"] == 1
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
        "integration": "LlamaIndex",
        "mode": "offline-contract-seam",
    }


def test_data_schema_drift_negative_case_is_rejected() -> None:
    with pytest.raises(IntegrationContractError, match="schema drift"):
        normalize_rows({"rows": [{"userId": "u-3", "score": 9}]})


def test_data_fixture_preserves_null_and_redacts_email() -> None:
    bundle = load_fixture(FIXTURES, "data")
    result = normalize_rows(bundle.input)
    assert result["rows"] == [
        {"user_id": "u-1", "score": 7.5, "email": "[REDACTED]"},
        {"user_id": "u-2", "score": None, "email": "[REDACTED]"},
    ]
    assert result["row_count"] == 2
    assert result["sensitive_values_exposed"] == 0
    assert result["integration"] == "PydanticAI"
    assert result["mode"] == "offline-contract-seam"


@pytest.mark.parametrize("score", [float("nan"), float("inf"), float("-inf")])
def test_data_rejects_non_finite_scores(score: float) -> None:
    payload: dict[str, JsonValue] = {
        "rows": [{"user_id": "u-1", "score": score, "email": None}]
    }
    with pytest.raises(IntegrationContractError, match="finite number"):
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
