import json, os, sys, time
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from app import senso
from app.seed import CATALOG
t = time.time()
d = senso._senso_check("Garden gift set with tote, sold by GiftBarn: Arrives in 2 days.", "Is this true?")
print(f"check took {time.time()-t:.1f}s"); print(json.dumps(d)[:2000])
