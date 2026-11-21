"""Detail probe: exact tool schemas for the calls the flow uses, plus current synthetic data shapes."""
import asyncio
import json
import os
import sys

import httpx

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from app import config  # noqa: E402,F401

E = os.environ.get


async def session_do(url, headers, fn):
    from mcp import ClientSession
    from mcp.client.streamable_http import streamablehttp_client
    async with streamablehttp_client(url, headers=headers or {}) as (r, w, _):
        async with ClientSession(r, w) as s:
            await s.initialize()
            return await fn(s)


def schemas(url, headers, names=None, match=None):
    async def fn(s):
        out = {}
        for t in (await s.list_tools()).tools:
            if (names and t.name in names) or (match and any(m in t.name for m in match)):
                out[t.name] = {"desc": (t.description or "")[:200], "schema": t.inputSchema}
        return out
    return asyncio.run(session_do(url, headers, fn))


def call(url, headers, name, args):
    async def fn(s):
        r = await s.call_tool(name, args)
        return r.isError, [getattr(c, "text", "")[:1500] for c in r.content]
    return asyncio.run(session_do(url, headers, fn))


what = sys.argv[1]
if what == "stripe":
    async def names(s):
        return [t.name for t in (await s.list_tools()).tools]
    print(asyncio.run(session_do(E("FIREDRILL_STRIPE_MCP_URL"), {}, names)))
    for k, v in schemas(E("FIREDRILL_STRIPE_MCP_URL"), {}, match=["payment_intents.create", "payment_intents.confirm", "checkout"]).items():
        props = v["schema"].get("properties", {})
        print(k, "|", v["desc"], "| req:", v["schema"].get("required"), "| props:", list(props)[:30])
if what == "senso":
    h = {"Authorization": f"Bearer {E('SENSO_API_KEY')}"}
    for k, v in schemas(E("SENSO_MCP_URL"), h, names=["senso_check_text", "senso_get_text_check", "senso_create_doc", "senso_search", "senso_list"]).items():
        print(k, "|", v["desc"], "|", json.dumps(v["schema"].get("properties"))[:500], "| req:", v["schema"].get("required"))
    print(call(E("SENSO_MCP_URL"), h, "senso_list", {"org_id": E("SENSO_ORG_ID")}))
if what == "calendar":
    print(call(E("FIREDRILL_GOOGLE_CALENDAR_MCP_URL"), {}, "calendarList.list", {}))
    print(call(E("FIREDRILL_GOOGLE_CALENDAR_MCP_URL"), {}, "events.list", {"calendarId": "primary", "maxResults": 10}))
if what == "gmail":
    print(call(E("FIREDRILL_GMAIL_MCP_URL"), {}, "profile.get", {"userId": "me"}))
    print(call(E("FIREDRILL_GMAIL_MCP_URL"), {}, "messages.list", {"userId": "me", "maxResults": 5}))
if what == "slack":
    print(call(E("FIREDRILL_SLACK_MCP_URL"), {}, "conversations.list", {"limit": 20}))
if what == "cognee":
    base = E("COGNEE_BASE_URL").rstrip("/")
    spec = httpx.get(base + "/openapi.json", headers={"X-Api-Key": E("COGNEE_API_KEY")}, timeout=20).json()
    comps = spec.get("components", {}).get("schemas", {})
    for p in ("/api/v1/remember", "/api/v1/recall", "/api/v1/add_text", "/api/v1/forget", "/api/v1/datasets/", "/api/v1/search"):
        for m, op in spec["paths"].get(p, {}).items():
            body = op.get("requestBody", {}).get("content", {})
            ref = None
            for ct, c in body.items():
                ref = c.get("schema", {}).get("$ref", "") or json.dumps(c.get("schema"))[:200]
                name = ref.split("/")[-1] if ref.startswith("#") else None
                props = comps.get(name, {}).get("properties", {}) if name else {}
                print(m.upper(), p, ct, "| req:", comps.get(name, {}).get("required"),
                      "| props:", {k: (v.get("type") or v.get("anyOf") or v.get("$ref")) for k, v in props.items()} if props else ref)
            if not body:
                print(m.upper(), p, "params:", [x["name"] for x in op.get("parameters", [])])
    print("security:", spec.get("components", {}).get("securitySchemes"))
