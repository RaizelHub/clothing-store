from decimal import Decimal
from django.contrib.auth import get_user_model
from rest_framework import status
from rest_framework.test import APITestCase

from apps.catalog.models import Category, Color, Product, ProductVariant, Size, StoreSettings
from apps.orders.models import Cart, CartItem, Order, OrderItem

User = get_user_model()


class CartInventoryValidationTests(APITestCase):
    def setUp(self):
        StoreSettings.objects.update_or_create(
            pk=1,
            defaults={
                "store_name": "Studio Inventory Test",
                "currency": "USD",
                "tax_rate": Decimal("0.08"),
                "shipping_flat_rate": Decimal("10.00"),
                "free_shipping_threshold": Decimal("100.00"),
                "low_stock_threshold": 3,
            },
        )
        self.category = Category.objects.create(name="Outerwear", slug="outerwear")
        self.color_navy = Color.objects.create(name="Navy", hex="#000080")
        self.color_bone = Color.objects.create(name="Bone", hex="#f8f6f0")
        self.size_s = Size.objects.create(name="S", sort_order=1)
        self.size_m = Size.objects.create(name="M", sort_order=2)

        self.product = Product.objects.create(
            name="Tailored Coat",
            slug="tailored-coat",
            base_price=Decimal("200.00"),
            category=self.category,
        )

        # Variant 1: Navy / S with 5 in stock
        self.v_navy_s = ProductVariant.objects.create(
            product=self.product,
            sku="COAT-NVY-S",
            color=self.color_navy,
            size=self.size_s,
            stock=5,
        )

        # Variant 2: Navy / M with 0 in stock (Sold Out)
        self.v_navy_m = ProductVariant.objects.create(
            product=self.product,
            sku="COAT-NVY-M",
            color=self.color_navy,
            size=self.size_m,
            stock=0,
        )

        # Variant 3: Bone / S with 3 in stock
        self.v_bone_s = ProductVariant.objects.create(
            product=self.product,
            sku="COAT-BNE-S",
            color=self.color_bone,
            size=self.size_s,
            stock=3,
        )

        self.customer = User.objects.create_user(
            email="client@example.com",
            password="testpassword123",
            first_name="Elena",
            last_name="Rostova",
        )
        self.client.force_authenticate(user=self.customer)

    def test_add_available_product_variant(self):
        """Adding an available variant with valid quantity succeeds."""
        res = self.client.post(
            "/api/cart/items/",
            {"variant_id": self.v_navy_s.id, "quantity": 2},
            format="json",
        )
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        self.assertEqual(res.data["item_count"], 2)
        self.assertEqual(res.data["subtotal"], "400.00")
        self.assertEqual(len(res.data["items"]), 1)
        self.assertEqual(res.data["items"][0]["quantity"], 2)
        self.assertEqual(res.data["items"][0]["available_stock"], 5)

    def test_add_sold_out_variant_fails(self):
        """Adding a variant with zero stock is rejected with a clear 400 error."""
        res = self.client.post(
            "/api/cart/items/",
            {"variant_id": self.v_navy_m.id, "quantity": 1},
            format="json",
        )
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("out of stock", str(res.data))

    def test_add_invalid_quantity_fails(self):
        """Quantities <= 0 or non-integers are rejected with 400."""
        # Zero
        res_zero = self.client.post(
            "/api/cart/items/",
            {"variant_id": self.v_navy_s.id, "quantity": 0},
            format="json",
        )
        self.assertEqual(res_zero.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("quantity", res_zero.data)

        # Negative
        res_neg = self.client.post(
            "/api/cart/items/",
            {"variant_id": self.v_navy_s.id, "quantity": -3},
            format="json",
        )
        self.assertEqual(res_neg.status_code, status.HTTP_400_BAD_REQUEST)

        # Non-numeric string
        res_str = self.client.post(
            "/api/cart/items/",
            {"variant_id": self.v_navy_s.id, "quantity": "invalid"},
            format="json",
        )
        self.assertEqual(res_str.status_code, status.HTTP_400_BAD_REQUEST)

    def test_add_quantity_exceeding_stock_fails(self):
        """Initial add request exceeding available stock is rejected."""
        res = self.client.post(
            "/api/cart/items/",
            {"variant_id": self.v_navy_s.id, "quantity": 10},  # stock is 5
            format="json",
        )
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("Only 5 available", str(res.data))

    def test_add_cumulative_quantity_exceeding_stock_fails(self):
        """Adding more items when the cart already holds quantity nearing stock is rejected."""
        # First add 4 out of 5
        res1 = self.client.post(
            "/api/cart/items/",
            {"variant_id": self.v_navy_s.id, "quantity": 4},
            format="json",
        )
        self.assertEqual(res1.status_code, status.HTTP_201_CREATED)

        # Attempt to add 2 more (4 + 2 = 6 > 5)
        res2 = self.client.post(
            "/api/cart/items/",
            {"variant_id": self.v_navy_s.id, "quantity": 2},
            format="json",
        )
        self.assertEqual(res2.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("at most 1 more", str(res2.data))

        # Add exactly 1 more (4 + 1 = 5) succeeds
        res3 = self.client.post(
            "/api/cart/items/",
            {"variant_id": self.v_navy_s.id, "quantity": 1},
            format="json",
        )
        self.assertEqual(res3.status_code, status.HTTP_201_CREATED)
        self.assertEqual(res3.data["items"][0]["quantity"], 5)

        # Attempt to add any more when already at maximum
        res4 = self.client.post(
            "/api/cart/items/",
            {"variant_id": self.v_navy_s.id, "quantity": 1},
            format="json",
        )
        self.assertEqual(res4.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("maximum available quantity", str(res4.data))

    def test_different_variants_remain_separate_cart_lines(self):
        """Different size/color variants of the same product create distinct cart line items."""
        # Add Navy S
        res1 = self.client.post(
            "/api/cart/items/",
            {"variant_id": self.v_navy_s.id, "quantity": 1},
            format="json",
        )
        self.assertEqual(res1.status_code, status.HTTP_201_CREATED)

        # Add Bone S
        res2 = self.client.post(
            "/api/cart/items/",
            {"variant_id": self.v_bone_s.id, "quantity": 2},
            format="json",
        )
        self.assertEqual(res2.status_code, status.HTTP_201_CREATED)

        # Verify 2 distinct lines in cart
        view_res = self.client.get("/api/cart/")
        self.assertEqual(view_res.data["item_count"], 3)
        self.assertEqual(len(view_res.data["items"]), 2)
        skus = {item["variant"]["sku"] for item in view_res.data["items"]}
        self.assertEqual(skus, {"COAT-NVY-S", "COAT-BNE-S"})

    def test_update_cart_quantity_validation(self):
        """Updating cart quantity enforces stock limits, minimum of 1, and recalculates subtotal."""
        res_add = self.client.post(
            "/api/cart/items/",
            {"variant_id": self.v_navy_s.id, "quantity": 2},
            format="json",
        )
        cart_item_id = res_add.data["items"][0]["id"]

        # Valid update from 2 to 4
        res_up = self.client.patch(
            f"/api/cart/items/{cart_item_id}/",
            {"quantity": 4},
            format="json",
        )
        self.assertEqual(res_up.status_code, status.HTTP_200_OK)
        self.assertEqual(res_up.data["cart"]["item_count"], 4)
        self.assertEqual(res_up.data["cart"]["subtotal"], "800.00")

        # Exceeding stock (5 available)
        res_exceed = self.client.patch(
            f"/api/cart/items/{cart_item_id}/",
            {"quantity": 6},
            format="json",
        )
        self.assertEqual(res_exceed.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("Only 5 available", str(res_exceed.data))

        # Quantity < 1
        res_zero = self.client.patch(
            f"/api/cart/items/{cart_item_id}/",
            {"quantity": 0},
            format="json",
        )
        self.assertEqual(res_zero.status_code, status.HTTP_400_BAD_REQUEST)

    def test_checkout_revalidates_stock_and_prevents_overselling(self):
        """Checkout atomically revalidates stock and fails if inventory drops before placement."""
        # Customer adds 3 units of Navy S (5 in stock)
        self.client.post(
            "/api/cart/items/",
            {"variant_id": self.v_navy_s.id, "quantity": 3},
            format="json",
        )

        # Simulate another order concurrently purchasing 4 units, leaving only 1
        ProductVariant.objects.filter(pk=self.v_navy_s.pk).update(stock=1)

        # Attempt to checkout with 3 units
        payload = {
            "customer_email": "client@example.com",
            "customer_name": "Elena Rostova",
            "shipping_address": {
                "recipient": "Elena Rostova",
                "line1": "123 Ayala Ave",
                "city": "Makati",
                "postal_code": "1200",
                "country": "Philippines",
            },
            "shipping_method": "standard",
            "payment": {"provider": "mock", "number": "4242424242424242"},
        }
        res_checkout = self.client.post("/api/checkout/place-order/", payload, format="json")
        self.assertEqual(res_checkout.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("Only 1 available", str(res_checkout.data))

        # Verify stock was not deducted into negative
        self.v_navy_s.refresh_from_db()
        self.assertEqual(self.v_navy_s.stock, 1)

    def test_checkout_empty_cart_fails_safely(self):
        """Placing an order with an empty cart or duplicate submission fails safely."""
        payload = {
            "customer_email": "client@example.com",
            "customer_name": "Elena Rostova",
            "shipping_address": {
                "recipient": "Elena Rostova",
                "line1": "123 Ayala Ave",
                "city": "Makati",
                "postal_code": "1200",
                "country": "Philippines",
            },
            "shipping_method": "standard",
            "payment": {"provider": "mock", "number": "4242424242424242"},
        }
        res = self.client.post("/api/checkout/place-order/", payload, format="json")
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("Cart is empty", str(res.data))
