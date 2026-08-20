from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

ROOT = Path(__file__).parents[1]
sys.path.insert(0, str(ROOT / "lab" / "src"))

from about_harness.labs import LAB_NAMES, execute_fixture, load_fixture, run_all  # noqa: E402

FIXTURES = ROOT / "lab" / "fixtures"


def main() -> int:
    parser = argparse.ArgumentParser(description="Run deterministic About Harness M5 labs")
    parser.add_argument("case", nargs="?", choices=(*LAB_NAMES, "all"), default="all")
    args = parser.parse_args()
    results = (
        run_all(FIXTURES)
        if args.case == "all"
        else [execute_fixture(load_fixture(FIXTURES, args.case))]
    )
    summary = {
        "schema_version": "1.0",
        "evidence": "E1",
        "offline": True,
        "cases": results,
        "passed": all(result["passed"] is True for result in results),
    }
    print(json.dumps(summary, ensure_ascii=False, sort_keys=True))
    return 0 if summary["passed"] else 1


if __name__ == "__main__":
    raise SystemExit(main())
