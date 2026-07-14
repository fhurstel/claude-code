import express from 'express';
import https from 'https';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
app.use(express.json({ limit: '50mb' }));
const OPENROUTER_KEYS_FILE = '/root/.hermes/workspace/profield/openrouter-keys.json';

function loadKeys() {
  try {
    const raw = fs.readFileSync(OPENROUTER_KEYS_FILE, 'utf8');
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function loadApiKey() {
  const keys = loadKeys();
  const active = keys.find(k => k && k.active && k.token) || keys[0];
  const token = active?.token || '';
  if (token && token !== '***') return token.replace(/^["']|["']$/g, '');
  for (const p of [path.join(process.env.HOME || '/root', '.hermes', '.env'), '/root/.hermes/.env']) {
    try {
      const content = fs.readFileSync(p, 'utf8');
      const match = content.match(/OPENROUTER_API_KEY\s*=\s*(.+)/);
      if (match) return match[1].trim().replace(/^["']|["']$/g, '');
    } catch (e) {}
  }
  return process.env.OPENROUTER_API_KEY || '';
}

function callOpenRouter(message, history = []) {
  return new Promise((resolve) => {
    const API_KEY = loadApiKey();
    if (!API_KEY) { resolve(fallback(message)); return; }
    const body = JSON.stringify({
      model: 'openai/gpt-5.4-mini',
      messages: [
        { role: 'system', content: `You are Jarvis, AI super agent for Aqua Logic Plumbing CRM. You help Francois run Fiji IT Solutions (FIS), an HVAC/plumbing/electrical contractor in the Bay Area. You can: manage jobs, estimates, invoices, leads, clients, schedule technicians, generate SEO content, create automations. Be concise, friendly, action-oriented. Natural voice conversational tone. Offer to do things directly. Today is ${new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}.` },
        ...history.slice(-8).map(m => ({ role: m.role === 'assistant' ? 'assistant' : 'user', content: m.text })),
        { role: 'user', content: message }
      ],
      max_tokens: 400,
      temperature: 0.7,
    });
    const opts = { hostname: 'openrouter.ai', path: '/api/v1/chat/completions', method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + API_KEY, 'HTTP-Referer': 'https://profield.local' }, timeout: 30000 };
    const req = https.request(opts, (res) => {
      let c = ''; res.on('data', d => c += d);
      res.on('end', () => { try { const j = JSON.parse(c); resolve(j.choices?.[0]?.message?.content || fallback(message)); } catch(e) { resolve(fallback(message)); } });
    });
    req.on('error', () => resolve(fallback(message)));
    req.on('timeout', () => { req.destroy(); resolve(fallback(message)); });
    req.end(body);
  });
}

function fallback(m) {
  const l = m.toLowerCase();
  if (l.includes('what can') || l.includes('help')) return "I'm Jarvis, your AI super agent! I can help manage jobs, estimates, invoices, generate leads, create SEO content, and build automations for Fiji IT Solutions. What would you like?";
  if (l.includes('job') || l.includes('schedule')) return "I can help with jobs — create, update, schedule, or check status. What do you need?";
  if (l.includes('lead') || l.includes('client')) return "For leads, I can help with SEO content, lead magnets, email sequences, and referrals. What sounds useful?";
  if (l.includes('seo') || l.includes('content')) return "I can help with keyword research and content creation. What topic for FIS?";
  if (l.includes('estimate') || l.includes('invoice')) return "I can create estimates and invoices. Want to make a new one?";
  if (l.includes('build') || l.includes('automat')) return "Let's build! Apps, automations, reports, or templates — what do you want?";
  return "I'm here! Tell me more about what you need.";
}

app.get('/health', (req, res) => res.json({ ok: true, hasKey: !!loadApiKey() }));
app.get('/openrouter-keys', (req, res) => res.json({ keys: loadKeys() }));
app.post('/openrouter-keys', (req, res) => {
  try {
    const keys = Array.isArray(req.body.keys) ? req.body.keys : [];
    fs.writeFileSync(OPENROUTER_KEYS_FILE, JSON.stringify(keys, null, 2));
    res.json({ ok: true, keys });
  } catch (e) {
    res.status(400).json({ ok: false, error: e.message });
  }
});
app.post('/openrouter-keys/refresh', (req, res) => res.json({ ok: true }));
app.post('/jarvis', async (req, res) => {
  const { message, history = [] } = req.body;
  if (!message?.trim()) return res.status(400).json({ error: 'Empty', response: "Didn't catch that." });
  res.json({ response: await callOpenRouter(message.trim(), history) });
});

// Route aliases for nginx proxy path
app.get('/jarvis-api/health', (req, res) => res.json({ ok: true, hasKey: !!API_KEY }));
app.post('/jarvis-api/jarvis', async (req, res) => {
  const { message, history = [] } = req.body;
  if (!message?.trim()) return res.status(400).json({ error: 'Empty', response: "Didn't catch that." });
  res.json({ response: await callOpenRouter(message.trim(), history) });
});

app.listen(3001, '127.0.0.1', () => console.log('Jarvis :3001 key=' + (loadApiKey() ? 'yes' : 'NO')));
