import copy
import json

import pytest
from about_harness.source_labs import data, document, read_sources, research, run_sources


def test_raw_sources_are_parsed_and_verified():
    result = run_sources()
    assert result["passed"] is True
    sources = read_sources()
    assert research(sources)["independent_sources"] == 2
    assert data(sources)["mean_points"] == 5


def test_csv_rejects_duplicate_keys_and_nonfinite_scores():
    sources = read_sources()
    for changed in [
        sources["scores.csv"].replace("u-2", "u-1"),
        sources["scores.csv"].replace("7.5", "NaN"),
    ]:
        with pytest.raises(ValueError):
            data({**sources, "scores.csv": changed})


def test_document_does_not_fall_back_to_denied_old_version():
    sources = read_sources()
    catalog = json.loads(sources["documents.json"])
    catalog[1]["allowed"] = False
    assert document({**sources, "documents.json": json.dumps(catalog)})["status"] == "access_denied"
    catalog.append(copy.deepcopy(catalog[0]))
    with pytest.raises(ValueError, match="duplicate"):
        document({**sources, "documents.json": json.dumps(catalog)})


def test_parsing_failure_and_unsupported_claim_are_not_silently_accepted():
    sources = read_sources()
    with pytest.raises(ValueError, match="active document"):
        document({**sources, "handbook-v2.html": "<script>invalid</script>"})
    assert research(sources)["insufficient"] == ["deletion_process"]
    with pytest.raises(ValueError, match="assertion failed"):
        research({**sources, "policy-b.md": "No retention statement."})
