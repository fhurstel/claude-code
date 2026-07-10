# Empire Remodels — PocketBase Backend

Complete backend for the Empire web app (`../webapp`): database, auth, file
storage, and admin dashboard in a single binary. Tested against PocketBase 0.39.5.

## Quick start (on your server)

```bash
cd Empire/backend
./setup.sh admin@yourdomain.com 'YourStrongPassword'
```

That downloads PocketBase, creates your admin account, starts the server on
127.0.0.1:8090, imports the 15-collection schema, and seeds the cost catalog
(27 items), vendors (6), estimate templates (4), and locations (4).

- **Admin dashboard:** http://127.0.0.1:8090/_/
- **REST API:** http://127.0.0.1:8090/api/

## Collections

| Collection | Purpose |
|---|---|
| clients | Customer records |
| leads | Pipeline with stages New → Contacted → Estimate Sent → Won/Lost |
| estimates | Numbered estimates with JSON line items |
| jobs | Jobs incl. budget_total + budget_lines |
| job_costs | Actual spend per job (drives budget-vs-actual) |
| change_orders | Pending/approved/declined COs |
| vendors / purchase_orders | Suppliers and PO lifecycle draft→sent→received→paid |
| invoices | Totals, paid amounts, status, JSON lines |
| daily_logs | Per-day field logs (crew, hours, weather, work, delays) |
| catalog_items | Cost catalog (cost + markup %) |
| estimate_templates | Template name → [catalogRef, qty] pairs |
| locations / workers | Branches and crew |
| job_photos | Real photo uploads (10MB max, images only) |

All collections currently require an authenticated user (any logged-in user
can read/write). Tighten per-role rules in the admin UI when you add
tech/client accounts.

## Production checklist

1. Run behind a reverse proxy (Caddy/nginx) with HTTPS, e.g. `pb.yourdomain.com`
2. Run as a systemd service:
   ```ini
   [Unit]
   Description=PocketBase
   After=network.target
   [Service]
   WorkingDirectory=/path/to/Empire/backend
   ExecStart=/path/to/Empire/backend/pocketbase serve --http=127.0.0.1:8090
   Restart=always
   [Install]
   WantedBy=multi-user.target
   ```
3. Backups: copy the `pb_data/` folder (or use Settings → Backups in the admin UI)
4. Configure SMTP in admin UI Settings for real email sending

## Next step: connect the front end

`../webapp/index.html` currently persists to browser localStorage. The
conversion swaps its journal layer (`logAction`/`replayJournal`) for PocketBase
SDK calls against these collections — the schema maps 1:1 to the app's data
structures by design.
