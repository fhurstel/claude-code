"""Tests for the FastAPI server endpoints."""
import pytest
from unittest.mock import patch, AsyncMock
from fastapi.testclient import TestClient

from app.server import app


@pytest.fixture
def client():
    return TestClient(app)


def test_health(client):
    resp = client.get("/health")
    assert resp.status_code == 200
    assert resp.json() == {"status": "ok"}


def test_voice_returns_twiml(client):
    with patch("app.server.config") as mock_config:
        mock_config.PUBLIC_BASE_URL = "https://test.example.com"
        resp = client.post("/voice")
    assert resp.status_code == 200
    assert "application/xml" in resp.headers["content-type"]
    body = resp.text
    assert "<Stream" in body
    assert "wss://test.example.com/ws" in body


def test_voice_transfer_with_number(client):
    with patch("app.server.config") as mock_config:
        mock_config.TRANSFER_TARGET_NUMBER = "+15551234567"
        resp = client.post("/voice/transfer")
    assert resp.status_code == 200
    assert "Connecting you to a technician" in resp.text
    assert "+15551234567" in resp.text


def test_voice_transfer_no_number(client):
    with patch("app.server.config") as mock_config:
        mock_config.TRANSFER_TARGET_NUMBER = ""
        resp = client.post("/voice/transfer")
    assert resp.status_code == 200
    assert "no technician line is configured" in resp.text


def test_sms_endpoint(client):
    with patch("app.server.extract_lead", new_callable=AsyncMock) as mock_extract, \
         patch("app.server.push_lead", new_callable=AsyncMock) as mock_push:
        mock_extract.return_value = {"phone": "", "first_name": "Test"}
        mock_push.return_value = True

        resp = client.post("/sms", data={"Body": "Need help with printer", "From": "+15105550142"})

    assert resp.status_code == 200
    assert "Thanks for contacting Fiji IT Solutions" in resp.text
    mock_extract.assert_called_once()
    mock_push.assert_called_once()
    pushed_lead = mock_push.call_args[0][0]
    assert pushed_lead["phone"] == "15105550142"


def test_chat_endpoint(client):
    with patch("app.server.ChatAgent") as MockAgent:
        agent_instance = MockAgent.return_value
        agent_instance.respond = AsyncMock(return_value="Hello! How can I help you?")

        resp = client.post("/chat", json={"message": "Hi there"})

    assert resp.status_code == 200
    data = resp.json()
    assert "session_id" in data
    assert data["reply"] == "Hello! How can I help you?"


def test_chat_ui(client):
    resp = client.get("/chat/ui")
    assert resp.status_code == 200
    assert "AI Receptionist" in resp.text
    assert "<script>" in resp.text
