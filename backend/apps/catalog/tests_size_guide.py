from decimal import Decimal
from django.contrib.auth import get_user_model
from rest_framework import status
from rest_framework.test import APITestCase

from apps.catalog.models import Category, Color, Product, ProductVariant, Size, StoreSettings

User = get_user_model()


class ProductSizeGuideAndFitTests(APITestCase):
    def setUp(self):
        StoreSettings.objects.update_or_create(
            pk=1,
            defaults={"store_name": "Studio", "currency": "USD", "tax_rate": Decimal("0.08")},
        )
        self.cat_dresses = Category.objects.create(name="Dresses", slug="women-dresses")
        self.cat_tops = Category.objects.create(name="Tops", slug="men-tops")
        self.cat_bottoms = Category.objects.create(name="Trousers", slug="men-trousers")
        self.cat_outerwear = Category.objects.create(name="Outerwear", slug="men-outerwear")

        self.color_black = Color.objects.create(name="Black", hex="#000000")
        self.color_cream = Color.objects.create(name="Cream", hex="#FAF9F6")

        self.size_xs = Size.objects.create(name="XS", sort_order=1)
        self.size_s = Size.objects.create(name="S", sort_order=2)
        self.size_m = Size.objects.create(name="M", sort_order=3)
        self.size_l = Size.objects.create(name="L", sort_order=4)

        # Create a dress product with fit note
        self.dress = Product.objects.create(
            name="Silk Slip Dress",
            slug="silk-slip-dress",
            base_price=Decimal("240.00"),
            category=self.cat_dresses,
            tagline="Cut on the bias for an effortless drape",
            fit="Bias cut — skims, never clings. If between sizes, size down for a closer fit.",
            description="Pure mulberry silk charmeuse.",
            care="Dry clean only.",
        )

        # Variant 1: XS Black - In stock
        self.v_dress_xs = ProductVariant.objects.create(
            product=self.dress,
            sku="DRS-BLK-XS",
            color=self.color_black,
            size=self.size_xs,
            stock=5,
        )

        # Variant 2: S Black - Sold out
        self.v_dress_s = ProductVariant.objects.create(
            product=self.dress,
            sku="DRS-BLK-S",
            color=self.color_black,
            size=self.size_s,
            stock=0,
        )

        # Variant 3: M Black - Low stock
        self.v_dress_m = ProductVariant.objects.create(
            product=self.dress,
            sku="DRS-BLK-M",
            color=self.color_black,
            size=self.size_m,
            stock=2,
        )

    def test_product_detail_api_exposes_fit_and_category_metadata(self):
        """API product detail response must include fit guidance, category slug, and variant stock."""
        res = self.client.get(f"/api/products/{self.dress.slug}/")
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        data = res.data

        # Fit guidance check
        self.assertIn("fit", data)
        self.assertEqual(data["fit"], "Bias cut — skims, never clings. If between sizes, size down for a closer fit.")

        # Category metadata for size guide routing
        self.assertEqual(data["category_slug"], "women-dresses")
        self.assertEqual(data["category_name"], "Dresses")

        # Variants contain size and stock
        variants = data["variants"]
        self.assertEqual(len(variants), 3)

        xs_variant = next(v for v in variants if v["size"]["name"] == "XS")
        s_variant = next(v for v in variants if v["size"]["name"] == "S")
        m_variant = next(v for v in variants if v["size"]["name"] == "M")

        self.assertEqual(xs_variant["stock"], 5)
        self.assertEqual(s_variant["stock"], 0)
        self.assertEqual(m_variant["stock"], 2)

    def test_category_slug_support_for_size_guide_mapping(self):
        """Each product category should provide identifiable slugs for size guide resolution."""
        top = Product.objects.create(
            name="Merino Knit",
            slug="merino-knit",
            base_price=Decimal("150.00"),
            category=self.cat_tops,
            fit="Relaxed through body; true to size.",
        )
        trouser = Product.objects.create(
            name="Pleated Trouser",
            slug="pleated-trouser",
            base_price=Decimal("180.00"),
            category=self.cat_bottoms,
            fit="True waist, wide straight leg.",
        )
        coat = Product.objects.create(
            name="Wool Overcoat",
            slug="wool-overcoat",
            base_price=Decimal("450.00"),
            category=self.cat_outerwear,
            fit="Oversized silhouette cut to layer over suiting.",
        )

        res_top = self.client.get(f"/api/products/{top.slug}/")
        self.assertEqual(res_top.data["category_slug"], "men-tops")
        self.assertEqual(res_top.data["fit"], "Relaxed through body; true to size.")

        res_trouser = self.client.get(f"/api/products/{trouser.slug}/")
        self.assertEqual(res_trouser.data["category_slug"], "men-trousers")

        res_coat = self.client.get(f"/api/products/{coat.slug}/")
        self.assertEqual(res_coat.data["category_slug"], "men-outerwear")
