import logging
from django.conf import settings
from django.core.mail import EmailMultiAlternatives
from .base import BaseEmailProvider, EmailMessage, EmailSendResult

logger = logging.getLogger("studio.emails")


class SmtpEmailProvider(BaseEmailProvider):
    """
    Standard Django SMTP email provider.
    Relies on Django's core email framework for staging/production SMTP configurations.
    """
    name = "smtp"

    def send(self, message: EmailMessage) -> EmailSendResult:
        from_email = message.from_email or getattr(
            settings, "DEFAULT_FROM_EMAIL", "Studio Atelier <concierge@studio-atelier.ph>"
        )
        try:
            msg = EmailMultiAlternatives(
                subject=message.subject,
                body=message.text_body,
                from_email=from_email,
                to=[message.to_email],
                reply_to=[message.reply_to] if message.reply_to else None,
            )
            if message.html_body:
                msg.attach_alternative(message.html_body, "text/html")
            msg.send(fail_silently=False)
            logger.info(f"[SmtpEmail] Delivered to <{message.to_email}>: '{message.subject}'")
            return EmailSendResult(success=True, message_id="smtp_delivered", provider=self.name)
        except Exception as exc:
            logger.error(f"[SmtpEmail] Delivery failure to <{message.to_email}>: {exc}")
            return EmailSendResult(success=False, error=str(exc), provider=self.name)
