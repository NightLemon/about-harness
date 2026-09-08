import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
import shared

shared.activate()
from agents import Agent, Model, Runner, function_tool, set_tracing_disabled  # noqa: E402
from agents.items import ModelResponse  # noqa: E402
from agents.usage import Usage  # noqa: E402
from openai.types.responses import (  # noqa: E402
    ResponseFunctionToolCall,
    ResponseOutputMessage,
    ResponseOutputText,
)
from shared import finish, materials, replay_answer  # noqa: E402

set_tracing_disabled(True)
calls = 0


@function_tool
def read_materials() -> str:
    """Read the two fixed local policy records."""
    global calls
    calls += 1
    return json.dumps(materials())


class ReplayModel(Model):
    def __init__(self):
        self.requests = 0
        self.result_received = False

    async def get_response(self, system_instructions, input, *args, **kwargs):
        self.requests += 1
        if self.requests == 1:
            output = [
                ResponseFunctionToolCall(
                    type="function_call",
                    id="fc-local",
                    call_id="read-1",
                    name="read_materials",
                    arguments="{}",
                    status="completed",
                )
            ]
        else:
            self.result_received = any(
                isinstance(item, dict)
                and item.get("type") == "function_call_output"
                and item.get("call_id") == "read-1"
                for item in input
            )
            assert self.result_received
            output = [
                ResponseOutputMessage(
                    type="message",
                    id="msg-local",
                    role="assistant",
                    status="completed",
                    content=[
                        ResponseOutputText(
                            type="output_text", text=json.dumps(replay_answer()), annotations=[]
                        )
                    ],
                )
            ]
        return ModelResponse(output=output, usage=Usage(), response_id=f"fake-{self.requests}")

    async def stream_response(self, *args, **kwargs):
        raise NotImplementedError("non-streaming offline example")
        yield  # pragma: no cover


model = ReplayModel()
agent = Agent(
    name="policy-reviewer",
    instructions="Read the local sources and preserve conflicts.",
    model=model,
    tools=[read_materials],
)
result = Runner.run_sync(agent, "Review retention policy.", max_turns=3)
finish(
    "OpenAI Agents SDK",
    ["openai-agents"],
    json.loads(result.final_output),
    {
        "tool_calls": calls,
        "model_requests": model.requests,
        "tool_result_received": model.result_received,
    },
)
