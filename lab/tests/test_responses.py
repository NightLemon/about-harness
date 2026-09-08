from __future__ import annotations

import json
from copy import deepcopy
from pathlib import Path
from typing import Any, Protocol, cast

import pytest
from about_harness.adapters.base import ToolObservation
from about_harness.adapters.responses import (
    HttpResponsesTransport,
    ReplayResponsesTransport,
    ResponsesAdapter,
    ResponsesError,
)
from about_harness.contracts import Budgets, ContractError, TaskSpec
from about_harness.loop import HarnessRunner
from about_harness.tools import ToolRegistry
from about_harness.usage import UsageObservation
from jsonschema import Draft202012Validator, ValidationError


class SchemaValidator(Protocol):
    def validate(self, value: object) -> None: ...


ROOT = Path(__file__).resolve().parents[1]


def fixture() -> list[dict[str, Any]]:
    return json.loads((ROOT / "fixtures/protocols/responses-v1.json").read_text())


def task():
    return TaskSpec(
        "responses-test",
        "sum two values",
        ("sum",),
        Budgets(max_steps=3),
        acceptance={"answer": 75},
    )


def adapter(responses: list[dict[str, Any]] | None = None) -> ResponsesAdapter:
    return ResponsesAdapter(
        ReplayResponsesTransport(responses or fixture()),
        "offline-model",
        [{"name": "sum", "type": "function"}],
    )


def test_responses_tool_round_trip_is_explicit_and_continuous():
    model = adapter()
    result = HarnessRunner(model, ToolRegistry.with_safe_defaults()).run(task())
    assert result.status.value == "completed"
    assert cast(dict[str, Any], model.observations[0]["usage"])["cost_status"] == "known"
    request = cast(ReplayResponsesTransport, model.transport).requests[1]
    assert request["previous_response_id"] == "response-1"
    assert request["input"] == [
        {"type": "function_call_output", "call_id": "sum-1", "output": "75.0"}
    ]
    assert request["parallel_tool_calls"] is False and request["stream"] is False


@pytest.mark.parametrize(
    "change", ["incomplete", "wrong_model", "parallel", "arguments", "missing_id", "refusal"]
)
def test_responses_rejects_bad_protocol_before_tool_execution(change: str):
    responses = fixture()
    first = responses[0]
    if change == "incomplete":
        first["status"] = "incomplete"
    if change == "wrong_model":
        first["model"] = "other"
    if change == "parallel":
        first["output"] *= 2
    if change == "arguments":
        first["output"][0]["arguments"] = "[]"
    if change == "missing_id":
        first["output"][0]["call_id"] = ""
    if change == "refusal":
        first["output"] = [{"type": "message", "content": [{"type": "refusal"}]}]
    result = HarnessRunner(adapter(responses), ToolRegistry.with_safe_defaults()).run(task())
    assert result.status.value == "failed"
    assert result.metrics["tool_calls"] == 0


def test_result_correlation_and_restore_fail_closed():
    model = adapter()
    model.next_action(task(), ())
    with pytest.raises(ResponsesError, match="identity_mismatch"):
        model.receive_tool_result(ToolObservation("wrong", "sum", 75))
    with pytest.raises(ResponsesError, match="tool_result_missing"):
        model.next_action(task(), ())
    with pytest.raises(ResponsesError, match="restore_unsupported"):
        model.restore(model.snapshot())


def test_http_default_never_reads_key_or_uses_network():
    touched: list[bool] = []
    transport = HttpResponsesTransport(lambda: touched.append(True) or "unused")
    with pytest.raises(ResponsesError, match="authorization_required"):
        transport.create({}, 1)
    assert not touched


def test_unknown_usage_and_late_response_are_retained():
    responses = fixture()
    del responses[0]["usage"]
    model = adapter(responses)
    model.next_action(task(), ())
    assert cast(dict[str, Any], model.observations[0]["usage"])["input_tokens"] is None
    assert cast(dict[str, Any], model.observations[0]["usage"])["token_status"] == "unknown"
    ticks = iter([0.0, 0.0, 20.0])
    model = adapter()
    model.clock = lambda: next(ticks)
    with pytest.raises(ResponsesError, match="timeout"):
        model.next_action(task(), ())
    assert len(model.observations) == 1


def test_model_budget_stops_extra_transport_request():
    model = adapter()
    limited = TaskSpec("limited", "sum", ("sum",), Budgets(max_model_calls=1))
    result = HarnessRunner(model, ToolRegistry.with_safe_defaults()).run(limited)
    assert result.stop_reason.value == "model_budget"
    assert len(cast(ReplayResponsesTransport, model.transport).requests) == 1


def test_usage_shared_contract():
    cases = json.loads((ROOT / "fixtures/contracts/usage-v1.json").read_text())
    schema = json.loads((ROOT / "schemas/usage-v1.json").read_text())
    for case in cases:
        if case["valid"]:
            cast(SchemaValidator, Draft202012Validator(schema)).validate(case["value"])
            assert UsageObservation.from_dict(case["value"]).to_dict() == case["value"]
        else:
            with pytest.raises(ValidationError):
                cast(SchemaValidator, Draft202012Validator(schema)).validate(case["value"])
            with pytest.raises((ContractError, TypeError, ValueError)):
                UsageObservation.from_dict(deepcopy(case["value"]))
