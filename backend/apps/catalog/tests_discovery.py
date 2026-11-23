from decimal import Decimal
from django.utils import timezone
from datetime import timedelta
from rest_framework import status
from rest_framework.test import APITestCase

from apps.catalog.models import Category, Color, Product, ProductVariant, Size, StoreSettings


class ProductDiscoveryTests(APITestCase):
    def setUp(self):
        StoreSettings.objects.update_or_create(
            pk=1,
            defaults={"store_name": "Studio", "currency": "PHP", "tax_rate": Decimal("0.08")},
        )
        self.cat_women = Category.objects.create(name="Women", slug="women")
        self.cat_dresses = Category.objects.create(name="Dresses", slug="women-dresses", parent=self.cat_women)
        self.cat_men = Category.objects.create(name="Men", slug="men")
        self.cat_men_tops = Category.objects.create(name="Shirts", slug="men-tops", parent=self.cat_men)

        self.color_black = Color.objects.create(name="Black", hex="#000000")
        self.color_white = Color.objects.create(name="White", hex="#ffffff")
        self.color_navy = Color.objects.create(name="Navy", hex="#000080")

        self.size_s = Size.objects.create(name="S", sort_order=1)
        self.size_m = Size.objects.create(name="M", sort_order=2)
        self.size_l = Size.objects.create(name="L", sort_order=3)

        # Product 1: In stock, Linen Shirt, Men tops, $85
        self.p_shirt = Product.objects.create(
            name="Relaxed Linen Shirt",
            slug="relaxed-linen-shirt",
            tagline="Soft European linen",
            description="Breathable casual linen shirt for everyday wear.",
            base_price=Decimal("85.00"),
            category=self.cat_men_tops,
            is_featured=True,
            is_new=True,
        )
        self.v_shirt = ProductVariant.objects.create(
            product=self.p_shirt,
            sku="SHIRT-WHT-M",
            color=self.color_white,
            size=self.size_m,
            stock=12,
        )

        # Product 2: In stock, Silk Slip Dress, Women dresses, $180, on sale $150
        self.p_dress = Product.objects.create(
            name="Silk Slip Dress",
            slug="silk-slip-dress",
            tagline="100% mulberry silk",
            description="Bias cut evening slip dress with delicate straps.",
            base_price=Decimal("180.00"),
            sale_price=Decimal("150.00"),
            category=self.cat_dresses,
            is_featured=False,
            is_new=False,
        )
        self.v_dress = ProductVariant.objects.create(
            product=self.p_dress,
            sku="DRESS-BLK-S",
            color=self.color_black,
            size=self.size_s,
            stock=5,
        )

        # Product 3: OUT OF STOCK, Tailored Blazer, Men, $260
        self.p_blazer = Product.objects.create(
            name="Tailored Wool Blazer",
            slug="tailored-wool-blazer",
            tagline="Italian wool blend",
            description="Modern structured fit with notch lapels.",
            base_price=Decimal("260.00"),
            category=self.cat_men,
            is_featured=True,
            is_new=False,
        )
        self.v_blazer = ProductVariant.objects.create(
            product=self.p_blazer,
            sku="BLAZER-NVY-L",
            color=self.color_navy,
            size=self.size_l,
            stock=0,  # 0 stock!
        )

    def test_search_by_name_and_description(self):
        """Search query matches product name, tagline, and description."""
        res = self.client.get("/api/products/?q=linen")
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        slugs = [p["slug"] for p in res.data["results"]]
        self.assertIn("relaxed-linen-shirt", slugs)
        self.assertNotIn("silk-slip-dress", slugs)

        res2 = self.client.get("/api/products/?q=bias+cut")
        self.assertEqual(res2.status_code, status.HTTP_200_OK)
        slugs2 = [p["slug"] for p in res2.data["results"]]
        self.assertIn("silk-slip-dress", slugs2)

    def test_search_by_category_name(self):
        """Search query matches category name e.g. 'Dresses' or 'Shirts'."""
        res = self.client.get("/api/products/?q=Dresses")
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        slugs = [p["slug"] for p in res.data["results"]]
        self.assertIn("silk-slip-dress", slugs)
        self.assertNotIn("relaxed-linen-shirt", slugs)

    def test_search_by_color_name(self):
        """Search query matches variant color name e.g. 'Navy' or 'Black'."""
        res = self.client.get("/api/products/?q=Navy")
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        slugs = [p["slug"] for p in res.data["results"]]
        self.assertIn("tailored-wool-blazer", slugs)

    def test_category_filter_parent_includes_children(self):
        """Filtering by parent category 'women' includes items in subcategory 'women-dresses'."""
        res = self.client.get("/api/products/?category=women")
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        slugs = [p["slug"] for p in res.data["results"]]
        self.assertIn("silk-slip-dress", slugs)
        self.assertNotIn("relaxed-linen-shirt", slugs)

    def test_price_range_filtering(self):
        """Min and max price filters correctly bracket product prices."""
        # 100 to 200 should match Dress (effective 150)
        res = self.client.get("/api/products/?min_price=100&max_price=200")
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        slugs = [p["slug"] for p in res.data["results"]]
        self.assertIn("silk-slip-dress", slugs)
        self.assertNotIn("relaxed-linen-shirt", slugs)
        self.assertNotIn("tailored-wool-blazer", slugs)

        # Under 100 should match Shirt (85)
        res_under = self.client.get("/api/products/?max_price=90")
        self.assertEqual(res_under.status_code, status.HTTP_200_OK)
        slugs_under = [p["slug"] for p in res_under.data["results"]]
        self.assertIn("relaxed-linen-shirt", slugs_under)
        self.assertNotIn("silk-slip-dress", slugs_under)

    def test_size_and_color_filtering(self):
        """Filtering by color ID and size ID."""
        # Filter by Black color
        res_color = self.client.get(f"/api/products/?color={self.color_black.id}")
        self.assertEqual(res_color.status_code, status.HTTP_200_OK)
        slugs = [p["slug"] for p in res_color.data["results"]]
        self.assertIn("silk-slip-dress", slugs)
        self.assertNotIn("relaxed-linen-shirt", slugs)

        # Filter by Size M
        res_size = self.client.get(f"/api/products/?size={self.size_m.id}")
        self.assertEqual(res_size.status_code, status.HTTP_200_OK)
        slugs_size = [p["slug"] for p in res_size.data["results"]]
        self.assertIn("relaxed-linen-shirt", slugs_size)
        self.assertNotIn("silk-slip-dress", slugs_size)

    def test_availability_in_stock_filter(self):
        """in_stock=true excludes items with 0 stock across all variants."""
        # Total 3 products without filter
        res_all = self.client.get("/api/products/")
        self.assertEqual(res_all.data["count"], 3)

        # in_stock=true should only return Shirt and Dress (Blazer has 0 stock)
        res_stock = self.client.get("/api/products/?in_stock=true")
        self.assertEqual(res_stock.status_code, status.HTTP_200_OK)
        self.assertEqual(res_stock.data["count"], 2)
        slugs = [p["slug"] for p in res_stock.data["results"]]
        self.assertIn("relaxed-linen-shirt", slugs)
        self.assertIn("silk-slip-dress", slugs)
        self.assertNotIn("tailored-wool-blazer", slugs)

    def test_in_stock_and_sold_out_badges(self):
        """Serializer sets in_stock=False and badges=['SOLD OUT'] when total stock is 0."""
        res = self.client.get(f"/api/products/{self.p_blazer.slug}/")
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertFalse(res.data["in_stock"])
        self.assertIn("SOLD OUT", res.data["badges"])

        res_dress = self.client.get(f"/api/products/{self.p_dress.slug}/")
        self.assertTrue(res_dress.data["in_stock"])
        self.assertIn("SALE", res_dress.data["badges"])

    def test_combined_filters(self):
        """Multiple filters work together seamlessly."""
        # Men category + White color + In stock
        res = self.client.get(f"/api/products/?category=men&color={self.color_white.id}&in_stock=true")
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(res.data["count"], 1)
        self.assertEqual(res.data["results"][0]["slug"], "relaxed-linen-shirt")

    def test_sorting_options(self):
        """Sort by price-asc, price-desc, newest, featured."""
        # Price ascending (85, 150, 260)
        res_asc = self.client.get("/api/products/?sort=price-asc")
        slugs_asc = [p["slug"] for p in res_asc.data["results"]]
        self.assertEqual(slugs_asc, ["relaxed-linen-shirt", "silk-slip-dress", "tailored-wool-blazer"])

        # Price descending (260, 150, 85)
        res_desc = self.client.get("/api/products/?sort=price-desc")
        slugs_desc = [p["slug"] for p in res_desc.data["results"]]
        self.assertEqual(slugs_desc, ["tailored-wool-blazer", "silk-slip-dress", "relaxed-linen-shirt"])

    def test_empty_results_and_zero_matches(self):
        """When filters or queries match 0 items, returns empty result cleanly without errors."""
        res = self.client.get("/api/products/?q=nonexistentgarmentxyz")
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(res.data["count"], 0)
        self.assertEqual(len(res.data["results"]), 0)

    def test_invalid_query_parameters_do_not_crash(self):
        """Invalid query parameters (e.g. min_price='abc', color='foo') are gracefully ignored."""
        res = self.client.get("/api/products/?min_price=invalid&max_price=notanumber&color=bad,ids&sort=unknown")
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertGreaterEqual(res.data["count"], 1)

    def test_bestselling_sorting_uses_actual_units_sold(self):
        """Bestselling sort prioritizes items with higher units_sold from confirmed orders."""
        from apps.orders.models import Order, OrderItem
        order = Order.objects.create(
            order_number="ORD-TEST-DISC-01",
            status="paid",
            subtotal=Decimal("150.00"),
            shipping=Decimal("10.00"),
            tax=Decimal("12.00"),
            total=Decimal("172.00"),
            shipping_address={},
            billing_address={},
        )
        OrderItem.objects.create(
            order=order,
            product=self.p_dress,
            product_name=self.p_dress.name,
            sku=self.v_dress.sku,
            color_name=self.color_black.name,
            size_name=self.size_s.name,
            quantity=15,
            unit_price=Decimal("150.00"),
        )

        res = self.client.get("/api/products/?sort=bestselling")
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        slugs = [p["slug"] for p in res.data["results"]]
        self.assertEqual(slugs[0], "silk-slip-dress")
