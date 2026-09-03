"""Deterministic reference harness used by the About Harness learning project."""

from about_harness.acceptance import (
    AcceptanceResult,
    AcceptanceValidator,
    JsonSubsetAcceptanceValidator,
)
from about_harness.contracts import Action, Budgets, RunResult, TaskSpec, ToolCall
from about_harness.loop import CancellationToken, HarnessRunner
from about_harness.streaming import (
    AssembledResponse,
    StreamAssembler,
    StreamErrorCode,
    StreamProtocolError,
)

__all__ = [
    "AcceptanceResult",
    "AcceptanceValidator",
    "Action",
    "AssembledResponse",
    "Budgets",
    "CancellationToken",
    "HarnessRunner",
    "JsonSubsetAcceptanceValidator",
    "RunResult",
    "StreamAssembler",
    "StreamErrorCode",
    "StreamProtocolError",
    "TaskSpec",
    "ToolCall",
]
