from typing import Optional

from django.conf import settings

from .base import BasePaymentProvider
from .mock_provider import MockPaymentProvider
from .paymongo_provider import PayMongoPaymentProvider


def get_payment_provider(name: Optional[str] = None) -> BasePaymentProvider:
    """
    Get payment provider instance.
    Defaults to settings.PAYMENTS_PROVIDER (e.g. 'mock' or 'paymongo').
    """
    provider_name = (name or getattr(settings, "PAYMENTS_PROVIDER", "mock")).lower().strip()
    if provider_name == "paymongo":
        return PayMongoPaymentProvider()
    return MockPaymentProvider()

