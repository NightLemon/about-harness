"""Shared local materials, an external-network tripwire and independent assertions."""

import importlib.metadata
import json
import os
import socket
import sys
from pathlib import Path

os.environ["OTEL_SDK_DISABLED"] = "true"
os.environ["OPENAI_AGENTS_DISABLE_TRACING"] = "1"
os.environ["LANGSMITH_TRACING"] = "false"
for variable in list(os.environ):
    if any(word in variable.upper() for word in ("API_KEY", "AUTHORIZATION", "CREDENTIAL")):
        os.environ.pop(variable, None)

_connect = socket.socket.connect
_getaddrinfo = socket.getaddrinfo
external_attempts = []


def _check(host):
    if host not in ("localhost", "127.0.0.1", "::1", None):
        external_attempts.append("blocked")
        raise RuntimeError("external network disabled in offline framework example")


def _guard_connect(sock, address):
    if sock.family in (socket.AF_INET, socket.AF_INET6):
        _check(address[0])
    return _connect(sock, address)


def _guard_dns(host, *args, **kwargs):
    _check(host)
    return _getaddrinfo(host, *args, **kwargs)


def activate():
    socket.socket.connect = _guard_connect
    socket.getaddrinfo = _guard_dns


def materials():
    return json.loads(Path(__file__).with_name("materials.json").read_text(encoding="utf-8"))


def replay_answer():
    return json.loads(Path(__file__).with_name("replay-answer.json").read_text(encoding="utf-8"))


def expected():
    records = materials()
    return {
        "retention_days": sorted({record["retention_days"] for record in records}),
        "status": "conflict",
        "sources": sorted(record["id"] for record in records),
    }


def finish(framework, distributions, output, observations):
    if "--inject-failure" in sys.argv:
        output = {**output, "sources": []}
    if output != expected() or external_attempts or observations.get("tool_calls") != 1:
        raise AssertionError("framework result, tool execution or offline boundary failed")
    print(
        json.dumps(
            {
                "evidence": "E1",
                "offline": True,
                "framework": framework,
                "versions": {name: importlib.metadata.version(name) for name in distributions},
                "output": output,
                "observations": observations,
                "external_attempts": len(external_attempts),
                "passed": True,
            },
            ensure_ascii=False,
            sort_keys=True,
        )
    )
