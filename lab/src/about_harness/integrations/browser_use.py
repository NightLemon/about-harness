from __future__ import annotations

from urllib.parse import urlparse

from about_harness.contracts import JsonValue
from about_harness.integrations.base import (
    IntegrationBoundary,
    IntegrationContractError,
    require_list,
    require_object,
    require_string,
)

BOUNDARY = IntegrationBoundary(
    name="Browser Use",
    distribution="browser-use",
    import_name="browser_use",
    representative_domain="browser",
)


def extract_local_catalog(payload: dict[str, JsonValue]) -> dict[str, JsonValue]:
    """Validate a synthetic page snapshot without starting a browser or importing Browser Use."""

    url = require_string(payload.get("url"), "url")
    parsed = urlparse(url)
    if parsed.scheme != "http" or parsed.hostname != "lab.local":
        raise IntegrationContractError("browser lab only permits http://lab.local")

    rows = require_list(payload.get("rows"), "rows")
    records: list[JsonValue] = []
    for index, raw in enumerate(rows):
        row = require_object(raw, f"rows[{index}]")
        records.append(
            {
                "sku": require_string(row.get("sku"), f"rows[{index}].sku"),
                "name": require_string(row.get("name"), f"rows[{index}].name"),
            }
        )

    page_text = require_string(payload.get("page_text"), "page_text")
    injection_refused = "ignore previous" in page_text.casefold()
    return {
        "records": records,
        "injection_refused": injection_refused,
        "side_effects": 0,
        "integration": BOUNDARY.name,
        "mode": BOUNDARY.execution_mode,
    }
