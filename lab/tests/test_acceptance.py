from __future__ import annotations

import json
import math
from collections.abc import Callable
from pathlib import Path
from typing import cast

import pytest
from about_harness.acceptance import AcceptanceResult, JsonSubsetAcceptanceValidator
from about_harness.contracts import Budgets, ContractError, JsonValue, TaskSpec

SHARED_FIXTURE = Path(__file__).parents[1] / "fixtures" / "contracts" / "acceptance-v1.json"


def task(criteria: dict[str, JsonValue]) -> TaskSpec:
    return TaskSpec(
        "acceptance-test",
        "validate a completion proposal",
        (),
        Budgets(),
        acceptance=criteria,
    )


def _load_shared_cases() -> list[dict[str, JsonValue]]:
    raw = cast(object, json.loads(SHARED_FIXTURE.read_text(encoding="utf-8")))
    if not isinstance(raw, dict):
        raise ValueError("shared acceptance fixture must be an object")
    document = cast(dict[str, object], raw)
    if (
        document.get("schema_version") != "1.0"
        or document.get("validator") != "json-subset-v1"
        or document.get("evidence") != "E1"
    ):
        raise ValueError("shared acceptance fixture metadata is invalid")
    raw_cases = document.get("cases")
    if not isinstance(raw_cases, list) or not raw_cases:
        raise ValueError("shared acceptance fixture must contain cases")
    cases: list[dict[str, JsonValue]] = []
    seen_ids: set[str] = set()
    for raw_case in cast(list[object], raw_cases):
        if not isinstance(raw_case, dict):
            raise ValueError("shared acceptance case must be an object")
        case = cast(dict[str, JsonValue], raw_case)
        case_id = case.get("case_id")
        criteria = case.get("criteria")
        expected = case.get("expected")
        if (
            not isinstance(case_id, str)
            or not case_id
            or case_id in seen_ids
            or not isinstance(criteria, dict)
            or "output" not in case
            or not isinstance(expected, dict)
        ):
            raise ValueError("shared acceptance case shape or identity is invalid")
        seen_ids.add(case_id)
        cases.append(case)
    return cases


SHARED_CASES = _load_shared_cases()
SHARED_CASE_IDS = [cast(str, case["case_id"]) for case in SHARED_CASES]


@pytest.mark.parametrize("case", SHARED_CASES, ids=SHARED_CASE_IDS)
def test_shared_json_subset_case(case: dict[str, JsonValue]) -> None:
    criteria = case["criteria"]
    expected = case["expected"]
    assert isinstance(criteria, dict)
    assert isinstance(expected, dict)
    result = JsonSubsetAcceptanceValidator().validate(task(criteria), case["output"])
    actual: dict[str, JsonValue] = {
        "accepted": result.accepted,
        "feedback": result.feedback,
        "evidence": result.evidence,
    }
    assert actual == expected


def test_json_subset_rejects_non_finite_numbers() -> None:
    result = JsonSubsetAcceptanceValidator().validate(
        task({"score": math.inf}), {"score": math.inf}
    )
    assert not result.accepted
    assert result.evidence["failed_paths"] == ["/score"]


@pytest.mark.parametrize(
    "result",
    [
        lambda: AcceptanceResult(cast(bool, "yes"), "feedback"),
        lambda: AcceptanceResult(True, ""),
        lambda: AcceptanceResult(True, "feedback", cast(dict[str, JsonValue], [])),
        lambda: AcceptanceResult(True, "feedback", {"score": math.inf}),
    ],
)
def test_acceptance_result_rejects_invalid_runtime_values(
    result: Callable[[], AcceptanceResult],
) -> None:
    with pytest.raises(ContractError):
        result()


def test_cyclic_non_json_acceptance_fails_closed() -> None:
    criteria: dict[str, JsonValue] = {}
    output: dict[str, JsonValue] = {}
    criteria["self"] = cast(JsonValue, criteria)
    output["self"] = cast(JsonValue, output)
    result = JsonSubsetAcceptanceValidator().validate(task(criteria), output)
    assert not result.accepted
    assert result.evidence["failed_paths"] == ["/self"]
