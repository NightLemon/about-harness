from __future__ import annotations

import ast
import copy
import hashlib
import json
from collections.abc import Callable
from dataclasses import dataclass
from pathlib import Path
from typing import cast

from about_harness.contracts import JsonValue
from about_harness.integrations.base import IntegrationContractError
from about_harness.integrations.browser_use import extract_local_catalog
from about_harness.integrations.langgraph import resolve_versioned_claims
from about_harness.integrations.llama_index import answer_from_latest
from about_harness.integrations.pydantic_ai import normalize_rows

LAB_NAMES = ("coding", "browser", "research", "data", "document", "migration")
MIGRATION_HARNESSES = {"Codex", "Pi", "Claude Code"}
MIGRATION_REQUIREMENTS = (
    "instructions",
    "tools",
    "sandbox",
    "approval",
    "network",
    "state",
)
MIGRATION_DOMAINS = {"coding", "browser", "research", "data", "document"}
MIGRATION_EVIDENCE_AXES = {"source", "seam", "source+seam", "live"}


class FixtureError(ValueError):
    pass


CollectFunction = Callable[[list[int]], list[int]]
_BUGGY_COLLECT = """def collect(items):
    index = 0
    output = []
    while index < len(items) - 1:
        output.append(items[index])
        index += 1
    return output
"""
_FIXED_COLLECT = """def collect(items):
    index = 0
    output = []
    while index < len(items):
        output.append(items[index])
        index += 1
    return output
"""
_COLLECT_AST_ALLOWLIST = {
    ast.dump(ast.parse(_BUGGY_COLLECT), include_attributes=False),
    ast.dump(ast.parse(_FIXED_COLLECT), include_attributes=False),
}
_CODING_CASES: dict[str, tuple[list[int], list[int]]] = {
    "empty": ([], []),
    "single": ([1], [1]),
    "multiple": ([1, 2, 3], [1, 2, 3]),
}


@dataclass(frozen=True, slots=True)
class FixtureBundle:
    name: str
    root: Path
    manifest: dict[str, JsonValue]
    input: dict[str, JsonValue]
    expected: dict[str, JsonValue]
    negative: dict[str, JsonValue]
    fixture_hash: str


def _load_object(path: Path) -> dict[str, JsonValue]:
    value: JsonValue = json.loads(path.read_text(encoding="utf-8"))
    if not isinstance(value, dict):
        raise FixtureError(f"{path} must contain a JSON object")
    return value


def _sha256(path: Path) -> str:
    value: JsonValue = json.loads(path.read_text(encoding="utf-8"))
    canonical = json.dumps(
        value,
        ensure_ascii=False,
        sort_keys=True,
        separators=(",", ":"),
    ).encode("utf-8")
    return hashlib.sha256(canonical).hexdigest()


def load_fixture(fixtures_root: Path, name: str) -> FixtureBundle:
    if name not in LAB_NAMES:
        raise FixtureError(f"unknown lab: {name}")
    root = fixtures_root / name
    manifest = _load_object(root / "manifest.json")
    files_value = manifest.get("files")
    if not isinstance(files_value, dict):
        raise FixtureError(f"{name}: manifest.files must be an object")
    rows: list[str] = []
    for filename in ("input.json", "expected.json", "negative.json"):
        expected_hash = files_value.get(filename)
        if not isinstance(expected_hash, str):
            raise FixtureError(f"{name}: missing hash for {filename}")
        actual_hash = _sha256(root / filename)
        if actual_hash != expected_hash:
            raise FixtureError(f"{name}: hash mismatch for {filename}")
        rows.append(f"{filename}\t{actual_hash}")
    fixture_hash = hashlib.sha256("\n".join(rows).encode()).hexdigest()
    return FixtureBundle(
        name=name,
        root=root,
        manifest=manifest,
        input=_load_object(root / "input.json"),
        expected=_load_object(root / "expected.json"),
        negative=_load_object(root / "negative.json"),
        fixture_hash=fixture_hash,
    )


def _compile_fixture_collect(source: str) -> CollectFunction:
    try:
        tree = ast.parse(source)
    except SyntaxError as exc:
        raise FixtureError("coding candidate is not valid Python") from exc
    if ast.dump(tree, include_attributes=False) not in _COLLECT_AST_ALLOWLIST:
        raise FixtureError("coding candidate is outside the fixed AST allowlist")
    namespace: dict[str, object] = {"__builtins__": {"len": len}}
    exec(compile(tree, "<coding-fixture>", "exec"), namespace)
    function = namespace.get("collect")
    if not callable(function):
        raise FixtureError("coding candidate must define collect")
    return cast(CollectFunction, function)


def evaluate_coding(payload: dict[str, JsonValue]) -> dict[str, JsonValue]:
    before = payload.get("before")
    patch = payload.get("candidate_patch")
    tests = payload.get("tests")
    if (
        not isinstance(before, str)
        or not isinstance(patch, str)
        or not isinstance(tests, list)
        or not all(isinstance(test, str) for test in tests)
        or len(tests) != len(set(tests))
        or set(tests) != set(_CODING_CASES)
    ):
        raise FixtureError("coding input is invalid")
    baseline = _compile_fixture_collect(before)
    candidate = _compile_fixture_collect(patch)
    baseline_failures: list[str] = []
    test_results: dict[str, JsonValue] = {}
    for test in tests:
        assert isinstance(test, str)
        values, expected = _CODING_CASES[test]
        if baseline(list(values)) != expected:
            baseline_failures.append(test)
        test_results[test] = candidate(list(values)) == expected
    tests_passed = sum(result is True for result in test_results.values())
    baseline_failure_items: list[JsonValue] = list(baseline_failures)
    return {
        "patch_applied": patch != before
        and bool(baseline_failures)
        and tests_passed == len(tests),
        "baseline_failures": baseline_failure_items,
        "test_results": test_results,
        "tests_passed": tests_passed,
        "files_changed": 1,
    }


def _json_list(values: list[str]) -> list[JsonValue]:
    return [value for value in values]


def evaluate_migration(payload: dict[str, JsonValue]) -> dict[str, JsonValue]:
    source = payload.get("source_harness")
    targets_value = payload.get("target_harnesses")
    requirements = payload.get("requirements")
    mappings = payload.get("mappings")
    domain_checklists = payload.get("domain_checklists")
    if not isinstance(source, str) or source not in MIGRATION_HARNESSES:
        raise FixtureError(f"migration: unknown source_harness {source!r}")
    if not isinstance(targets_value, list) or not all(
        isinstance(target, str) for target in targets_value
    ):
        raise FixtureError("migration: target_harnesses must be a string array")
    targets = [target for target in targets_value if isinstance(target, str)]
    expected_targets = MIGRATION_HARNESSES - {source}
    if len(targets) != len(set(targets)) or set(targets) != expected_targets:
        raise FixtureError(
            "migration: target_harnesses must cover each other approved harness exactly once"
        )
    if (
        not isinstance(requirements, list)
        or len(requirements) != len(set(item for item in requirements if isinstance(item, str)))
        or set(requirements) != set(MIGRATION_REQUIREMENTS)
        or not isinstance(mappings, dict)
    ):
        raise FixtureError("migration input is invalid")
    if not isinstance(domain_checklists, dict) or set(domain_checklists) != MIGRATION_DOMAINS:
        raise FixtureError("migration: domain_checklists must cover five approved domains")
    for domain, checks in domain_checklists.items():
        if not isinstance(checks, list) or not checks or not all(
            isinstance(check, str) and check.strip() for check in checks
        ):
            raise FixtureError(f"migration: {domain} domain checklist is empty or invalid")

    missing: list[str] = []
    uncompensated_gaps: list[str] = []
    boundary_violations: list[str] = []
    verbatim_targets: list[str] = []
    invalid_entries: list[str] = []
    mapped = 0
    for target in targets:
        target_mappings = mappings.get(target)
        if not isinstance(target_mappings, dict):
            missing.extend(f"{target}.{requirement}" for requirement in MIGRATION_REQUIREMENTS)
            continue
        target_is_verbatim = True
        for requirement in MIGRATION_REQUIREMENTS:
            location = f"{target}.{requirement}"
            entry = target_mappings.get(requirement)
            if not isinstance(entry, dict):
                missing.append(location)
                continue
            values = {
                key: entry.get(key)
                for key in (
                    "source_semantics",
                    "target_semantics",
                    "gap",
                    "compensating_control",
                    "evidence_axis",
                )
            }
            if not all(isinstance(value, str) and value.strip() for value in values.values()):
                invalid_entries.append(f"{location}: semantic fields must be non-empty strings")
                continue
            source_semantics = values["source_semantics"]
            target_semantics = values["target_semantics"]
            gap = values["gap"]
            compensation = values["compensating_control"]
            evidence_axis = values["evidence_axis"]
            assert isinstance(source_semantics, str)
            assert isinstance(target_semantics, str)
            assert isinstance(gap, str)
            assert isinstance(compensation, str)
            assert isinstance(evidence_axis, str)
            if evidence_axis not in MIGRATION_EVIDENCE_AXES:
                invalid_entries.append(f"{location}: invalid evidence_axis {evidence_axis}")
            if gap.casefold() != "none" and compensation.casefold() == "none":
                uncompensated_gaps.append(location)
            if entry.get("preserves_boundary") is not True:
                boundary_violations.append(location)
            if source_semantics.strip().casefold() != target_semantics.strip().casefold():
                target_is_verbatim = False
            mapped += 1
        if target_is_verbatim:
            verbatim_targets.append(target)

    problems = [
        *(f"missing {item}" for item in missing),
        *(f"uncompensated gap {item}" for item in uncompensated_gaps),
        *(f"boundary violation {item}" for item in boundary_violations),
        *(f"verbatim target {item}" for item in verbatim_targets),
        *invalid_entries,
    ]
    if problems:
        raise FixtureError(f"migration contract failed: {'; '.join(problems)}")

    return {
        "source_harness": source,
        "target_harnesses": _json_list(targets),
        "paths_checked": len(targets),
        "mapped_responsibilities": mapped,
        "domains_checked": len(domain_checklists),
        "missing": _json_list(missing),
        "uncompensated_gaps": _json_list(uncompensated_gaps),
        "boundary_violations": _json_list(boundary_violations),
        "verbatim_targets": _json_list(verbatim_targets),
        "config_copied_verbatim": bool(verbatim_targets),
        "control_boundaries_preserved": not boundary_violations,
    }


def execute_fixture(bundle: FixtureBundle) -> dict[str, JsonValue]:
    handlers = {
        "coding": evaluate_coding,
        "browser": extract_local_catalog,
        "research": resolve_versioned_claims,
        "data": normalize_rows,
        "document": answer_from_latest,
        "migration": evaluate_migration,
    }
    output = handlers[bundle.name](bundle.input)
    negative_rejected = _negative_rejected(bundle, output)
    passed = all(output.get(key) == value for key, value in bundle.expected.items())
    passed = passed and negative_rejected
    return {
        "schema_version": "1.0",
        "case_id": bundle.name,
        "fixture_hash": bundle.fixture_hash,
        "evidence": "E1",
        "offline": True,
        "passed": passed,
        "safety_violation": False,
        "negative_rejected": negative_rejected,
        "output": output,
    }


def run_all(fixtures_root: Path) -> list[dict[str, JsonValue]]:
    return [execute_fixture(load_fixture(fixtures_root, name)) for name in LAB_NAMES]


def _negative_rejected(bundle: FixtureBundle, output: dict[str, JsonValue]) -> bool:
    if bundle.name == "coding":
        patch = bundle.negative.get("candidate_patch")
        if not isinstance(patch, str):
            return False
        try:
            _compile_fixture_collect(patch)
        except FixtureError:
            return True
        return False
    if bundle.name == "browser":
        cases = bundle.negative.get("cases")
        if not isinstance(cases, list) or not cases:
            return False
        for case in cases:
            if not isinstance(case, dict):
                return False
            override = case.get("override")
            expected_error = case.get("expected_error")
            if not isinstance(override, dict) or not isinstance(expected_error, str):
                return False
            path = override.get("path")
            if (
                not isinstance(path, list)
                or not path
                or not all(isinstance(part, str) and part for part in path)
            ):
                return False
            payload = copy.deepcopy(bundle.input)
            cursor: JsonValue = payload
            for part in path[:-1]:
                if not isinstance(cursor, dict) or part not in cursor:
                    return False
                cursor = cursor[part]
            final = path[-1]
            if not isinstance(cursor, dict) or final not in cursor:
                return False
            cursor[final] = copy.deepcopy(override.get("value"))
            try:
                extract_local_catalog(payload)
            except IntegrationContractError as error:
                if expected_error not in str(error):
                    return False
            else:
                return False
        return True
    if bundle.name == "research":
        claims = output.get("claims")
        candidate = bundle.negative.get("candidate_claim")
        if not isinstance(candidate, dict) or not isinstance(claims, list):
            return False
        candidate_id = candidate.get("claim")
        ledger_claim = next(
            (
                claim
                for claim in claims
                if isinstance(claim, dict) and claim.get("claim") == candidate_id
            ),
            None,
        )
        if not isinstance(ledger_claim, dict):
            return True
        compared_fields = ("status", "values", "citations")
        return any(
            candidate.get(field) != ledger_claim.get(field) for field in compared_fields
        )
    if bundle.name == "data":
        cases = bundle.negative.get("cases")
        if not isinstance(cases, list) or not cases:
            return False
        for case in cases:
            if not isinstance(case, dict):
                return False
            rows = case.get("rows")
            expected_error = case.get("expected_error")
            if not isinstance(rows, list) or not isinstance(expected_error, str):
                return False
            payload = copy.deepcopy(bundle.input)
            payload["rows"] = rows
            try:
                normalize_rows(payload)
            except IntegrationContractError as error:
                if expected_error not in str(error):
                    return False
            else:
                return False
        return True
    if bundle.name == "document":
        candidate = bundle.negative.get("candidate_answer")
        if not isinstance(candidate, dict):
            return False
        compared_fields = ("status", "answer", "citations")
        return any(
            candidate.get(field) != output.get(field) for field in compared_fields
        )
    if bundle.name == "migration":
        proposals = bundle.negative.get("proposals")
        if not isinstance(proposals, list) or not proposals:
            return False
        for proposal in proposals:
            if not isinstance(proposal, dict):
                return False
            payload = copy.deepcopy(bundle.input)
            mappings = payload.get("mappings")
            target = proposal.get("target_harness")
            mode = proposal.get("mode")
            if not isinstance(mappings, dict) or not isinstance(target, str):
                return False
            target_mappings = mappings.get(target)
            if not isinstance(target_mappings, dict):
                return False
            if mode == "copy-source-semantics":
                for entry in target_mappings.values():
                    if not isinstance(entry, dict):
                        return False
                    source_semantics = entry.get("source_semantics")
                    if not isinstance(source_semantics, str):
                        return False
                    entry["target_semantics"] = source_semantics
            elif mode == "replace-mapping":
                responsibility = proposal.get("responsibility")
                replacement = proposal.get("mapping")
                if not isinstance(responsibility, str) or not isinstance(replacement, dict):
                    return False
                target_mappings[responsibility] = copy.deepcopy(replacement)
            else:
                return False
            try:
                evaluate_migration(payload)
            except FixtureError:
                continue
            return False
        return True
    return False
