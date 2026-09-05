from decimal import Decimal

from django.contrib.auth import get_user_model
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from apps.catalog.models import Category, Color, Product, ProductVariant, Size, StoreSettings
from apps.orders.models import Cart, CartItem, Coupon, Order, OrderItem

User = get_user_model()


class OrderSystemTests(APITestCase):
    def setUp(self):
        StoreSettings.objects.update_or_create(
            pk=1,
            defaults={
                "store_name": "Studio Test",
                "currency": "USD",
                "tax_rate": Decimal("0.08"),
                "shipping_flat_rate": Decimal("12.00"),
                "free_shipping_threshold": Decimal("150.00"),
                "low_stock_threshold": 5,
            },
        )
        self.category = Category.objects.create(name="Tops", slug="tops")
        self.color_black = Color.objects.create(name="Black", hex="#000000")
        self.color_white = Color.objects.create(name="White", hex="#ffffff")
        self.size_m = Size.objects.create(name="M", sort_order=1)
        self.size_l = Size.objects.create(name="L", sort_order=2)

        self.product = Product.objects.create(
            name="Test Tee",
            slug="test-tee",
            base_price=Decimal("50.00"),
            category=self.category,
        )
        self.variant_1 = ProductVariant.objects.create(
            product=self.product,
            sku="STU-BLK-M",
            color=self.color_black,
            size=self.size_m,
            stock=5,
        )
        self.variant_2 = ProductVariant.objects.create(
            product=self.product,
            sku="STU-WHT-L",
            color=self.color_white,
            size=self.size_l,
            stock=10,
        )

        self.customer = User.objects.create_user(
            email="shopper@example.com",
            password="password123",
            first_name="Jane",
            last_name="Shopper",
        )
        self.admin = User.objects.create_superuser(
            email="staff@example.com",
            password="adminpassword",
            first_name="Staff",
            last_name="Member",
        )

    def test_guest_cart_isolation(self):
        """Two different guest session IDs must have separate, isolated carts."""
        session_a = "guest-session-aaa-111"
        session_b = "guest-session-bbb-222"

        # Guest A adds variant 1
        res_a = self.client.post(
            "/api/cart/items/",
            {"variant_id": self.variant_1.id, "quantity": 1},
            format="json",
            HTTP_X_GUEST_SESSION_ID=session_a,
        )
        self.assertEqual(res_a.status_code, status.HTTP_201_CREATED)
        self.assertEqual(res_a.data["item_count"], 1)
        self.assertEqual(res_a.data["items"][0]["variant"]["sku"], "STU-BLK-M")

        # Guest B adds variant 2
        res_b = self.client.post(
            "/api/cart/items/",
            {"variant_id": self.variant_2.id, "quantity": 2},
            format="json",
            HTTP_X_GUEST_SESSION_ID=session_b,
        )
        self.assertEqual(res_b.status_code, status.HTTP_201_CREATED)
        self.assertEqual(res_b.data["item_count"], 2)
        self.assertEqual(res_b.data["items"][0]["variant"]["sku"], "STU-WHT-L")

        # Verify Guest A's cart is not modified by Guest B
        view_a = self.client.get("/api/cart/", HTTP_X_GUEST_SESSION_ID=session_a)
        self.assertEqual(view_a.data["item_count"], 1)
        self.assertEqual(view_a.data["items"][0]["variant"]["sku"], "STU-BLK-M")

    def test_guest_cart_merge_preserves_other_guests(self):
        """Merging Guest A cart into an account must not delete Guest B's cart."""
        session_a = "guest-session-aaa-111"
        session_b = "guest-session-bbb-222"

        self.client.post(
            "/api/cart/items/",
            {"variant_id": self.variant_1.id, "quantity": 1},
            format="json",
            HTTP_X_GUEST_SESSION_ID=session_a,
        )
        self.client.post(
            "/api/cart/items/",
            {"variant_id": self.variant_2.id, "quantity": 3},
            format="json",
            HTTP_X_GUEST_SESSION_ID=session_b,
        )

        # Authenticate as customer and merge session A
        self.client.force_authenticate(user=self.customer)
        merge_res = self.client.post("/api/cart/merge/", HTTP_X_GUEST_SESSION_ID=session_a)
        self.assertEqual(merge_res.status_code, status.HTTP_200_OK)
        self.assertEqual(merge_res.data["item_count"], 1)

        # Disconnect auth and check Guest B's cart
        self.client.force_authenticate(user=None)
        view_b = self.client.get("/api/cart/", HTTP_X_GUEST_SESSION_ID=session_b)
        self.assertEqual(view_b.data["item_count"], 3)
        self.assertEqual(view_b.data["items"][0]["variant"]["sku"], "STU-WHT-L")

    def test_place_order_atomic_and_stock_deduction(self):
        """Placing an order atomically decrements stock and captures email."""
        session = "guest-checkout-session"
        self.client.post(
            "/api/cart/items/",
            {"variant_id": self.variant_1.id, "quantity": 2},
            format="json",
            HTTP_X_GUEST_SESSION_ID=session,
        )

        payload = {
            "customer_email": "guest.buyer@example.com",
            "customer_name": "Guest Buyer",
            "shipping_address": {
                "recipient": "Guest Buyer",
                "line1": "123 Main St",
                "city": "Metropolis",
                "postal_code": "10001",
                "country": "US",
            },
            "shipping_method": "standard",
            "payment": {"provider": "paymongo", "method": "card", "number": "4242424242424242"},
        }
        res = self.client.post("/api/checkout/place-order/", payload, format="json", HTTP_X_GUEST_SESSION_ID=session)
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        self.assertEqual(res.data["customer_email"], "guest.buyer@example.com")
        self.assertEqual(res.data["customer_name"], "Guest Buyer")

        # Verify stock decremented: was 5, ordered 2 -> remaining 3
        self.variant_1.refresh_from_db()
        self.assertEqual(self.variant_1.stock, 3)

        # Cart should now be empty
        cart_res = self.client.get("/api/cart/", HTTP_X_GUEST_SESSION_ID=session)
        self.assertEqual(cart_res.data["item_count"], 0)

    def test_place_order_insufficient_stock_rejected(self):
        """Checkout fails and does not alter stock if quantity exceeds stock."""
        session = "insufficient-stock-session"
        self.variant_1.stock = 1
        self.variant_1.save()

        # Try to order 2 when only 1 is available
        # Manually create cart item to simulate race condition
        cart, _ = Cart.objects.get_or_create(owner_key=f"guest:{session}")
        CartItem.objects.create(cart=cart, variant=self.variant_1, quantity=2)

        payload = {
            "customer_email": "buyer@example.com",
            "shipping_address": {"recipient": "Buyer", "line1": "123 St", "city": "City", "country": "US"},
            "payment": {"number": "4242424242424242"},
        }
        res = self.client.post("/api/checkout/place-order/", payload, format="json", HTTP_X_GUEST_SESSION_ID=session)
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)

        # Stock unchanged
        self.variant_1.refresh_from_db()
        self.assertEqual(self.variant_1.stock, 1)

    def test_place_order_invalid_email_rejected(self):
        """Checkout rejects empty or malformed email addresses."""
        session = "email-val-session"
        self.client.post(
            "/api/cart/items/",
            {"variant_id": self.variant_2.id, "quantity": 1},
            format="json",
            HTTP_X_GUEST_SESSION_ID=session,
        )

        payload = {
            "customer_email": "not-an-email",
            "shipping_address": {"recipient": "Buyer", "line1": "123 St", "city": "City", "country": "US"},
            "payment": {"number": "4242424242424242"},
        }
        res = self.client.post("/api/checkout/place-order/", payload, format="json", HTTP_X_GUEST_SESSION_ID=session)
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)

    def test_cancel_order_restores_inventory(self):
        """Customer cancelling an order restores inventory stock."""
        self.client.force_authenticate(user=self.customer)
        cart, _ = Cart.objects.get_or_create(user=self.customer)
        CartItem.objects.create(cart=cart, variant=self.variant_1, quantity=2)

        # Place order
        payload = {
            "customer_email": self.customer.email,
            "shipping_address": {"recipient": "Jane", "line1": "456 Oak", "city": "NYC", "country": "US"},
            "payment": {"number": "4242424242424242"},
        }
        res = self.client.post("/api/checkout/place-order/", payload, format="json")
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        order_number = res.data["order_number"]

        # Stock decreased from 5 to 3
        self.variant_1.refresh_from_db()
        self.assertEqual(self.variant_1.stock, 3)

        # Cancel order
        cancel_res = self.client.post(f"/api/orders/{order_number}/cancel/")
        self.assertEqual(cancel_res.status_code, status.HTTP_200_OK)
        self.assertEqual(cancel_res.data["status"], Order.STATUS_CANCELLED)

        # Stock must be restored back to 5
        self.variant_1.refresh_from_db()
        self.assertEqual(self.variant_1.stock, 5)

    def test_auth_status_codes_401_vs_403(self):
        """Unauthenticated requests must receive 401; non-staff must receive 403 on admin routes."""
        # Unauthenticated customer orders route -> 401
        res = self.client.get("/api/orders/")
        self.assertEqual(res.status_code, status.HTTP_401_UNAUTHORIZED)

        # Unauthenticated admin route -> 401
        res_admin_anon = self.client.get("/api/admin/orders/")
        self.assertEqual(res_admin_anon.status_code, status.HTTP_401_UNAUTHORIZED)

        # Authenticated non-staff on admin route -> 403
        self.client.force_authenticate(user=self.customer)
        res_admin_cust = self.client.get("/api/admin/orders/")
        self.assertEqual(res_admin_cust.status_code, status.HTTP_403_FORBIDDEN)

        # Authenticated staff on admin route -> 200
        self.client.force_authenticate(user=self.admin)
        res_admin_staff = self.client.get("/api/admin/orders/")
        self.assertEqual(res_admin_staff.status_code, status.HTTP_200_OK)
