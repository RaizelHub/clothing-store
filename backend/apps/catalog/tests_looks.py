from decimal import Decimal
from django.test import TestCase
from rest_framework.test import APIClient
from rest_framework import status

from apps.accounts.models import User
from apps.catalog.models import (
    Category,
    Color,
    Outfit,
    OutfitItem,
    Product,
    ProductVariant,
    Size,
)
from apps.orders.models import Cart, CartItem, Coupon


class ShopTheLookBackendTests(TestCase):
    def setUp(self):
        self.client = APIClient()

        # Users
        self.customer = User.objects.create_user(
            email="shopper@atelier.test",
            password="testpassword123",
            first_name="Camila",
            last_name="Reyes",
        )
        self.staff_user = User.objects.create_superuser(
            email="director@atelier.test",
            password="testpassword123",
            first_name="Creative",
            last_name="Director",
        )

        # Catalog setup
        self.category = Category.objects.create(name="Tops", slug="tops")
        self.color_black = Color.objects.create(name="Black", hex="#000000")
        self.color_white = Color.objects.create(name="White", hex="#ffffff")
        self.size_m = Size.objects.create(name="M", sort_order=1)
        self.size_l = Size.objects.create(name="L", sort_order=2)

        # Product 1: Shirt (₱3,000)
        self.product_shirt = Product.objects.create(
            name="Relaxed Linen Shirt",
            slug="relaxed-linen-shirt",
            category=self.category,
            base_price=Decimal("3000.00"),
        )
        self.variant_shirt_m = ProductVariant.objects.create(
            product=self.product_shirt,
            color=self.color_white,
            size=self.size_m,
            sku="SHIRT-WHT-M",
            stock=10,
        )
        self.variant_shirt_l_empty = ProductVariant.objects.create(
            product=self.product_shirt,
            color=self.color_white,
            size=self.size_l,
            sku="SHIRT-WHT-L",
            stock=0,  # Out of stock
        )

        # Product 2: Tee (₱1,500)
        self.product_tee = Product.objects.create(
            name="Essential Tee",
            slug="essential-tee",
            category=self.category,
            base_price=Decimal("1500.00"),
        )
        self.variant_tee_m = ProductVariant.objects.create(
            product=self.product_tee,
            color=self.color_black,
            size=self.size_m,
            sku="TEE-BLK-M",
            stock=8,
        )

        # Published Outfit with 15% bundle discount
        self.outfit = Outfit.objects.create(
            name="Weekend Neutrals",
            slug="weekend-neutrals",
            description="Tonal relaxation in airy linen and heavyweight cotton.",
            cover_image="https://images.unsplash.com/photo-1?auto=format&fit=crop&w=1000",
            status=Outfit.STATUS_PUBLISHED,
            is_featured=True,
            sort_order=1,
            bundle_discount_type=Outfit.DISCOUNT_PERCENT,
            bundle_discount_value=Decimal("15.00"),
            bundle_min_items=2,
        )
        self.item_shirt = OutfitItem.objects.create(
            outfit=self.outfit,
            product=self.product_shirt,
            position=0,
            styling_note="Leave unbuttoned over tee.",
            is_featured_item=True,
        )
        self.item_tee = OutfitItem.objects.create(
            outfit=self.outfit,
            product=self.product_tee,
            position=1,
            styling_note="Tucked into waist.",
            is_featured_item=False,
        )

        # Draft Outfit (Private)
        self.draft_outfit = Outfit.objects.create(
            name="Secret Autumn Capsule",
            slug="secret-autumn-capsule",
            description="Unreleased runway looks.",
            status=Outfit.STATUS_DRAFT,
            is_featured=False,
            sort_order=2,
        )
        OutfitItem.objects.create(
            outfit=self.draft_outfit,
            product=self.product_shirt,
            position=0,
        )

    # --- Part 10: Public Storefront API Tests ---

    def test_public_outfits_list_shows_only_published(self):
        """Public list endpoint returns published outfits and hides drafts."""
        res = self.client.get("/api/looks/")
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        slugs = [look["slug"] for look in res.data]
        self.assertIn("weekend-neutrals", slugs)
        self.assertNotIn("secret-autumn-capsule", slugs)

    def test_public_outfit_detail_draft_hidden_from_guest(self):
        """Guests cannot access draft outfits (returns 404)."""
        res = self.client.get("/api/looks/secret-autumn-capsule/")
        self.assertEqual(res.status_code, status.HTTP_404_NOT_FOUND)

    def test_staff_can_preview_draft_outfit(self):
        """Staff members can view draft outfits for review/preview."""
        self.client.force_authenticate(user=self.staff_user)
        res = self.client.get("/api/looks/secret-autumn-capsule/")
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(res.data["slug"], "secret-autumn-capsule")

    def test_outfit_detail_contains_products_and_bundle_pricing(self):
        """Detail response provides styled items, variant information, and bundle calculation."""
        res = self.client.get(f"/api/looks/{self.outfit.slug}/")
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        data = res.data
        self.assertEqual(data["name"], "Weekend Neutrals")
        self.assertEqual(data["items_count"], 2)
        self.assertEqual(len(data["items"]), 2)

        # Check item ordering and styling note
        item0 = data["items"][0]
        self.assertEqual(item0["product"]["name"], "Relaxed Linen Shirt")
        self.assertEqual(item0["styling_note"], "Leave unbuttoned over tee.")
        self.assertTrue(item0["is_featured_item"])

        # Check bundle calculation: ₱3,000 + ₱1,500 = ₱4,500. 15% discount = ₱675.00. Final: ₱3,825.00
        bp = data["bundle_pricing"]
        self.assertTrue(bp["is_eligible"])
        self.assertEqual(bp["subtotal"], "4500.00")
        self.assertEqual(bp["discount_amount"], "675.00")
        self.assertEqual(bp["final_total"], "3825.00")
        self.assertIn("15%", bp["savings_label"])

    # --- Part 10: Add Entire Look to Cart Tests ---

    def test_add_entire_look_to_cart_success(self):
        """Valid items are atomically added to the cart, with bundle coupon registered."""
        self.client.force_authenticate(user=self.customer)
        payload = {
            "items": [
                {"product_id": self.product_shirt.id, "variant_id": self.variant_shirt_m.id, "quantity": 1},
                {"product_id": self.product_tee.id, "variant_id": self.variant_tee_m.id, "quantity": 1},
            ]
        }
        res = self.client.post(f"/api/looks/{self.outfit.slug}/add-to-cart/", payload, format="json")
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        self.assertEqual(res.data["items_added"], 2)
        self.assertTrue(res.data["bundle_applied"])
        self.assertIn("BUNDLE-WEEKEND-NEUTRALS", res.data["bundle_coupon_code"])

        # Verify database cart state
        cart = Cart.objects.get(user=self.customer)
        self.assertEqual(cart.items.count(), 2)

        # Verify auto-created Coupon in database for checkout integration
        coupon = Coupon.objects.get(code=res.data["bundle_coupon_code"])
        self.assertEqual(coupon.type, Coupon.TYPE_PERCENT)
        self.assertEqual(coupon.value, Decimal("15.00"))

    def test_add_to_cart_stock_validation_atomic_failure(self):
        """If one item in the look is out of stock, whole cart operation rolls back cleanly."""
        self.client.force_authenticate(user=self.customer)
        initial_cart = Cart.objects.create(user=self.customer)

        payload = {
            "items": [
                {"product_id": self.product_tee.id, "variant_id": self.variant_tee_m.id, "quantity": 1},
                # Shirt L has stock 0
                {"product_id": self.product_shirt.id, "variant_id": self.variant_shirt_l_empty.id, "quantity": 1},
            ]
        }
        res = self.client.post(f"/api/looks/{self.outfit.slug}/add-to-cart/", payload, format="json")
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("stock", res.data)
        self.assertEqual(int(res.data["unavailable_variant_id"]), self.variant_shirt_l_empty.id)

        # Assert atomic rollback: zero items added to cart
        self.assertEqual(initial_cart.items.count(), 0)

    def test_add_to_cart_rejects_unrelated_product(self):
        """Cannot submit a product that does not belong to this look."""
        other_product = Product.objects.create(
            name="Random Trousers",
            slug="random-trousers",
            category=self.category,
            base_price=Decimal("2000.00"),
        )
        other_var = ProductVariant.objects.create(
            product=other_product,
            color=self.color_black,
            size=self.size_m,
            sku="TROUSER-BLK-M",
            stock=5,
        )
        payload = {
            "items": [
                {"product_id": other_product.id, "variant_id": other_var.id, "quantity": 1},
            ]
        }
        res = self.client.post(f"/api/looks/{self.outfit.slug}/add-to-cart/", payload, format="json")
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("items", res.data)

    # --- Part 10: Admin Management API Tests ---

    def test_admin_create_outfit_requires_staff(self):
        """Regular customer cannot create outfits."""
        self.client.force_authenticate(user=self.customer)
        res = self.client.post("/api/admin/looks/", {"name": "Hacker Look"}, format="json")
        self.assertEqual(res.status_code, status.HTTP_403_FORBIDDEN)

    def test_admin_create_outfit_with_items_and_bundle(self):
        """Staff can create an outfit with item ordering, styling notes, and bundle discounts."""
        self.client.force_authenticate(user=self.staff_user)
        payload = {
            "name": "Summer Riviera",
            "slug": "summer-riviera",
            "description": "Breezy coastal aesthetic.",
            "cover_image": "https://example.com/cover.jpg",
            "status": "published",
            "is_featured": True,
            "sort_order": 5,
            "bundle_discount_type": "fixed",
            "bundle_discount_value": "300.00",
            "bundle_min_items": 1,
            "items": [
                {
                    "product_id": self.product_shirt.id,
                    "position": 0,
                    "styling_note": "Tuck casually into shorts.",
                    "is_featured_item": True,
                }
            ],
        }
        res = self.client.post("/api/admin/looks/", payload, format="json")
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        self.assertEqual(res.data["slug"], "summer-riviera")
        self.assertEqual(res.data["bundle_discount_type"], "fixed")
        self.assertEqual(len(res.data["items"]), 1)

        # Verify DB
        outfit = Outfit.objects.get(slug="summer-riviera")
        self.assertEqual(outfit.items.count(), 1)
        self.assertEqual(outfit.items.first().product, self.product_shirt)

    def test_admin_patch_outfit_and_reorder_items(self):
        """Staff can update outfit details and reorder styled items."""
        self.client.force_authenticate(user=self.staff_user)
        payload = {
            "name": "Weekend Neutrals (Updated)",
            "bundle_discount_value": "20.00",
            "items": [
                {"product_id": self.product_tee.id, "position": 0, "styling_note": "Now primary layer"},
                {"product_id": self.product_shirt.id, "position": 1, "styling_note": "Worn open"},
            ],
        }
        res = self.client.patch(f"/api/admin/looks/{self.outfit.id}/", payload, format="json")
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(res.data["name"], "Weekend Neutrals (Updated)")
        self.assertEqual(res.data["bundle_discount_value"], "20.00")

        # Verify items were reordered
        self.outfit.refresh_from_db()
        first_item = self.outfit.items.first()
        self.assertEqual(first_item.product, self.product_tee)
        self.assertEqual(first_item.position, 0)

    def test_admin_delete_outfit_safely(self):
        """Deleting an outfit cascades to OutfitItem but preserves Products in catalog."""
        self.client.force_authenticate(user=self.staff_user)
        outfit_id = self.outfit.id
        shirt_id = self.product_shirt.id

        res = self.client.delete(f"/api/admin/looks/{outfit_id}/")
        self.assertEqual(res.status_code, status.HTTP_204_NO_CONTENT)

        self.assertFalse(Outfit.objects.filter(id=outfit_id).exists())
        self.assertFalse(OutfitItem.objects.filter(outfit_id=outfit_id).exists())
        # Product MUST still exist!
        self.assertTrue(Product.objects.filter(id=shirt_id).exists())
