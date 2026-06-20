# Fiji IT Solutions — AI Receptionist

An inbound voice + SMS AI receptionist. It answers calls, collects
**name, phone, email, and the caller's requirement**, optionally transfers
urgent callers to a technician, and pushes every lead into your ticketing
system.

## The honest cost picture

The **brains run fully free and self-hosted** — speech-to-text, the LLM,
text-to-speech, and the CRM push cost nothing beyond your VPS.

What you **can't get truly free** is the phone layer: a phone number and
call minutes. Twilio is the cheapest easy starting point (~$1.15/mo for a
number + ~$0.013/min inbound, plus their starter credit to test). The code
isolates telephony so you can later swap to a SIP trunk (e.g. Telnyx) if you
want cheaper per-minute rates.

So: **free to build and test, a few dollars a month to actually keep a live
number answering calls.**

## Architecture

```
Caller ──▶ Twilio (number + media stream)
                │  websocket audio
                ▼
        FastAPI server (app/server.py)
                │
                ▼
        Pipecat pipeline (app/agent.py)
          Whisper STT ─▶ LLM ─▶ Kokoro TTS
          (free)        (Ollama, free)  (free)
                │
         on hangup ▼
        Extraction (app/extraction.py)  ──▶  CRM webhook (app/crm.py)
                                              → fiji.dickens.org /api/leads
```

SMS comes in the same server at `POST /sms` and goes straight to extraction
+ CRM push with an auto-reply.

## What you need to provide

1. **A Twilio account** with a phone number (uses your starter credit to test).
2. **A server** to run this on — your Vultr/Hostinger VPS is fine. For the
   self-hosted LLM you'll want ~8GB RAM (matches the 8GB plan we discussed).
   If the box is small, set `LLM_PROVIDER=openai` instead and skip Ollama.
3. **A CRM endpoint** on your ticketing app that accepts a POST lead. See
   "CRM integration" below — this is the one piece you may need to add.

## Setup

```bash
cd ai-receptionist
cp .env.example .env        # fill in Twilio + CRM values
docker compose up -d --build
docker compose exec ollama ollama pull llama3.1:8b   # one-time model pull
```

Expose the server publicly (your VPS domain, or ngrok for local testing):

```bash
# local testing only:
ngrok http 8000
# then set PUBLIC_BASE_URL in .env to the https URL ngrok prints
```

In the Twilio console, point your number's:
- **A Call Comes In** → `https://<your-domain>/voice` (HTTP POST)
- **A Message Comes In** → `https://<your-domain>/sms` (HTTP POST)

Call the number and you should hear the receptionist greet you.

## CRM integration

The agent POSTs each lead to `CRM_WEBHOOK_URL` as JSON:

```json
{
  "source": "ai-receptionist",
  "firstName": "Jane",
  "lastName": "Doe",
  "phone": "5105550142",
  "email": "jane@example.com",
  "requirement": "New workstation setup and printer connection.",
  "isExistingClient": false,
  "urgency": "medium"
}
```

Your ticketing app needs a route that accepts this and creates a lead
(the same shape as your manual "new lead" form). If your leads currently
come in via UpFirst/Gmail, this becomes a second, direct intake path. If
you don't have an API route yet, tell me your backend stack and I'll write
the endpoint to match.

Until the webhook exists, leads that fail to POST are appended to
`failed_leads.jsonl` so nothing is ever lost.

## Swapping the free/paid pieces

| Piece | Free default | Paid upgrade |
|---|---|---|
| LLM | Ollama `llama3.1:8b` | OpenAI `gpt-4o-mini` (set `LLM_PROVIDER=openai`) |
| STT | Whisper `base.en` | Whisper `small.en`/`medium.en` for accuracy |
| TTS | Kokoro | Cartesia / ElevenLabs for premium voices |
| Phone | Twilio pay-as-you-go | Telnyx SIP for cheaper minutes at volume |

## Prompts

- `prompts/system_prompt.txt` — how the receptionist talks and what it collects.
- `prompts/extraction_prompt.txt` — turns the transcript into structured CRM fields.

Both are plain text — edit them freely; no code changes needed.

## Known things to verify on first run

- Pipecat moves fast; the exact import paths for `KokoroTTSService` /
  `WhisperSTTService` can shift between versions. If an import fails, run
  `pip show pipecat-ai` and check that service's current path in their docs,
  or tell me the version and I'll pin the imports.
- Whisper's first run downloads the model — expect a slow first call.
- The transfer flow is wired as a separate TwiML endpoint
  (`/voice/transfer`); hooking "agent decides to transfer mid-call" into a
  live Twilio redirect is the one piece I'd test carefully with you.
