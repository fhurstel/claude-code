"""Live demo check: a family member's own agent connects over the PUBLIC MCP URL and its preference changes the plan.

Usage (on the VM): set -a; . ./.env; set +a; python scripts/demo_family_mcp.py <public_web_url> <public_mcp_url>
"""
import asyncio
import json
import os
import sys

import httpx
from mcp import ClientSession
from mcp.client.streamable_http import streamablehttp_client

WEB, MCPBASE = sys.argv[1].rstrip("/"), sys.argv[2].rstrip("/")
tok = dict(p.split(":") for p in os.environ["MEMBER_TOKENS"].split(","))["dad"]


def detergent(p):
    q = next(q for q in p["quotes"] if q["source_key"] == p["recommended"])
    return next(i["offer"]["product"] for i in q["items"] if i["item"] == "laundry detergent")


httpx.post(WEB + "/api/g/reset", timeout=60)
for m, t in [("shivay", "We need laundry detergent for the flat"), ("shivay", "1 gallon of milk for me"), ("shivay", "a dozen eggs for the flat"), ("shivay", "2 loaves of bread for me")]:
    httpx.post(f"{WEB}/api/g/requests?member={m}", json={"text": t}, timeout=180)
p = httpx.post(WEB + "/api/g/plan?member=shivay", timeout=240).json()
print("BEFORE Alex's agent:", detergent(p))


async def alex():
    async with streamablehttp_client(f"{MCPBASE}/mcp?token={tok}") as (r, w, _):
        async with ClientSession(r, w) as s:
            await s.initialize()
            res = await s.call_tool("set_preference", {"subject": "laundry detergent", "value": "fragrance-free", "hard": True})
            print("Alex's agent set_preference ->", res.content[0].text)
            res = await s.call_tool("add_request", {"text": "2 cartons of oat milk for me"})
            print("Alex's agent add_request ->", res.content[0].text[:160])
            res = await s.call_tool("save_plan", {})
            d = json.loads(res.content[0].text)
            print("Alex's agent save_plan ->", d["recommended"], [(a["member"], a["amount"]) for a in d["allocations"]])


async def bad():
    async with streamablehttp_client(f"{MCPBASE}/mcp?token=wrong") as (r, w, _):
        async with ClientSession(r, w) as s:
            await s.initialize()
            res = await s.call_tool("get_group_context", {})
            print("wrong token ->", "rejected" if res.isError else "ACCEPTED (bad)", res.content[0].text[:60])


asyncio.run(alex())
p = httpx.get(WEB + "/api/g/snapshot?member=shivay", timeout=60).json()["plan"]
print("AFTER, as seen in Shivay's app:", detergent(p))
asyncio.run(bad())
