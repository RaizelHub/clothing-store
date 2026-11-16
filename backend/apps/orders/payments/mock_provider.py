import json
from typing import Dict

from .base import BasePaymentProvider, PaymentSessionResult, WebhookVerificationResult


class MockPaymentProvider(BasePaymentProvider):
    @property
    def name(self) -> str:
        return "mock"

    def create_checkout_session(
        self,
        order,
        success_url: str,
        cancel_url: str,
        **kwargs
    ) -> PaymentSessionResult:
        simulate_redirect = kwargs.get("simulate_redirect", False)
        session_id = f"mock_cs_{order.order_number}"
        redirect_url = f"{success_url}?mock_session={session_id}" if simulate_redirect else success_url
        return PaymentSessionResult(
            session_id=session_id,
            checkout_url=redirect_url,
            payment_provider="mock",
            requires_redirect=simulate_redirect,
            metadata={"simulated": True, "order_number": order.order_number},
        )

    def verify_webhook(
        self,
        raw_body: bytes,
        headers: Dict[str, str]
    ) -> WebhookVerificationResult:
        sig = headers.get("x-mock-signature") or headers.get("X-Mock-Signature")
        if sig != "valid_mock_signature":
            return WebhookVerificationResult(
                is_valid=False,
                error_message="Invalid mock signature. Expected 'valid_mock_signature'.",
            )
        try:
            payload = json.loads(raw_body.decode("utf-8"))
        except (ValueError, UnicodeDecodeError) as e:
            return WebhookVerificationResult(is_valid=False, error_message=f"Malformed JSON: {e}")

        event_id = payload.get("id") or payload.get("event_id") or "mock_evt_1"
        event_type = payload.get("type") or payload.get("event_type") or "checkout_session.payment.paid"
        order_number = payload.get("order_number") or payload.get("reference_number")
        payment_ref = payload.get("payment_reference") or payload.get("checkout_session_id")

        return WebhookVerificationResult(
            is_valid=True,
            event_id=event_id,
            event_type=event_type,
            order_number=order_number,
            payment_reference=payment_ref,
            payment_transaction_id=payload.get("payment_transaction_id", f"mock_pay_{order_number}"),
            payment_status=payload.get("payment_status", "paid"),
            amount_cents=payload.get("amount_cents"),
            currency=payload.get("currency", "PHP"),
            payment_method=payload.get("payment_method", "card"),
            paid_at=payload.get("paid_at"),
            raw_event=payload,
        )

