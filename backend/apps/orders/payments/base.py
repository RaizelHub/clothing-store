from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from typing import Any, Dict, Optional


@dataclass
class PaymentSessionResult:
    session_id: str
    checkout_url: str
    payment_provider: str
    requires_redirect: bool = True
    metadata: Dict[str, Any] = field(default_factory=dict)


@dataclass
class WebhookVerificationResult:
    is_valid: bool
    event_id: str = ""
    event_type: str = ""
    order_number: Optional[str] = None
    payment_reference: Optional[str] = None
    payment_transaction_id: Optional[str] = None
    payment_status: Optional[str] = None
    amount_cents: Optional[int] = None
    currency: Optional[str] = None
    payment_method: Optional[str] = None
    paid_at: Optional[str] = None
    raw_event: Dict[str, Any] = field(default_factory=dict)
    error_message: Optional[str] = None


class BasePaymentProvider(ABC):
    @property
    @abstractmethod
    def name(self) -> str:
        """Provider identifier string, e.g. 'mock' or 'paymongo'."""
        pass

    @abstractmethod
    def create_checkout_session(
        self,
        order,
        success_url: str,
        cancel_url: str,
        **kwargs
    ) -> PaymentSessionResult:
        """Create a payment session for an order."""
        pass

    @abstractmethod
    def verify_webhook(
        self,
        raw_body: bytes,
        headers: Dict[str, str]
    ) -> WebhookVerificationResult:
        """Verify an incoming webhook signature and parse payment event data."""
        pass

