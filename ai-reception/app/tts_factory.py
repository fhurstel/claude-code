"""Builds the TTS service based on what's available."""
from app import config

try:
    from pipecat.services.openai import OpenAITTSService
    _HAS_OPENAI_TTS = True
except ImportError:
    _HAS_OPENAI_TTS = False


def build_tts_service():
    if _HAS_OPENAI_TTS and config.OPENAI_API_KEY:
        return OpenAITTSService(
            api_key=config.OPENAI_API_KEY,
            voice=config.TTS_VOICE or "alloy",
        )
    raise RuntimeError(
        "No TTS service available. Set OPENAI_API_KEY for OpenAI TTS, "
        "or install Kokoro/Piper."
    )
