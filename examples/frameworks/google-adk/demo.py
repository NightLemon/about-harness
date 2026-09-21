import asyncio
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
import shared

shared.activate()
from google.adk.agents import LlmAgent  # noqa: E402
from google.adk.models.base_llm import BaseLlm  # noqa: E402
from google.adk.models.llm_response import LlmResponse  # noqa: E402
from google.adk.runners import Runner  # noqa: E402
from google.adk.sessions import InMemorySessionService  # noqa: E402
from google.adk.tools import ToolContext  # noqa: E402
from google.genai import types  # noqa: E402
from pydantic import PrivateAttr  # noqa: E402
from shared import finish, materials, replay_answer  # noqa: E402


def read_materials(tool_context: ToolContext) -> dict:
    """Read fixed policy records and persist the read count in this session."""
    tool_context.state["reads"] = tool_context.state.get("reads", 0) + 1
    return {"records": materials()}


class ReplayModel(BaseLlm):
    _requests: int = PrivateAttr(default=0)
    _received: bool = PrivateAttr(default=False)

    async def generate_content_async(self, llm_request, stream=False):
        assert not stream
        self._requests += 1
        if self._requests == 1:
            part = types.Part.from_function_call(name="read_materials", args={})
        else:
            self._received = any(
                part.function_response is not None
                for content in llm_request.contents
                for part in (content.parts or [])
            )
            assert self._received
            part = types.Part.from_text(text=json.dumps(replay_answer()))
        yield LlmResponse(content=types.Content(role="model", parts=[part]))


async def main():
    model = ReplayModel(model="offline-policy-replay")
    sessions = InMemorySessionService()
    await sessions.create_session(app_name="local_policy", user_id="learner", session_id="one")
    runner = Runner(
        app_name="local_policy",
        agent=LlmAgent(
            name="reviewer",
            model=model,
            instruction="Read local sources and retain conflict.",
            tools=[read_materials],
        ),
        session_service=sessions,
    )
    event_count = 0
    final = None
    async for event in runner.run_async(
        user_id="learner",
        session_id="one",
        new_message=types.Content(
            role="user", parts=[types.Part.from_text(text="Review retention policy.")]
        ),
    ):
        event_count += 1
        if event.is_final_response() and event.content:
            final = json.loads(event.content.parts[0].text)
    session = await sessions.get_session(
        app_name="local_policy", user_id="learner", session_id="one"
    )
    finish(
        "Google ADK",
        ["google-adk"],
        final,
        {
            "tool_calls": session.state["reads"],
            "events": event_count,
            "model_requests": model._requests,
            "tool_result_received": model._received,
        },
    )
    await runner.close()


asyncio.run(main())
