import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "lab/src"))
from about_harness.source_labs import run_sources

print(json.dumps(run_sources(), ensure_ascii=False, sort_keys=True))
