"""Loads and validates configuration from environment variables."""
import os
from pathlib import Path
from dotenv import load_dotenv

load_dotenv()

BASE_DIR = Path(__file__).resolve().parent.parent
PROMPTS_DIR = BASE_DIR / "prompts"


def _read_prompt(name: str) -> str:
    return (PROMPTS_DIR / name).read_text(encoding="utf-8").strip()


SYSTEM_PROMPT = _read_prompt("system_prompt.txt")
EXTRACTION_PROMPT = _read_prompt("extraction_prompt.txt")

# Telephony
TWILIO_ACCOUNT_SID = os.getenv("TWILIO_ACCOUNT_SID", "")
TWILIO_AUTH_TOKEN = os.getenv("TWILIO_AUTH_TOKEN", "")
TWILIO_PHONE_NUMBER = os.getenv("TWILIO_PHONE_NUMBER", "")
TRANSFER_TARGET_NUMBER = os.getenv("TRANSFER_TARGET_NUMBER", "")
PUBLIC_BASE_URL = os.getenv("PUBLIC_BASE_URL", "").rstrip("/")

# LLM
LLM_PROVIDER = os.getenv("LLM_PROVIDER", "ollama")
OLLAMA_BASE_URL = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434")
OLLAMA_MODEL = os.getenv("OLLAMA_MODEL", "llama3.1:8b")
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY", "")
OPENAI_MODEL = os.getenv("OPENAI_MODEL", "gpt-4o-mini")

# Speech
WHISPER_MODEL = os.getenv("WHISPER_MODEL", "base.en")
TTS_VOICE = os.getenv("TTS_VOICE", "af_heart")

# CRM
CRM_WEBHOOK_URL = os.getenv("CRM_WEBHOOK_URL", "")
CRM_WEBHOOK_TOKEN = os.getenv("CRM_WEBHOOK_TOKEN", "")
