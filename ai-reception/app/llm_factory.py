"""Builds the LLM service for the pipeline based on config."""
from pipecat.services.openai import OpenAILLMService

from app import config


def build_llm_service():
    """Return a Pipecat LLM service.

    Ollama exposes an OpenAI-compatible endpoint, so the same service class
    works for both providers by swapping base_url + api_key.
    """
    if config.LLM_PROVIDER == "openai":
        return OpenAILLMService(
            api_key=config.OPENAI_API_KEY,
            model=config.OPENAI_MODEL,
        )

    # Ollama (free, self-hosted) via its OpenAI-compatible API.
    return OpenAILLMService(
        api_key="ollama",  # placeholder; Ollama ignores it
        base_url=f"{config.OLLAMA_BASE_URL}/v1",
        model=config.OLLAMA_MODEL,
    )
