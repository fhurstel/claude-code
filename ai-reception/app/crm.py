"""Pushes a captured lead into the Fiji IT ticketing system via webhook."""
import json
import logging

import httpx

from app import config

logger = logging.getLogger("crm")


async def push_lead(lead: dict) -> bool:
    """POST the lead to the CRM webhook. Returns True on success.

    Expected `lead` keys: first_name, last_name, phone, email,
    requirement, is_existing_client, urgency, wants_transfer.
    """
    if not config.CRM_WEBHOOK_URL:
        logger.warning("No CRM_WEBHOOK_URL set; logging lead instead:\n%s",
                       json.dumps(lead, indent=2))
        return False

    headers = {"Content-Type": "application/json"}
    if config.CRM_WEBHOOK_TOKEN:
        headers["Authorization"] = f"Bearer {config.CRM_WEBHOOK_TOKEN}"

    payload = {
        "source": "ai-receptionist",
        "firstName": lead.get("first_name", ""),
        "lastName": lead.get("last_name", ""),
        "phone": lead.get("phone", ""),
        "email": lead.get("email", ""),
        "requirement": lead.get("requirement", ""),
        "isExistingClient": lead.get("is_existing_client", False),
        "urgency": lead.get("urgency", "low"),
    }

    try:
        async with httpx.AsyncClient(timeout=15) as client:
            resp = await client.post(config.CRM_WEBHOOK_URL, json=payload,
                                     headers=headers)
            resp.raise_for_status()
        logger.info("Lead pushed to CRM: %s %s", payload["firstName"],
                    payload["lastName"])
        return True
    except httpx.HTTPError as exc:
        logger.error("CRM push failed: %s", exc)
        # Fallback: persist locally so the lead is never lost
        with open("failed_leads.jsonl", "a", encoding="utf-8") as fh:
            fh.write(json.dumps(payload) + "\n")
        return False
