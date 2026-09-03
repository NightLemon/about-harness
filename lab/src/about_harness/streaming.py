from __future__ import annotations

import json
from dataclasses import dataclass
from enum import StrEnum
from typing import NoReturn, cast

from about_harness.contracts import Action, ContractError, JsonValue, ToolCall


class StreamErrorCode(StrEnum):
    INVALID_EVENT = "invalid_event"
    SEQUENCE_CONFLICT = "sequence_conflict"
    RESPONSE_MISMATCH = "response_mismatch"
    STATE_VIOLATION = "state_violation"
    INVALID_TOOL_ARGUMENTS = "invalid_tool_arguments"
    UNSUPPORTED_PARALLEL_CALLS = "unsupported_parallel_calls"
    INCOMPLETE_STREAM = "incomplete_stream"
    PROVIDER_ERROR = "provider_error"
    CANCELLED = "cancelled"


class StreamProtocolError(ValueError):
    def __init__(self, code: StreamErrorCode, message: str) -> None:
        super().__init__(message)
        self.code = code


@dataclass(frozen=True, slots=True)
class AssembledResponse:
    response_id: str
    text: str
    actions: tuple[Action, ...]
    usage: dict[str, int] | None
    accepted_events: int
    duplicates_ignored: int

    def to_dict(self) -> dict[str, JsonValue]:
        return {
            "response_id": self.response_id,
            "text": self.text,
            "actions": [
                {
                    "kind": action.kind,
                    "tool_call": {
                        "call_id": action.tool_call.call_id,
                        "name": action.tool_call.name,
                        "arguments": action.tool_call.arguments,
                        "idempotency_key": action.tool_call.idempotency_key,
                    },
                    "cost_usd": action.cost_usd,
                }
                for action in self.actions
                if action.tool_call is not None
            ],
            "usage": (
                cast(dict[str, JsonValue], self.usage)
                if self.usage is not None
                else None
            ),
            "accepted_events": self.accepted_events,
            "duplicates_ignored": self.duplicates_ignored,
        }


class StreamAssembler:
    """Assemble provider-neutral events without exposing partial tool calls."""

    def __init__(self) -> None:
        self._response_id: str | None = None
        self._expected_sequence = 0
        self._seen_events: dict[str, dict[str, JsonValue]] = {}
        self._text_parts: list[str] = []
        self._tool_call: Action | None = None
        self._tool_call_id: str | None = None
        self._tool_name: str | None = None
        self._idempotency_key: str | None = None
        self._argument_parts: list[str] = []
        self._usage: dict[str, int] | None = None
        self._terminal: str | None = None
        self._failure: tuple[StreamErrorCode, str] | None = None
        self._duplicates_ignored = 0

    def accept(self, event: dict[str, JsonValue]) -> None:
        if self._failure is not None:
            code, message = self._failure
            raise StreamProtocolError(code, message)
        try:
            self._accept_event(event)
        except StreamProtocolError as exc:
            self._failure = (exc.code, str(exc))
            raise

    def _accept_event(self, event: dict[str, JsonValue]) -> None:

        event_id = _required_string(event, "event_id")
        sequence = _required_non_negative_int(event, "sequence")
        event_type = _required_string(event, "type")
        response_id = _required_string(event, "response_id")

        previous = self._seen_events.get(event_id)
        if previous is not None:
            if previous == event:
                self._duplicates_ignored += 1
                return
            self._abort(
                StreamErrorCode.SEQUENCE_CONFLICT,
                f"event_id {event_id} was reused with different content",
            )

        if self._terminal is not None:
            self._abort(
                StreamErrorCode.STATE_VIOLATION,
                f"event {event_type} arrived after terminal {self._terminal}",
            )
        if sequence != self._expected_sequence:
            self._abort(
                StreamErrorCode.SEQUENCE_CONFLICT,
                f"expected sequence {self._expected_sequence}, received {sequence}",
            )
        if self._response_id is None:
            if event_type != "response_started":
                self._abort(
                    StreamErrorCode.STATE_VIOLATION,
                    "the first event must be response_started",
                )
            self._response_id = response_id
        elif response_id != self._response_id:
            self._abort(
                StreamErrorCode.RESPONSE_MISMATCH,
                f"response changed from {self._response_id} to {response_id}",
            )

        self._dispatch(event_type, event)
        self._seen_events[event_id] = dict(event)
        self._expected_sequence += 1

    def finish(self) -> AssembledResponse:
        if self._failure is not None:
            code, message = self._failure
            raise StreamProtocolError(code, message)
        if self._terminal != "response_completed" or self._response_id is None:
            self._abort(
                StreamErrorCode.INCOMPLETE_STREAM,
                "stream ended without response_completed",
            )
        if self._tool_call_id is not None:
            self._abort(
                StreamErrorCode.INCOMPLETE_STREAM,
                f"tool call {self._tool_call_id} did not complete",
            )
        if not self._text_parts and self._tool_call is None:
            self._abort(StreamErrorCode.STATE_VIOLATION, "completed response has no content")
        return AssembledResponse(
            response_id=self._response_id,
            text="".join(self._text_parts),
            actions=(self._tool_call,) if self._tool_call is not None else (),
            usage=dict(self._usage) if self._usage is not None else None,
            accepted_events=len(self._seen_events),
            duplicates_ignored=self._duplicates_ignored,
        )

    def _dispatch(self, event_type: str, event: dict[str, JsonValue]) -> None:
        base = {"event_id", "sequence", "type", "response_id"}
        if event_type == "response_started":
            _require_exact_fields(event, base, event_type)
            if self._expected_sequence != 0:
                self._abort(StreamErrorCode.STATE_VIOLATION, "response_started must be first")
            return
        if event_type == "text_delta":
            _require_exact_fields(event, base | {"delta"}, event_type)
            self._text_parts.append(_required_string(event, "delta", allow_empty=True))
            return
        if event_type == "tool_call_started":
            _require_exact_fields(
                event,
                base | {"call_id", "name", "idempotency_key"},
                event_type,
            )
            if self._tool_call is not None or self._tool_call_id is not None:
                self._abort(
                    StreamErrorCode.UNSUPPORTED_PARALLEL_CALLS,
                    "v1 assembler accepts one tool call per response",
                )
            self._tool_call_id = _required_string(event, "call_id")
            self._tool_name = _required_string(event, "name")
            self._idempotency_key = _required_string(event, "idempotency_key")
            self._argument_parts = []
            return
        if event_type == "tool_arguments_delta":
            _require_exact_fields(event, base | {"call_id", "delta"}, event_type)
            self._require_open_tool_call(_required_string(event, "call_id"))
            self._argument_parts.append(_required_string(event, "delta", allow_empty=True))
            return
        if event_type == "tool_call_completed":
            _require_exact_fields(event, base | {"call_id"}, event_type)
            call_id = _required_string(event, "call_id")
            self._require_open_tool_call(call_id)
            try:
                arguments_value = json.loads("".join(self._argument_parts))
                if not isinstance(arguments_value, dict):
                    raise TypeError("tool arguments must decode to an object")
                action = Action.tool(
                    ToolCall(
                        call_id=call_id,
                        name=cast(str, self._tool_name),
                        arguments=cast(dict[str, JsonValue], arguments_value),
                        idempotency_key=cast(str, self._idempotency_key),
                    )
                )
                action = Action.from_dict(action_to_wire(action))
            except (ContractError, json.JSONDecodeError, TypeError) as exc:
                self._abort(
                    StreamErrorCode.INVALID_TOOL_ARGUMENTS,
                    f"tool arguments are not valid JSON object data: {type(exc).__name__}",
                )
            self._tool_call = action
            self._tool_call_id = None
            self._tool_name = None
            self._idempotency_key = None
            self._argument_parts = []
            return
        if event_type == "usage":
            _require_exact_fields(event, base | {"input_tokens", "output_tokens"}, event_type)
            if self._usage is not None:
                self._abort(StreamErrorCode.STATE_VIOLATION, "usage may appear only once")
            self._usage = {
                "input_tokens": _required_non_negative_int(event, "input_tokens"),
                "output_tokens": _required_non_negative_int(event, "output_tokens"),
            }
            return
        if event_type == "response_completed":
            _require_exact_fields(event, base, event_type)
            if self._tool_call_id is not None:
                self._abort(
                    StreamErrorCode.INCOMPLETE_STREAM,
                    f"response completed before tool call {self._tool_call_id}",
                )
            self._terminal = event_type
            return
        if event_type == "response_error":
            _require_exact_fields(event, base | {"code", "message"}, event_type)
            code = _required_string(event, "code")
            message = _required_string(event, "message")
            self._terminal = event_type
            self._abort(StreamErrorCode.PROVIDER_ERROR, f"provider error {code}: {message}")
        if event_type == "response_cancelled":
            _require_exact_fields(event, base, event_type)
            self._terminal = event_type
            self._abort(StreamErrorCode.CANCELLED, "provider response was cancelled")
        self._abort(StreamErrorCode.INVALID_EVENT, f"unsupported event type: {event_type}")

    def _require_open_tool_call(self, call_id: str) -> None:
        if self._tool_call_id is None:
            self._abort(StreamErrorCode.STATE_VIOLATION, "tool delta has no open tool call")
        if call_id != self._tool_call_id:
            self._abort(
                StreamErrorCode.STATE_VIOLATION,
                f"tool call changed from {self._tool_call_id} to {call_id}",
            )

    def _abort(self, code: StreamErrorCode, message: str) -> NoReturn:
        self._failure = (code, message)
        raise StreamProtocolError(code, message)


def action_to_wire(action: Action) -> dict[str, JsonValue]:
    if action.kind != "tool" or action.tool_call is None:
        raise ContractError("stream assembler only emits tool actions")
    return {
        "kind": "tool",
        "tool_call": {
            "call_id": action.tool_call.call_id,
            "name": action.tool_call.name,
            "arguments": action.tool_call.arguments,
            "idempotency_key": action.tool_call.idempotency_key,
        },
        "cost_usd": action.cost_usd,
    }


def _required_string(
    event: dict[str, JsonValue], key: str, *, allow_empty: bool = False
) -> str:
    value = event.get(key)
    if not isinstance(value, str) or (not allow_empty and not value):
        raise StreamProtocolError(
            StreamErrorCode.INVALID_EVENT,
            f"{key} must be {'a string' if allow_empty else 'a non-empty string'}",
        )
    return value


def _required_non_negative_int(event: dict[str, JsonValue], key: str) -> int:
    value = event.get(key)
    if not isinstance(value, int) or isinstance(value, bool) or value < 0:
        raise StreamProtocolError(
            StreamErrorCode.INVALID_EVENT,
            f"{key} must be a non-negative integer",
        )
    return value


def _require_exact_fields(
    event: dict[str, JsonValue], expected: set[str], label: str
) -> None:
    missing = expected.difference(event)
    unknown = set(event).difference(expected)
    if missing or unknown:
        raise StreamProtocolError(
            StreamErrorCode.INVALID_EVENT,
            f"{label} fields differ; missing={sorted(missing)}, unknown={sorted(unknown)}",
        )


__all__ = [
    "AssembledResponse",
    "StreamAssembler",
    "StreamErrorCode",
    "StreamProtocolError",
]
