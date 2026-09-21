"""Run reproducible synthetic ecosystem exercises without model/network access."""

from __future__ import annotations

import argparse
import copy
import hashlib
import json
import sys
import uuid
from collections.abc import Callable, Mapping
from pathlib import Path
from typing import TypeAlias, cast

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "lab" / "src"))

from about_harness.ecosystem import (  # noqa: E402
    ExerciseError,
    orchestration_comparison,
    protocol_decision,
    selection_metrics,
)

ExerciseFunction: TypeAlias = Callable[[Mapping[str, object]], dict[str, object]]

FUNCTIONS: dict[str, ExerciseFunction] = {
    "protocols": protocol_decision,
    "orchestration": orchestration_comparison,
    "selection": selection_metrics,
}


def _fixture_cases(value: object) -> dict[str, dict[str, object]]:
    if not isinstance(value, Mapping):
        raise ValueError("ecosystem fixture must be an object")
    raw_fixture = cast(Mapping[object, object], value)
    cases: dict[str, dict[str, object]] = {}
    for name in FUNCTIONS:
        raw_case = raw_fixture.get(name)
        if not isinstance(raw_case, Mapping):
            raise ValueError(f"ecosystem fixture case {name} must be an object")
        raw_mapping = cast(Mapping[object, object], raw_case)
        case: dict[str, object] = {}
        for key, item in raw_mapping.items():
            if not isinstance(key, str):
                raise ValueError(f"ecosystem fixture case {name} has a non-string key")
            case[key] = item
        cases[name] = case
    return cases


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("case", choices=[*FUNCTIONS, "all"], default="all", nargs="?")
    parser.add_argument(
        "--negative", action="store_true", help="inject an expected rejection (exit 1)"
    )
    args = parser.parse_args()
    raw = (ROOT / "lab/fixtures/ecosystem.json").read_bytes()
    fixture_value: object = json.loads(raw)
    fixture = _fixture_cases(fixture_value)
    cases = list(FUNCTIONS) if args.case == "all" else [args.case]
    config: dict[str, object] = {"cases": cases, "negative": args.negative, "live_enabled": False}
    results: list[dict[str, object]] = []
    for name in cases:
        data = copy.deepcopy(fixture[name])
        if args.negative:
            if name == "protocols":
                data["requested_action"] = "write"
            elif name == "orchestration":
                data["call_budget"] = 2
            else:
                candidates = data["candidates"]
                if (
                    not isinstance(candidates, list)
                    or not candidates
                    or not isinstance(candidates[0], dict)
                ):
                    raise ValueError("ecosystem selection fixture must contain candidates")
                candidates[0]["uncertainty"] = 1.2
        try:
            result = FUNCTIONS[name](data)
        except ExerciseError as error:
            result: dict[str, object] = {
                "passed": False,
                "failure_classification": error.classification,
                "trace": [{"event": "input_rejected", "reason": str(error)}],
            }
        result["task_id"] = f"ecosystem-{name}-v1"
        result["run_id"] = uuid.uuid4().hex
        result["exit_code"] = 0 if result["passed"] is True else 1
        results.append(result)
    passed = all(result["passed"] is True for result in results)
    implementation = (ROOT / "lab/src/about_harness/ecosystem.py").read_bytes()
    implementation_hash = hashlib.sha256(implementation + Path(__file__).read_bytes()).hexdigest()
    exit_code = 0 if passed else 1
    summary: dict[str, object] = {
        "schema_version": "ecosystem-result-v1",
        "evidence": "E1",
        "offline": True,
        "fixture_sha256": hashlib.sha256(raw).hexdigest(),
        "config": config,
        "config_sha256": hashlib.sha256(json.dumps(config, sort_keys=True).encode()).hexdigest(),
        "implementation_sha256": implementation_hash,
        "cases": results,
        "passed": passed,
        "exit_code": exit_code,
    }
    print(json.dumps(summary, ensure_ascii=False, sort_keys=True, allow_nan=False))
    return exit_code


if __name__ == "__main__":
    raise SystemExit(main())
