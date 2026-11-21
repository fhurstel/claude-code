# Provenance and permission

This branch is built on **Pantry / occasions-agent** by Shivay Lamba
(https://github.com/shivaylamba/occasions-agent), commit `13dcfad`. It was copied from the
`reference/occasions-agent` branch of bertramsargla/pah (commit `cb9ca8b`) on 2026-11-21.

- The upstream repository has **no license**, so its author keeps all rights. This copy and the
  changes below are made **with the author's permission**, as the owner of this repository confirmed.
  Before you publish, submit or relicense any of it, check that the permission covers that use.
- The first commit on this branch is the author's code, unmodified. Every later commit is ours.
- **Database:** a remote SingleStore cluster when `SINGLESTORE_URL` is set, else a SQLite file that
  `app/db.py` creates at runtime under `data/` and `app/seed.py` fills with demo data. The repository
  contains no database file.

## What this branch adds

- **Senso over REST.** `app/senso.py` can now talk to the Senso REST API (`SENSO_API_URL`, e.g.
  `https://apiv2.senso.ai/api/v1`) as well as Senso's MCP server. It uses `POST /org/kb/raw` to load
  documents and `POST /org/search/context` to search. A duplicate upload (409) counts as already
  loaded. When `SENSO_API_URL` is set, REST takes priority. `senso_check_text`, kept upstream only
  for reference, still uses MCP.
- **Local stand-ins for Firedrill Stripe, Gmail and Slack.** With no Firedrill URLs set, the group
  run's payment calls follow test-mode Stripe semantics locally: manual capture, the
  `pm_card_chargeDeclined` decline, cancel, refund. Receipts and Slack posts are no-ops. Every audit
  entry is labelled `local stub ... (Firedrill not configured)`. Before this, the "authorize and
  place order" step always failed without Firedrill.
- **Tests:** 28, up from 23. `tests/test_senso_rest.py` covers the REST transport offline, and a
  full approve, pay and refund flow runs on the local stub.
