"""Senso: judge each seller claim against the organization's knowledge base (the trusted context).

Live mode (SENSO_API_KEY): the verified product facts are loaded into Senso as documents once
(sync_kb). For each listing the agent retrieves the matching verified-facts document with
senso_search (context mode) and judges every claim against the facts in that retrieved text; the
trail cites the Senso document and its search score. (senso_check_text only verifies claims about
the organization itself, so for third-party sellers it answers "not_verifiable".)
Transport: the Senso REST API when SENSO_API_URL is set (POST /org/kb/raw, POST /org/search/context),
else the Senso MCP server (SENSO_API_KEY + SENSO_MCP_URL).
Without Senso, the same judgement runs on the local copy of the facts, labelled as a demo fixture.
"""
import re
import time

import httpx

from . import mcpcall
from .config import env
from .db import db
from .seed import CATALOG, VERIFIED_FACTS


def _h():
    return {"Authorization": f"Bearer {env('SENSO_API_KEY')}"}


def rest_url():
    """Senso REST API base (e.g. https://apiv2.senso.ai/api/v1). Preferred over MCP when set."""
    return env("SENSO_API_URL").rstrip("/")


def mcp_live():
    return bool(env("SENSO_API_KEY") and env("SENSO_MCP_URL"))


def live():
    return bool(rest_url()) or mcp_live()


def transport():
    return "rest" if rest_url() else ("mcp" if mcp_live() else "fixture")


def _rest(method, path, body=None, timeout=45):
    """One REST call. The key goes in X-API-Key; it may be absent when a proxy injects it."""
    h = {"Content-Type": "application/json", "X-Senso-Signals": "off"}  # no "gap" filing for empty searches
    if env("SENSO_API_KEY"):
        h["X-API-Key"] = env("SENSO_API_KEY")
    r = None
    for wait in (0, 3, 8):
        time.sleep(wait)
        try:
            r = httpx.request(method, rest_url() + path, json=body, headers=h, timeout=timeout)
        except Exception as e:
            r = e
            continue
        if r.status_code != 429:
            break
    if isinstance(r, Exception) or r is None:
        return {"ok": False, "status": 0, "data": {"error": type(r).__name__}}
    try:
        data = r.json()
    except Exception:
        data = {"text": r.text[:300]}
    return {"ok": r.status_code < 300, "status": r.status_code, "data": data}


def create_doc(title, text, summary=""):
    """Add one raw-text document to the knowledge base. A duplicate (409) counts as already loaded."""
    if rest_url():
        r = _rest("POST", "/org/kb/raw", {"title": title, "text": text})
        return {"ok": r["ok"] or r["status"] == 409, "id": (r["data"] or {}).get("id"), "status": r["status"]}
    r = mcpcall.call(env("SENSO_MCP_URL"), "senso_create_doc", {"title": title, "text": text, "summary": summary}, _h())
    return {"ok": r["ok"], "id": (r["data"] or {}).get("id"), "status": 200 if r["ok"] else 0}


def search(query, max_results=3):
    """Context-only search. Returns {"ok", "results": [{"title", "text", "score", "content_id"}], "error"}."""
    if rest_url():
        r = _rest("POST", "/org/search/context", {"query": query, "max_results": max_results})
        hits = (r["data"] or {}).get("results") or [] if r["ok"] else []
        return {"ok": r["ok"], "error": None if r["ok"] else f"senso search {r['status']}",
                "results": [{"title": h.get("title"), "text": h.get("chunk_text") or "", "score": h.get("score"),
                             "content_id": h.get("content_id")} for h in hits]}
    r = mcpcall.call(env("SENSO_MCP_URL"), "senso_search",
                     {"query": query, "mode": "context", "max_results": max_results}, _h(), timeout=45)
    return {"ok": r["ok"], "error": None if r["ok"] else str(r["data"])[:160],
            "results": (r["data"] or {}).get("results") or [] if r["ok"] else []}


def parse_facts(text):
    """Turn a retrieved Senso verified-facts document back into structured facts."""
    f = {}
    m = re.search(r"Source: (.+)", text)
    if m:
        f["source"] = m.group(1).strip()
    m = re.search(r"Verified shipping time: (\d+) days", text)
    if m:
        f["ships_in_days"] = int(m.group(1))
    m = re.search(r"Verified materials: (.+?)\.", text)
    if m:
        f["material"] = [x.strip() for x in m.group(1).split(",")]
    for b, s in re.findall(r"Genuine (\w+) products are sold only by authorized sellers: (.+?)\.", text):
        f.setdefault("authentic_brand_sellers", {})[b] = [x.strip() for x in s.split(",")]
    m = re.search(r"warranty is (\d+) year", text)
    if m:
        f["warranty_years"] = int(m.group(1))
    m = re.search(r"serves (\d+) people", text)
    if m:
        f["serves"] = int(m.group(1))
    if "Label: vegetarian." in text:
        f["diet"] = ["vegetarian"]
    elif "Label: not vegetarian." in text:
        f["diet"] = []
    m = re.search(r"Contains: (.+?)\.", text)
    if m:
        f["contains"] = [x.strip() for x in m.group(1).split(",")]
    return f


def senso_evidence(listing):
    """Retrieve this listing's verified-facts document from Senso (cached per listing)."""
    cached = db.get("claims", f"senso_ev:{listing['id']}")
    if cached:
        return cached
    r = None
    for wait in (0, 3, 8):
        time.sleep(wait)
        r = search(f"Verified facts: {listing['title']} (listing {listing['id']}) sold by {listing['seller']}")
        if r["ok"]:
            break
    if not r or not r["ok"]:
        return {"error": (r or {}).get("error") or ""}
    hits = r["results"]
    hit = next((h for h in hits if f"(listing {listing['id']})" in (h.get("text") or "")), None)
    ev = {"found": bool(hit), "title": (hit or {}).get("title"), "score": round((hit or {}).get("score") or 0, 3),
          "content_id": (hit or {}).get("content_id"), "text": (hit or {}).get("text", "")}
    if hit:
        db.put("claims", f"senso_ev:{listing['id']}", ev, grp="senso_cache")
    return ev


def _local_verdict(listing, claim, facts=None):
    facts = VERIFIED_FACTS.get(listing["id"], {}) if facts is None else facts
    src = facts.get("source", "no verified source")
    k, v = claim["kind"], claim["value"]
    if k == "ships_in_days" and "ships_in_days" in facts:
        real = facts["ships_in_days"]
        if real <= v:
            return "supported", f"verified: ships in {real} days", src
        return "contradicted", f"verified: ships in {real} days, not {v}", src
    if k == "material" and "material" in facts:
        ok = v in facts["material"]
        return ("supported" if ok else "contradicted"), f"verified materials: {', '.join(facts['material'])}", src
    if k == "authentic_brand" and "authentic_brand_sellers" in facts:
        sellers = facts["authentic_brand_sellers"].get(v, [])
        if listing["seller"] in sellers:
            return "supported", f"{listing['seller']} is an authorized {v} seller", src
        return "contradicted", f"{listing['seller']} is not an authorized {v} seller", src
    if k == "warranty_years" and "warranty_years" in facts:
        real = facts["warranty_years"]
        if v <= real:
            return "supported", f"warranty is {real} year(s)", src
        return "contradicted", f"warranty is {real} year(s), not {v}", src
    if k == "serves" and "serves" in facts:
        real = facts["serves"]
        return ("supported" if real >= v else "contradicted"), f"label says serves {real}", src
    if k == "diet" and "diet" in facts:
        ok = v in facts["diet"]
        extra = f" (contains {', '.join(facts.get('contains', []))})" if facts.get("contains") else ""
        return ("supported" if ok else "contradicted"), f"label diet: {', '.join(facts['diet']) or 'none'}{extra}", src
    return "unsupported", "no verified fact covers this claim", src


def fact_doc(lid):
    """One knowledge-base document per product, in plain language."""
    L = next(c for c in CATALOG if c["id"] == lid)
    f = VERIFIED_FACTS[lid]
    lines = [f"# {L['title']} (listing {lid}), sold by {L['seller']}", f"Source: {f.get('source')}"]
    if "ships_in_days" in f:
        lines.append(f"Verified shipping time: {f['ships_in_days']} days. It does not ship faster than {f['ships_in_days']} days.")
    if "material" in f:
        lines.append(f"Verified materials: {', '.join(f['material'])}.")
    if "authentic_brand_sellers" in f:
        for b, s in f["authentic_brand_sellers"].items():
            lines.append(f"Genuine {b} products are sold only by authorized sellers: {', '.join(s)}. "
                         f"{L['seller']} is not an authorized {b} seller.")
    if "warranty_years" in f:
        lines.append(f"The manufacturer warranty is {f['warranty_years']} year, and only for purchases from authorized sellers.")
    if "serves" in f:
        lines.append(f"Label: serves {f['serves']} people.")
    if "diet" in f:
        lines.append("Label: vegetarian." if "vegetarian" in f["diet"] else "Label: not vegetarian.")
    if f.get("contains"):
        lines.append(f"Contains: {', '.join(f['contains'])}.")
    if f.get("allergens"):
        lines.append(f"Allergens: {', '.join(f['allergens'])}.")
    return L["title"], "\n".join(lines)


def sync_kb():
    """Load verified facts into Senso once. Returns how many docs were created."""
    if not live() or db.get("claims", "senso_kb_synced"):
        return 0
    n = 0
    for lid in VERIFIED_FACTS:
        title, text = fact_doc(lid)
        r = create_doc(f"Verified facts: {title}", text, f"Verified product facts for listing {lid}")
        n += 1 if r["ok"] else 0
    db.put("claims", "senso_kb_synced", {"docs": n, "at": time.strftime("%H:%M")}, grp="system")
    return n


def _senso_check(text, question):
    """One fact check, with backoff on rate limits. Returns Senso's completed check or None."""
    r = None
    for wait in (0, 3, 8, 15):
        time.sleep(wait)
        r = mcpcall.call(env("SENSO_MCP_URL"), "senso_check_text",
                         {"text": text, "author": "ai_assistant", "question": question}, _h(), timeout=60)
        if r["ok"] or "429" not in str(r["data"]) and "TaskGroup" not in str(r["data"]):
            break
    if not r or not r["ok"]:
        return {"_error": str(r["data"] if r else "")[:200]}
    cid = r["data"].get("check_id")
    if not cid:
        return r["data"]
    for _ in range(30):
        time.sleep(2)
        g = mcpcall.call(env("SENSO_MCP_URL"), "senso_get_text_check", {"check_id": cid}, _h())
        d = g["data"] if g["ok"] else {}
        if d.get("status") not in ("queued", "running", None):
            return d
    return {"_error": "senso check timed out"}


def _verdict_of(c):
    v = str(c.get("verdict") or c.get("status") or c.get("label") or "").lower()
    if any(k in v for k in ("conflict", "contradict", "false", "incorrect")):
        return "contradicted"
    if any(k in v for k in ("verified", "supported", "true", "correct")) and "un" not in v[:2]:
        return "supported"
    return "unsupported"


def _expl(c):
    for k in ("explanation", "reason", "rationale", "evidence", "note"):
        if c.get(k):
            return str(c[k])[:240]
    return ""


def _words(s):
    return set(re.findall(r"[a-z0-9]+", s.lower()))


def check_listing(listing):
    """Judge each claim against the listing's verified facts retrieved from Senso."""
    claims = listing.get("claims", [])
    if not claims:
        return []
    if not live():
        return [dict(zip(("verdict", "why", "source"), _local_verdict(listing, c)), claim=c["text"],
                     engine="rules (demo fixture)") for c in claims]
    ev = senso_evidence(listing)
    if not ev.get("found"):
        return [{"claim": c["text"], "verdict": "unsupported", "engine": "senso",
                 "why": "no verified facts for this product in the Senso knowledge base",
                 "source": ev.get("error") or "Senso search: no matching document"} for c in claims]
    facts = parse_facts(ev["text"])
    out = []
    for c in claims:
        status, why, src = _local_verdict(listing, c, facts)
        out.append({"claim": c["text"], "verdict": status, "why": why, "engine": "senso",
                    "source": f"Senso KB: \"{ev['title']}\" (search score {ev['score']}); {src}",
                    "senso_content_id": ev.get("content_id")})
    return out


def check_listing_text_api(listing):
    """Alternative: Senso's own fact check (senso_check_text). Kept for reference; see module docstring."""
    claims = listing.get("claims", [])
    d = None
    if live() and claims:
        cache = db.get("claims", f"senso:{listing['id']}")
        if cache:
            d = cache
        else:
            text = " ".join(f"{listing['title']}, sold by {listing['seller']}: {c['text']}." for c in claims)
            d = _senso_check(text, f"Are these seller claims about {listing['title']} true?")
            if d and not d.get("_error"):
                db.put("claims", f"senso:{listing['id']}", d, grp="senso_cache")
    sclaims = (d or {}).get("claims") or []
    out = []
    for c in claims:
        status, why, src = _local_verdict(listing, c)
        row = {"claim": c["text"], "verdict": status, "why": why, "source": src, "engine": "rules (demo fixture)"}
        if sclaims:
            best = max(sclaims, key=lambda s: len(_words(c["text"]) & _words(str(s.get("claim") or s.get("text") or s))))
            sv = _verdict_of(best)
            row["senso_verdict"] = str(best.get("verdict"))
            row["senso_claim"] = str(best.get("claim") or best.get("text") or "")[:160]
            if sv in ("supported", "contradicted"):
                row.update(verdict=sv, why=_expl(best) or why, engine="senso")
            else:  # Senso could not verify: decide on the verified fixture, and say so
                row["engine"] = f"rules (Senso: {best.get('verdict')})"
        elif d and d.get("_error"):
            row["senso_error"] = d["_error"][:120]
        out.append(row)
    return out
