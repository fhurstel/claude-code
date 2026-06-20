"""Extracts structured lead fields from a call transcript using the LLM."""
import json
import logging
import re

import httpx

from app import config

logger = logging.getLogger("extract")

EMPTY_LEAD = {
    "first_name": "", "last_name": "", "phone": "", "email": "",
    "requirement": "", "is_existing_client": False,
    "urgency": "low", "wants_transfer": False,
}


def _strip_fences(text: str) -> str:
    return text.replace("```json", "").replace("```", "").strip()


async def extract_lead(transcript: str) -> dict:
    """Run the extraction prompt over the transcript and return a lead dict."""
    user_msg = f"{config.EXTRACTION_PROMPT}\n\nTRANSCRIPT:\n{transcript}"

    try:
        if config.LLM_PROVIDER == "mock":
            return _mock_extract(transcript)
        elif config.LLM_PROVIDER == "openai":
            content = await _openai_complete(user_msg)
        else:
            content = await _ollama_complete(user_msg)
        parsed = json.loads(_strip_fences(content))
        # Merge onto defaults so missing keys never break the CRM push
        return {**EMPTY_LEAD, **parsed}
    except (httpx.HTTPError, json.JSONDecodeError, KeyError) as exc:
        logger.error("Extraction failed, returning empty lead: %s", exc)
        return dict(EMPTY_LEAD)


def _mock_extract(transcript: str) -> dict:
    lead = dict(EMPTY_LEAD)
    email_match = re.search(r'[\w.+-]+@[\w.-]+\.\w+', transcript)
    if email_match:
        lead["email"] = email_match.group().lower()
    phone_match = re.search(r'[\d][\d\s\-().]{6,}[\d]', transcript)
    if phone_match:
        lead["phone"] = re.sub(r'\D', '', phone_match.group())
    for line in transcript.split("\n"):
        if line.startswith("Caller:"):
            text = line[7:].strip()
            words = text.split()
            if 2 <= len(words) <= 4 and all(w[0].isupper() for w in words if w.isalpha()):
                lead["first_name"] = words[0]
                lead["last_name"] = " ".join(words[1:])
    for line in transcript.split("\n"):
        if line.startswith("Caller:") and len(line) > 30 and "@" not in line:
            text = line[7:].strip()
            if not all(w[0].isupper() for w in text.split() if w.isalpha()):
                lead["requirement"] = text
                break
    return lead


async def _ollama_complete(prompt: str) -> str:
    async with httpx.AsyncClient(timeout=60) as client:
        resp = await client.post(
            f"{config.OLLAMA_BASE_URL}/api/generate",
            json={"model": config.OLLAMA_MODEL, "prompt": prompt,
                  "stream": False, "format": "json"},
        )
        resp.raise_for_status()
        return resp.json()["response"]


async def _openai_complete(prompt: str) -> str:
    async with httpx.AsyncClient(timeout=60) as client:
        resp = await client.post(
            "https://api.openai.com/v1/chat/completions",
            headers={"Authorization": f"Bearer {config.OPENAI_API_KEY}"},
            json={
                "model": config.OPENAI_MODEL,
                "messages": [{"role": "user", "content": prompt}],
                "response_format": {"type": "json_object"},
            },
        )
        resp.raise_for_status()
        return resp.json()["choices"][0]["message"]["content"]
