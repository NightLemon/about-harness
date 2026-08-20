from __future__ import annotations

from collections.abc import Callable
from dataclasses import dataclass, field

from about_harness.contracts import JsonValue, TaskSpec, ToolCall


@dataclass(frozen=True, slots=True)
class PolicyDecision:
    allowed: bool
    reason: str
    requires_approval: bool = False


ApprovalCallback = Callable[[TaskSpec, ToolCall], bool]


def _new_approval_tools() -> set[str]:
    return set()


@dataclass(slots=True)
class PermissionPolicy:
    approval_tools: set[str] = field(default_factory=_new_approval_tools)
    forbidden_argument_keys: set[str] = field(
        default_factory=lambda: {"api_key", "password", "secret", "token"}
    )
    approve: ApprovalCallback | None = None

    def decide(self, task: TaskSpec, call: ToolCall) -> PolicyDecision:
        if call.name not in task.allowed_tools:
            return PolicyDecision(False, f"tool is not allowlisted: {call.name}")
        sensitive = self._find_sensitive_key(call.arguments)
        if sensitive:
            return PolicyDecision(False, f"sensitive argument key is forbidden: {sensitive}")
        if call.name in self.approval_tools:
            if self.approve is None:
                return PolicyDecision(
                    False, "tool requires approval but no approver is configured", True
                )
            if not self.approve(task, call):
                return PolicyDecision(False, "human approval denied", True)
            return PolicyDecision(True, "human approval granted", True)
        return PolicyDecision(True, "allowlisted")

    def _find_sensitive_key(self, value: JsonValue) -> str | None:
        if isinstance(value, dict):
            for key, child in value.items():
                if key.lower() in self.forbidden_argument_keys:
                    return key
                nested = self._find_sensitive_key(child)
                if nested:
                    return nested
        elif isinstance(value, list):
            for child in value:
                nested = self._find_sensitive_key(child)
                if nested:
                    return nested
        return None
