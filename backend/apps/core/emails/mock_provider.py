import logging
import uuid
from typing import List, Dict, Any
from .base import BaseEmailProvider, EmailMessage, EmailSendResult

logger = logging.getLogger("studio.emails")


class MockEmailProvider(BaseEmailProvider):
    """
    Mock email provider for local development, testing, and offline modes.
    Stores sent messages in-memory and outputs cleanly to logging.
    """
    name = "mock"
    outbox: List[Dict[str, Any]] = []

    @classmethod
    def reset_outbox(cls):
        cls.outbox.clear()

    def send(self, message: EmailMessage) -> EmailSendResult:
        msg_id = f"mock_mail_{uuid.uuid4().hex[:12]}"
        record = {
            "id": msg_id,
            "to": message.to_email,
            "subject": message.subject,
            "from_email": message.from_email,
            "reply_to": message.reply_to,
            "html": message.html_body,
            "text": message.text_body,
            "metadata": message.metadata,
        }
        self.outbox.append(record)
        logger.info(f"[MockEmail] Dispatched to <{message.to_email}>: '{message.subject}' (id: {msg_id})")
        return EmailSendResult(success=True, message_id=msg_id, provider=self.name)
