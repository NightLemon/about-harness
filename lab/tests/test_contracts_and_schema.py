from __future__ import annotations

# pyright: reportUnknownMemberType=false
import json
from pathlib import Path
from typing import Any

import pytest
from about_harness.contracts import Budgets, ContractError, TaskSpec
from jsonschema import Draft202012Validator

ROOT = Path(__file__).parents[1]
SCHEMAS = ROOT / "schemas"


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


def test_task_dataclass_and_json_schema_accept_same_positive_fixture() -> None:
    data = valid_task()
    task = TaskSpec.from_dict(data)
    assert task.task_id == "schema-smoke"
    schema = json.loads((SCHEMAS / "task.json").read_text(encoding="utf-8"))
    Draft202012Validator(schema).validate(data)


@pytest.mark.parametrize(
    ("field", "value"),
    [("goal", ""), ("allowed_tools", ["echo", "echo"]), ("budgets", {"max_steps": 0})],
)
def test_invalid_tasks_are_rejected(field: str, value: object) -> None:
    data = valid_task()
    data[field] = value
    with pytest.raises((ContractError, ValueError)):
        TaskSpec.from_dict(data)


def test_all_schemas_are_valid_draft_2020_12() -> None:
    for name in ("task", "run", "trace", "result", "config", "eval-run", "study"):
        schema = json.loads((SCHEMAS / f"{name}.json").read_text(encoding="utf-8"))
        Draft202012Validator.check_schema(schema)


def test_budget_rejects_negative_cost() -> None:
    with pytest.raises(ContractError):
        Budgets(max_cost_usd=-0.01)
