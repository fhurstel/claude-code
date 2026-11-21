"""Probe each integration. Prints statuses, tool names and response shapes only; never keys or URLs."""
import asyncio
import json
import os
import sys

import httpx

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from app import config  # noqa: E402,F401  (loads .env)

E = os.environ.get
only = set(sys.argv[1:])


def want(n):
    return not only or n in only


def short(x, n=300):
    s = x if isinstance(x, str) else json.dumps(x)
    return s[:n]


async def mcp_tools(url, headers=None):
    from mcp import ClientSession
    from mcp.client.streamable_http import streamablehttp_client
    async with streamablehttp_client(url, headers=headers or {}) as (r, w, _):
        async with ClientSession(r, w) as s:
            await s.initialize()
            return [(t.name, list((t.inputSchema or {}).get("properties", {}).keys())) for t in (await s.list_tools()).tools]


def run(name, fn):
    if not want(name):
        return
    try:
        print(f"== {name}: {fn()}")
    except Exception as e:
        print(f"== {name}: ERROR {type(e).__name__}: {short(str(e), 200)}")


def nebius():
    r = httpx.post("https://api.tokenfactory.nebius.com/v1/chat/completions", timeout=60,
                   headers={"Authorization": f"Bearer {E('NEBIUS_API_KEY')}"},
                   json={"model": "nvidia/Nemotron-3_5-Lightning", "max_tokens": 400,
                         "messages": [{"role": "user", "content": "Reply with the word ok."}]})
    j = r.json()
    return r.status_code, short(j.get("choices", [{}])[0].get("message", {}).get("content") or j, 120)


def firedrill(app):
    def f():
        tools = asyncio.run(mcp_tools(E(f"FIREDRILL_{app}_MCP_URL")))
        return f"{len(tools)} tools: " + "; ".join(f"{n}({','.join(a)})" for n, a in tools)[:1500]
    return f


def senso():
    out = []
    for h in ({"Authorization": f"Bearer {E('SENSO_API_KEY')}"}, {"X-API-Key": E("SENSO_API_KEY")}):
        try:
            tools = asyncio.run(mcp_tools(E("SENSO_MCP_URL"), h))
            return f"auth={list(h)[0]} ok, {len(tools)} tools, has check_text={any(n=='senso_check_text' for n,_ in tools)}"
        except Exception as e:
            out.append(f"{list(h)[0]}: {type(e).__name__} {short(str(e), 120)}")
    return " | ".join(out)


def cognee():
    base = E("COGNEE_BASE_URL").rstrip("/")
    res = []
    for p in ("/health", "/api/v1/datasets", "/openapi.json"):
        for h in ({"X-Api-Key": E("COGNEE_API_KEY")}, {"Authorization": f"Bearer {E('COGNEE_API_KEY')}"}):
            r = httpx.get(base + p, headers=h, timeout=20)
            res.append(f"{p} {list(h)[0]}={r.status_code}")
            if r.status_code == 200 and p == "/openapi.json":
                paths = list(r.json().get("paths", {}).keys())
                res.append("paths: " + ", ".join(paths)[:900])
                break
    return " | ".join(res)


def singlestore():
    from app.db import DB  # noqa
    import pymysql  # noqa
    os.environ.setdefault("SINGLESTORE_URL", E("SINGLESTORE_URL"))
    d = DB()
    return f"connected kind={d.kind}"


def persona():
    r = httpx.get(f"https://withpersona.com/api/v1/inquiry-templates/{E('PERSONA_TEMPLATE_ID')}", timeout=20,
                  headers={"Authorization": f"Bearer {E('PERSONA_API_KEY')}", "Persona-Version": "2023-01-05"})
    return r.status_code, short(r.json().get("data", {}).get("attributes", {}).get("name", r.text), 100)


def statsig():
    r = httpx.post("https://api.statsig.com/v1/get_config", timeout=15, headers={"statsig-api-key": E("STATSIG_SERVER_SECRET")},
                   json={"user": {"userID": "shivay"}, "configName": "agent_settings"})
    return r.status_code, short(r.text, 200)


def amplitude():
    r = httpx.post("https://api2.amplitude.com/2/httpapi", timeout=15,
                   json={"api_key": E("AMPLITUDE_API_KEY"), "events": [{"event_type": "probe", "user_id": "probe-user"}]})
    return r.status_code, short(r.text, 150)


def sie():
    base = E("SIE_ENDPOINT").rstrip("/")
    res = []
    for p in ("/models", "/openapi.json", ""):
        r = httpx.get(base + p, headers={"Authorization": f"Bearer {E('SIE_API_KEY')}"}, timeout=20)
        res.append(f"GET {p or '/'}={r.status_code} {short(r.text, 250)}")
    return " | ".join(res)


def tokens():
    r = httpx.post(E("TOKENS_OBSERVE_INGEST_URL"), timeout=15, headers={"Authorization": f"Bearer {E('TOKENS_OBSERVE_API_KEY')}"},
                   json={"events": [{"type": "probe", "name": "occasions.probe", "attributes": {"ok": True}}]})
    return r.status_code, short(r.text, 300)


run("nebius", nebius)
for app in ("GOOGLE_CALENDAR", "GMAIL", "SLACK", "STRIPE"):
    run(f"firedrill_{app.lower()}", firedrill(app))
run("senso", senso)
run("cognee", cognee)
run("singlestore", singlestore)
run("persona", persona)
run("statsig", statsig)
run("amplitude", amplitude)
run("sie", sie)
run("tokens", tokens)
