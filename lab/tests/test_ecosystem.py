from __future__ import annotations

import copy
import json
from collections.abc import Mapping
from pathlib import Path
from typing import cast

import pytest
from about_harness.ecosystem import (
    ExerciseError,
    orchestration_comparison,
    protocol_decision,
    selection_metrics,
)

FIXTURE = Path(__file__).parents[1] / "fixtures/ecosystem.json"


def _mapping(value: object) -> Mapping[str, object]:
    assert isinstance(value, Mapping)
    return cast(Mapping[str, object], value)


def _objects(value: object) -> list[object]:
    assert isinstance(value, list)
    return cast(list[object], value)


def test_capabilities_do_not_grant_authority() -> None:
    data = json.loads(FIXTURE.read_text())["protocols"]
    assert protocol_decision(data)["planned_handler_calls"] == 1
    data["requested_action"] = "write"
    result = protocol_decision(data)
    assert result["failure_classification"] == "permission_denied"
    assert result["planned_handler_calls"] == 0
    assert result["ignored_skill_grants"] == ["write"]
    data["requested_action"] = "read"
    data["required_capability"] = "tasks"
    assert protocol_decision(data)["failure_classification"] == "unsupported_capability"


def test_scripted_aggregation_preserves_the_business_result() -> None:
    data = json.loads(FIXTURE.read_text())["orchestration"]
    result = orchestration_comparison(data)
    direct = _mapping(result["direct"])
    programmatic = _mapping(result["programmatic"])
    assert direct["total_units"] == programmatic["total_units"] == 10
    assert programmatic["ids"] == ["north", "south", "west"]
    assert result["tool_calls"] == 3
    direct_payload_bytes = result["direct_payload_bytes"]
    programmatic_payload_bytes = result["programmatic_payload_bytes"]
    assert isinstance(direct_payload_bytes, int)
    assert isinstance(programmatic_payload_bytes, int)
    assert programmatic_payload_bytes < direct_payload_bytes
    data["call_budget"] = 2
    rejected = orchestration_comparison(data)
    assert rejected["failure_classification"] == "budget_exhausted"
    assert rejected["tool_calls"] == 2
    assert "programmatic" not in rejected  # partial inventory is not a valid final total


@pytest.mark.parametrize("units", [True, -1, "5", None])
def test_bad_tool_observations_cannot_be_summed(units: object) -> None:
    data = json.loads(FIXTURE.read_text())["orchestration"]
    data["responses"][0]["units"] = units
    with pytest.raises(ExerciseError, match="observation"):
        orchestration_comparison(data)


def test_oracle_success_does_not_imply_selector_success() -> None:
    data = json.loads(FIXTURE.read_text())["selection"]
    original = copy.deepcopy(data)
    result = selection_metrics(data)
    assert result["oracle_any_pass"] is True
    assert result["selected_id"] == "b" and result["selected_pass"] is False
    assert result["task_count"] == 1 and result["candidate_count"] == 4
    assert result["curves"] == [
        {"threshold": 0.25, "accepted": 1, "coverage": 0.25, "error_rate_among_accepted": 0.0},
        {"threshold": 0.75, "accepted": 3, "coverage": 0.75,
         "error_rate_among_accepted": 1 / 3},
    ]
    assert data == original


def test_threshold_equality_abstains_and_empty_risk_is_unknown() -> None:
    data = {"candidates": [{"id": "x", "score": 0.2, "uncertainty": 0.5,
                           "oracle_pass": False}], "thresholds": [0.0, 0.5, 1.0]}
    result = selection_metrics(data)
    curves = [_mapping(row) for row in _objects(result["curves"])]
    assert [row["coverage"] for row in curves] == [0.0, 0.0, 1.0]
    assert curves[0]["error_rate_among_accepted"] is None


@pytest.mark.parametrize("uncertainty", [True, -0.1, 1.2, float("nan"), float("inf")])
def test_invalid_uncertainty_is_rejected(uncertainty: object) -> None:
    data = json.loads(FIXTURE.read_text())["selection"]
    data["candidates"][0]["uncertainty"] = uncertainty
    with pytest.raises(ExerciseError, match="uncertainty"):
        selection_metrics(data)
