"""FastAPI server: Twilio voice webhook, media-stream websocket, SMS, and text chat.

Inbound call flow:
  1. Twilio hits  POST /voice  -> we return TwiML that opens a media stream
     to  /ws  and (optionally) dials a transfer target.
  2. Twilio connects the websocket to /ws; the Pipecat agent runs the call.
  3. On hangup, the agent extracts the lead and pushes it to the CRM.

Inbound SMS flow:
  Twilio hits POST /sms -> we extract a lead from the message body and push it.

Text chat flow (for testing without Twilio):
  POST /chat  with {"message": "...", "session_id": "..."}
  Returns the receptionist's reply. Session state is kept in memory.
"""
import json as _json
import logging
import uuid

from fastapi import FastAPI, Request, WebSocket
from fastapi.responses import HTMLResponse, PlainTextResponse, Response
from pydantic import BaseModel
from twilio.twiml.voice_response import Connect, VoiceResponse

from app import config
from app.chat_agent import ChatAgent
from app.crm import push_lead
from app.extraction import extract_lead

def _get_voice_agent():
    from app.agent import run_voice_agent
    return run_voice_agent

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("server")

app = FastAPI(title="Fiji IT AI Receptionist")

_chat_sessions: dict[str, ChatAgent] = {}


@app.get("/health")
async def health():
    return {"status": "ok"}


@app.post("/voice")
async def voice(request: Request):
    """Return TwiML that streams call audio to our websocket."""
    response = VoiceResponse()
    ws_url = config.PUBLIC_BASE_URL.replace("https://", "wss://") + "/ws"
    connect = Connect()
    connect.stream(url=ws_url)
    response.append(connect)
    return Response(content=str(response), media_type="application/xml")


@app.post("/voice/transfer")
async def voice_transfer(request: Request):
    """Standalone TwiML endpoint to bridge a caller to a live technician."""
    response = VoiceResponse()
    if config.TRANSFER_TARGET_NUMBER:
        response.say("Connecting you to a technician now. One moment.")
        response.dial(config.TRANSFER_TARGET_NUMBER)
    else:
        response.say("I'm sorry, no technician line is configured. "
                     "Someone will follow up shortly.")
    return Response(content=str(response), media_type="application/xml")


@app.websocket("/ws")
async def media_stream(websocket: WebSocket):
    await websocket.accept()
    # Twilio sends a 'connected' then 'start' message with stream/call SIDs.
    stream_sid = None
    call_sid = None
    import json
    # Read the first two control frames to obtain the SIDs.
    for _ in range(2):
        msg = await websocket.receive_text()
        data = json.loads(msg)
        if data.get("event") == "start":
            stream_sid = data["start"]["streamSid"]
            call_sid = data["start"]["callSid"]
            break

    if not stream_sid:
        await websocket.close()
        return

    logger.info("Media stream started: call=%s", call_sid)
    await _get_voice_agent()(websocket, stream_sid, call_sid)


@app.post("/sms")
async def sms(request: Request):
    """Handle inbound text messages as a lead-intake channel."""
    form = await request.form()
    body = form.get("Body", "")
    from_number = form.get("From", "")

    lead = await extract_lead(f"Inbound SMS from {from_number}: {body}")
    if not lead.get("phone"):
        lead["phone"] = from_number.lstrip("+")
    await push_lead(lead)

    # Auto-reply to the texter.
    twiml = (
        "<?xml version='1.0' encoding='UTF-8'?><Response><Message>"
        "Thanks for contacting Fiji IT Solutions. We've logged your request "
        "and a technician will follow up shortly."
        "</Message></Response>"
    )
    return PlainTextResponse(content=twiml, media_type="application/xml")


# ── Text chat for testing (no Twilio needed) ──


class ChatRequest(BaseModel):
    message: str = ""
    session_id: str = ""


@app.post("/chat")
async def chat(req: ChatRequest):
    sid = req.session_id or str(uuid.uuid4())
    if sid not in _chat_sessions:
        _chat_sessions[sid] = ChatAgent()
    agent = _chat_sessions[sid]
    reply = await agent.respond(req.message)
    return {"session_id": sid, "reply": reply}


@app.post("/chat/end")
async def chat_end(req: ChatRequest):
    sid = req.session_id
    agent = _chat_sessions.pop(sid, None)
    if not agent:
        return {"error": "session not found"}
    transcript = agent.get_transcript()
    lead = await extract_lead(transcript)
    result = await push_lead(lead)
    return {"lead": lead, "pushed": result}


@app.get("/chat/ui")
async def chat_ui():
    return HTMLResponse(content=CHAT_HTML)


CHAT_HTML = """<!DOCTYPE html>
<html><head><title>AI Receptionist - Test Chat</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: system-ui, sans-serif; background: #f5f5f5; display: flex; justify-content: center; padding: 2rem; }
  .chat-container { width: 100%; max-width: 600px; background: white; border-radius: 12px; box-shadow: 0 2px 12px rgba(0,0,0,0.1); overflow: hidden; }
  .header { background: #2563eb; color: white; padding: 1rem; text-align: center; font-size: 1.1rem; }
  .messages { height: 500px; overflow-y: auto; padding: 1rem; display: flex; flex-direction: column; gap: 0.5rem; }
  .msg { padding: 0.6rem 1rem; border-radius: 12px; max-width: 80%; word-wrap: break-word; line-height: 1.4; }
  .msg.user { background: #2563eb; color: white; align-self: flex-end; }
  .msg.bot { background: #e5e7eb; color: #1f2937; align-self: flex-start; }
  .msg.system { background: #fef3c7; color: #92400e; align-self: center; font-size: 0.85rem; }
  .input-area { display: flex; border-top: 1px solid #e5e7eb; }
  .input-area input { flex: 1; padding: 1rem; border: none; outline: none; font-size: 1rem; }
  .input-area button { padding: 1rem 1.5rem; background: #2563eb; color: white; border: none; cursor: pointer; font-size: 1rem; }
  .input-area button:hover { background: #1d4ed8; }
  .end-btn { display: block; margin: 0.5rem auto; padding: 0.5rem 1.5rem; background: #dc2626; color: white; border: none; border-radius: 6px; cursor: pointer; font-size: 0.9rem; }
</style></head><body>
<div class="chat-container">
  <div class="header">Fiji IT Solutions - AI Receptionist (Test Mode)</div>
  <div class="messages" id="messages"></div>
  <div class="input-area">
    <input id="input" placeholder="Type a message..." onkeypress="if(event.key==='Enter')send()">
    <button onclick="send()">Send</button>
  </div>
  <button class="end-btn" onclick="endCall()">End Call & Extract Lead</button>
</div>
<script>
let sessionId = '';
const msgs = document.getElementById('messages');
function addMsg(text, cls) {
  const d = document.createElement('div');
  d.className = 'msg ' + cls;
  d.textContent = text;
  msgs.appendChild(d);
  msgs.scrollTop = msgs.scrollHeight;
}
async function send() {
  const input = document.getElementById('input');
  const text = input.value.trim();
  if (!text) return;
  input.value = '';
  addMsg(text, 'user');
  const resp = await fetch('/chat', {
    method: 'POST', headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({message: text, session_id: sessionId})
  });
  const data = await resp.json();
  sessionId = data.session_id;
  addMsg(data.reply, 'bot');
}
async function endCall() {
  if (!sessionId) return;
  addMsg('--- Call ended, extracting lead... ---', 'system');
  const resp = await fetch('/chat/end', {
    method: 'POST', headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({message: '', session_id: sessionId})
  });
  const data = await resp.json();
  addMsg('Lead extracted: ' + JSON.stringify(data.lead, null, 2), 'system');
  addMsg('Pushed to CRM: ' + data.pushed, 'system');
  sessionId = '';
}
addMsg('Welcome! Type a message to start a conversation with the AI receptionist. Click "End Call" when done to see the extracted lead.', 'system');
</script></body></html>"""
