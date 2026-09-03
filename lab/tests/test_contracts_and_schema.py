from __future__ import annotations

# pyright: reportUnknownMemberType=false
import json
import math
from pathlib import Path
from typing import Any, cast

import pytest
from about_harness.adapters.fake import FakeAdapter
from about_harness.contracts import (
    Action,
    Budgets,
    ContractError,
    RunCheckpoint,
    RunResult,
    TaskSpec,
    ToolCall,
)
from about_harness.loop import HarnessRunner
from about_harness.tools import ToolRegistry
from jsonschema import Draft202012Validator
from jsonschema.exceptions import ValidationError

ROOT = Path(__file__).parents[1]
SCHEMAS = ROOT / "schemas"
CONTRACT_FIXTURE = ROOT / "fixtures" / "contracts" / "runtime-contract-v1.json"
RESULT_FIXTURE = ROOT / "fixtures" / "contracts" / "run-result-v1.json"


def _load_contract_cases(section: str) -> list[dict[str, Any]]:
    document: dict[str, Any] = json.loads(CONTRACT_FIXTURE.read_text(encoding="utf-8"))
    if document.get("schema_version") != "1.0" or document.get("evidence") != "E1":
        raise ValueError("shared runtime contract fixture metadata is invalid")
    raw_cases = document.get(section)
    if not isinstance(raw_cases, list) or not raw_cases:
        raise ValueError(f"shared runtime contract fixture has no {section}")
    cases: list[dict[str, Any]] = []
    seen_ids: set[str] = set()
    for raw_case_value in cast(list[object], raw_cases):
        if not isinstance(raw_case_value, dict):
            raise ValueError(f"{section} entries must be objects")
        raw_case = cast(dict[str, Any], raw_case_value)
        case_id = raw_case.get("case_id")
        valid = raw_case.get("valid")
        value = raw_case.get("value")
        if (
            not isinstance(case_id, str)
            or not case_id
            or case_id in seen_ids
            or not isinstance(valid, bool)
            or not isinstance(value, dict)
        ):
            raise ValueError(f"{section} contains an invalid case")
        seen_ids.add(case_id)
        cases.append(raw_case)
    return cases


SHARED_TASK_CASES = _load_contract_cases("task_cases")
SHARED_ACTION_CASES = _load_contract_cases("action_cases")


def _load_result_cases() -> list[dict[str, Any]]:
    document: dict[str, Any] = json.loads(RESULT_FIXTURE.read_text(encoding="utf-8"))
    if (
        document.get("schema_version") != "1.0"
        or document.get("result_schema_version") != "1.1"
        or document.get("evidence") != "E1"
    ):
        raise ValueError("shared result fixture metadata is invalid")
    raw_cases = document.get("result_cases")
    if not isinstance(raw_cases, list) or not raw_cases:
        raise ValueError("shared result fixture has no cases")
    cases: list[dict[str, Any]] = []
    seen_ids: set[str] = set()
    for raw_case_value in cast(list[object], raw_cases):
        if not isinstance(raw_case_value, dict):
            raise ValueError("shared result entries must be objects")
        raw_case = cast(dict[str, Any], raw_case_value)
        case_id = raw_case.get("case_id")
        if (
            not isinstance(case_id, str)
            or not case_id
            or case_id in seen_ids
            or not isinstance(raw_case.get("schema_valid"), bool)
            or not isinstance(raw_case.get("runtime_valid"), bool)
            or not isinstance(raw_case.get("value"), dict)
        ):
            raise ValueError("shared result fixture contains an invalid case")
        seen_ids.add(case_id)
        cases.append(raw_case)
    return cases


SHARED_RESULT_CASES = _load_result_cases()


def valid_task() -> dict[str, Any]:
    return {
        "schema_version": "1.0",
        "task_id": "schema-smoke",
        "goal": "validate the deterministic task contract",
        "input": {"value": 1},
        "allowed_tools": ["echo"],
        "budgets": {
            "max_steps": 3,
            "max_model_calls": 3,
            "timeout_ms": 1000,
            "max_cost_usd": 0,
        },
        "acceptance": {"equals": 1},
        "metadata": {"evidence": "E1"},
    }


@pytest.mark.parametrize(
    "case",
    SHARED_TASK_CASES,
    ids=[case["case_id"] for case in SHARED_TASK_CASES],
)
def test_shared_task_wire_contract(case: dict[str, Any]) -> None:
    data = cast(dict[str, Any], case["value"])
    expected_valid = cast(object, case["valid"])
    assert isinstance(expected_valid, bool)
    try:
        TaskSpec.from_dict(data)
        python_valid = True
    except ContractError:
        python_valid = False
    schema = json.loads((SCHEMAS / "task.json").read_text(encoding="utf-8"))
    schema_valid = Draft202012Validator(schema).is_valid(data)
    assert (python_valid, schema_valid) == (expected_valid, expected_valid)


@pytest.mark.parametrize(
    "case",
    SHARED_ACTION_CASES,
    ids=[case["case_id"] for case in SHARED_ACTION_CASES],
)
def test_shared_action_wire_contract(case: dict[str, Any]) -> None:
    data = cast(dict[str, Any], case["value"])
    expected_valid = cast(object, case["valid"])
    assert isinstance(expected_valid, bool)
    try:
        Action.from_dict(data)
        python_valid = True
    except ContractError:
        python_valid = False
    schema = json.loads((SCHEMAS / "action.json").read_text(encoding="utf-8"))
    schema_valid = Draft202012Validator(schema).is_valid(data)
    assert (python_valid, schema_valid) == (expected_valid, expected_valid)


@pytest.mark.parametrize(
    "case",
    SHARED_RESULT_CASES,
    ids=[case["case_id"] for case in SHARED_RESULT_CASES],
)
def test_shared_result_wire_contract(case: dict[str, Any]) -> None:
    data = cast(dict[str, Any], case["value"])
    expected_schema = cast(object, case["schema_valid"])
    expected_runtime = cast(object, case["runtime_valid"])
    assert isinstance(expected_schema, bool)
    assert isinstance(expected_runtime, bool)
    try:
        RunResult.from_dict(data)
        python_valid = True
    except ContractError:
        python_valid = False
    schema = json.loads((SCHEMAS / "result.json").read_text(encoding="utf-8"))
    schema_valid = Draft202012Validator(schema).is_valid(data)
    assert (python_valid, schema_valid) == (expected_runtime, expected_schema)


def test_task_dataclass_and_json_schema_accept_same_positive_fixture() -> None:
    data = valid_task()
    task = TaskSpec.from_dict(data)
    assert task.task_id == "schema-smoke"
    schema = json.loads((SCHEMAS / "task.json").read_text(encoding="utf-8"))
    Draft202012Validator(schema).validate(data)


@pytest.mark.parametrize(
    ("field", "value"),
    [
        ("task_id", "bad task id"),
        ("goal", ""),
        ("goal", "x" * 4001),
        ("allowed_tools", ["echo", "echo"]),
        ("allowed_tools", [""]),
        ("budgets", {"max_steps": 0}),
        (
            "budgets",
            {"max_steps": 10001, "max_model_calls": 3, "timeout_ms": 1000},
        ),
    ],
)
def test_invalid_tasks_are_rejected(field: str, value: object) -> None:
    data = valid_task()
    data[field] = value
    with pytest.raises((ContractError, ValueError)):
        TaskSpec.from_dict(data)


def test_task_rejects_unknown_top_level_and_budget_fields() -> None:
    data = valid_task()
    data["unexpected"] = True
    with pytest.raises(ContractError):
        TaskSpec.from_dict(data)

    data = valid_task()
    data["budgets"]["unexpected"] = 1
    with pytest.raises(ContractError):
        TaskSpec.from_dict(data)


def test_all_schemas_are_valid_draft_2020_12() -> None:
    for name in (
        "task",
        "action",
        "run",
        "trace",
        "trace-v1.0",
        "result",
        "result-v1.0",
        "config",
        "eval-run",
        "study",
        "fixture-lineage",
    ):
        schema = json.loads((SCHEMAS / f"{name}.json").read_text(encoding="utf-8"))
        Draft202012Validator.check_schema(schema)


def test_runtime_completion_result_and_trace_match_public_schemas() -> None:
    task = TaskSpec(
        "schema-result",
        "validate serialized completion evidence",
        (),
        Budgets(),
        acceptance={"ok": True},
    )
    result = HarnessRunner(
        FakeAdapter((Action.complete({"ok": True}),)),
        ToolRegistry(),
    ).run(task, run_id="run-schema-result")
    serialized = result.to_dict()
    trace = {
        "schema_version": "1.1",
        "run_id": result.run_id,
        "events": serialized["trace"],
    }
    result_schema = json.loads((SCHEMAS / "result.json").read_text(encoding="utf-8"))
    old_result_schema = json.loads(
        (SCHEMAS / "result-v1.0.json").read_text(encoding="utf-8")
    )
    trace_schema = json.loads((SCHEMAS / "trace.json").read_text(encoding="utf-8"))
    old_trace_schema = json.loads(
        (SCHEMAS / "trace-v1.0.json").read_text(encoding="utf-8")
    )
    Draft202012Validator(result_schema).validate(serialized)
    assert RunResult.from_dict(serialized).to_dict() == serialized
    legacy_result = dict(serialized)
    legacy_result["schema_version"] = "1.0"
    Draft202012Validator(old_result_schema).validate(legacy_result)
    with pytest.raises(ValidationError):
        Draft202012Validator(result_schema).validate(legacy_result)
    with pytest.raises(ValidationError):
        Draft202012Validator(old_result_schema).validate(serialized)
    Draft202012Validator(trace_schema).validate(trace)
    assert any(event.kind == "acceptance_result" for event in result.trace)
    with pytest.raises(ValidationError):
        Draft202012Validator(old_trace_schema).validate(trace)


def test_schema_inventory_contains_only_runtime_and_evaluation_contracts() -> None:
    expected = {
        "task.json",
        "action.json",
        "run.json",
        "trace.json",
        "trace-v1.0.json",
        "result.json",
        "result-v1.0.json",
        "config.json",
        "eval-run.json",
        "study.json",
        "fixture-lineage.json",
    }
    assert {item.name for item in SCHEMAS.glob("*.json")} == expected


def test_budget_rejects_negative_cost() -> None:
    with pytest.raises(ContractError):
        Budgets(max_cost_usd=-0.01)


@pytest.mark.parametrize("value", [-1.0, math.inf, -math.inf, math.nan])
def test_budget_and_action_reject_unsafe_costs(value: float) -> None:
    with pytest.raises(ContractError):
        Budgets(max_cost_usd=value)
    with pytest.raises(ContractError):
        Action.complete("unsafe", cost_usd=value)


def test_wire_parsers_reject_non_json_runtime_values() -> None:
    task_data = valid_task()
    task_data["input"] = {"value": math.nan}
    with pytest.raises(ContractError):
        TaskSpec.from_dict(task_data)

    with pytest.raises(ContractError):
        Action.from_dict(
            {"kind": "complete", "output": {"value": math.inf}, "cost_usd": 0}
        )

    cyclic: dict[str, Any] = {}
    cyclic["self"] = cyclic
    with pytest.raises(ContractError):
        Action.from_dict({"kind": "complete", "output": cyclic, "cost_usd": 0})

    result_data = json.loads(json.dumps(SHARED_RESULT_CASES[0]["value"]))
    result_data["metrics"]["cost_usd"] = math.inf
    with pytest.raises(ContractError):
        RunResult.from_dict(result_data)

    result_data = json.loads(json.dumps(SHARED_RESULT_CASES[0]["value"]))
    result_data["output"] = cyclic
    with pytest.raises(ContractError):
        RunResult.from_dict(result_data)


def test_internal_tool_action_rejects_completion_output() -> None:
    with pytest.raises(ContractError):
        Action(
            kind="tool",
            tool_call=ToolCall("call-1", "echo", {}, "echo-1"),
            output="unexpected",
        )


def test_checkpoint_rejects_inconsistent_or_negative_counters() -> None:
    with pytest.raises(ContractError):
        RunCheckpoint(-1, 0, 0, 0, 0.0, {})
    with pytest.raises(ContractError):
        RunCheckpoint(2, 2, 1, 0, 0.0, {})
