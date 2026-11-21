import os
import sys
import time

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from app import memory  # noqa: E402

t = time.time()
print("add:", memory._cognee_add("household", "Mom: loves pottery; took a wheel-throwing class this year (source: Mom's email)"),
      f"{time.time()-t:.1f}s")
print("add private:", memory._cognee_add("shivay_private", "Mom: Shivay is planning a surprise spring trip for Mom"))
for i in range(6):
    time.sleep(15)
    t = time.time()
    txt, ds = memory.cognee_recall("dad", "What does Mom like, and is anything planned for her?")
    print(f"[{i}] dad recall {time.time()-t:.1f}s:", (txt or ds)[:400] if txt else ds)
    if txt and "pottery" in txt.lower():
        break
txt, ds = memory.cognee_recall("shivay", "Is anything planned for Mom?")
print("shivay recall:", (txt or ds)[:400] if txt else ds)
