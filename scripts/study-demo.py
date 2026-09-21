from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "lab" / "src"))
from about_harness.study_demo import CONFIG, default_output, run_study


def main() -> None:
    parser = argparse.ArgumentParser(description="Run the complete offline coding study")
    parser.add_argument("--config", type=Path, default=CONFIG)
    parser.add_argument("--output", type=Path)
    args = parser.parse_args()
    output = args.output or default_output()
    result = run_study(output, args.config)
    print(json.dumps(result, ensure_ascii=False, sort_keys=True))
    print("Report: " + output.as_posix() + "/report.md")


if __name__ == "__main__":
    main()
