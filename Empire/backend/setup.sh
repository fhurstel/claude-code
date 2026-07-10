#!/usr/bin/env bash
# Empire Remodels — PocketBase backend setup
# Usage: ./setup.sh <admin-email> <admin-password>
set -euo pipefail
ADMIN_EMAIL="${1:?Usage: ./setup.sh <admin-email> <admin-password>}"
ADMIN_PASS="${2:?Usage: ./setup.sh <admin-email> <admin-password>}"
HOST="${PB_HOST:-127.0.0.1:8090}"

# 1. Get PocketBase if not present (linux x64 via npm registry mirror of official binary)
if [ ! -x ./pocketbase ]; then
  echo "Downloading PocketBase..."
  if command -v npm >/dev/null; then
    npm pack pocketbase-server-linux-x64 --silent
    tar xzf pocketbase-server-linux-x64-*.tgz package/bin/pocketbase
    mv package/bin/pocketbase . && rm -rf package pocketbase-server-linux-x64-*.tgz
  else
    curl -sL -o pb.zip "https://github.com/pocketbase/pocketbase/releases/latest/download/pocketbase_linux_amd64.zip"
    unzip -o pb.zip pocketbase && rm pb.zip
  fi
  chmod +x ./pocketbase
fi
./pocketbase --version

# 2. Create admin + start server
./pocketbase superuser upsert "$ADMIN_EMAIL" "$ADMIN_PASS"
if ! curl -s "http://$HOST/api/health" >/dev/null 2>&1; then
  echo "Starting PocketBase on $HOST ..."
  nohup ./pocketbase serve --http="$HOST" > pocketbase.log 2>&1 &
  sleep 2
fi
curl -s "http://$HOST/api/health" | grep -q healthy && echo "Server healthy."

# 3. Import schema
TOKEN=$(curl -s -X POST "http://$HOST/api/collections/_superusers/auth-with-password" \
  -H "Content-Type: application/json" \
  -d "{\"identity\":\"$ADMIN_EMAIL\",\"password\":\"$ADMIN_PASS\"}" | python3 -c "import sys,json;print(json.load(sys.stdin)['token'])")
CODE=$(curl -s -o /dev/null -w "%{http_code}" -X PUT "http://$HOST/api/collections/import" \
  -H "Content-Type: application/json" -H "Authorization: $TOKEN" \
  -d "{\"collections\": $(cat pb_schema.json), \"deleteMissing\": false}")
[ "$CODE" = "204" ] && echo "Schema imported (15 collections)." || { echo "Schema import failed: HTTP $CODE"; exit 1; }

# 4. Seed reference data (idempotent-ish: skips if catalog already has rows)
EXISTING=$(curl -s "http://$HOST/api/collections/catalog_items/records?perPage=1" -H "Authorization: $TOKEN" | python3 -c "import sys,json;print(json.load(sys.stdin)['totalItems'])")
if [ "$EXISTING" = "0" ]; then
  python3 - "$HOST" "$TOKEN" << 'PYEOF'
import json, sys, urllib.request
host, token = sys.argv[1], sys.argv[2]
seed = json.load(open('seed_data.json'))
for coll, records in seed.items():
    for r in records:
        req = urllib.request.Request(f'http://{host}/api/collections/{coll}/records',
            data=json.dumps(r).encode(), method='POST',
            headers={'Content-Type': 'application/json', 'Authorization': token})
        urllib.request.urlopen(req)
    print(f'{coll}: {len(records)} seeded')
PYEOF
else
  echo "Catalog already seeded — skipping seed step."
fi

echo ""
echo "DONE. Admin UI: http://$HOST/_/   API: http://$HOST/api/"
