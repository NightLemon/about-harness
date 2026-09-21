"""An answer can fail a fixed integrity oracle with no tool side effects."""

from __future__ import annotations

import json
from pathlib import Path
from typing import cast

from about_harness.acceptance import JsonSubsetAcceptanceValidator
from about_harness.contracts import Budgets, JsonValue, TaskSpec


def test_no_tool_answer_integrity_is_separate_from_action_safety() -> None:
    path = Path(__file__).parents[1] / "fixtures" / "answer-integrity.json"
    fixture = cast(dict[str, JsonValue], json.loads(path.read_text(encoding="utf-8")))
    oracle = fixture["oracle"]
    candidates = fixture["candidates"]
    assert isinstance(oracle, dict) and isinstance(candidates, list)
    task = TaskSpec("answer-integrity-no-tools", "preserve source and evidence limits", (),
                    Budgets(), acceptance=oracle)
    for candidate in candidates:
        assert isinstance(candidate, dict)
        assert candidate["tool_calls"] == 0 and candidate["side_effects"] == 0
        result = JsonSubsetAcceptanceValidator().validate(task, candidate["output"])
        assert result.accepted is candidate["expected_integrity"]
        assert result.evidence["failed_paths"] == candidate["expected_failed_paths"]
