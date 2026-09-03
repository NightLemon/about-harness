from __future__ import annotations

import math
from collections.abc import Callable
from typing import cast

import pytest
from about_harness.acceptance import AcceptanceResult, JsonSubsetAcceptanceValidator
from about_harness.contracts import Budgets, ContractError, JsonValue, TaskSpec


def task(criteria: dict[str, JsonValue]) -> TaskSpec:
    return TaskSpec(
        "acceptance-test",
        "validate a completion proposal",
        (),
        Budgets(),
        acceptance=criteria,
    )


def test_json_subset_accepts_nested_values_and_extra_output_fields() -> None:
    result = JsonSubsetAcceptanceValidator().validate(
        task({"passed": True, "details": {"rows": [1, 2]}}),
        {"passed": True, "details": {"rows": [1, 2], "note": "kept"}, "extra": 3},
    )
    assert result.accepted
    assert result.evidence["failed_paths"] == []


@pytest.mark.parametrize(
    ("criteria", "output", "failed_path"),
    [
        ({"passed": True}, {"passed": 1}, "/passed"),
        ({"score": math.inf}, {"score": math.inf}, "/score"),
        ({"rows": [1, 2]}, {"rows": [1]}, "/rows"),
        ({"details": {"count": 2}}, {"details": {}}, "/details/count"),
    ],
)
def test_json_subset_rejects_type_value_and_shape_mismatches(
    criteria: dict[str, JsonValue],
    output: JsonValue,
    failed_path: str,
) -> None:
    result = JsonSubsetAcceptanceValidator().validate(task(criteria), output)
    assert not result.accepted
    assert result.evidence["failed_paths"] == [failed_path]


def test_failed_paths_use_json_pointer_escaping() -> None:
    result = JsonSubsetAcceptanceValidator().validate(
        task({"a/b~c": "expected"}),
        {},
    )
    assert result.evidence["failed_paths"] == ["/a~1b~0c"]


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
