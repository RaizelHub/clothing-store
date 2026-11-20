import json
import logging
import urllib.request
import urllib.error
from django.conf import settings
from .base import BaseEmailProvider, EmailMessage, EmailSendResult

logger = logging.getLogger("studio.emails")


class ResendEmailProvider(BaseEmailProvider):
    """
    Resend transactional email provider via official HTTP API.
    Does not require external package installations, keeping dependencies lightweight.
    """
    name = "resend"

    def __init__(self, api_key: str = None, default_from: str = None):
        self.api_key = api_key or getattr(settings, "RESEND_API_KEY", "")
        self.default_from = default_from or getattr(
            settings, "DEFAULT_FROM_EMAIL", "Studio Atelier <onboarding@resend.dev>"
        )

    def send(self, message: EmailMessage) -> EmailSendResult:
        if not self.api_key:
            err = "RESEND_API_KEY is not configured in settings."
            logger.warning(f"[ResendEmail] {err}")
            return EmailSendResult(success=False, error=err, provider=self.name)

        payload = {
            "from": message.from_email or self.default_from,
            "to": [message.to_email],
            "subject": message.subject,
            "html": message.html_body,
            "text": message.text_body,
        }
        if message.reply_to:
            payload["reply_to"] = message.reply_to

        req = urllib.request.Request(
            "https://api.resend.com/emails",
            data=json.dumps(payload).encode("utf-8"),
            headers={
                "Authorization": f"Bearer {self.api_key}",
                "Content-Type": "application/json",
                "User-Agent": "Studio-Atelier/1.0",
            },
            method="POST",
        )

        try:
            with urllib.request.urlopen(req, timeout=10) as resp:
                data = json.loads(resp.read().decode("utf-8"))
                msg_id = data.get("id", "")
                logger.info(f"[ResendEmail] Successfully sent email to <{message.to_email}> (id: {msg_id})")
                return EmailSendResult(success=True, message_id=msg_id, provider=self.name)
        except urllib.error.HTTPError as exc:
            err_body = exc.read().decode("utf-8")
            logger.error(f"[ResendEmail] HTTP error {exc.code}: {err_body}")
            return EmailSendResult(success=False, error=f"HTTP {exc.code}: {err_body}", provider=self.name)
        except Exception as exc:
            logger.error(f"[ResendEmail] Dispatch error: {str(exc)}")
            return EmailSendResult(success=False, error=str(exc), provider=self.name)
