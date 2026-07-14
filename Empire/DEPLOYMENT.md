# Empire Remodels — VPS Deployment Guide

Complete, step-by-step guide to deploy the full system (web app + PocketBase
backend + HTTPS) to a Linux VPS. Written for someone deploying to a fresh
Ubuntu/Debian server. Total time: ~45–60 minutes.

Build audited: **v4.3** (stored-XSS remediated → 0 fires, append-only audit log,
SSO-ready). See `SECURITY.md` for the full audit.

---

## What you're deploying

```
                    ┌─────────────────────────────┐
   Browser  ──────► │  Caddy / nginx (HTTPS :443) │
  (staff &          └──────────┬──────────────────┘
   clients)                    │  reverse proxy
                    ┌──────────▼───────────┐   ┌──────────────────┐
                    │  Web app (static)    │   │  PocketBase      │
                    │  index.html          │   │  :8090 (local)   │
                    └──────────────────────┘   │  DB + auth +     │
                                               │  files + admin   │
                                               └──────────────────┘
```

- **Web app** = one static `index.html` — served by the proxy.
- **PocketBase** = one binary + `pb_data/` folder — the database, auth, file
  storage, and admin dashboard.
- The app talks to PocketBase over HTTPS; you connect them in the app's Settings.

---

## Prerequisites

- A VPS (DigitalOcean, Hetzner, Linode, Vultr, AWS Lightsail — 1GB RAM is plenty)
- A domain name with DNS pointed at the VPS IP. Suggested records:
  - `app.yourdomain.com`  → the web app
  - `pb.yourdomain.com`   → the PocketBase API + admin
  (Both can be the same server. A single domain also works — see Option B.)
- SSH access to the server as a sudo-capable user

---

## Step 1 — Server prep

```bash
ssh youruser@YOUR_VPS_IP
sudo apt update && sudo apt -y upgrade
sudo apt -y install unzip curl
sudo mkdir -p /opt/empire && sudo chown $USER:$USER /opt/empire
cd /opt/empire
```

---

## Step 2 — Upload the app

Three ways — pick one. All put the files in `/opt/empire`.

### Option A — from GitHub (recommended, keeps you updatable)
```bash
cd /opt/empire
git clone https://github.com/fhurstel/claude-code.git repo
cp -r repo/Empire/backend  ./backend
cp -r repo/Empire/webapp   ./webapp
```
_(If the repo is private, use a deploy key or a personal access token.)_

### Option B — upload the deploy zip from your machine
On your **local** computer (where you downloaded `empire-complete-v4.2.zip`
or newer):
```bash
scp empire-complete-v4.3.zip youruser@YOUR_VPS_IP:/opt/empire/
```
Then on the server:
```bash
cd /opt/empire && unzip empire-complete-v4.3.zip
```

### Option C — SFTP GUI
Use FileZilla/Cyberduck to drop the `webapp/` and `backend/` folders into
`/opt/empire`.

---

## Step 3 — Install & initialize PocketBase

```bash
cd /opt/empire/backend
chmod +x setup.sh
./setup.sh admin@yourdomain.com 'CHANGE-THIS-STRONG-PASSWORD'
```

This downloads PocketBase, creates your admin, imports all 17 collections
(including `journal` and append-only `audit_log`), and seeds the cost catalog,
vendors, templates, and locations. When it finishes it prints the admin URL.

Stop the foreground server (Ctrl-C) — Step 5 runs it as a service instead.

---

## Step 4 — Create team accounts

Open `http://YOUR_VPS_IP:8090/_/` (temporarily, before HTTPS) → log in as the
admin you just created → **Collections → users → New record** for each staff
member (email + password). They'll use these to sign into the app.

> Prefer SSO? Skip manual users — see Step 7.

---

## Step 5 — Run PocketBase as a service (survives reboots)

```bash
sudo tee /etc/systemd/system/pocketbase.service > /dev/null << 'EOF'
[Unit]
Description=PocketBase (Empire)
After=network.target

[Service]
Type=simple
User=YOUR_LINUX_USER
WorkingDirectory=/opt/empire/backend
ExecStart=/opt/empire/backend/pocketbase serve --http=127.0.0.1:8090
Restart=always
RestartSec=5
LimitNOFILE=4096

[Install]
WantedBy=multi-user.target
EOF

sudo sed -i "s/YOUR_LINUX_USER/$USER/" /etc/systemd/system/pocketbase.service
sudo systemctl daemon-reload
sudo systemctl enable --now pocketbase
sudo systemctl status pocketbase --no-pager
```

Note it binds to `127.0.0.1` (localhost only) — never expose `:8090` to the
internet directly. The proxy in Step 6 handles public HTTPS.

---

## Step 6 — HTTPS reverse proxy with Caddy (automatic TLS)

Caddy gets and renews Let's Encrypt certs automatically — easiest choice.

```bash
sudo apt -y install debian-keyring debian-archive-keyring apt-transport-https
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | sudo gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' | sudo tee /etc/apt/sources.list.d/caddy-stable.list
sudo apt update && sudo apt -y install caddy
```

Edit `/etc/caddy/Caddyfile`:

### Two-subdomain setup (recommended)
```
app.yourdomain.com {
    root * /opt/empire/webapp
    file_server
    encode gzip
}

pb.yourdomain.com {
    reverse_proxy 127.0.0.1:8090
}
```

### Single-domain setup (app at root, API under /pb)
```
yourdomain.com {
    encode gzip
    handle_path /pb/* {
        reverse_proxy 127.0.0.1:8090
    }
    handle {
        root * /opt/empire/webapp
        file_server
    }
}
```

Then:
```bash
sudo systemctl reload caddy
```

Caddy provisions TLS certs on first request. Give DNS a minute to propagate.

---

## Step 7 (optional) — Enable SSO

In the PocketBase admin (`https://pb.yourdomain.com/_/`) → **Collections →
users → Options → OAuth2** → enable your provider:

- **Google / Microsoft (Entra ID)** — built in; paste Client ID + Secret from
  your provider's console.
- **Okta / Auth0 / OneLogin / any OIDC** — choose "OIDC", paste issuer URL +
  Client ID/Secret.
- Set the redirect URL to `https://app.yourdomain.com/`.

The app's login screen auto-detects enabled providers and shows
"Continue with …" buttons. Also enable **MFA** here for admin accounts.

---

## Step 8 — Connect the app to the backend

1. Visit `https://app.yourdomain.com`
2. **Settings → Backend Server (PocketBase URL)** → enter
   `https://pb.yourdomain.com` (or `https://yourdomain.com/pb` for single-domain)
   → **Connect**
3. Sign in with a team account (or SSO)
4. A green **☁ Synced** badge appears — data is now shared across every device
   and user

That's it. The app is live, multi-user, and syncing.

---

## Post-deploy checklist (do these)

- [ ] Change the demo admin password if you used the example one
- [ ] Confirm `:8090` is NOT reachable from outside: `curl http://YOUR_VPS_IP:8090` should fail/refuse
- [ ] Enable a firewall: `sudo ufw allow OpenSSH && sudo ufw allow 80,443/tcp && sudo ufw enable`
- [ ] Turn on backups: PocketBase admin → Settings → Backups → schedule (or cron `cp -r pb_data` off-server)
- [ ] Configure SMTP: PocketBase admin → Settings → Mail → your SMTP creds (enables password resets + real emails)
- [ ] Enable OAuth2 SSO + MFA (Step 7)
- [ ] Disk-encrypt or restrict permissions on `/opt/empire/backend/pb_data`
- [ ] Before adding techs/clients as roles: implement per-role collection rules (SECURITY.md §4)

---

## Backups & restore

**Back up** (everything is one folder + the binary):
```bash
sudo systemctl stop pocketbase        # optional, for a clean snapshot
tar czf empire-backup-$(date +%F).tgz -C /opt/empire/backend pb_data
sudo systemctl start pocketbase
# copy the .tgz off-server (scp / rsync / S3)
```

**Restore** on a new server: install PocketBase (Step 3 without seeding),
drop the `pb_data` folder back in, start the service. All data returns.

---

## Updating the app later

The web app is one file — updating is a copy:
```bash
cd /opt/empire/repo && git pull
cp repo/Empire/webapp/index.html /opt/empire/webapp/index.html
```
No rebuild, no downtime. Users get the new version on next page load. Their data
(in PocketBase) is untouched.

To update PocketBase itself, replace the `pocketbase` binary and
`sudo systemctl restart pocketbase` — it auto-migrates `pb_data`.

---

## Troubleshooting

| Symptom | Fix |
|---|---|
| App shows login but "Login failed" | Check `https://pb.yourdomain.com/api/health` returns healthy; verify the URL in Settings has no trailing slash |
| "☁ Synced" badge never appears | You're in offline mode — set the Backend URL in Settings and sign in |
| TLS cert error | DNS not propagated yet, or port 80/443 blocked by firewall/provider |
| PocketBase won't start | `journalctl -u pocketbase -n 50` for the error; usually a port conflict or perms on pb_data |
| Data not shared between devices | Both must point at the same Backend URL and be signed in (green badge) |

---

## Cost estimate

- VPS: **$5–12/month** (1GB RAM tier is ample for a contracting business)
- Domain: ~$12/year
- TLS: free (Let's Encrypt via Caddy)
- PocketBase: free, self-hosted
- **No per-seat SaaS fees** — unlimited staff and client-portal users

Total: roughly **$6–13/month** all-in.
