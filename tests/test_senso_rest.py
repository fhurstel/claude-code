"""Senso REST transport (offline: httpx is faked)."""
import os
import tempfile

os.environ["DB_PATH"] = os.path.join(tempfile.mkdtemp(), "s.db")
os.environ["OCCASIONS_NO_DOTENV"] = "1"
for k in ("NEBIUS_API_KEY", "COGNEE_API_KEY", "SINGLESTORE_URL", "SENSO_API_KEY", "SENSO_MCP_URL"):
    os.environ.pop(k, None)

import httpx  # noqa: E402
import pytest  # noqa: E402

from app import grocery, senso  # noqa: E402
from app.db import db  # noqa: E402

KB = {}


class Resp:
    def __init__(self, status, data):
        self.status_code, self._d, self.text = status, data, str(data)

    def json(self):
        return self._d


def fake_request(method, url, json=None, headers=None, timeout=None):
    assert headers["X-Senso-Signals"] == "off"
    if url.endswith("/org/kb/raw"):
        if json["title"] in KB:
            return Resp(409, {"error": "duplicate"})
        KB[json["title"]] = json["text"]
        return Resp(202, {"id": f"c{len(KB)}", "processing_status": "processing"})
    if url.endswith("/org/search/context"):
        sku = json["query"].split("(SKU ")[1].split(")")[0]
        hits = [{"title": t, "chunk_text": x, "score": 0.9, "content_id": "c1"} for t, x in KB.items()
                if f"(SKU {sku})" in x]
        return Resp(200, {"results": hits[: json.get("max_results", 3)]})
    return Resp(404, {})


@pytest.fixture(autouse=True)
def rest(monkeypatch):
    monkeypatch.setenv("SENSO_API_URL", "https://senso.test/api/v1")
    monkeypatch.setattr(httpx, "request", fake_request)
    monkeypatch.setattr(grocery.time, "sleep", lambda s: None)
    KB.clear()
    db.clear(keep_groups=())
    yield


def test_transport_prefers_rest():
    assert senso.live() and senso.transport() == "rest"


def test_create_doc_treats_duplicate_as_loaded():
    assert senso.create_doc("t", "x")["ok"]
    assert senso.create_doc("t", "x")["ok"]  # 409


def test_grocery_kb_sync_and_attribute_lookup():
    assert grocery.sync_grocery_kb() == len(grocery.OFFERS)
    assert grocery.sync_grocery_kb() == 0  # only once
    attrs, ev = grocery.senso_attributes("SW-2002", "Tide Original detergent 92 oz")
    assert attrs == [] and "Senso KB" in ev  # Tide Original is not fragrance-free
    attrs, _ = grocery.senso_attributes("SW-2001", "Tide Free & Gentle detergent 92 oz")
    assert attrs == ["fragrance-free"]


def test_search_error_falls_back_to_fixture(monkeypatch):
    monkeypatch.setattr(httpx, "request", lambda *a, **k: Resp(402, {"error": "credits"}))
    assert grocery.senso_attributes("SW-2001", "Tide Free & Gentle detergent 92 oz") == (None, None)
