# Empire Remodels — Security Audit & Compliance Readiness

_Audit performed on webapp build v4.3 + PocketBase backend v0.39.5. All findings
verified by live testing (real browser attack probes + API tests), not static
guesses._

## 1. Security audit findings

| # | Severity | Finding | Status |
|---|---|---|---|
| 1 | 🔴 Critical | **Stored XSS** — user-entered text (names, descriptions, notes, logs) rendered as HTML executed injected scripts when viewed by staff. Proven exploitable across leads, clients, daily logs, vendors, locations, and more. | **FIXED** — every `innerHTML` interpolation of user data now passes through `escHtml`/`escAttr`. Re-probed all 7 vector groups → 0 fires. |
| 2 | 🟡 Medium | **Flat authorization** — any authenticated user can read/write all records (a field tech could see every client's financials; no client-level isolation). | **Documented** — safe for single-owner use. Per-role collection rules required before multi-role rollout (see §4). |
| 3 | 🟢 Low/Info | Unauthenticated API access | **Not vulnerable** — auth rules filter all records; anonymous requests return empty. Verified. |
| 4 | 🟢 Info | No hardcoded production secrets in the app | **Clean** — only demo credentials in setup docs; tokens stored in `sessionStorage` (cleared on tab close), never `localStorage`. |

**XSS remediation detail:** `escHtml()` encodes `& < > " '`; applied to ~60 render
sinks across 25+ functions. Attribute-context values use `escAttr` (quote-encoded,
so `onclick` handlers stay intact — the browser decodes at execution). The audit-log
view is itself XSS-safe (verified: malicious client name renders inert).

## 2. Audit logging (implemented)

Every create / edit / delete / status-change / login is recorded with **actor,
action, reference, and ISO timestamp**:

- **In-app:** new **Audit Log** page (sidebar) — searchable, CSV-exportable, persists locally.
- **Backend:** `audit_log` collection is **append-only** — app users can create
  but **cannot update or delete** entries (enforced at the DB rule level; verified:
  delete returns HTTP 403). Only a superuser can purge, satisfying tamper-evidence.
- Actor = signed-in user's email in backend mode; "Local User" in offline mode.

## 3. SSO — supported

PocketBase provides OAuth2/OIDC natively. The app's login screen auto-discovers
configured providers and shows "Continue with …" buttons.

**Supported IdPs:** Google, Microsoft (Entra ID), Apple, GitHub, GitLab, Discord,
and **any OIDC provider** — which covers **Okta, Auth0, OneLogin, Ping**, etc.

**To enable (server-side, ~10 min):** Admin UI → Collections → `users` → Options →
OAuth2 → enable your provider → paste the Client ID / Secret from your IdP and set
the redirect URL to `https://yourapp/`. Buttons then appear automatically.

**MFA:** PocketBase supports multi-factor auth on the `users` collection
(Admin UI → users → Options → toggle MFA). Recommended for admin accounts.

## 4. SOC 2 Type II readiness — the honest picture

**SOC 2 Type II is not a software feature you can ship.** It is an attestation
**report** a licensed CPA firm issues after observing *your organization's* controls
operate over a 3–12 month window. Software can be **SOC 2-ready**; the company gets
audited. Here is how this system maps to the Trust Services Criteria and what's left
to *you* (the org), not the code:

| Control area | Provided by this system | Your organizational work |
|---|---|---|
| **Access control (CC6)** | Auth required on all data; SSO + MFA available; token in sessionStorage | Enforce SSO+MFA org-wide; quarterly access reviews; least-privilege roles (see below) |
| **Audit / monitoring (CC7)** | Append-only audit log of all data changes + logins | Retain logs ≥1 yr; ship to a SIEM; define alerting & incident response runbook |
| **Change management (CC8)** | Full git history (`fhurstel/claude-code`); versioned builds | PR reviews, approvals, and a documented release process |
| **Encryption** | Deploy behind HTTPS (setup docs) | TLS cert management; encrypt `pb_data/` at rest (disk encryption) |
| **Availability (A1)** | Single-binary backend; one-file DB backup | Backup schedule + tested restore; uptime monitoring; DR plan |
| **Vendor management** | PocketBase (self-hosted — no third-party data processor) | Document your subprocessors (host, email, payments) |
| **Confidentiality (C1)** | Per-collection rules; data stays on your server | Data classification & retention policy |

### Role-based access — two layers

**Layer 1 — UI role gating (IMPLEMENTED, build v4.4).** The `users` collection has
a `role` field (`admin` / `manager` / `tech` / `client`). On login the app reads
the role and hides the sections that role shouldn't use, blocks navigation to them,
and shows a role badge:

- **Admin / Manager** — full access.
- **Technician** — operations only (jobs, schedule, clients, inventory, timesheets);
  **no** invoices, estimates, reports, purchase orders, services, locations, or settings.
- **Client** — dashboard + their portal only.

This is a real access-control and least-astonishment layer, verified with live
tech/client/admin accounts. **It is enforced in the browser, not at the database.**

**Layer 2 — Database-enforced isolation.**

*Backend (DONE — build v4.5).* All collections now carry per-role / per-owner
PocketBase rules keyed off a `role` field on `users` (`admin`/`manager`/`tech`/
`client`) and an `owner_email` field on client-facing records. Enforced at the
database and **proven with live per-role tokens**:

| Test | Result |
|---|---|
| Tech reads invoices / purchase orders | **0 records** (financials blocked) |
| Tech writes reference data (catalog) | **HTTP 400** (blocked; read-only) |
| Tech reads jobs | OK (operations allowed) |
| Client reads invoices | **only their own** (`owner_email` match) |
| Client reads another client's invoice | not returned |
| Client reads the sync `journal` | **blocked** (staff-only) |
| Client reads CRM `clients` list | **blocked** |
| Client creates an invoice | **HTTP 400** (blocked) |
| Admin / manager | full access |

These rules are exported into `backend/pb_schema.json` and reproduced by
`setup.sh` on any fresh server (verified on a clean instance).

*App integration (REMAINING — Phase 2).* Staff use the app today via the shared
`journal` (now staff-only at the DB, so clients cannot read it). To give **clients**
working logins, the client portal must read their own records directly from the
typed collections (`jobs`/`invoices`/`estimates`/`change_orders` filtered by
`owner_email`) instead of the journal, and staff record-creation must stamp
`owner_email`. Until that ships, **do not issue client-role logins** — staff
(admin/manager/tech) and offline mode are unaffected and fully functional.

**Practical guidance:** the internal team can go live now (Layer 1 UI gating +
Layer 2 backend rules protect financials from techs). Complete Phase 2 before
onboarding external clients.

## 5. SCIM — honest answer

**SCIM (automated user provisioning/deprovisioning from your IdP) is _not_ a
PocketBase feature.** Options, most to least practical:

1. **SSO-only (recommended for your scale):** with OIDC SSO, users are
   just-in-time provisioned on first login; deprovisioning = disable them in your IdP
   and/or the PocketBase users collection. Covers the practical intent of SCIM for a
   contracting business.
2. **Custom SCIM bridge:** a small service exposing SCIM 2.0 endpoints
   (`/Users`, `/Groups`) that your IdP calls, translating to PocketBase user
   CRUD. Real engineering effort; warranted only if an enterprise customer contractually requires SCIM.
3. **Switch IdP-managed backend:** platforms like WorkOS/Auth0 offer SCIM out of
   the box, at cost and added complexity.

For an owner-operated remodeling company, **SSO + manual deprovisioning (option 1)**
is the right call; a SCIM bridge is over-engineering unless a client demands it.

## 6. Recommended hardening checklist (server-side)

- [ ] HTTPS via Caddy/nginx reverse proxy (never expose `:8090` directly)
- [ ] Enable OAuth2 SSO + MFA for admins
- [ ] Add `role` field + per-role collection rules (§4)
- [ ] Disk encryption on the `pb_data/` volume
- [ ] Automated daily backups with a tested restore (Admin UI → Backups)
- [ ] Ship audit_log to external storage/SIEM for retention
- [ ] Configure SMTP for password-reset emails
- [ ] Set a strong superuser password; rotate the demo credentials
