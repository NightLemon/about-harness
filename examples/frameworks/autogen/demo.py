import asyncio
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
import shared

shared.activate()
from autogen_agentchat.agents import AssistantAgent  # noqa: E402
from autogen_agentchat.conditions import MaxMessageTermination, TextMentionTermination  # noqa: E402
from autogen_agentchat.teams import RoundRobinGroupChat  # noqa: E402
from autogen_core import FunctionCall  # noqa: E402
from autogen_core.models import CreateResult, RequestUsage  # noqa: E402
from autogen_ext.models.replay import ReplayChatCompletionClient  # noqa: E402
from shared import finish, materials, replay_answer  # noqa: E402

calls = 0


def read_materials() -> str:
    """Read two fixed local policy records."""
    global calls
    calls += 1
    return json.dumps(materials())


async def main():
    tool_response = CreateResult(
        finish_reason="function_calls",
        content=[FunctionCall(id="read-1", name="read_materials", arguments="{}")],
        usage=RequestUsage(prompt_tokens=0, completion_tokens=0),
        cached=False,
    )
    reader_client = ReplayChatCompletionClient(
        [tool_response],
        model_info={
            "vision": False,
            "function_calling": True,
            "json_output": True,
            "family": "unknown",
            "structured_output": True,
        },
    )
    reviewer_client = ReplayChatCompletionClient([json.dumps(replay_answer()) + "\nTERMINATE"])
    reader = AssistantAgent(
        "reader", model_client=reader_client, tools=[read_materials], reflect_on_tool_use=False
    )
    reviewer = AssistantAgent("reviewer", model_client=reviewer_client)
    team = RoundRobinGroupChat(
        [reader, reviewer],
        termination_condition=TextMentionTermination("TERMINATE") | MaxMessageTermination(6),
        max_turns=3,
    )
    result = await team.run(task="Review the local retention policies.")
    assert result.messages[-1].source == "reviewer"
    assert result.stop_reason
    final = json.loads(result.messages[-1].content.split("\nTERMINATE")[0])
    finish(
        "AutoGen",
        ["autogen-agentchat", "autogen-ext"],
        final,
        {
            "tool_calls": calls,
            "messages": len(result.messages),
            "terminated": True,
            "participants": sorted(
                {message.source for message in result.messages if message.source != "user"}
            ),
        },
    )
    await reader_client.close()
    await reviewer_client.close()


asyncio.run(main())
