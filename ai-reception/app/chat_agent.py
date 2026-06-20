"""Text-based chat agent for testing the receptionist without Twilio/audio."""
import httpx

from app import config


class ChatAgent:
    def __init__(self):
        self.messages = [{"role": "system", "content": config.SYSTEM_PROMPT}]
        self._collected = {"name": False, "phone": False, "email": False, "requirement": False}

    async def respond(self, user_message: str) -> str:
        self.messages.append({"role": "user", "content": user_message})

        if config.LLM_PROVIDER == "openai":
            reply = await self._openai_chat()
        elif config.LLM_PROVIDER == "mock":
            reply = self._mock_chat(user_message)
        else:
            reply = await self._ollama_chat()

        self.messages.append({"role": "assistant", "content": reply})
        return reply

    def get_transcript(self) -> str:
        lines = []
        for m in self.messages:
            if m["role"] == "user":
                lines.append(f"Caller: {m['content']}")
            elif m["role"] == "assistant":
                lines.append(f"Receptionist: {m['content']}")
        return "\n".join(lines)

    def _mock_chat(self, user_message: str) -> str:
        msg_lower = user_message.lower()
        user_count = sum(1 for m in self.messages if m["role"] == "user")

        if user_count == 1:
            return (
                "Hello! Thank you for calling Fiji IT Solutions. "
                "I'm the virtual receptionist. How can I help you today?"
            )

        if not self._collected["requirement"] and len(user_message) > 10:
            self._collected["requirement"] = True
            return (
                "I understand, I'll make sure a technician follows up on that. "
                "Could I get your full name please?"
            )

        if not self._collected["name"] and any(c.isupper() for c in user_message):
            self._collected["name"] = True
            return "Thank you! And what's the best phone number to reach you at?"

        if not self._collected["phone"] and any(c.isdigit() for c in msg_lower):
            self._collected["phone"] = True
            return "Got it. And could I get your email address?"

        if not self._collected["email"] and "@" in msg_lower:
            self._collected["email"] = True
            return (
                "Perfect, let me confirm what I have: I've noted your contact details "
                "and your request. A technician will follow up with you shortly. "
                "Is there anything else I can help you with?"
            )

        if all(self._collected.values()):
            return (
                "Thank you for calling Fiji IT Solutions! "
                "A technician will be in touch shortly. Have a great day!"
            )

        return "Could you tell me a bit more about what you need help with?"

    async def _openai_chat(self) -> str:
        async with httpx.AsyncClient(timeout=60) as client:
            resp = await client.post(
                "https://api.openai.com/v1/chat/completions",
                headers={"Authorization": f"Bearer {config.OPENAI_API_KEY}"},
                json={"model": config.OPENAI_MODEL, "messages": self.messages},
            )
            resp.raise_for_status()
            return resp.json()["choices"][0]["message"]["content"]

    async def _ollama_chat(self) -> str:
        async with httpx.AsyncClient(timeout=60) as client:
            resp = await client.post(
                f"{config.OLLAMA_BASE_URL}/v1/chat/completions",
                json={"model": config.OLLAMA_MODEL, "messages": self.messages},
            )
            resp.raise_for_status()
            return resp.json()["choices"][0]["message"]["content"]
