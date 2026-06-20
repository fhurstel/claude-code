"""Tests for lead extraction and CRM push logic."""
import json
import pytest
import httpx
from unittest.mock import AsyncMock, MagicMock, patch, mock_open

from app.extraction import extract_lead, _strip_fences, _mock_extract, EMPTY_LEAD
from app.crm import push_lead


def test_mock_extract_full_transcript():
    transcript = (
        "Caller: Hi there\n"
        "Receptionist: Hello! How can I help you?\n"
        "Caller: My printer keeps jamming and showing error codes\n"
        "Receptionist: Could I get your name?\n"
        "Caller: Jane Doe\n"
        "Receptionist: Phone number?\n"
        "Caller: 510-555-0142\n"
        "Receptionist: Email?\n"
        "Caller: jane@example.com\n"
    )
    lead = _mock_extract(transcript)
    assert lead["first_name"] == "Jane"
    assert lead["last_name"] == "Doe"
    assert lead["phone"] == "5105550142"
    assert lead["email"] == "jane@example.com"
    assert "printer" in lead["requirement"].lower()


def test_mock_extract_partial_info():
    transcript = "Caller: I need help with my wifi\n"
    lead = _mock_extract(transcript)
    assert lead["first_name"] == ""
    assert lead["email"] == ""


def test_strip_fences():
    assert _strip_fences('```json\n{"a": 1}\n```') == '{"a": 1}'
    assert _strip_fences('{"a": 1}') == '{"a": 1}'


@pytest.mark.asyncio
async def test_extract_lead_ollama():
    fake_response = json.dumps({
        "first_name": "Jane",
        "last_name": "Doe",
        "phone": "5105550142",
        "email": "jane@example.com",
        "requirement": "Printer not working",
        "is_existing_client": True,
        "urgency": "high",
        "wants_transfer": True,
    })

    mock_resp = MagicMock()
    mock_resp.status_code = 200
    mock_resp.raise_for_status = lambda: None
    mock_resp.json.return_value = {"response": fake_response}

    with patch("app.extraction.config") as mock_config:
        mock_config.LLM_PROVIDER = "ollama"
        mock_config.OLLAMA_BASE_URL = "http://localhost:11434"
        mock_config.OLLAMA_MODEL = "llama3.1:8b"
        mock_config.EXTRACTION_PROMPT = "Extract data."

        with patch("httpx.AsyncClient") as MockClient:
            client_instance = AsyncMock()
            client_instance.post.return_value = mock_resp
            MockClient.return_value.__aenter__ = AsyncMock(return_value=client_instance)
            MockClient.return_value.__aexit__ = AsyncMock(return_value=False)

            lead = await extract_lead("Caller: Hi, I'm Jane Doe. My printer is broken.")

    assert lead["first_name"] == "Jane"
    assert lead["last_name"] == "Doe"
    assert lead["urgency"] == "high"


@pytest.mark.asyncio
async def test_extract_lead_returns_defaults_on_error():
    with patch("app.extraction.config") as mock_config:
        mock_config.LLM_PROVIDER = "ollama"
        mock_config.OLLAMA_BASE_URL = "http://localhost:11434"
        mock_config.OLLAMA_MODEL = "llama3.1:8b"
        mock_config.EXTRACTION_PROMPT = "Extract data."

        with patch("httpx.AsyncClient") as MockClient:
            client_instance = AsyncMock()
            client_instance.post.side_effect = httpx.ConnectError("no connection")
            MockClient.return_value.__aenter__ = AsyncMock(return_value=client_instance)
            MockClient.return_value.__aexit__ = AsyncMock(return_value=False)

            lead = await extract_lead("some transcript")

    assert lead == EMPTY_LEAD


@pytest.mark.asyncio
async def test_push_lead_no_url():
    with patch("app.crm.config") as mock_config:
        mock_config.CRM_WEBHOOK_URL = ""
        result = await push_lead({"first_name": "Test"})
    assert result is False


@pytest.mark.asyncio
async def test_push_lead_success():
    mock_resp = AsyncMock()
    mock_resp.status_code = 200
    mock_resp.raise_for_status = lambda: None

    with patch("app.crm.config") as mock_config:
        mock_config.CRM_WEBHOOK_URL = "https://example.com/api/leads"
        mock_config.CRM_WEBHOOK_TOKEN = "test-token"

        with patch("httpx.AsyncClient") as MockClient:
            client_instance = AsyncMock()
            client_instance.post.return_value = mock_resp
            MockClient.return_value.__aenter__ = AsyncMock(return_value=client_instance)
            MockClient.return_value.__aexit__ = AsyncMock(return_value=False)

            result = await push_lead({
                "first_name": "Jane",
                "last_name": "Doe",
                "phone": "5105550142",
                "email": "jane@example.com",
                "requirement": "Printer broken",
                "is_existing_client": False,
                "urgency": "medium",
            })

    assert result is True


@pytest.mark.asyncio
async def test_push_lead_failure_saves_to_file():
    with patch("app.crm.config") as mock_config:
        mock_config.CRM_WEBHOOK_URL = "https://example.com/api/leads"
        mock_config.CRM_WEBHOOK_TOKEN = ""

        with patch("httpx.AsyncClient") as MockClient:
            client_instance = AsyncMock()
            client_instance.post.side_effect = httpx.ConnectError("fail")
            MockClient.return_value.__aenter__ = AsyncMock(return_value=client_instance)
            MockClient.return_value.__aexit__ = AsyncMock(return_value=False)

            m = mock_open()
            with patch("builtins.open", m):
                result = await push_lead({"first_name": "Jane"})

    assert result is False
    m.assert_called_once()
