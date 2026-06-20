#!/usr/bin/env bash
# ─────────────────────────────────────────────────
# Fiji IT Solutions — AI Receptionist  |  One-click setup
# ─────────────────────────────────────────────────
set -e

echo ""
echo "=========================================="
echo "  Fiji IT — AI Receptionist Setup"
echo "=========================================="
echo ""

# Check Python version
if ! command -v python3 &>/dev/null; then
    echo "ERROR: Python 3 is required. Install it first."
    exit 1
fi

PYVER=$(python3 -c 'import sys; print(f"{sys.version_info.major}.{sys.version_info.minor}")')
echo "[1/4] Python $PYVER detected"

# Create virtual environment
if [ ! -d "venv" ]; then
    echo "[2/4] Creating virtual environment..."
    python3 -m venv venv
else
    echo "[2/4] Virtual environment already exists"
fi

# Activate venv
source venv/bin/activate

# Install dependencies
echo "[3/4] Installing dependencies (this may take a minute)..."
pip install --upgrade pip -q
pip install -r requirements.txt -q

# Create .env if it doesn't exist
if [ ! -f ".env" ]; then
    echo "[4/4] Creating .env with mock mode (no API keys needed)..."
    cat > .env << 'ENVEOF'
# ─── Test mode (no external services needed) ───
LLM_PROVIDER=mock
PUBLIC_BASE_URL=https://localhost:8000
CRM_WEBHOOK_URL=

# ─── To use a real LLM, uncomment one: ───

# Option A: OpenAI (best quality, paid)
# LLM_PROVIDER=openai
# OPENAI_API_KEY=sk-your-key-here
# OPENAI_MODEL=gpt-4o-mini

# Option B: Ollama (free, self-hosted)
# LLM_PROVIDER=ollama
# OLLAMA_BASE_URL=http://localhost:11434
# OLLAMA_MODEL=llama3.1:8b

# ─── Twilio (needed for real phone calls) ───
# TWILIO_ACCOUNT_SID=
# TWILIO_AUTH_TOKEN=
# TWILIO_PHONE_NUMBER=
# TRANSFER_TARGET_NUMBER=

# ─── CRM push ───
# CRM_WEBHOOK_URL=https://your-ticketing-app.com/api/leads
# CRM_WEBHOOK_TOKEN=
ENVEOF
else
    echo "[4/4] .env already exists, keeping it"
fi

echo ""
echo "=========================================="
echo "  Setup complete!"
echo "=========================================="
echo ""
echo "  To start the server:"
echo "    source venv/bin/activate"
echo "    python -m uvicorn app.server:app --host 0.0.0.0 --port 8000"
echo ""
echo "  Then open in your browser:"
echo "    http://localhost:8000/chat/ui"
echo ""
echo "  To run tests:"
echo "    python -m pytest tests/ -v"
echo ""
echo "  Current mode: MOCK (no API keys needed)"
echo "  Edit .env to switch to OpenAI or Ollama"
echo ""
