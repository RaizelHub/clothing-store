import hashlib
import hmac
import json
import time
from decimal import Decimal
from unittest.mock import MagicMock, patch

from django.contrib.auth import get_user_model
from django.test import override_settings
from rest_framework import status
from rest_framework.test import APITestCase

from apps.catalog.models import Category, Color, Product, ProductVariant, Size, StoreSettings
from apps.orders.models import Cart, CartItem, Coupon, Order, OrderItem, PaymentWebhookEvent
from apps.orders.payments.paymongo_provider import PayMongoPaymentProvider

User = get_user_model()


class PayMongoAndPaymentIntegrationTests(APITestCase):
    def setUp(self):
        StoreSettings.objects.update_or_create(
            pk=1,
            defaults={
                "store_name": "Studio Test",
                "currency": "PHP",
                "tax_rate": Decimal("0.08"),
                "shipping_flat_rate": Decimal("12.00"),
                "free_shipping_threshold": Decimal("150.00"),
                "low_stock_threshold": 5,
            },
        )
        self.category = Category.objects.create(name="Tops", slug="tops")
        self.color_black = Color.objects.create(name="Black", hex="#000000")
        self.size_m = Size.objects.create(name="M", sort_order=1)

        self.product = Product.objects.create(
            name="Studio Silk Shirt",
            slug="studio-silk-shirt",
            base_price=Decimal("100.00"),
            category=self.category,
        )
        self.variant = ProductVariant.objects.create(
            product=self.product,
            sku="STU-SLK-M",
            color=self.color_black,
            size=self.size_m,
            stock=10,
        )

        self.customer = User.objects.create_user(
            email="janmark@example.com",
            password="password123",
            first_name="Janmark",
            last_name="Suelto",
        )
        self.admin = User.objects.create_superuser(
            email="admin@studio.test",
            password="adminpassword",
            first_name="Admin",
            last_name="User",
        )

        self.test_wh_secret = "whsk_test_mock_secret_key_12345"

    def _generate_paymongo_signature(self, raw_body_bytes: bytes, timestamp: int, secret: str = None) -> str:
        sec = secret or self.test_wh_secret
        signed_payload = f"{timestamp}.".encode("utf-8") + raw_body_bytes
        sig = hmac.new(sec.encode("utf-8"), signed_payload, hashlib.sha256).hexdigest()
        return f"t={timestamp},te={sig}"

    # 1. Mock payment flow
    def test_mock_payment_flow(self):
        """When PAYMENTS_PROVIDER=mock, checkout immediately sets order to paid and decrements stock once."""
        session = "guest-mock-session"
        self.client.post(
            "/api/cart/items/",
            {"variant_id": self.variant.id, "quantity": 1},
            format="json",
            HTTP_X_GUEST_SESSION_ID=session,
        )
        payload = {
            "customer_email": "buyer@example.com",
            "shipping_address": {"recipient": "Buyer", "line1": "123 St", "city": "Manila", "country": "PH"},
            "payment": {"provider": "mock", "number": "4242424242424242"},
        }
        res = self.client.post("/api/checkout/place-order/", payload, format="json", HTTP_X_GUEST_SESSION_ID=session)
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        self.assertEqual(res.data["status"], "paid")
        self.assertEqual(res.data["payment_status"], "paid")
        self.assertEqual(res.data["payment_provider"], "mock")

        self.variant.refresh_from_db()
        self.assertEqual(self.variant.stock, 9)

    # 2. PayMongo payment-session creation
    @override_settings(
        PAYMENTS_PROVIDER="paymongo",
        PAYMONGO_SECRET_KEY="sk_test_dummy_key",
        FRONTEND_URL="http://localhost:5173",
    )
    def test_paymongo_payment_session_creation(self):
        """With PayMongo configured, place_order calls PayMongo API and returns checkout_url."""
        session = "guest-paymongo-session"
        self.client.post(
            "/api/cart/items/",
            {"variant_id": self.variant.id, "quantity": 2},
            format="json",
            HTTP_X_GUEST_SESSION_ID=session,
        )

        mock_response_data = {
            "data": {
                "id": "cs_test_session_999",
                "type": "checkout_session",
                "attributes": {
                    "checkout_url": "https://checkout.paymongo.com/cs_test_session_999",
                    "client_key": "client_key_999",
                    "status": "active",
                },
            }
        }

        mock_resp = MagicMock()
        mock_resp.read.return_value = json.dumps(mock_response_data).encode("utf-8")
        mock_resp.__enter__.return_value = mock_resp

        with patch("urllib.request.urlopen", return_value=mock_resp) as mock_urlopen:
            payload = {
                "customer_email": "buyer@example.com",
                "customer_name": "Buyer Name",
                "shipping_address": {
                    "recipient": "Buyer Name",
                    "line1": "Ayala Ave",
                    "city": "Makati",
                    "postal_code": "1200",
                    "country": "PH",
                    "phone": "09171234567",
                },
                "shipping_method": "standard",
                "payment": {"provider": "paymongo"},
            }
            res = self.client.post("/api/checkout/place-order/", payload, format="json", HTTP_X_GUEST_SESSION_ID=session)
            self.assertEqual(res.status_code, status.HTTP_201_CREATED)
            self.assertEqual(res.data["status"], "pending")
            self.assertEqual(res.data["payment_status"], "pending")
            self.assertEqual(res.data["payment_provider"], "paymongo")
            self.assertEqual(res.data["payment_reference"], "cs_test_session_999")
            self.assertEqual(res.data["checkout_url"], "https://checkout.paymongo.com/cs_test_session_999")

            # Stock must be reserved
            self.variant.refresh_from_db()
            self.assertEqual(self.variant.stock, 8)

            # Verify API request was made to PayMongo URL
            req = mock_urlopen.call_args[0][0]
            self.assertEqual(req.full_url, "https://api.paymongo.com/v1/checkout_sessions")
            self.assertIn("Basic ", req.headers["Authorization"])

    # 3. Invalid credentials
    @override_settings(PAYMENTS_PROVIDER="paymongo", PAYMONGO_SECRET_KEY="")
    def test_paymongo_invalid_credentials(self):
        """Missing PayMongo secret key fails cleanly without deducting inventory."""
        session = "guest-invalid-cred-session"
        self.client.post(
            "/api/cart/items/",
            {"variant_id": self.variant.id, "quantity": 1},
            format="json",
            HTTP_X_GUEST_SESSION_ID=session,
        )
        payload = {
            "customer_email": "buyer@example.com",
            "shipping_address": {"recipient": "Buyer", "line1": "123 St", "city": "City", "country": "PH"},
            "payment": {"provider": "paymongo"},
        }
        res = self.client.post("/api/checkout/place-order/", payload, format="json", HTTP_X_GUEST_SESSION_ID=session)
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("payment", res.data)

        # Stock unchanged
        self.variant.refresh_from_db()
        self.assertEqual(self.variant.stock, 10)

    # 4. Invalid webhook signatures
    @override_settings(PAYMONGO_WEBHOOK_SECRET="whsk_test_mock_secret_key_12345")
    def test_invalid_webhook_signature_rejected(self):
        """Webhooks with forged or mismatched signatures must be rejected with HTTP 400."""
        payload_bytes = json.dumps({"data": {"id": "evt_1", "attributes": {"type": "checkout_session.payment.paid"}}}).encode("utf-8")
        headers = {"HTTP_PAYMONGO_SIGNATURE": "t=12345,te=wrong_signature_hex"}
        res = self.client.post("/api/orders/webhooks/paymongo/", payload_bytes, content_type="application/json", **headers)
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)

    # 5. Webhook timestamp expiration (replay attack protection)
    @override_settings(PAYMONGO_WEBHOOK_SECRET="whsk_test_mock_secret_key_12345")
    def test_webhook_timestamp_expired_rejected(self):
        """Webhooks older than 300 seconds must be rejected as potential replays."""
        payload_bytes = json.dumps({"data": {"id": "evt_1", "attributes": {"type": "checkout_session.payment.paid"}}}).encode("utf-8")
        old_timestamp = int(time.time()) - 400
        sig_header = self._generate_paymongo_signature(payload_bytes, old_timestamp)
        headers = {"HTTP_PAYMONGO_SIGNATURE": sig_header}
        res = self.client.post("/api/orders/webhooks/paymongo/", payload_bytes, content_type="application/json", **headers)
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("tolerance", res.json().get("error", "").lower())

    # 6. Valid webhook events & preventing duplicate stock deductions
    @override_settings(PAYMONGO_WEBHOOK_SECRET="whsk_test_mock_secret_key_12345")
    def test_valid_webhook_paid_event_and_no_duplicate_stock_deduction(self):
        """A verified payment webhook marks the order paid and does NOT deduct stock a second time."""
        order = Order.objects.create(
            order_number="ST-9001",
            status=Order.STATUS_PENDING,
            payment_status="pending",
            payment_provider="paymongo",
            payment_reference="cs_test_session_9001",
            subtotal=Decimal("100.00"),
            shipping=Decimal("12.00"),
            discount=Decimal("0.00"),
            tax=Decimal("8.96"),
            total=Decimal("120.96"),
            is_stock_deducted=True,  # Stock was already deducted at reservation
        )
        OrderItem.objects.create(
            order=order,
            product=self.product,
            product_name=self.product.name,
            sku=self.variant.sku,
            color_name="Black",
            size_name="M",
            unit_price=Decimal("100.00"),
            quantity=2,
        )
        # Manually reserve stock from 10 to 8
        self.variant.stock = 8
        self.variant.save()

        now_ts = int(time.time())
        event_payload = {
            "data": {
                "id": "evt_paid_123",
                "type": "event",
                "attributes": {
                    "type": "checkout_session.payment.paid",
                    "data": {
                        "id": "cs_test_session_9001",
                        "type": "checkout_session",
                        "attributes": {
                            "reference_number": "ST-9001",
                            "status": "paid",
                            "payments": [
                                {
                                    "id": "pay_tx_777",
                                    "type": "payment",
                                    "attributes": {
                                        "amount": 12096,
                                        "currency": "PHP",
                                        "status": "paid",
                                        "source": {"type": "gcash"},
                                        "paid_at": now_ts,
                                    },
                                }
                            ],
                        },
                    },
                },
            }
        }
        raw_body = json.dumps(event_payload).encode("utf-8")
        sig_header = self._generate_paymongo_signature(raw_body, now_ts)

        res = self.client.post(
            "/api/orders/webhooks/paymongo/",
            raw_body,
            content_type="application/json",
            HTTP_PAYMONGO_SIGNATURE=sig_header,
        )
        self.assertEqual(res.status_code, status.HTTP_200_OK)

        order.refresh_from_db()
        self.assertEqual(order.status, Order.STATUS_PAID)
        self.assertEqual(order.payment_status, "paid")
        self.assertEqual(order.payment_transaction_id, "pay_tx_777")
        self.assertIn("gcash", order.payment_method)

        # CRITICAL: Stock was 8 before webhook, must STILL be 8 (no duplicate deduction!)
        self.variant.refresh_from_db()
        self.assertEqual(self.variant.stock, 8)

        # Verify event logged in PaymentWebhookEvent
        logged = PaymentWebhookEvent.objects.filter(event_id="evt_paid_123").first()
        self.assertIsNotNone(logged)
        self.assertEqual(logged.status, "processed")

    # 7. Duplicate webhook events (Idempotency)
    @override_settings(PAYMONGO_WEBHOOK_SECRET="whsk_test_mock_secret_key_12345")
    def test_duplicate_webhook_events_idempotent(self):
        """Delivering the exact same event ID twice must return 200 OK without re-processing."""
        PaymentWebhookEvent.objects.create(
            event_id="evt_duplicate_test",
            provider="paymongo",
            event_type="checkout_session.payment.paid",
            status="processed",
        )
        now_ts = int(time.time())
        event_payload = {
            "data": {
                "id": "evt_duplicate_test",
                "attributes": {
                    "type": "checkout_session.payment.paid",
                    "data": {"id": "cs_test", "attributes": {"reference_number": "ST-9999"}},
                },
            }
        }
        raw_body = json.dumps(event_payload).encode("utf-8")
        sig_header = self._generate_paymongo_signature(raw_body, now_ts)

        res = self.client.post(
            "/api/orders/webhooks/paymongo/",
            raw_body,
            content_type="application/json",
            HTTP_PAYMONGO_SIGNATURE=sig_header,
        )
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(res.json().get("detail"), "Event already processed")

    # 8. Payment failure releases stock
    @override_settings(PAYMONGO_WEBHOOK_SECRET="whsk_test_mock_secret_key_12345")
    def test_payment_failure_restores_inventory(self):
        """A payment failure webhook event sets order to failed and restores reserved inventory."""
        self.variant.stock = 7
        self.variant.save()

        order = Order.objects.create(
            order_number="ST-FAIL-1",
            status=Order.STATUS_PENDING,
            payment_status="pending",
            subtotal=Decimal("100.00"),
            shipping=Decimal("12.00"),
            discount=Decimal("0.00"),
            tax=Decimal("8.96"),
            total=Decimal("120.96"),
            is_stock_deducted=True,
        )
        OrderItem.objects.create(
            order=order,
            product=self.product,
            sku=self.variant.sku,
            unit_price=Decimal("100.00"),
            quantity=3,
        )

        now_ts = int(time.time())
        event_payload = {
            "data": {
                "id": "evt_fail_999",
                "attributes": {
                    "type": "payment.failed",
                    "data": {"attributes": {"reference_number": "ST-FAIL-1"}},
                },
            }
        }
        raw_body = json.dumps(event_payload).encode("utf-8")
        sig_header = self._generate_paymongo_signature(raw_body, now_ts)

        res = self.client.post(
            "/api/orders/webhooks/paymongo/",
            raw_body,
            content_type="application/json",
            HTTP_PAYMONGO_SIGNATURE=sig_header,
        )
        self.assertEqual(res.status_code, status.HTTP_200_OK)

        order.refresh_from_db()
        self.assertEqual(order.status, Order.STATUS_FAILED)
        self.assertEqual(order.payment_status, "failed")
        self.assertFalse(order.is_stock_deducted)

        # Stock was 7, 3 units restored -> 10
        self.variant.refresh_from_db()
        self.assertEqual(self.variant.stock, 10)

    # 9. Payment expiration event
    @override_settings(PAYMONGO_WEBHOOK_SECRET="whsk_test_mock_secret_key_12345")
    def test_payment_expiration_restores_inventory_and_coupon(self):
        """Checkout session expiration releases stock and decrements coupon uses."""
        coupon = Coupon.objects.create(code="SAVE10", type="fixed", value=Decimal("10.00"), uses=1)
        self.variant.stock = 5
        self.variant.save()

        order = Order.objects.create(
            order_number="ST-EXP-1",
            status=Order.STATUS_PENDING,
            payment_status="pending",
            subtotal=Decimal("100.00"),
            shipping=Decimal("12.00"),
            discount=Decimal("10.00"),
            tax=Decimal("8.16"),
            total=Decimal("110.16"),
            coupon=coupon,
            is_stock_deducted=True,
        )
        OrderItem.objects.create(
            order=order,
            product=self.product,
            sku=self.variant.sku,
            unit_price=Decimal("100.00"),
            quantity=2,
        )

        now_ts = int(time.time())
        event_payload = {
            "data": {
                "id": "evt_exp_888",
                "attributes": {
                    "type": "checkout_session.expired",
                    "data": {"attributes": {"reference_number": "ST-EXP-1"}},
                },
            }
        }
        raw_body = json.dumps(event_payload).encode("utf-8")
        sig_header = self._generate_paymongo_signature(raw_body, now_ts)

        res = self.client.post(
            "/api/orders/webhooks/paymongo/",
            raw_body,
            content_type="application/json",
            HTTP_PAYMONGO_SIGNATURE=sig_header,
        )
        self.assertEqual(res.status_code, status.HTTP_200_OK)

        order.refresh_from_db()
        self.assertEqual(order.status, Order.STATUS_EXPIRED)

        # Inventory restored: 5 + 2 = 7
        self.variant.refresh_from_db()
        self.assertEqual(self.variant.stock, 7)

        # Coupon uses decremented: 1 - 1 = 0
        coupon.refresh_from_db()
        self.assertEqual(coupon.uses, 0)

    # 10. Line items sum matches order total exactly
    def test_line_items_sum_equals_order_total_exactly(self):
        """PayMongo provider line_items builder must match order total down to the centavo."""
        order = Order.objects.create(
            order_number="ST-LINE-1",
            status=Order.STATUS_PENDING,
            subtotal=Decimal("199.98"),
            shipping=Decimal("12.00"),
            discount=Decimal("25.00"),
            tax=Decimal("14.96"),
            total=Decimal("201.94"),
            shipping_method="standard",
        )
        OrderItem.objects.create(
            order=order,
            product=self.product,
            product_name="Item 1",
            sku="SKU-1",
            color_name="Black",
            size_name="M",
            unit_price=Decimal("99.99"),
            quantity=1,
        )
        OrderItem.objects.create(
            order=order,
            product=self.product,
            product_name="Item 2",
            sku="SKU-2",
            color_name="Black",
            size_name="M",
            unit_price=Decimal("99.99"),
            quantity=1,
        )

        provider = PayMongoPaymentProvider(secret_key="sk_test_123")
        line_items = provider.build_line_items(order)

        calculated_sum = sum(li["amount"] * li["quantity"] for li in line_items)
        expected_total_cents = 20194  # 201.94 * 100
        self.assertEqual(calculated_sum, expected_total_cents)

    # 11. Admin manual mark as paid requires auditable note
    def test_admin_manual_mark_as_paid_requires_audit_note(self):
        """An administrator cannot mark an order paid without providing an auditable note."""
        order = Order.objects.create(
            order_number="ST-AUDIT-1",
            status=Order.STATUS_PENDING,
            payment_status="pending",
            subtotal=Decimal("50.00"),
            shipping=Decimal("12.00"),
            discount=Decimal("0.00"),
            tax=Decimal("4.96"),
            total=Decimal("66.96"),
        )
        self.client.force_authenticate(user=self.admin)

        # Attempt without note -> rejected with 400
        fail_res = self.client.patch(f"/api/admin/orders/{order.order_number}/", {"status": "paid"}, format="json")
        self.assertEqual(fail_res.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("note", fail_res.data)

        # Attempt with valid audit note -> succeeds
        success_res = self.client.patch(
            f"/api/admin/orders/{order.order_number}/",
            {"status": "paid", "note": "Verified bank deposit receipt #12345"},
            format="json",
        )
        self.assertEqual(success_res.status_code, status.HTTP_200_OK)
        order.refresh_from_db()
        self.assertEqual(order.status, Order.STATUS_PAID)
        self.assertTrue(any("admin@studio.test" in entry.get("note", "") for entry in order.timeline))

    # 12. Public order status endpoint
    def test_public_order_status_endpoint(self):
        """Public order status endpoint exposes payment status and items without exposing sensitive data."""
        order = Order.objects.create(
            order_number="ST-STATUS-1",
            status=Order.STATUS_PENDING,
            payment_status="pending",
            payment_provider="paymongo",
            subtotal=Decimal("50.00"),
            shipping=Decimal("12.00"),
            discount=Decimal("0.00"),
            tax=Decimal("4.96"),
            total=Decimal("66.96"),
        )
        res = self.client.get(f"/api/orders/{order.order_number}/status/")
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(res.data["order_number"], "ST-STATUS-1")
        self.assertEqual(res.data["status"], "pending")
        self.assertEqual(res.data["payment_status"], "pending")
        self.assertNotIn("customer_email", res.data)

