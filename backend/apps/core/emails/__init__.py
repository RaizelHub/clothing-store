from .base import EmailMessage, EmailSendResult, BaseEmailProvider
from .factory import get_email_provider
from .mock_provider import MockEmailProvider
from .resend_provider import ResendEmailProvider
from .smtp_provider import SmtpEmailProvider
from .templates import (
    build_order_confirmation_email,
    build_payment_receipt_email,
    build_order_shipped_email,
    build_contact_acknowledgement_email,
)

__all__ = [
    "EmailMessage",
    "EmailSendResult",
    "BaseEmailProvider",
    "get_email_provider",
    "MockEmailProvider",
    "ResendEmailProvider",
    "SmtpEmailProvider",
    "build_order_confirmation_email",
    "build_payment_receipt_email",
    "build_order_shipped_email",
    "build_contact_acknowledgement_email",
]
