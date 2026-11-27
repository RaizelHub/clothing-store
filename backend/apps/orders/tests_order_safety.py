import threading
from decimal import Decimal

from django.contrib.auth import get_user_model
from rest_framework import status
from rest_framework.test import APITestCase

from apps.catalog.models import Category, Color, Product, ProductVariant, Size, StoreSettings
from apps.orders.models import Cart, CartItem, Order

User = get_user_model()


class OrderSafetyAndDuplicatePreventionTests(APITestCase):
    def setUp(self):
        StoreSettings.objects.update_or_create(
            pk=1,
            defaults={"store_name": "Studio", "currency": "USD", "tax_rate": Decimal("0.08")},
        )
        self.category = Category.objects.create(name="Tops", slug="men-tops")
        self.color = Color.objects.create(name="Onyx", hex="#111111")
        self.size = Size.objects.create(name="M", sort_order=3)

        self.product = Product.objects.create(
            name="Merino Overcoat",
            slug="merino-overcoat",
            base_price=Decimal("200.00"),
            category=self.category,
        )
        self.variant = ProductVariant.objects.create(
            product=self.product,
            sku="MOC-ONX-M",
            color=self.color,
            size=self.size,
            stock=10,
        )

        self.customer = User.objects.create_user(
            email="shopper@example.com",
            password="securepassword123",
            first_name="Jane",
            last_name="Doe",
        )
        self.client.force_authenticate(user=self.customer)

        self.base_payload = {
            "customer_email": "shopper@example.com",
            "customer_name": "Jane Doe",
            "shipping_address": {
                "recipient": "Jane Doe",
                "line1": "100 Ayala Avenue",
                "city": "Makati",
                "state": "Metro Manila",
                "postal_code": "1226",
                "country": "Philippines",
                "phone": "+639171234567",
            },
            "billing_same_as_shipping": True,
            "shipping_method": "standard",
            "payment": {
                "provider": "mock",
                "method": "card",
                "number": "4242424242424242",
            },
        }

    def _setup_cart(self, quantity=2):
        cart, _ = Cart.objects.get_or_create(user=self.customer)
        cart.items.all().delete()
        CartItem.objects.create(cart=cart, variant=self.variant, quantity=quantity)
        return cart

    def test_successful_order_creation_with_idempotency_key(self):
        """A valid checkout request creates an order, deducts stock, and records the idempotency key."""
        self._setup_cart(quantity=2)
        initial_stock = self.variant.stock

        res = self.client.post(
            "/api/checkout/place-order/",
            self.base_payload,
            HTTP_IDEMPOTENCY_KEY="idemp_unique_key_001",
            format="json",
        )
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        self.assertEqual(Order.objects.count(), 1)

        order = Order.objects.first()
        self.assertEqual(order.idempotency_key, "idemp_unique_key_001")
        self.assertEqual(order.status, Order.STATUS_PAID)

        # Inventory correctly deducted
        self.variant.refresh_from_db()
        self.assertEqual(self.variant.stock, initial_stock - 2)

        # Cart emptied
        cart = Cart.objects.get(user=self.customer)
        self.assertEqual(cart.items.count(), 0)

    def test_duplicate_request_with_same_idempotency_key_replays_existing_order(self):
        """Retrying an identical request with the same Idempotency-Key returns the existing order without creating a duplicate or re-deducting stock."""
        self._setup_cart(quantity=2)
        initial_stock = self.variant.stock

        # First request
        res1 = self.client.post(
            "/api/checkout/place-order/",
            self.base_payload,
            HTTP_IDEMPOTENCY_KEY="idemp_repeat_key_100",
            format="json",
        )
        self.assertEqual(res1.status_code, status.HTTP_201_CREATED)
        order_number_1 = res1.data["order_number"]

        self.variant.refresh_from_db()
        self.assertEqual(self.variant.stock, initial_stock - 2)
        self.assertEqual(Order.objects.count(), 1)

        # Second request (e.g. browser retry or network replay with same key)
        res2 = self.client.post(
            "/api/checkout/place-order/",
            self.base_payload,
            HTTP_IDEMPOTENCY_KEY="idemp_repeat_key_100",
            format="json",
        )
        self.assertEqual(res2.status_code, status.HTTP_200_OK)
        self.assertEqual(res2.data["order_number"], order_number_1)

        # CRITICAL: Total orders MUST still be exactly 1
        self.assertEqual(Order.objects.count(), 1)

        # CRITICAL: Stock MUST NOT be deducted a second time
        self.variant.refresh_from_db()
        self.assertEqual(self.variant.stock, initial_stock - 2)

    def test_rapid_consecutive_request_without_idempotency_key_blocked(self):
        """If a second request arrives after cart deletion (e.g. without idempotency key), it fails safely with 'Cart is empty' rather than duplicating."""
        self._setup_cart(quantity=1)

        res1 = self.client.post("/api/checkout/place-order/", self.base_payload, format="json")
        self.assertEqual(res1.status_code, status.HTTP_201_CREATED)
        self.assertEqual(Order.objects.count(), 1)

        # Immediate follow-up request
        res2 = self.client.post("/api/checkout/place-order/", self.base_payload, format="json")
        self.assertEqual(res2.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("Cart is empty", str(res2.data))

        # Exactly 1 order in DB
        self.assertEqual(Order.objects.count(), 1)

    def test_payment_card_decline_preserves_cart_and_stock(self):
        """Payment failure aborts before order creation: no order is created, inventory is untouched, and cart items remain saved."""
        self._setup_cart(quantity=2)
        initial_stock = self.variant.stock

        declined_payload = dict(self.base_payload)
        declined_payload["payment"] = {
            "provider": "mock",
            "method": "card",
            "number": "4242424242424444",  # Decline simulation card
        }

        res = self.client.post(
            "/api/checkout/place-order/",
            declined_payload,
            HTTP_IDEMPOTENCY_KEY="idemp_declined_key",
            format="json",
        )
        self.assertEqual(res.status_code, status.HTTP_402_PAYMENT_REQUIRED)

        # No order created
        self.assertEqual(Order.objects.count(), 0)

        # Stock unchanged
        self.variant.refresh_from_db()
        self.assertEqual(self.variant.stock, initial_stock)

        # Cart preserved so user does not lose their shopping bag
        cart = Cart.objects.get(user=self.customer)
        self.assertEqual(cart.items.count(), 1)
        self.assertEqual(cart.items.first().quantity, 2)

    def test_payment_failure_retry_allows_successful_checkout(self):
        """After a card decline, customer can correct card details and successfully place the order."""
        self._setup_cart(quantity=1)
        initial_stock = self.variant.stock

        # 1. Fail with declined card
        declined_payload = dict(self.base_payload)
        declined_payload["payment"] = {
            "provider": "mock",
            "method": "card",
            "number": "4242424242424444",
        }
        res_fail = self.client.post("/api/checkout/place-order/", declined_payload, format="json")
        self.assertEqual(res_fail.status_code, status.HTTP_402_PAYMENT_REQUIRED)
        self.assertEqual(Order.objects.count(), 0)

        # 2. Retry with valid card
        res_success = self.client.post(
            "/api/checkout/place-order/",
            self.base_payload,
            HTTP_IDEMPOTENCY_KEY="idemp_retry_success",
            format="json",
        )
        self.assertEqual(res_success.status_code, status.HTTP_201_CREATED)
        self.assertEqual(Order.objects.count(), 1)
        self.variant.refresh_from_db()
        self.assertEqual(self.variant.stock, initial_stock - 1)

    def test_stock_depleted_during_checkout_aborts_safely(self):
        """If inventory is depleted before placing order, checkout raises validation error without creating order or deducting below zero."""
        self._setup_cart(quantity=5)
        # Deplete variant stock externally
        ProductVariant.objects.filter(pk=self.variant.pk).update(stock=2)

        res = self.client.post("/api/checkout/place-order/", self.base_payload, format="json")
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("stock", res.data)
        self.assertEqual(Order.objects.count(), 0)

        # Stock remains at 2 (not negative)
        self.variant.refresh_from_db()
        self.assertEqual(self.variant.stock, 2)

    def test_idempotency_key_in_request_body_supported(self):
        """Idempotency key passed directly in JSON payload is honored identically to the HTTP header."""
        self._setup_cart(quantity=1)
        payload = dict(self.base_payload)
        payload["idempotency_key"] = "idemp_body_key_999"

        res1 = self.client.post("/api/checkout/place-order/", payload, format="json")
        self.assertEqual(res1.status_code, status.HTTP_201_CREATED)
        self.assertEqual(Order.objects.count(), 1)
        order_num = res1.data["order_number"]

        # Re-send same payload
        res2 = self.client.post("/api/checkout/place-order/", payload, format="json")
        self.assertEqual(res2.status_code, status.HTTP_200_OK)
        self.assertEqual(res2.data["order_number"], order_num)
        self.assertEqual(Order.objects.count(), 1)

    def test_integrity_race_condition_handling_replays_existing_order(self):
        """If two concurrent transactions hit a race condition on idempotency key insertion, the second catches IntegrityError and safely replays the order."""
        self._setup_cart(quantity=2)
        initial_stock = self.variant.stock

        # First request succeeds
        res1 = self.client.post(
            "/api/checkout/place-order/",
            self.base_payload,
            HTTP_IDEMPOTENCY_KEY="race_condition_test_key",
            format="json",
        )
        self.assertEqual(res1.status_code, status.HTTP_201_CREATED)
        self.assertEqual(Order.objects.count(), 1)
        order_num = res1.data["order_number"]

        # Re-add items to cart to simulate concurrent cart availability
        cart = Cart.objects.get(user=self.customer)
        CartItem.objects.create(cart=cart, variant=self.variant, quantity=2)

        # Second request with same idempotency key catches the unique constraint and returns the first order
        res2 = self.client.post(
            "/api/checkout/place-order/",
            self.base_payload,
            HTTP_IDEMPOTENCY_KEY="race_condition_test_key",
            format="json",
        )
        self.assertEqual(res2.status_code, status.HTTP_200_OK)
        self.assertEqual(res2.data["order_number"], order_num)

        # Still exactly 1 order in database
        self.assertEqual(Order.objects.count(), 1)

        # Stock was only deducted for the first order
        self.variant.refresh_from_db()
        self.assertEqual(self.variant.stock, initial_stock - 2)
