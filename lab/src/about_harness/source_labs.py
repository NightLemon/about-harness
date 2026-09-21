"""Read raw local sources before deterministic domain validation (E1)."""

from __future__ import annotations

import csv
import hashlib
import io
import json
import math
import re
from html.parser import HTMLParser
from pathlib import Path
from typing import Any, cast

from about_harness.contracts import JsonValue

ROOT = Path(__file__).resolve().parents[3] / "lab/fixtures/sources-v2"


def read_sources(root: Path = ROOT) -> dict[str, str]:
    manifest = json.loads((root / "manifest.json").read_text(encoding="utf-8"))
    output: dict[str, str] = {}
    for name, expected in manifest["files"].items():
        file = root / name
        if not file.resolve().is_relative_to(root.resolve()) or file.is_symlink():
            raise ValueError("source path escapes fixture root")
        data = file.read_bytes()
        if hashlib.sha256(data).hexdigest() != expected:
            raise ValueError("raw source hash mismatch")
        output[name] = data.decode("utf-8")
    return output


def research(sources: dict[str, str]) -> dict[str, JsonValue]:
    evidence: list[JsonValue] = []
    roots: set[str] = set()
    values: set[int] = set()
    for name in ("policy-a.md", "policy-b.md", "policy-copy.md"):
        text = sources[name]
        parent = re.search(r"^derived_from: (.+)$", text, re.M)
        roots.add(parent.group(1) if parent else name)
        for line, quote in enumerate(text.splitlines(), start=1):
            match = re.fullmatch(r"Records are retained for (\d+) days\.", quote)
            if match:
                value = int(match.group(1))
                values.add(value)
                evidence.append(
                    {
                        "source": name,
                        "line": line,
                        "quote": quote,
                        "sha256": hashlib.sha256(text.encode()).hexdigest(),
                        "value": value,
                    }
                )
    if len(evidence) != 3 or len(roots) != 2 or values != {30, 45}:
        raise ValueError("research source, conflict or independence assertion failed")
    return {
        "status": "conflict",
        "values": cast(list[JsonValue], sorted(values)),
        "citations": evidence,
        "independent_sources": len(roots),
        "insufficient": ["deletion_process"],
    }


def data(sources: dict[str, str]) -> dict[str, JsonValue]:
    reader = csv.DictReader(io.StringIO(sources["scores.csv"]))
    if reader.fieldnames != ["user_id", "score", "email", "cohort"]:
        raise ValueError("CSV schema drift")
    rows: list[JsonValue] = []
    ids: set[str] = set()
    values: list[float] = []
    for source in reader:
        if None in source or not all(value is not None for value in source.values()):
            raise ValueError("CSV row shape mismatch")
        identifier = source["user_id"]
        if not identifier or identifier in ids:
            raise ValueError("duplicate or missing user_id")
        ids.add(identifier)
        raw = source["score"]
        state = "missing" if raw == "" else "null" if raw == "null" else "value"
        score = float(raw) if state == "value" else None
        if score is not None:
            if not math.isfinite(score) or not 0 <= score <= 10:
                raise ValueError("score outside finite points range")
            values.append(score)
        rows.append(
            {
                "user_id": identifier,
                "score": score,
                "score_state": state,
                "email": "[REDACTED]" if source["email"] else None,
                "cohort": source["cohort"],
            }
        )
    # Recompute using a second expression; the denominator includes only observed scores.
    total = sum(values)
    result = {
        "input_rows": len(ids),
        "output_rows": len(rows),
        "known_scores": len(values),
        "sum_points": total,
        "mean_points": total / len(values) if values else None,
        "rows": rows,
    }
    if len(rows) != 4 or total != 10 or len(values) != 2:
        raise ValueError("CSV population or arithmetic assertion failed")
    return cast(dict[str, JsonValue], result)


class Blocks(HTMLParser):
    def __init__(self) -> None:
        super().__init__()
        self.blocks: dict[str, str] = {}
        self.current: str | None = None

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        if tag in {"script", "iframe", "object"}:
            raise ValueError("active document content is unsupported")
        if tag == "p":
            identifier = dict(attrs).get("id")
            if not identifier or identifier in self.blocks:
                raise ValueError("missing or duplicate block identity")
            self.current = identifier
            self.blocks[identifier] = ""

    def handle_data(self, data: str) -> None:
        if self.current:
            self.blocks[self.current] += data

    def handle_endtag(self, tag: str) -> None:
        if tag == "p":
            self.current = None


def document(sources: dict[str, str], query: str = "retention policy") -> dict[str, JsonValue]:
    catalog = json.loads(sources["documents.json"])
    latest: dict[str, dict[str, Any]] = {}
    seen: set[tuple[str, int]] = set()
    for item in catalog:
        identity = (item["doc_id"], item["version"])
        if identity in seen:
            raise ValueError("duplicate document version")
        seen.add(identity)
        if item["published"] and item["effective"] <= "2026-09-08":
            previous = latest.get(item["doc_id"])
            if previous is None or item["version"] > previous["version"]:
                latest[item["doc_id"]] = item
    eligible = latest["handbook"]
    if not eligible["allowed"]:
        return {"status": "access_denied", "answer": None, "citations": []}
    raw = sources[eligible["file"]]
    parser = Blocks()
    if eligible["file"].endswith(".html"):
        parser.feed(raw)
        if parser.current is not None:
            raise ValueError("unclosed document block")
        blocks = parser.blocks
    else:
        blocks = {
            f"paragraph-{i}": block.strip()
            for i, block in enumerate(raw.split("\n\n"))
            if block.strip()
        }
    terms = set(re.findall(r"\w+", query.casefold()))
    if not terms:
        raise ValueError("empty query")
    for identifier, text in blocks.items():
        if terms.issubset(set(re.findall(r"\w+", text.casefold()))):
            return {
                "status": "answered",
                "answer": text,
                "citations": [
                    {
                        "doc_id": "handbook",
                        "version": eligible["version"],
                        "file": eligible["file"],
                        "block_id": identifier,
                        "sha256": hashlib.sha256(raw.encode()).hexdigest(),
                        "quote": text,
                    }
                ],
            }
    return {"status": "insufficient", "answer": None, "citations": []}


def run_sources() -> dict[str, JsonValue]:
    sources = read_sources()
    outputs = {"research": research(sources), "data": data(sources), "document": document(sources)}
    assert outputs["document"]["answer"] == "The retention policy keeps records for 45 days."
    assert document(sources, "unmatched query")["status"] == "insufficient"
    return {
        "schema_version": "2.0",
        "evidence": "E1",
        "offline": True,
        "passed": True,
        "source_bundle_hash": hashlib.sha256((ROOT / "manifest.json").read_bytes()).hexdigest(),
        "outputs": cast(JsonValue, outputs),
    }
