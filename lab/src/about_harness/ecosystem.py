"""Small offline exercises, not implementations of MCP, A2A or a model API."""

from __future__ import annotations

import json
import math
from collections.abc import Mapping
from typing import TypeAlias, TypedDict, cast


class ExerciseError(ValueError):
    def __init__(self, classification: str, message: str) -> None:
        super().__init__(message)
        self.classification = classification


UnitValue: TypeAlias = int | float


class Observation(TypedDict):
    id: str
    units: int
    description: str


class Candidate(TypedDict):
    id: str
    score: UnitValue
    uncertainty: UnitValue
    oracle_pass: bool


def _objects(value: object, field: str) -> list[object]:
    if not isinstance(value, list):
        raise ExerciseError("invalid_input", f"{field} must be a list")
    return cast(list[object], value)


def _strings(value: object, field: str) -> set[str]:
    strings: set[str] = set()
    for item in _objects(value, field):
        if not isinstance(item, str):
            raise ExerciseError("invalid_input", f"{field} must be a string list")
        strings.add(item)
    return strings


def _mapping(
    value: object, message: str, classification: str = "invalid_input"
) -> Mapping[str, object]:
    if not isinstance(value, Mapping):
        raise ExerciseError(classification, message)
    raw_mapping = cast(Mapping[object, object], value)
    parsed: dict[str, object] = {}
    for key, item in raw_mapping.items():
        if not isinstance(key, str):
            raise ExerciseError(classification, message)
        parsed[key] = item
    return parsed


def _unit_interval(value: object, field: str) -> UnitValue:
    if (
        isinstance(value, bool)
        or not isinstance(value, (int, float))
        or not math.isfinite(value)
        or not 0 <= value <= 1
    ):
        raise ExerciseError("invalid_input", f"{field} must be finite and in [0,1]")
    return value


def _observation(value: object, seen: set[str]) -> Observation:
    response = _mapping(
        value, "invalid or duplicate inventory observation", classification="tool_contract"
    )
    identifier = response.get("id")
    units = response.get("units")
    description = response.get("description")
    if (
        not isinstance(identifier, str)
        or identifier in seen
        or isinstance(units, bool)
        or not isinstance(units, int)
        or units < 0
        or not isinstance(description, str)
    ):
        raise ExerciseError("tool_contract", "invalid or duplicate inventory observation")
    seen.add(identifier)
    return {"id": identifier, "units": units, "description": description}


def _candidate(value: object, seen: set[str]) -> Candidate:
    record = _mapping(value, "candidate identity and boolean oracle required")
    identifier = record.get("id")
    oracle_pass = record.get("oracle_pass")
    if not isinstance(identifier, str) or identifier in seen or not isinstance(oracle_pass, bool):
        raise ExerciseError("invalid_input", "candidate identity and boolean oracle required")
    seen.add(identifier)
    return {
        "id": identifier,
        "score": _unit_interval(record.get("score"), "score"),
        "uncertainty": _unit_interval(record.get("uncertainty"), "uncertainty"),
        "oracle_pass": oracle_pass,
    }


def _encoded_size(value: object) -> int:
    return len(json.dumps(value, sort_keys=True).encode("utf-8"))


def protocol_decision(data: Mapping[str, object]) -> dict[str, object]:
    """Capability availability and host authority are separate predicates."""
    client = _strings(data.get("client_capabilities"), "client_capabilities")
    server = _strings(data.get("server_capabilities"), "server_capabilities")
    authorized = _strings(data.get("authorized_actions"), "authorized_actions")
    # Reading a skill's suggestions never mutates the host's authority set.
    suggested = _strings(data.get("skill_suggested_actions"), "skill_suggested_actions")
    capability = data.get("required_capability")
    action = data.get("requested_action")
    if not isinstance(capability, str) or not isinstance(action, str):
        raise ExerciseError("invalid_input", "capability and action must be strings")
    supported = capability in client & server
    allowed = action in authorized
    classification = "none" if supported and allowed else (
        "unsupported_capability" if not supported else "permission_denied"
    )
    return {
        "passed": supported and allowed,
        "failure_classification": classification,
        "capability_available": supported,
        "action_authorized": allowed,
        "ignored_skill_grants": sorted(suggested - authorized),
        "planned_handler_calls": int(supported and allowed),
        "side_effects": 0,
        "trace": [
            {"event": "capabilities_intersected", "available": sorted(client & server)},
            {"event": "host_policy_checked", "action": action, "allowed": allowed},
            {"event": "read_handler_planned" if supported and allowed else "action_rejected"},
        ],
    }


def orchestration_comparison(data: Mapping[str, object]) -> dict[str, object]:
    """Compare retained output size, never model latency or token quality."""
    responses = _objects(data.get("responses"), "responses")
    budget = data.get("call_budget")
    if isinstance(budget, bool) or not isinstance(budget, int) or budget < 0:
        raise ExerciseError("invalid_input", "responses/list and nonnegative call budget required")
    observations: list[Observation] = []
    seen: set[str] = set()
    trace: list[dict[str, object]] = []
    for response in responses:
        if len(observations) >= budget:
            return {
                "passed": False,
                "failure_classification": "budget_exhausted",
                "tool_calls": len(observations),
                "side_effects": 0,
                "trace": trace,
            }
        trace.append({"event": "fake_tool_requested", "attempt": len(observations) + 1})
        observation = _observation(response, seen)
        observations.append(observation)
        trace.append({"event": "fake_tool_validated", "id": observation["id"]})
    # The direct consumer receives every validated observation. The scripted
    # consumer derives the same business result before returning to a model.
    total = sum(row["units"] for row in observations)
    direct: dict[str, object] = {"observations": observations, "total_units": total}
    compact: dict[str, object] = {
        "ids": [row["id"] for row in observations],
        "total_units": total,
    }
    return {
        "passed": True,
        "failure_classification": "none",
        "tool_calls": len(observations),
        "side_effects": 0,
        "direct": direct,
        "programmatic": compact,
        "direct_payload_bytes": _encoded_size(direct),
        "programmatic_payload_bytes": _encoded_size(compact),
        "trace": [*trace, {"event": "aggregate_validated", "total_units": total}],
    }


def selection_metrics(data: Mapping[str, object]) -> dict[str, object]:
    candidates_raw = _objects(data.get("candidates"), "candidates")
    thresholds_raw = _objects(data.get("thresholds"), "thresholds")
    if not candidates_raw:
        raise ExerciseError("invalid_input", "nonempty candidates and thresholds required")
    seen: set[str] = set()
    candidates = [_candidate(value, seen) for value in candidates_raw]
    thresholds = [_unit_interval(value, "threshold") for value in thresholds_raw]
    # Selection cannot inspect oracle labels. Oracle is used only to evaluate.
    selected = max(candidates, key=lambda row: row["score"])
    curves: list[dict[str, object]] = []
    for threshold in thresholds:
        accepted = [row for row in candidates if row["uncertainty"] < threshold]
        errors = sum(not row["oracle_pass"] for row in accepted)
        curves.append(
            {
                "threshold": threshold,
                "accepted": len(accepted),
                "coverage": len(accepted) / len(candidates),
                "error_rate_among_accepted": errors / len(accepted) if accepted else None,
            }
        )
    return {
        "passed": True,
        "failure_classification": "none",
        "task_count": 1,
        "candidate_count": len(candidates),
        "oracle_any_pass": any(row["oracle_pass"] for row in candidates),
        "selected_id": selected["id"],
        "selected_pass": selected["oracle_pass"],
        "abstain_rule": "uncertainty >= threshold",
        "curves": curves,
        "trace": [
            {"event": "candidates_frozen", "count": len(candidates)},
            {"event": "selector_applied_without_oracle", "selected": selected["id"]},
        ],
    }
