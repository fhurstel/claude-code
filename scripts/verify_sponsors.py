"""Quick live check: Statsig config read, Senso attribute evidence on a hard preference, Gmail receipts per payer."""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from app import grocery, telemetry  # noqa: E402

s = telemetry.settings("shivay")
print("statsig agent_settings:", {k: s[k] for k in ("auto_buy_under", "act_days_before", "_source") if k in s})
print("senso grocery docs created now:", grocery.sync_grocery_kb())

grocery.reset_run()
for m, t in [("shivay", "We need laundry detergent for the flat"), ("shivay", "1 gallon of milk for me"),
             ("dad", "a dozen eggs for the flat"), ("dad", "2 loaves of bread for me")]:
    grocery.add_request(m, t)
grocery.set_preference("dad", "laundry detergent", "fragrance-free", True, "group", private_reason="skin condition")
p = grocery.plan("shivay")
q = next(q for q in p["quotes"] if q["source_key"] == p["recommended"])
det = next(i for i in q["items"] if i["item"] == "laundry detergent")
print("detergent chosen:", det["offer"]["product"], "| evidence:", det.get("attribute_evidence"))
print("rejected:", det["rejected"])
for a in p["allocations"]:
    grocery.approve(a["member"], p["id"], a["amount"])
act = grocery.execute("shivay")
print("execute:", act["state"], "| receipts:", act.get("receipts"))
