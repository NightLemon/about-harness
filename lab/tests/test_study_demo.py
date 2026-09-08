from __future__ import annotations

import hashlib
import json
from pathlib import Path
from typing import Protocol, cast

import pytest
from about_harness import study_demo
from about_harness.adapters.fake import FakeAdapter
from about_harness.contracts import Action, Budgets, TaskSpec
from about_harness.loop import HarnessRunner
from about_harness.study_demo import Workspace, WorkspaceValidator
from about_harness.tools import ToolRegistry
from jsonschema import Draft202012Validator


class SchemaValidator(Protocol):
    def validate(self, value: object) -> None: ...


def test_completion_cannot_claim_unwritten_candidate(tmp_path: Path) -> None:
    root = tmp_path / "workspace"
    root.mkdir()
    (root / "solution.py").write_text("def solve(value): return value[:-1]\n")
    (root / "verify.py").write_text("raise SystemExit(1)\n")
    workspace = Workspace(root, "", "def solve(value): return list(value)\n", "unused", tmp_path)
    task = TaskSpec("false-completion", "fix the file", (), Budgets(), acceptance={"tests": "all"})
    result = HarnessRunner(
        FakeAdapter((Action.complete({"tests_passed": True}),)),
        ToolRegistry(),
        acceptance_validator=WorkspaceValidator(workspace),
    ).run(task)
    assert result.status.value == "failed"
    assert workspace.executions == 0
    assert not (tmp_path / "test-1.json").exists()


def test_study_configuration_budget_changes_actual_execution(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    fixture = tmp_path / "tasks.json"
    original = json.loads(study_demo.FIXTURE.read_bytes())
    data = (json.dumps(original[:1]) + "\n").encode()
    fixture.write_bytes(data)
    fixture.with_name("manifest.json").write_text(
        json.dumps({"files": {"tasks.json": hashlib.sha256(data).hexdigest()}})
    )
    monkeypatch.setattr(study_demo, "FIXTURE", fixture)
    config = tmp_path / "config.json"
    config.write_text(
        json.dumps(
            {
                "schema_version": "1.0",
                "configs": [
                    {"config_id": "a", "variant": "baseline", "max_model_calls": 1},
                    {"config_id": "b", "variant": "candidate", "max_model_calls": 1},
                ],
            }
        )
    )
    output = tmp_path / "results"
    result = study_demo.run_study(output, config)
    assert result["runs"] == 2
    assert result["passed_runs"] == 0
    for line in (output / "runs.jsonl").read_text(encoding="utf-8").splitlines():
        row = json.loads(line)
        schemas = study_demo.ROOT / "lab/schemas"
        cast(
            SchemaValidator,
            Draft202012Validator(json.loads((schemas / "eval-run-v1.1.json").read_text())),
        ).validate(row)
        for key, schema in {
            "run": "run-v1.1",
            "result": "result",
            "trace": "trace",
            "task": "task",
        }.items():
            value = json.loads((output / row["artifacts"][key]["path"]).read_text(encoding="utf-8"))
            cast(
                SchemaValidator,
                Draft202012Validator(json.loads((schemas / f"{schema}.json").read_text())),
            ).validate(value)
        assert row["failure_type"] == "budget"
        artifact = json.loads(
            (output / row["artifacts"]["result"]["path"]).read_text(encoding="utf-8")
        )
        assert artifact["metrics"]["model_calls"] == 1
        assert artifact["metrics"]["steps"] == 1


@pytest.mark.parametrize("damage", ["scope", "verifier", "artifact", "failing-tests"])
def test_independent_acceptance_rejects_workspace_damage(tmp_path: Path, damage: str) -> None:
    fixture = json.loads(study_demo.FIXTURE.read_bytes())[0]
    root = tmp_path / "workspace"
    root.mkdir()
    source = fixture["baseline" if damage == "failing-tests" else "candidate"]
    verifier = study_demo.build_verifier(fixture["tests"])
    (root / "solution.py").write_text(fixture["initial"], encoding="utf-8", newline="\n")
    (root / "verify.py").write_text(verifier, encoding="utf-8", newline="\n")
    (root / "extra.txt").write_text("original")
    for command in (
        ["git", "init", "--quiet"],
        ["git", "add", "."],
        [
            "git",
            "-c",
            "user.name=Fixture",
            "-c",
            "user.email=fixture@example.invalid",
            "-c",
            "core.hooksPath=disabled-hooks",
            "commit",
            "--quiet",
            "-m",
            "fixture",
        ],
    ):
        assert study_demo.run_command(command, root).returncode == 0
    (root / "solution.py").write_text(source, encoding="utf-8", newline="\n")
    if damage == "scope":
        (root / "extra.txt").write_text("changed")
    elif damage == "verifier":
        (root / "verify.py").write_text("raise SystemExit(0)\n")
    elif damage == "artifact":
        (root / "unexpected.txt").write_text("untracked")
    workspace = Workspace(root, "", source, hashlib.sha256(verifier.encode()).hexdigest(), tmp_path)
    task = TaskSpec("damaged", "fix", (), Budgets(), acceptance={"tests": "all"})
    result = HarnessRunner(
        FakeAdapter((Action.complete({"tests_passed": True}),)),
        ToolRegistry(),
        acceptance_validator=WorkspaceValidator(workspace),
    ).run(task)
    assert result.status.value != "completed"
    if damage == "failing-tests":
        evidence = json.loads((tmp_path / "test-1.json").read_text())
        assert evidence["exit_code"] == 1
        assert not all(case["passed"] for case in evidence["assertions"])
    else:
        assert workspace.executions == 0
