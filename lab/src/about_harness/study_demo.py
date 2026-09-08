"""A complete, measured offline study on six reviewed temporary repositories."""

from __future__ import annotations

import hashlib
import json
import os
import subprocess
import sys
import tempfile
import uuid
from dataclasses import asdict, dataclass
from datetime import UTC, datetime
from pathlib import Path
from typing import Any, cast

from about_harness.acceptance import AcceptanceResult
from about_harness.adapters.replay import ReplayAdapter
from about_harness.contracts import Budgets, JsonValue, TaskSpec
from about_harness.loop import HarnessRunner
from about_harness.tools import ToolError, ToolRegistry

ROOT = Path(__file__).resolve().parents[3]
FIXTURE = ROOT / "lab" / "fixtures" / "study-coding" / "tasks.json"
CONFIG = ROOT / "examples" / "study" / "config.json"


def digest(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def write_json(path: Path, value: object) -> dict[str, str]:
    path.parent.mkdir(parents=True, exist_ok=True)
    data = (json.dumps(value, ensure_ascii=False, sort_keys=True, indent=2) + "\n").encode()
    path.write_bytes(data)
    return {"path": path.name, "sha256": digest(data)}


def run_command(
    argv: list[str], cwd: Path, timeout: float = 10
) -> subprocess.CompletedProcess[str]:
    env = {
        key: value
        for key, value in os.environ.items()
        if key.upper()
        in {
            "PATH",
            "SYSTEMROOT",
            "WINDIR",
            "TEMP",
            "TMP",
            "PATHEXT",
        }
    }
    env.update(
        {
            "GIT_CONFIG_NOSYSTEM": "1",
            "GIT_CONFIG_GLOBAL": os.devnull,
            "GIT_AUTHOR_DATE": "2026-09-08T00:00:00Z",
            "GIT_COMMITTER_DATE": "2026-09-08T00:00:00Z",
        }
    )
    return subprocess.run(
        argv,
        cwd=cwd,
        env=env,
        text=True,
        encoding="utf-8",
        capture_output=True,
        timeout=timeout,
        check=False,
    )


@dataclass
class Workspace:
    root: Path
    patch: str
    expected_source: str
    verifier_hash: str
    artifact_root: Path
    executions: int = 0

    def read(self, arguments: dict[str, JsonValue]) -> JsonValue:
        if arguments != {"path": "solution.py"}:
            raise ToolError("read is restricted to solution.py")
        return {"path": "solution.py", "content": (self.root / "solution.py").read_text()}

    def apply(self, arguments: dict[str, JsonValue]) -> JsonValue:
        if arguments != {"patch_id": "reviewed-candidate"}:
            raise ToolError("only the reviewed candidate is executable")
        patch_path = self.artifact_root / "candidate.patch"
        patch_path.write_text(self.patch, encoding="utf-8", newline="\n")
        for command in (
            ["git", "apply", "--check", str(patch_path)],
            ["git", "apply", str(patch_path)],
        ):
            result = run_command(list(command), self.root)
            if result.returncode != 0:
                raise ToolError("reviewed patch does not apply to this base")
        return {
            "changed_paths": self.changed_paths(),
            "source_hash": digest((self.root / "solution.py").read_bytes()),
        }

    def changed_paths(self) -> list[JsonValue]:
        result = run_command(["git", "diff", "--name-only", "HEAD"], self.root)
        if result.returncode:
            raise ToolError("cannot inspect workspace diff")
        return [line for line in result.stdout.splitlines() if line]

    def verify(self, arguments: dict[str, JsonValue]) -> JsonValue:
        if arguments:
            raise ToolError("test command takes no model-controlled arguments")
        if (self.root / "solution.py").is_symlink() or (self.root / "verify.py").is_symlink():
            raise ToolError("workspace symlinks are forbidden")
        if (self.root / "solution.py").read_text() != self.expected_source:
            raise ToolError("source is not the pre-reviewed candidate")
        if digest((self.root / "verify.py").read_bytes()) != self.verifier_hash:
            raise ToolError("verification script was modified")
        if self.changed_paths() != ["solution.py"]:
            raise ToolError("changed paths are outside the declared scope")
        untracked = run_command(["git", "ls-files", "--others", "--exclude-standard"], self.root)
        if untracked.returncode or untracked.stdout.strip():
            raise ToolError("unexpected workspace artifact")
        executed = run_command([sys.executable, "-I", "-B", "verify.py"], self.root)
        self.executions += 1
        # Only the trusted verifier's JSON is retained; no private absolute traceback paths.
        try:
            cases = json.loads(executed.stdout)
        except json.JSONDecodeError as exc:
            raise ToolError("verifier did not return its JSON contract") from exc
        evidence = {
            "command": ["python", "-I", "-B", "verify.py"],
            "exit_code": executed.returncode,
            "assertions": cases,
            "source_hash": digest((self.root / "solution.py").read_bytes()),
            "verifier_hash": self.verifier_hash,
            "execution": self.executions,
        }
        write_json(self.artifact_root / f"test-{self.executions}.json", evidence)
        return cast(JsonValue, evidence)


@dataclass
class WorkspaceValidator:
    workspace: Workspace
    name: str = "workspace-tests-v1"

    def validate(self, task: TaskSpec, output: JsonValue) -> AcceptanceResult:
        del output  # Completion text cannot supply the evidence.
        evidence = cast(dict[str, JsonValue], self.workspace.verify({}))
        accepted = evidence["exit_code"] == 0 and task.acceptance.get("tests") == "all"
        return AcceptanceResult(
            accepted,
            "workspace tests passed" if accepted else "workspace tests failed; completion rejected",
            evidence,
        )


def build_verifier(tests: object) -> str:
    return (
        "import json, runpy\n"
        "solve = runpy.run_path('solution.py')['solve']\n"
        f"cases = json.loads({json.dumps(tests, ensure_ascii=False)!r})\n"
        "out = []\n"
        "for case in cases:\n"
        "    try:\n"
        "        actual = solve(case['input'])\n"
        "        out.append({'id': case['id'], 'passed': actual == case['expected']})\n"
        "    except Exception as error:\n"
        "        out.append({'id': case['id'], 'passed': False, 'error': type(error).__name__})\n"
        "print(json.dumps(out, sort_keys=True))\n"
        "raise SystemExit(0 if all(item['passed'] for item in out) else 1)\n"
    )


def run_study(output: Path, config_path: Path = CONFIG) -> dict[str, JsonValue]:
    import difflib

    if output.exists():
        raise ValueError("output must be a new directory; existing evidence is never overwritten")
    config = json.loads(config_path.read_text(encoding="utf-8"))
    if set(config) != {"schema_version", "configs"} or config["schema_version"] != "1.0":
        raise ValueError("invalid study demo configuration")
    raw_profiles: object = config["configs"]
    if not isinstance(raw_profiles, list):
        raise ValueError("configs must be a list")
    profiles = cast(list[dict[str, Any]], raw_profiles)
    if len(profiles) != 2:
        raise ValueError("exactly two study configurations are required")
    ids: set[str] = set()
    for profile in profiles:
        if set(profile) != {"config_id", "variant", "max_model_calls"}:
            raise ValueError("unknown or missing configuration fields")
        if profile["variant"] not in {"baseline", "candidate"}:
            raise ValueError("only reviewed patch variants are allowed")
        identifier = profile["config_id"]
        if (
            not isinstance(identifier, str)
            or not identifier.replace("-", "").isalnum()
            or identifier in ids
        ):
            raise ValueError("invalid or duplicate configuration identity")
        ids.add(identifier)
        Budgets(max_model_calls=profile["max_model_calls"])
    fixture_bytes = FIXTURE.read_bytes()
    fixture_hash = digest(fixture_bytes)
    manifest = json.loads(FIXTURE.with_name("manifest.json").read_text())
    if manifest["files"]["tasks.json"] != fixture_hash:
        raise ValueError("study fixture hash mismatch")
    fixtures = json.loads(fixture_bytes)
    output.mkdir(parents=True)
    output = output.resolve()
    (output / "fixtures").mkdir()
    (output / "fixtures/tasks.json").write_bytes(fixture_bytes)
    runtime_sources = {
        file.relative_to(ROOT).as_posix(): digest(file.read_bytes())
        for file in sorted((ROOT / "lab/src/about_harness").rglob("*.py"))
    }
    study = {
        "schema_version": "1.2",
        "study_id": "coding-execution-demo-v1",
        "study_kind": "learning",
        "evidence_target": "E1",
        "sampling_rationale": (
            "Six distinct synthetic coding defects; "
            "deterministic replay tests execution, not model quality."
        ),
        "configs": [p["config_id"] for p in profiles],
        "repeats": 1,
        "tasks": [
            {"task_id": f["task_id"], "workload": "coding", "split": f["split"]} for f in fixtures
        ],
        "promotion": {
            "pass_rate_analysis_unit": "task",
            "task_pass_min_runs": 1,
            "min_pass_rate_delta": 0.05,
            "max_p90_cost_delta": 0,
            "safety_violations": 0,
        },
    }
    write_json(output / "study.json", study)
    rows: list[dict[str, JsonValue]] = []
    task_rows: list[dict[str, JsonValue]] = []
    commit = run_command(["git", "rev-parse", "HEAD"], ROOT).stdout.strip()
    for fixture in fixtures:
        for profile in profiles:
            run_id = f"{fixture['task_id']}-{profile['config_id']}"
            destination = output / run_id
            destination.mkdir()
            source = fixture[profile["variant"]]
            patch = "".join(
                difflib.unified_diff(
                    fixture["initial"].splitlines(keepends=True),
                    source.splitlines(keepends=True),
                    fromfile="a/solution.py",
                    tofile="b/solution.py",
                )
            )
            task = TaskSpec(
                fixture["task_id"],
                fixture["goal"],
                ("workspace.read", "workspace.patch", "test.run"),
                Budgets(max_steps=5, max_model_calls=profile["max_model_calls"], timeout_ms=30000),
                input={"fixture_ref": "study-coding-v1", "fixture_hash": fixture_hash},
                acceptance={"tests": "all"},
                metadata={"evidence": "E1", "fixture_hash": fixture_hash},
            )
            task_data = cast(dict[str, JsonValue], asdict(task))
            if profile is profiles[0]:
                task_rows.append(task_data)
            with tempfile.TemporaryDirectory(prefix="about-harness-study-") as temporary:
                workspace_root = Path(temporary).resolve()
                if not workspace_root.is_relative_to(Path(tempfile.gettempdir()).resolve()):
                    raise ValueError("unexpected temporary workspace root")
                (workspace_root / "solution.py").write_text(
                    fixture["initial"], encoding="utf-8", newline="\n"
                )
                verifier = build_verifier(fixture["tests"])
                (workspace_root / "verify.py").write_text(verifier, encoding="utf-8", newline="\n")
                for argv in (
                    ["git", "init", "--quiet"],
                    ["git", "add", "solution.py", "verify.py"],
                    [
                        "git",
                        "-c",
                        "user.name=Offline Fixture",
                        "-c",
                        "user.email=fixture@example.invalid",
                        "-c",
                        "core.hooksPath=disabled-hooks",
                        "commit",
                        "--quiet",
                        "-m",
                        "fixed input",
                    ],
                ):
                    if run_command(list(argv), workspace_root).returncode:
                        raise ToolError("cannot prepare temporary Git repository")
                base = run_command(["git", "rev-parse", "HEAD"], workspace_root).stdout.strip()
                before = run_command([sys.executable, "-I", "-B", "verify.py"], workspace_root)
                if before.returncode != 1:
                    raise ToolError("initial defect must be reproduced before applying a candidate")
                write_json(
                    destination / "baseline-test.json",
                    {
                        "exit_code": before.returncode,
                        "assertions": json.loads(before.stdout),
                        "base_commit": base,
                    },
                )
                workspace = Workspace(
                    workspace_root, patch, source, digest(verifier.encode()), destination
                )
                registry = ToolRegistry()
                registry.register("workspace.read", workspace.read)
                registry.register("workspace.patch", workspace.apply)
                registry.register("test.run", workspace.verify)
                records: list[dict[str, JsonValue]] = []
                steps: list[tuple[str, dict[str, JsonValue]]] = [
                    ("workspace.read", {"path": "solution.py"}),
                    ("workspace.patch", {"patch_id": "reviewed-candidate"}),
                    ("test.run", {}),
                ]
                for number, (name, args) in enumerate(steps):
                    records.append(
                        {
                            "kind": "tool",
                            "cost_usd": 0,
                            "tool_call": {
                                "call_id": f"call-{number}",
                                "name": name,
                                "arguments": args,
                                "idempotency_key": f"{run_id}-{number}",
                            },
                        }
                    )
                completion: dict[str, JsonValue] = {
                    "kind": "complete",
                    "cost_usd": 0,
                    "output": {"tests_passed": True},
                }
                records.extend([completion, completion])
                adapter = ReplayAdapter.from_records(records)
                started_at = datetime.now(UTC).isoformat()
                result = HarnessRunner(
                    adapter, registry, acceptance_validator=WorkspaceValidator(workspace)
                ).run(task, run_id=run_id)
                result_data = result.to_dict()
                write_json(
                    destination / "workspace.json",
                    {
                        "base_commit": base,
                        "changed_paths": workspace.changed_paths(),
                        "source": (workspace_root / "solution.py").read_text(),
                        "source_hash": digest((workspace_root / "solution.py").read_bytes()),
                        "diff": run_command(
                            ["git", "diff", "HEAD", "--", "solution.py"], workspace_root
                        ).stdout,
                    },
                )
            objects: dict[str, object] = {
                "task": task_data,
                "config": profile,
                "fixture": {
                    "fixture_hash": fixture_hash,
                    "task": fixture,
                    "manifest": manifest,
                    "source": {"path": "fixtures/tasks.json", "sha256": fixture_hash},
                },
                "trace": {
                    "schema_version": "1.1",
                    "run_id": run_id,
                    "events": result_data["trace"],
                },
                "result": result_data,
            }
            refs: dict[str, JsonValue] = {}
            for key, value in objects.items():
                ref = write_json(destination / f"{key}.json", value)
                ref["path"] = f"{run_id}/{key}.json"
                refs[key] = cast(JsonValue, ref)
            envelope: dict[str, Any] = {
                "schema_version": "1.1",
                "run_id": run_id,
                "task_id": task.task_id,
                "started_at": started_at,
                "fixture_hash": fixture_hash,
                "config": profile,
                "environment": {
                    "offline": True,
                    "python": sys.version.split()[0],
                    "platform": sys.platform,
                    "source_commit": commit,
                    "runtime_source_hashes": runtime_sources,
                },
                "artifacts": {key: ref for key, ref in refs.items()},
                "execution_artifacts": {
                    file.name: {
                        "path": f"{run_id}/{file.name}",
                        "sha256": digest(file.read_bytes()),
                    }
                    for file in sorted(destination.iterdir())
                    if file.name in {"candidate.patch", "baseline-test.json", "workspace.json"}
                    or file.name.startswith("test-")
                },
                "cleanup": {"temporary_repository_removed": not workspace_root.exists()},
            }
            # Portable envelope: only immutable local artifact references, no absolute paths.
            ref = write_json(destination / "run.json", envelope)
            ref["path"] = f"{run_id}/run.json"
            refs["run"] = cast(JsonValue, ref)
            passed = result.status.value == "completed"
            row: dict[str, JsonValue] = {
                "schema_version": "1.1",
                "run_id": run_id,
                "task_id": task.task_id,
                "config_id": profile["config_id"],
                "config_version": "1",
                "repeat": 1,
                "split": fixture["split"],
                "passed": passed,
                "safety_violation": False,
                "duration_ms": result.metrics["duration_ms"],
                "cost_usd": 0,
                "input_tokens": 0,
                "output_tokens": 0,
                "tool_errors": 0,
                "human_turns": 0,
                "failure_type": None
                if passed
                else (
                    "verification"
                    if any(event.kind == "acceptance_result" for event in result.trace)
                    else "budget"
                    if result.stop_reason.value in {"model_budget", "max_steps", "timeout"}
                    else "tool"
                ),
                "fixture_hash": fixture_hash,
                "evidence": "E1",
                "model_id": "reviewed-patch-replay",
                "harness_version": commit,
                "instruction_hash": digest(b"Only reviewed local patches and independent tests."),
                "artifacts": refs,
            }
            rows.append(row)
    for filename, values in [("runs.jsonl", rows), ("tasks.jsonl", task_rows)]:
        (output / filename).write_text(
            "".join(json.dumps(v, ensure_ascii=False, sort_keys=True) + "\n" for v in values),
            encoding="utf-8",
        )
    write_json(
        output / "fixture-refs.json", {"schema_version": "1.1", "source": "execution-artifacts"}
    )
    summary_process = run_command(
        [
            "node",
            "scripts/summarize-evals.mjs",
            str(output / "study.json"),
            str(output / "runs.jsonl"),
        ],
        ROOT,
    )
    if summary_process.returncode:
        raise ToolError(
            "generated study failed analysis; retained evidence for diagnosis: "
            + summary_process.stderr[:500]
        )
    summary = json.loads(summary_process.stdout)
    write_json(output / "summary.json", summary)
    lines = [
        "# 完整离线编码研究",
        "",
        "E1：固定补丁的实际执行结果，仅用于本案例回归。",  # noqa: RUF001
        "",
        "| 任务 | 配置 | 验收 | 失败分类 | Result |",
        "| --- | --- | --- | --- | --- |",
    ]
    for row in rows:
        lines.append(
            f"| {row['task_id']} | {row['config_id']} | {row['passed']} | "
            f"{row['failure_type']} | [{row['run_id']}]({row['run_id']}/result.json) |"
        )
    lines += [
        "",
        "矩阵完整：" + str(summary["matrix"]["complete"]),  # noqa: RUF001
        "",
        "决定：只保留通过独立工作区测试的候选作为这些固定任务的回归基线。",  # noqa: RUF001
        "",
        "不用于真实模型质量、产品采用或发布；失败记录和临时仓库清理回执均保留。",  # noqa: RUF001
    ]
    (output / "report.md").write_text("\n".join(lines) + "\n", encoding="utf-8")
    return {
        "evidence": "E1",
        "matrix_complete": summary["matrix"]["complete"],
        "runs": len(rows),
        "passed_runs": sum(row["passed"] is True for row in rows),
        "promotion_eligible": False,
    }


def default_output() -> Path:
    return ROOT / "lab" / "results" / "local" / f"study-{uuid.uuid4().hex[:12]}"
