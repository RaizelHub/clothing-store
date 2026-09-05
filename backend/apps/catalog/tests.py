from decimal import Decimal

from django.contrib.auth import get_user_model
from rest_framework import status
from rest_framework.test import APITestCase

from apps.catalog.models import Category, Color, Product, ProductVariant, Review, Size, StoreSettings
from apps.orders.models import Cart, CartItem

User = get_user_model()


class CatalogSystemTests(APITestCase):
    def setUp(self):
        StoreSettings.objects.update_or_create(
            pk=1,
            defaults={"store_name": "Studio", "currency": "USD", "tax_rate": Decimal("0.08")},
        )
        self.category = Category.objects.create(name="Women", slug="women")
        self.color_black = Color.objects.create(name="Black", hex="#000000")
        self.size_s = Size.objects.create(name="S", sort_order=1)

        self.product = Product.objects.create(
            name="Silk Dress",
            slug="silk-dress",
            base_price=Decimal("120.00"),
            category=self.category,
        )
        self.variant = ProductVariant.objects.create(
            product=self.product,
            sku="STU-BLK-S",
            color=self.color_black,
            size=self.size_s,
            stock=10,
        )

        self.customer = User.objects.create_user(
            email="cust@example.com",
            password="password123",
            first_name="Customer",
        )
        self.admin = User.objects.create_superuser(
            email="admin@example.com",
            password="adminpassword",
            first_name="Admin",
        )

    def test_admin_update_product_with_variant_in_cart(self):
        """Editing a product whose variant is in a cart must not raise ProtectedError."""
        # Add variant to customer cart
        cart, _ = Cart.objects.get_or_create(user=self.customer)
        CartItem.objects.create(cart=cart, variant=self.variant, quantity=1)

        # Authenticate as admin and update product
        self.client.force_authenticate(user=self.admin)
        payload = {
            "name": "Silk Dress Updated",
            "base_price": "135.00",
            "category_id": self.category.id,
            "variants": [
                {
                    "sku": "STU-BLK-S",
                    "color_id": self.color_black.id,
                    "size_id": self.size_s.id,
                    "stock": 15,
                }
            ],
            "colors": [{"color_id": self.color_black.id, "hex": "#111111"}],
        }
        res = self.client.patch(f"/api/admin/products/{self.product.id}/", payload, format="json")
        self.assertEqual(res.status_code, status.HTTP_200_OK)

        # Verify variant stock updated and was not destroyed
        self.variant.refresh_from_db()
        self.assertEqual(self.variant.stock, 15)
        self.product.refresh_from_db()
        self.assertEqual(self.product.name, "Silk Dress Updated")

    def test_unauthenticated_review_returns_401(self):
        """Submitting a product review without authentication must return HTTP 401."""
        res = self.client.post(
            f"/api/products/{self.product.slug}/reviews/",
            {"rating": 5, "comment": "Great piece."},
            format="json",
        )
        self.assertEqual(res.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_admin_catalog_auth_codes(self):
        """Admin catalog views return 401 when anonymous and 403 when customer."""
        # Anonymous -> 401
        res = self.client.get("/api/admin/products/")
        self.assertEqual(res.status_code, status.HTTP_401_UNAUTHORIZED)

        # Customer -> 403
        self.client.force_authenticate(user=self.customer)
        res = self.client.get("/api/admin/products/")
        self.assertEqual(res.status_code, status.HTTP_403_FORBIDDEN)

        # Admin -> 200
        self.client.force_authenticate(user=self.admin)
        res = self.client.get("/api/admin/products/")
        self.assertEqual(res.status_code, status.HTTP_200_OK)
