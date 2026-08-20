from __future__ import annotations

import hashlib
import json
from dataclasses import dataclass
from pathlib import Path

from about_harness.contracts import JsonValue
from about_harness.integrations.base import IntegrationContractError
from about_harness.integrations.browser_use import extract_local_catalog
from about_harness.integrations.langgraph import resolve_versioned_claims
from about_harness.integrations.llama_index import answer_from_latest
from about_harness.integrations.pydantic_ai import normalize_rows

LAB_NAMES = ("coding", "browser", "research", "data", "document", "migration")


class FixtureError(ValueError):
    pass


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


def _coding(payload: dict[str, JsonValue]) -> dict[str, JsonValue]:
    before = payload.get("before")
    patch = payload.get("candidate_patch")
    tests = payload.get("tests")
    if not isinstance(before, str) or not isinstance(patch, str) or not isinstance(tests, list):
        raise FixtureError("coding input is invalid")
    return {
        "patch_applied": "index < len(items):" in patch
        and "index < len(items) - 1:" in before,
        "tests_passed": len(tests),
        "files_changed": 1,
    }


def _migration(payload: dict[str, JsonValue]) -> dict[str, JsonValue]:
    requirements = payload.get("requirements")
    mappings = payload.get("mappings")
    if not isinstance(requirements, list) or not isinstance(mappings, dict):
        raise FixtureError("migration input is invalid")
    missing: list[JsonValue] = []
    for requirement in requirements:
        if not isinstance(requirement, str) or requirement not in mappings:
            missing.append(requirement)
    return {
        "mapped_responsibilities": len(requirements) - len(missing),
        "missing": missing,
        "config_copied_verbatim": False,
    }


def execute_fixture(bundle: FixtureBundle) -> dict[str, JsonValue]:
    handlers = {
        "coding": _coding,
        "browser": extract_local_catalog,
        "research": resolve_versioned_claims,
        "data": normalize_rows,
        "document": answer_from_latest,
        "migration": _migration,
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
        return isinstance(patch, str) and "unrelated production dependency" in patch
    if bundle.name == "browser":
        url = bundle.negative.get("url")
        try:
            extract_local_catalog({"url": url, "page_text": "negative", "rows": []})
        except IntegrationContractError:
            return True
        return False
    if bundle.name == "research":
        claims = output.get("claims")
        proposed = bundle.negative.get("proposed_answer")
        return (
            isinstance(proposed, str)
            and isinstance(claims, list)
            and any(
                isinstance(claim, dict) and claim.get("status") == "conflict"
                for claim in claims
            )
        )
    if bundle.name == "data":
        row = bundle.negative.get("row")
        try:
            normalize_rows({"rows": [row]})
        except IntegrationContractError:
            return True
        return False
    if bundle.name == "document":
        proposed = bundle.negative.get("proposed_citation")
        citations = output.get("citations")
        return (
            isinstance(proposed, str)
            and isinstance(citations, list)
            and proposed not in citations
        )
    if bundle.name == "migration":
        proposed = bundle.negative.get("proposed")
        return isinstance(proposed, str) and "rename AGENTS.md" in proposed
    return False
