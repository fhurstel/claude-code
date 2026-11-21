import json
import os
import sys

import httpx

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from app import config  # noqa: E402,F401

E = os.environ.get
h = {"Authorization": f"Bearer {E('SIE_API_KEY')}"}
base = E("SIE_ENDPOINT").rstrip("/")
m = httpx.get(base + "/models", headers=h, timeout=20).json()
print("sie models:", [x["id"] for x in m["data"]][:40])
for path, body in [("/embeddings", {"model": "BAAI/bge-m3", "input": ["pottery tools", "loves pottery"]}),
                   ("/rerank", {"model": "BAAI/bge-reranker-v2-m3", "query": "gift for someone who loves pottery",
                                "documents": ["pottery tool set", "pruning shears"]})]:
    r = httpx.post(base + path, headers=h, json=body, timeout=30)
    print(path, r.status_code, r.text[:250])
r = httpx.post("https://api.tokenfactory.nebius.com/v1/chat/completions", timeout=90,
               headers={"Authorization": f"Bearer {E('NEBIUS_API_KEY')}"},
               json={"model": "nvidia/Nemotron-3_5-Lightning", "max_tokens": 800,
                     "messages": [{"role": "system", "content": "Reply only with JSON."},
                                  {"role": "user", "content": 'Pick one id from [{"id":"L1","title":"pottery set"},{"id":"L2","title":"shears"}] for someone who loves pottery. JSON {"id":..,"reason":..}'}]})
j = r.json()
print("nemotron:", r.status_code, json.dumps(j["choices"][0]["message"])[:400], j.get("usage"))
