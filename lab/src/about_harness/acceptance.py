from __future__ import annotations

import math
from dataclasses import dataclass, field
from typing import Protocol, cast

from about_harness.contracts import ContractError, JsonValue, TaskSpec


def _new_evidence() -> dict[str, JsonValue]:
    return {}


@dataclass(frozen=True, slots=True)
class AcceptanceResult:
    accepted: bool
    feedback: str
    evidence: dict[str, JsonValue] = field(default_factory=_new_evidence)

    def __post_init__(self) -> None:
        raw_accepted = cast(object, self.accepted)
        raw_feedback = cast(object, self.feedback)
        raw_evidence = cast(object, self.evidence)
        if type(raw_accepted) is not bool:
            raise ContractError("acceptance result must contain a boolean decision")
        if not isinstance(raw_feedback, str) or not raw_feedback.strip():
            raise ContractError("acceptance result must contain non-empty feedback")
        if not isinstance(raw_evidence, dict) or not _is_json_tree(
            cast(object, raw_evidence), set()
        ):
            raise ContractError("acceptance result evidence must be a finite JSON object")


class AcceptanceValidator(Protocol):
    @property
    def name(self) -> str: ...

    def validate(self, task: TaskSpec, output: JsonValue) -> AcceptanceResult: ...


@dataclass(frozen=True, slots=True)
class JsonSubsetAcceptanceValidator:
    """Require every value in TaskSpec.acceptance to appear in the completion output."""

    name: str = "json-subset-v1"

    def validate(self, task: TaskSpec, output: JsonValue) -> AcceptanceResult:
        failed_paths: list[str] = []
        if task.acceptance:
            _compare_subset(task.acceptance, output, "", failed_paths, set())
        accepted = not failed_paths
        if accepted:
            feedback = (
                "no acceptance constraints were declared"
                if not task.acceptance
                else "all declared acceptance values matched"
            )
        else:
            feedback = f"acceptance mismatch at {', '.join(failed_paths)}"
        evidence_paths: list[JsonValue] = list(failed_paths)
        evidence: dict[str, JsonValue] = {
            "validator": self.name,
            "top_level_criteria": len(task.acceptance),
            "failed_paths": evidence_paths,
        }
        return AcceptanceResult(
            accepted=accepted,
            feedback=feedback,
            evidence=evidence,
        )


def _compare_subset(
    expected: JsonValue,
    actual: JsonValue,
    path: str,
    failed_paths: list[str],
    seen: set[tuple[int, int]],
) -> None:
    display_path = path or "/"
    if isinstance(expected, dict):
        if not isinstance(actual, dict):
            failed_paths.append(display_path)
            return
        expected_object = cast(dict[str, JsonValue], expected)
        actual_object = cast(dict[str, JsonValue], actual)
        identity = (id(expected_object), id(actual_object))
        if identity in seen:
            failed_paths.append(display_path)
            return
        seen.add(identity)
        try:
            for raw_key, value in expected_object.items():
                key_value = cast(object, raw_key)
                if not isinstance(key_value, str):
                    failed_paths.append(display_path)
                    continue
                key = key_value
                child_path = f"{path}/{_escape_pointer(key)}"
                if key not in actual_object:
                    failed_paths.append(child_path)
                    continue
                _compare_subset(value, actual_object[key], child_path, failed_paths, seen)
        finally:
            seen.remove(identity)
        return

    if isinstance(expected, list):
        if not isinstance(actual, list) or len(expected) != len(actual):
            failed_paths.append(display_path)
            return
        expected_items = cast(list[JsonValue], expected)
        actual_items = cast(list[JsonValue], actual)
        identity = (id(expected_items), id(actual_items))
        if identity in seen:
            failed_paths.append(display_path)
            return
        seen.add(identity)
        try:
            for index, value in enumerate(expected_items):
                _compare_subset(
                    value,
                    actual_items[index],
                    f"{path}/{index}",
                    failed_paths,
                    seen,
                )
        finally:
            seen.remove(identity)
        return

    if not _same_json_scalar(expected, actual):
        failed_paths.append(display_path)


def _same_json_scalar(expected: JsonValue, actual: JsonValue) -> bool:
    if isinstance(expected, bool) or isinstance(actual, bool):
        return type(expected) is type(actual) and expected == actual
    if isinstance(expected, (int, float)) and isinstance(actual, (int, float)):
        return (
            math.isfinite(float(expected))
            and math.isfinite(float(actual))
            and expected == actual
        )
    if expected is None or actual is None:
        return expected is None and actual is None
    if isinstance(expected, str) and isinstance(actual, str):
        return expected == actual
    return False


def _escape_pointer(value: str) -> str:
    return value.replace("~", "~0").replace("/", "~1")


def _is_json_tree(value: object, seen: set[int]) -> bool:
    if value is None or isinstance(value, (str, bool)):
        return True
    if isinstance(value, int):
        return True
    if isinstance(value, float):
        return math.isfinite(value)
    if isinstance(value, (list, dict)):
        collection = cast(object, value)
        identity = id(collection)
        if identity in seen:
            return False
        seen.add(identity)
        try:
            if isinstance(value, list):
                items = cast(list[object], value)
                return all(_is_json_tree(item, seen) for item in items)
            mapping = cast(dict[object, object], value)
            return all(
                isinstance(key, str) and _is_json_tree(item, seen)
                for key, item in mapping.items()
            )
        finally:
            seen.remove(identity)
    return False


__all__ = ["AcceptanceResult", "AcceptanceValidator", "JsonSubsetAcceptanceValidator"]
