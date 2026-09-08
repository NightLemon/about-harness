import operator
import sys
from pathlib import Path
from typing import Annotated, TypedDict

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
import shared

shared.activate()
from langgraph.checkpoint.memory import InMemorySaver  # noqa: E402
from langgraph.graph import END, START, StateGraph  # noqa: E402
from langgraph.types import Command, interrupt  # noqa: E402
from shared import finish, materials  # noqa: E402


class State(TypedDict, total=False):
    records: list
    branches: Annotated[list, operator.add]
    output: dict
    approved: bool


calls = 0


def read_materials(state):
    global calls
    calls += 1
    return {"records": materials()}


def resolve(state):
    records = state["branches"]
    return {
        "output": {
            "retention_days": sorted({r["retention_days"] for r in records}),
            "sources": sorted(r["id"] for r in records),
            "status": "conflict",
        }
    }


def review(state):
    approved = interrupt({"question": "Preserve both conflicting sources?"})
    if approved is not True:
        raise ValueError("review denied")
    return {"approved": True}


builder = StateGraph(State)
builder.add_node("read", read_materials)
builder.add_node("first", lambda state: {"branches": state["records"][:1]})
builder.add_node("remaining", lambda state: {"branches": state["records"][1:]})
builder.add_node("resolve", resolve)
builder.add_node("review", review)
builder.add_edge(START, "read")
builder.add_edge("read", "first")
builder.add_edge("read", "remaining")
builder.add_edge(["first", "remaining"], "resolve")
builder.add_conditional_edges(
    "resolve", lambda state: "review" if state["output"]["status"] == "conflict" else END
)
builder.add_edge("review", END)
graph = builder.compile(checkpointer=InMemorySaver())
config = {"configurable": {"thread_id": "offline-study"}, "recursion_limit": 8}
paused = graph.invoke({}, config)
assert paused["__interrupt__"]
assert graph.get_state(config).next == ("review",)
resumed = graph.invoke(Command(resume=True), config)
finish(
    "LangGraph",
    ["langgraph"],
    resumed["output"],
    {
        "tool_calls": calls,
        "merged_sources": len(resumed["branches"]),
        "interrupted": True,
        "resumed": resumed["approved"],
        "next": list(graph.get_state(config).next),
    },
)
