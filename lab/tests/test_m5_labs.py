from __future__ import annotations

# pyright: reportUnknownMemberType=false
import json
import shutil
import subprocess
import sys
from pathlib import Path
from typing import Any

import pytest
from about_harness.integrations.base import IntegrationContractError
from about_harness.integrations.browser_use import extract_local_catalog
from about_harness.integrations.pydantic_ai import normalize_rows
from about_harness.labs import LAB_NAMES, FixtureError, execute_fixture, load_fixture
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


def test_data_schema_drift_negative_case_is_rejected() -> None:
    with pytest.raises(IntegrationContractError, match="schema drift"):
        normalize_rows({"rows": [{"userId": "u-3", "score": 9}]})


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


def test_public_summary_matches_current_fixture_results() -> None:
    summary_path = ROOT / "results" / "public" / "m5-offline-summary.json"
    summary = json.loads(summary_path.read_text(encoding="utf-8"))
    recorded = {case["case_id"]: case for case in summary["cases"]}
    for name in LAB_NAMES:
        result = execute_fixture(load_fixture(FIXTURES, name))
        assert recorded[name]["fixture_hash"] == result["fixture_hash"]
        assert recorded[name]["passed"] is result["passed"] is True
        assert recorded[name]["negative_rejected"] is result["negative_rejected"] is True
