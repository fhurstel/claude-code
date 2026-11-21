# Pantry: a group grocery agent with receipts

**Repo:** https://github.com/shivaylamba/occasions-agent

## What we built
A personal shopping agent for households, roommates and friends who shop together.
- **Collect:** everyone adds what they need whenever they think of it, in plain words, from the app or from their own AI agent over MCP.
- **Understand:** the agent pulls out a structured request (item, quantity, shared or personal, required attributes) and keeps who asked.
- **Remember:** it keeps each person's preferences, and the private reasons behind them stay private.
- **Compare:** it builds complete baskets across the stores it checked and computes every total deterministically: pack sizes, coupons, CA tax, fees, and unknown costs labelled as unknown.
- **Split:** it proposes per-person shares that reconcile to the cent, with either one group payer or everyone paying their share.
- **Approve and pay:** each payer approves the exact plan version. The agent then holds each payer's card and charges once everyone is authorized; a declined card releases the other holds and pauses the run.
- **Report:** it emails each payer a receipt and posts to the family Slack channel, and every input, source, decision, approval and outcome is in an audit trail.

Each family member's own agent (Claude, ChatGPT, …) connects to the shared family memory through our MCP server with a personal token. A preference set from your own agent changes the group's plan live.

## Sponsor tools
- **Senso:** verified product facts are loaded into the Senso knowledge base. Required attributes like "fragrance-free", and seller claims, are decided from `senso_search` evidence, cited in the trail.
- **Cognee:** per-member and household memory datasets, with recall scoped to what that member may read.
- **Firedrill:** synthetic Google Calendar (triggers), Stripe (authorize, capture, cancel, refund), Gmail (receipts), Slack (family channel).
- **SingleStore:** canonical store for requests, preferences, plan versions, approvals, payment actions and the audit trail.
- **Superlinked SIE:** bge-m3 embeddings score how well each chosen product matches the original request (exact, likely, uncertain).
- **Statsig:** `agent_settings` dynamic config controls the auto-buy limit and how early the agent acts.
- **Amplitude:** funnel events (request → plan → approval → order) with no names or shopping text.
- **Persona:** GovID sandbox inquiry verifies the human behind a spending mandate.
- **Tokens& Observe:** official SDK sends metadata-only telemetry for every model call and tool call.
- **Guild AI:** every plan starts a review session with our shopping agent in a Guild workspace.
- **Nebius Token Factory (Nemotron):** request extraction and decisions.

## Honest limits
- No live retailer API access was available, so retailer prices are a labelled fixture and orders are labelled "synthetic", never "purchased".
- The web app uses a member switcher for the demo; MCP access uses per-member tokens.

## Team
<names and contact emails>

## Demo video
<link>
