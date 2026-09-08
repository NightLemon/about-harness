from __future__ import annotations

import argparse
import json
import os
import sys
from datetime import date
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "lab" / "src"))
from about_harness.adapters.responses import (
    HttpResponsesTransport,
    ReplayResponsesTransport,
    ResponsesAdapter,
)
from about_harness.contracts import Budgets, JsonValue, TaskSpec
from about_harness.loop import HarnessRunner
from about_harness.tools import ToolError, ToolRegistry

ROOT = Path(__file__).resolve().parents[1]


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Offline Responses protocol probe; live requires separate authorization"
    )
    parser.add_argument("--live", action="store_true")
    parser.add_argument("--model")
    parser.add_argument("--max-cost-usd", type=float)
    parser.add_argument("--timeout-ms", type=int)
    parser.add_argument("--input-price", type=float)
    parser.add_argument("--output-price", type=float)
    parser.add_argument("--price-checked")
    args = parser.parse_args()
    if args.live:
        if not all(
            value is not None
            for value in (
                args.model,
                args.max_cost_usd,
                args.timeout_ms,
                args.input_price,
                args.output_price,
                args.price_checked,
            )
        ):
            parser.error(
                "live requires explicit model, budget, timeout "
                "and reviewed input/output prices and date"
            )
        if not 0 <= (date.today() - date.fromisoformat(args.price_checked)).days <= 30:
            parser.error("price date must be inspected within the last 30 days")
        transport = HttpResponsesTransport(
            lambda: os.environ.get("OPENAI_API_KEY", ""), authorized=True
        )
    else:
        transport = ReplayResponsesTransport(
            json.loads((ROOT / "lab/fixtures/protocols/responses-v1.json").read_text())
        )
    definitions: list[dict[str, JsonValue]] = [
        {
            "type": "function",
            "name": "sum",
            "description": "Sum a bounded list of numbers.",
            "strict": True,
            "parameters": {
                "type": "object",
                "properties": {
                    "values": {"type": "array", "items": {"type": "number"}, "maxItems": 8}
                },
                "required": ["values"],
                "additionalProperties": False,
            },
        }
    ]
    adapter = ResponsesAdapter(
        transport,
        args.model or "offline-model",
        definitions,
        max_cost_usd=args.max_cost_usd or 0,
        timeout_ms=args.timeout_ms or 10000,
        input_price_per_million=args.input_price,
        output_price_per_million=args.output_price,
    )
    task = TaskSpec(
        "responses-probe",
        "Use sum to add 30 and 45, then return an object with answer.",
        ("sum",),
        Budgets(
            max_steps=3,
            max_model_calls=3,
            timeout_ms=args.timeout_ms or 10000,
            max_cost_usd=args.max_cost_usd or 0,
        ),
        acceptance={"answer": 75},
    )
    registry = ToolRegistry.with_safe_defaults()
    original = registry.handlers["sum"]

    def bounded_sum(arguments: dict[str, JsonValue]) -> JsonValue:
        if (
            set(arguments) != {"values"}
            or not isinstance(arguments["values"], list)
            or len(arguments["values"]) > 8
        ):
            raise ToolError("invalid bounded sum arguments")
        return original(arguments)

    registry.handlers["sum"] = bounded_sum
    result = HarnessRunner(adapter, registry).run(task)
    print(
        json.dumps(
            {
                "evidence": "E2" if args.live else "E1",
                "offline": not args.live,
                "result": result.to_dict(),
                "provider_observations": adapter.observations,
                "cost_note": (
                    "price estimate, not an invoice; "
                    "unknown requests remain in provider_observations"
                ),
            },
            ensure_ascii=False,
        )
    )
    return 0 if result.status.value == "completed" else 1


if __name__ == "__main__":
    raise SystemExit(main())
