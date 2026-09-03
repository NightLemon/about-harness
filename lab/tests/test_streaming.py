from __future__ import annotations

# pyright: reportUnknownMemberType=false
import json
from pathlib import Path
from typing import Any, cast

import pytest
from about_harness.streaming import (
    AssembledResponse,
    StreamAssembler,
    StreamErrorCode,
    StreamProtocolError,
)

FIXTURE = (
    Path(__file__).parents[1] / "fixtures" / "protocols" / "stream-events-v1.json"
)


def _load_cases() -> list[dict[str, Any]]:
    document: dict[str, Any] = json.loads(FIXTURE.read_text(encoding="utf-8"))
    if document.get("schema_version") != "1.0" or document.get("evidence") != "E1":
        raise ValueError("stream fixture metadata is invalid")
    raw_cases = document.get("cases")
    if not isinstance(raw_cases, list) or not raw_cases:
        raise ValueError("stream fixture has no cases")
    cases: list[dict[str, Any]] = []
    seen_ids: set[str] = set()
    for raw_case_value in cast(list[object], raw_cases):
        if not isinstance(raw_case_value, dict):
            raise ValueError("stream cases must be objects")
        case = cast(dict[str, Any], raw_case_value)
        case_id = case.get("case_id")
        valid = case.get("valid")
        events = case.get("events")
        if (
            not isinstance(case_id, str)
            or not case_id
            or case_id in seen_ids
            or not isinstance(valid, bool)
            or not isinstance(events, list)
            or not events
        ):
            raise ValueError("stream fixture contains an invalid case")
        if valid and not isinstance(case.get("expected"), dict):
            raise ValueError(f"valid stream case {case_id} has no expected result")
        if not valid and not isinstance(case.get("expected_error"), str):
            raise ValueError(f"invalid stream case {case_id} has no error code")
        seen_ids.add(case_id)
        cases.append(case)
    return cases


STREAM_CASES = _load_cases()


@pytest.mark.parametrize(
    "case",
    STREAM_CASES,
    ids=[case["case_id"] for case in STREAM_CASES],
)
def test_provider_neutral_stream_contract(case: dict[str, Any]) -> None:
    assembler = StreamAssembler()
    result: AssembledResponse | None = None
    failure: StreamProtocolError | None = None
    try:
        for raw_event in cast(list[object], case["events"]):
            if not isinstance(raw_event, dict):
                raise AssertionError("fixture event must be an object")
            assembler.accept(cast(dict[str, Any], raw_event))
        result = assembler.finish()
    except StreamProtocolError as exc:
        failure = exc

    if case["valid"] is True:
        assert failure is None
        assert result is not None
        assert result.to_dict() == case["expected"]
        return

    assert result is None
    assert failure is not None
    assert failure.code is StreamErrorCode(case["expected_error"])
