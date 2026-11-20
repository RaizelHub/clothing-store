from typing import Optional
from django.conf import settings
from .base import BaseEmailProvider
from .mock_provider import MockEmailProvider
from .resend_provider import ResendEmailProvider
from .smtp_provider import SmtpEmailProvider


def get_email_provider(name: Optional[str] = None) -> BaseEmailProvider:
    """
    Resolves the transactional email provider based on parameter or Django settings.
    Supported values: 'mock', 'resend', 'smtp'.
    Defaults safely to 'mock'.
    """
    provider_name = (name or getattr(settings, "EMAIL_PROVIDER", "mock")).lower().strip()
    if provider_name == "resend":
        return ResendEmailProvider()
    elif provider_name in ("smtp", "django"):
        return SmtpEmailProvider()
    return MockEmailProvider()
