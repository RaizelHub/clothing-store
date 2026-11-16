import base64
import hashlib
import hmac
import json
import logging
import time
import urllib.error
import urllib.request
from typing import Any, Dict, List, Optional

from django.conf import settings

from apps.common.money import to_cents
from .base import BasePaymentProvider, PaymentSessionResult, WebhookVerificationResult
from .exceptions import PaymentConfigurationError, PaymentProviderError

logger = logging.getLogger(__name__)

PAYMONGO_API_URL = "https://api.paymongo.com/v1/checkout_sessions"
DEFAULT_PAYMENT_METHODS = ["card", "gcash", "paymaya", "grab_pay", "dob", "billease"]
SIGNATURE_TOLERANCE_SECONDS = 300  # 5 minutes replay protection window


class PayMongoPaymentProvider(BasePaymentProvider):
    def __init__(
        self,
        secret_key: Optional[str] = None,
        public_key: Optional[str] = None,
        webhook_secret: Optional[str] = None,
    ):
        self.secret_key = secret_key or getattr(settings, "PAYMONGO_SECRET_KEY", "")
        self.public_key = public_key or getattr(settings, "PAYMONGO_PUBLIC_KEY", "")
        self.webhook_secret = webhook_secret or getattr(settings, "PAYMONGO_WEBHOOK_SECRET", "")

    @property
    def name(self) -> str:
        return "paymongo"

    def _get_auth_header(self) -> str:
        if not self.secret_key:
            raise PaymentConfigurationError("PAYMONGO_SECRET_KEY is not configured.")
        encoded = base64.b64encode(f"{self.secret_key}:".encode("utf-8")).decode("utf-8")
        return f"Basic {encoded}"

    def build_line_items(self, order) -> List[Dict[str, Any]]:
        """
        Build line items in centavos where sum(amount * quantity) matches
        to_cents(order.total) to prevent total mismatch rejections.
        """
        currency = getattr(order, "currency", None) or "PHP"
        total_cents = to_cents(order.total)
        shipping_cents = to_cents(order.shipping)
        tax_cents = to_cents(order.tax)
        discount_cents = to_cents(order.discount)
        subtotal_cents = to_cents(order.subtotal)

        items = list(order.items.all())
        if not items:
            # Fallback if no item rows exist
            return [
                {
                    "currency": currency,
                    "amount": total_cents,
                    "name": f"Studio Order {order.order_number}",
                    "quantity": 1,
                }
            ]

        line_items: List[Dict[str, Any]] = []

        # Target net sum for products after coupon discount
        target_products_cents = max(0, subtotal_cents - discount_cents)

        allocated_cents = 0
        for i, item in enumerate(items):
            item_subtotal = to_cents(item.unit_price) * item.quantity
            if subtotal_cents > 0 and discount_cents > 0:
                # Prorate discount across items
                if i == len(items) - 1:
                    item_net_total = target_products_cents - allocated_cents
                else:
                    item_net_total = round(item_subtotal * target_products_cents / subtotal_cents)
                    allocated_cents += item_net_total
            else:
                item_net_total = item_subtotal

            # Amount per single unit
            unit_amount = max(1, item_net_total // item.quantity)
            line_item_entry = {
                "currency": currency,
                "amount": unit_amount,
                "name": f"{item.product_name} ({item.color_name} / {item.size_name})",
                "quantity": item.quantity,
                "description": f"SKU: {item.sku}",
            }
            if item.image:
                line_item_entry["images"] = [item.image]
            line_items.append(line_item_entry)

        if shipping_cents > 0:
            line_items.append(
                {
                    "currency": currency,
                    "amount": shipping_cents,
                    "name": f"Shipping ({order.shipping_method})",
                    "quantity": 1,
                }
            )

        if tax_cents > 0:
            line_items.append(
                {
                    "currency": currency,
                    "amount": tax_cents,
                    "name": "Estimated Tax",
                    "quantity": 1,
                }
            )

        # Reconcile any 1-2 centavo rounding discrepancies so sum == total_cents exactly
        current_sum = sum(li["amount"] * li["quantity"] for li in line_items)
        diff = total_cents - current_sum
        if diff != 0 and line_items:
            # Adjust the first item to absorb the centavo difference
            line_items[0]["amount"] = max(1, line_items[0]["amount"] + diff)

        return line_items

    def create_checkout_session(
        self,
        order,
        success_url: str,
        cancel_url: str,
        **kwargs
    ) -> PaymentSessionResult:
        """
        Create a PayMongo hosted checkout session securely from backend.
        Never trust client-supplied totals.
        """
        auth_header = self._get_auth_header()

        line_items = self.build_line_items(order)

        shipping_addr = order.shipping_address or {}
        billing_addr = order.billing_address or shipping_addr

        billing_payload = {
            "name": order.customer_name or shipping_addr.get("recipient") or "Customer",
            "email": order.customer_email,
            "phone": str(shipping_addr.get("phone", "")),
            "address": {
                "line1": str(billing_addr.get("line1", "")),
                "line2": str(billing_addr.get("line2", "")),
                "city": str(billing_addr.get("city", "")),
                "state": str(billing_addr.get("state", "")),
                "postal_code": str(billing_addr.get("postal_code", "")),
                "country": str(billing_addr.get("country", "PH"))[:2].upper() or "PH",
            },
        }

        payment_method_types = kwargs.get("payment_method_types") or DEFAULT_PAYMENT_METHODS

        payload = {
            "data": {
                "attributes": {
                    "billing": billing_payload,
                    "send_email_receipt": True,
                    "show_description": True,
                    "show_line_items": True,
                    "description": f"Studio Order {order.order_number}",
                    "line_items": line_items,
                    "payment_method_types": payment_method_types,
                    "reference_number": order.order_number,
                    "success_url": success_url,
                    "cancel_url": cancel_url,
                }
            }
        }

        req = urllib.request.Request(
            PAYMONGO_API_URL,
            data=json.dumps(payload).encode("utf-8"),
            headers={
                "Content-Type": "application/json",
                "Accept": "application/json",
                "Authorization": auth_header,
                "User-Agent": "StudioCommerce/1.0",
            },
            method="POST",
        )

        try:
            with urllib.request.urlopen(req, timeout=20) as resp:
                data = json.loads(resp.read().decode("utf-8"))
        except urllib.error.HTTPError as e:
            raw_err = e.read().decode("utf-8")
            logger.error("PayMongo API HTTP %d error: %s", e.code, raw_err)
            try:
                err_json = json.loads(raw_err)
            except Exception:
                err_json = {"detail": raw_err}
            errors = err_json.get("errors", [])
            detail = errors[0].get("detail", "PayMongo session creation failed.") if errors else "PayMongo error."
            raise PaymentProviderError(detail, raw_response=err_json, status_code=e.code)
        except urllib.error.URLError as e:
            logger.error("PayMongo connection error: %s", str(e))
            raise PaymentProviderError(f"Network error connecting to PayMongo: {e.reason}")

        session_data = data.get("data", {})
        session_id = session_data.get("id", "")
        attributes = session_data.get("attributes", {})
        checkout_url = attributes.get("checkout_url", "")

        if not session_id or not checkout_url:
            raise PaymentProviderError("PayMongo response missing session ID or checkout URL.")

        return PaymentSessionResult(
            session_id=session_id,
            checkout_url=checkout_url,
            payment_provider="paymongo",
            requires_redirect=True,
            metadata={
                "client_key": attributes.get("client_key"),
                "status": attributes.get("status"),
                "reference_number": order.order_number,
            },
        )

    def verify_webhook(
        self,
        raw_body: bytes,
        headers: Dict[str, str]
    ) -> WebhookVerificationResult:
        """
        Verify PayMongo webhook signatures using the official PayMongo specification:
        Header: Paymongo-Signature: t=timestamp,te=test_sig,li=live_sig
        HMAC-SHA256 of: f"{t}.{raw_body.decode()}" using PAYMONGO_WEBHOOK_SECRET.
        """
        if not self.webhook_secret:
            return WebhookVerificationResult(
                is_valid=False,
                error_message="PAYMONGO_WEBHOOK_SECRET is not configured on the server.",
            )

        # Header lookup is case-insensitive
        sig_header = (
            headers.get("paymongo-signature")
            or headers.get("Paymongo-Signature")
            or headers.get("HTTP_PAYMONGO_SIGNATURE")
        )
        if not sig_header:
            return WebhookVerificationResult(
                is_valid=False,
                error_message="Missing 'Paymongo-Signature' header.",
            )

        parts: Dict[str, str] = {}
        for piece in sig_header.split(","):
            if "=" in piece:
                k, v = piece.strip().split("=", 1)
                parts[k.strip()] = v.strip()

        timestamp_str = parts.get("t")
        if not timestamp_str or not timestamp_str.isdigit():
            return WebhookVerificationResult(
                is_valid=False,
                error_message="Missing or invalid timestamp 't' in Paymongo-Signature.",
            )

        timestamp = int(timestamp_str)
        now = int(time.time())
        if abs(now - timestamp) > SIGNATURE_TOLERANCE_SECONDS:
            return WebhookVerificationResult(
                is_valid=False,
                error_message=f"Webhook timestamp expired or outside tolerance window ({abs(now - timestamp)}s > {SIGNATURE_TOLERANCE_SECONDS}s).",
            )

        test_sig = parts.get("te")
        live_sig = parts.get("li")
        if not test_sig and not live_sig:
            return WebhookVerificationResult(
                is_valid=False,
                error_message="Paymongo-Signature missing both 'te' and 'li' signatures.",
            )

        # Construct signed payload according to PayMongo spec: timestamp + "." + raw_body
        signed_payload = f"{timestamp_str}.".encode("utf-8") + raw_body
        computed_sig = hmac.new(
            self.webhook_secret.encode("utf-8"),
            signed_payload,
            hashlib.sha256,
        ).hexdigest()

        is_match = False
        if test_sig and hmac.compare_digest(computed_sig, test_sig):
            is_match = True
        elif live_sig and hmac.compare_digest(computed_sig, live_sig):
            is_match = True

        if not is_match:
            return WebhookVerificationResult(
                is_valid=False,
                error_message="Webhook signature mismatch.",
            )

        try:
            event = json.loads(raw_body.decode("utf-8"))
        except (ValueError, UnicodeDecodeError) as e:
            return WebhookVerificationResult(
                is_valid=False,
                error_message=f"Malformed webhook JSON body: {e}",
            )

        event_data = event.get("data", {})
        event_id = event_data.get("id", "")
        event_attrs = event_data.get("attributes", {})
        event_type = event_attrs.get("type", "")

        nested_data = event_attrs.get("data", {})
        nested_attrs = nested_data.get("attributes", {})

        order_number = nested_attrs.get("reference_number")
        payment_reference = nested_data.get("id")

        # Payment details if present
        payments = nested_attrs.get("payments", [])
        payment_tx_id = None
        payment_status = nested_attrs.get("status")
        amount_cents = None
        currency = None
        payment_method = None
        paid_at = None

        if payments and isinstance(payments, list):
            first_pay = payments[0]
            pay_attrs = first_pay.get("attributes", {})
            payment_tx_id = first_pay.get("id")
            payment_status = pay_attrs.get("status", payment_status)
            amount_cents = pay_attrs.get("amount")
            currency = pay_attrs.get("currency")
            payment_method = pay_attrs.get("source", {}).get("type")
            paid_at_epoch = pay_attrs.get("paid_at")
            if paid_at_epoch:
                import datetime
                paid_at = datetime.datetime.fromtimestamp(paid_at_epoch, tz=datetime.timezone.utc).isoformat()

        # If direct payment object
        if nested_data.get("type") == "payment":
            payment_tx_id = nested_data.get("id")
            payment_status = nested_attrs.get("status", payment_status)
            amount_cents = nested_attrs.get("amount")
            currency = nested_attrs.get("currency")
            payment_method = nested_attrs.get("source", {}).get("type")

        return WebhookVerificationResult(
            is_valid=True,
            event_id=event_id,
            event_type=event_type,
            order_number=order_number,
            payment_reference=payment_reference,
            payment_transaction_id=payment_tx_id,
            payment_status=payment_status,
            amount_cents=amount_cents,
            currency=currency,
            payment_method=payment_method,
            paid_at=paid_at,
            raw_event=event,
        )

