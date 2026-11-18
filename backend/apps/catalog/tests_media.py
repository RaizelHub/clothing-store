import tempfile
from decimal import Decimal
from io import BytesIO
from pathlib import Path
from unittest.mock import patch

from django.contrib.auth import get_user_model
from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import override_settings
from PIL import Image
from rest_framework import status
from rest_framework.test import APITestCase

from apps.catalog.models import Category, Color, Product, ProductImage, ProductVariant, Size, StoreSettings

User = get_user_model()


def _make_image_bytes(fmt: str = "JPEG", size: tuple[int, int] = (200, 250), color: str = "black") -> bytes:
    buf = BytesIO()
    mode = "RGBA" if fmt == "PNG" else "RGB"
    img = Image.new(mode, size, color=color)
    img.save(buf, format=fmt)
    return buf.getvalue()


def _uploaded_image(name: str = "front.jpg", fmt: str = "JPEG", size: tuple[int, int] = (200, 250), content_type: str = "image/jpeg"):
    return SimpleUploadedFile(name, _make_image_bytes(fmt=fmt, size=size), content_type=content_type)


class ProductMediaManagementTests(APITestCase):
    def setUp(self):
        StoreSettings.objects.update_or_create(
            pk=1,
            defaults={"store_name": "Studio", "currency": "PHP", "tax_rate": Decimal("0.08")},
        )
        self.category = Category.objects.create(name="Outerwear", slug="outerwear")
        self.color_black = Color.objects.create(name="Black", hex="#111111")
        self.color_stone = Color.objects.create(name="Stone", hex="#d6d3d1")
        self.size_m = Size.objects.create(name="M", sort_order=1)

        self.product = Product.objects.create(
            name="Wool Trench Coat",
            slug="wool-trench-coat",
            base_price=Decimal("4200.00"),
            category=self.category,
        )
        self.other_product = Product.objects.create(
            name="Cashmere Knit",
            slug="cashmere-knit",
            base_price=Decimal("3100.00"),
            category=self.category,
        )
        self.variant = ProductVariant.objects.create(
            product=self.product,
            sku="STU-BLK-M",
            color=self.color_black,
            size=self.size_m,
            stock=8,
        )

        self.customer = User.objects.create_user(
            email="customer@studio.test",
            password="password123",
            first_name="Customer",
        )
        self.admin = User.objects.create_superuser(
            email="admin@studio.test",
            password="adminpassword",
            first_name="Admin",
        )

    # 1. Valid Cloudinary image upload & responsive transformation URLs
    @override_settings(
        MEDIA_STORAGE_PROVIDER="cloudinary",
        CLOUDINARY_CLOUD_NAME="studio-demo-cloud",
        CLOUDINARY_API_KEY="test_api_key",
        CLOUDINARY_API_SECRET="test_api_secret",
        CLOUDINARY_SECURE=True,
        CLOUDINARY_UPLOAD_FOLDER="studio/products",
    )
    def test_valid_cloudinary_image_upload_and_transformations(self):
        self.client.force_authenticate(user=self.admin)
        fake_cloud_resp = {
            "public_id": f"studio/products/product-{self.product.id}/abc123",
            "secure_url": f"https://res.cloudinary.com/studio-demo-cloud/image/upload/v1/studio/products/product-{self.product.id}/abc123.jpg",
            "width": 200,
            "height": 250,
            "format": "jpg",
            "bytes": 1234,
            "version": 1,
        }

        with patch("cloudinary.uploader.upload", return_value=fake_cloud_resp) as mock_upload:
            res = self.client.post(
                f"/api/admin/products/{self.product.id}/images/",
                {
                    "file": _uploaded_image("front.jpg", "JPEG"),
                    "alt": "Front view in Black",
                    "color_id": self.color_black.id,
                    "is_primary": "true",
                },
                format="multipart",
            )

        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        self.assertEqual(res.data["storage_provider"], "cloudinary")
        self.assertEqual(res.data["public_id"], fake_cloud_resp["public_id"])
        self.assertEqual(res.data["alt"], "Front view in Black")
        self.assertEqual(res.data["color"], self.color_black.id)
        self.assertTrue(res.data["is_primary"])
        self.assertEqual(res.data["width"], 200)
        self.assertEqual(res.data["height"], 250)

        # Verify SDK generated responsive transformation URLs
        urls = res.data["urls"]
        for preset in ("thumbnail", "card", "detail", "large", "mobile", "admin_preview"):
            self.assertIn(preset, urls)
            self.assertIn("res.cloudinary.com/studio-demo-cloud", urls[preset])
            self.assertIn("f_auto", urls[preset])
            self.assertIn("q_auto", urls[preset])

        # Verify Cloudinary folder and safe upload flags were passed
        _, kwargs = mock_upload.call_args
        self.assertEqual(kwargs["folder"], f"studio/products/product-{self.product.id}")
        self.assertEqual(kwargs["resource_type"], "image")
        self.assertFalse(kwargs["use_filename"])
        self.assertTrue(kwargs["unique_filename"])

    # 2. Local development upload without Cloudinary credentials
    def test_local_media_upload_without_cloudinary_credentials(self):
        with tempfile.TemporaryDirectory() as tmpdir:
            with override_settings(MEDIA_STORAGE_PROVIDER="local", MEDIA_ROOT=Path(tmpdir), MEDIA_URL="media/"):
                self.client.force_authenticate(user=self.admin)
                res = self.client.post(
                    f"/api/admin/products/{self.product.id}/images/",
                    {"file": _uploaded_image("detail.png", "PNG", content_type="image/png"), "alt": "Fabric detail"},
                    format="multipart",
                )
                self.assertEqual(res.status_code, status.HTTP_201_CREATED)
                self.assertEqual(res.data["storage_provider"], "local")
                self.assertTrue(res.data["image"].startswith("/media/products/"))
                saved_file = Path(tmpdir) / res.data["public_id"]
                self.assertTrue(saved_file.is_file())

    # 3. Unsupported file types & spoofed MIME/filename rejected
    def test_unsupported_and_spoofed_file_types_rejected(self):
        self.client.force_authenticate(user=self.admin)

        # SVG XSS attempt disguised as image/jpeg
        svg_xss = SimpleUploadedFile(
            "evil.jpg",
            b'<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>',
            content_type="image/jpeg",
        )
        res_svg = self.client.post(
            f"/api/admin/products/{self.product.id}/images/",
            {"file": svg_xss},
            format="multipart",
        )
        self.assertEqual(res_svg.status_code, status.HTTP_400_BAD_REQUEST)

        # Plain text disguised as PNG
        fake_png = SimpleUploadedFile("fake.png", b"not actually a png file at all", content_type="image/png")
        res_fake = self.client.post(
            f"/api/admin/products/{self.product.id}/images/",
            {"file": fake_png},
            format="multipart",
        )
        self.assertEqual(res_fake.status_code, status.HTTP_400_BAD_REQUEST)

        # Corrupted JPEG (valid magic bytes, broken payload)
        corrupt_jpg = SimpleUploadedFile("corrupt.jpg", b"\xff\xd8\xff\xe0" + b"\x00" * 50, content_type="image/jpeg")
        res_corrupt = self.client.post(
            f"/api/admin/products/{self.product.id}/images/",
            {"file": corrupt_jpg},
            format="multipart",
        )
        self.assertEqual(res_corrupt.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(ProductImage.objects.filter(product=self.product).count(), 0)

    # 4. Oversized file rejected
    @override_settings(MEDIA_MAX_UPLOAD_SIZE_MB=1)
    def test_oversized_file_rejected(self):
        self.client.force_authenticate(user=self.admin)
        oversized = SimpleUploadedFile(
            "huge.jpg",
            b"\xff\xd8\xff" + (b"\x00" * (1024 * 1024 + 500)),
            content_type="image/jpeg",
        )
        res = self.client.post(
            f"/api/admin/products/{self.product.id}/images/",
            {"file": oversized},
            format="multipart",
        )
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("maximum allowed size", str(res.data).lower())

    # 5. Unauthorized uploads & cross-product modification blocked
    def test_unauthorized_uploads_and_cross_product_protection(self):
        # Anonymous -> 401
        res_anon = self.client.post(
            f"/api/admin/products/{self.product.id}/images/",
            {"file": _uploaded_image()},
            format="multipart",
        )
        self.assertEqual(res_anon.status_code, status.HTTP_401_UNAUTHORIZED)

        # Authenticated non-staff -> 403
        self.client.force_authenticate(user=self.customer)
        res_cust = self.client.post(
            f"/api/admin/products/{self.product.id}/images/",
            {"file": _uploaded_image()},
            format="multipart",
        )
        self.assertEqual(res_cust.status_code, status.HTTP_403_FORBIDDEN)

        # Staff cannot modify product B's image through product A's route -> 404
        img_other = ProductImage.objects.create(
            product=self.other_product,
            image="/media/products/other.jpg",
            alt="Other",
            position=0,
        )
        self.client.force_authenticate(user=self.admin)
        res_cross = self.client.patch(
            f"/api/admin/products/{self.product.id}/images/{img_other.id}/",
            {"alt": "Hijacked"},
            format="json",
        )
        self.assertEqual(res_cross.status_code, status.HTTP_404_NOT_FOUND)

    # 6. Arbitrary remote URL uploads blocked
    def test_arbitrary_remote_url_upload_rejected(self):
        self.client.force_authenticate(user=self.admin)
        res_upload_ep = self.client.post(
            f"/api/admin/products/{self.product.id}/images/",
            {"url": "https://evil.example.com/ssrf.jpg"},
            format="json",
        )
        self.assertEqual(res_upload_ep.status_code, status.HTTP_400_BAD_REQUEST)

        res_product_patch = self.client.patch(
            f"/api/admin/products/{self.product.id}/",
            {"images": [{"image": "https://untrusted.example.com/remote.jpg", "alt": "Remote"}]},
            format="json",
        )
        self.assertEqual(res_product_patch.status_code, status.HTTP_400_BAD_REQUEST)

    # 7. Multiple images, variant association, primary selection, and reordering
    def test_gallery_ordering_primary_selection_and_variant_association(self):
        with tempfile.TemporaryDirectory() as tmpdir:
            with override_settings(MEDIA_STORAGE_PROVIDER="local", MEDIA_ROOT=Path(tmpdir), MEDIA_URL="media/"):
                self.client.force_authenticate(user=self.admin)
                res = self.client.post(
                    f"/api/admin/products/{self.product.id}/images/",
                    {
                        "files": [
                            _uploaded_image("front.jpg", "JPEG"),
                            _uploaded_image("back.jpg", "JPEG"),
                            _uploaded_image("side.webp", "WEBP", content_type="image/webp"),
                        ]
                    },
                    format="multipart",
                )
                self.assertEqual(res.status_code, status.HTTP_201_CREATED)
                self.assertEqual(len(res.data), 3)
                ids = [item["id"] for item in res.data]
                self.assertTrue(res.data[0]["is_primary"])
                self.assertFalse(res.data[1]["is_primary"])

                # Associate second image with Stone color & set it as primary
                res_patch = self.client.patch(
                    f"/api/admin/products/{self.product.id}/images/{ids[1]}/",
                    {"color_id": self.color_stone.id, "alt": "Back view in Stone", "is_primary": True},
                    format="json",
                )
                self.assertEqual(res_patch.status_code, status.HTTP_200_OK)
                self.assertTrue(res_patch.data["is_primary"])
                self.assertEqual(res_patch.data["color"], self.color_stone.id)

                # First image must no longer be primary
                self.assertFalse(ProductImage.objects.get(pk=ids[0]).is_primary)

                # Reorder gallery: [ids[2], ids[0], ids[1]]
                res_reorder = self.client.post(
                    f"/api/admin/products/{self.product.id}/images/reorder/",
                    {"image_ids": [ids[2], ids[0], ids[1]]},
                    format="json",
                )
                self.assertEqual(res_reorder.status_code, status.HTTP_200_OK)
                self.assertEqual([img["id"] for img in res_reorder.data], [ids[2], ids[0], ids[1]])
                self.assertEqual([img["position"] for img in res_reorder.data], [0, 1, 2])
                # Primary stays sticky to ids[1]
                self.assertTrue(res_reorder.data[2]["is_primary"])

    # 8. Safe image replacement (uploads new before deleting old; preserves old on failure)
    @override_settings(
        MEDIA_STORAGE_PROVIDER="cloudinary",
        CLOUDINARY_CLOUD_NAME="studio-demo-cloud",
        CLOUDINARY_API_KEY="test_api_key",
        CLOUDINARY_API_SECRET="test_api_secret",
    )
    def test_safe_image_replacement_and_shared_asset_protection(self):
        self.client.force_authenticate(user=self.admin)
        old_pub_id = f"studio/products/product-{self.product.id}/old_img"
        new_pub_id = f"studio/products/product-{self.product.id}/new_img"

        img = ProductImage.objects.create(
            product=self.product,
            image="https://res.cloudinary.com/studio-demo-cloud/image/upload/v1/old.jpg",
            public_id=old_pub_id,
            storage_provider="cloudinary",
            alt="Old Front",
            position=0,
            is_primary=True,
        )

        # Case A: Upload fails -> old image NOT deleted and DB unchanged
        with patch("cloudinary.uploader.upload", side_effect=RuntimeError("Cloudinary timeout")), patch(
            "cloudinary.uploader.destroy"
        ) as mock_destroy:
            res_fail = self.client.patch(
                f"/api/admin/products/{self.product.id}/images/{img.id}/",
                {"file": _uploaded_image("replacement.jpg")},
                format="multipart",
            )
        self.assertEqual(res_fail.status_code, status.HTTP_502_BAD_GATEWAY)
        mock_destroy.assert_not_called()
        img.refresh_from_db()
        self.assertEqual(img.public_id, old_pub_id)

        # Case B: Upload succeeds -> DB updated -> old unreferenced asset deleted
        new_cloud_resp = {
            "public_id": new_pub_id,
            "secure_url": "https://res.cloudinary.com/studio-demo-cloud/image/upload/v2/new.jpg",
            "width": 200,
            "height": 250,
            "format": "jpg",
            "bytes": 999,
        }
        with patch("cloudinary.uploader.upload", return_value=new_cloud_resp), patch(
            "cloudinary.uploader.destroy", return_value={"result": "ok"}
        ) as mock_destroy:
            res_ok = self.client.patch(
                f"/api/admin/products/{self.product.id}/images/{img.id}/",
                {"file": _uploaded_image("replacement.jpg"), "alt": "New Front"},
                format="multipart",
            )
        self.assertEqual(res_ok.status_code, status.HTTP_200_OK)
        self.assertEqual(res_ok.data["public_id"], new_pub_id)
        mock_destroy.assert_called_once()
        self.assertEqual(mock_destroy.call_args[0][0], old_pub_id)

    # 9. Deletion does not delete Cloudinary asset if referenced by another product
    @override_settings(
        MEDIA_STORAGE_PROVIDER="cloudinary",
        CLOUDINARY_CLOUD_NAME="studio-demo-cloud",
        CLOUDINARY_API_KEY="test_api_key",
        CLOUDINARY_API_SECRET="test_api_secret",
    )
    def test_delete_skips_cloudinary_destroy_when_referenced_elsewhere(self):
        self.client.force_authenticate(user=self.admin)
        shared_pub_id = f"studio/products/product-{self.product.id}/shared_asset"

        img1 = ProductImage.objects.create(
            product=self.product,
            image="https://res.cloudinary.com/studio-demo-cloud/image/upload/v1/shared.jpg",
            public_id=shared_pub_id,
            storage_provider="cloudinary",
            position=0,
            is_primary=True,
        )
        ProductImage.objects.create(
            product=self.other_product,
            image="https://res.cloudinary.com/studio-demo-cloud/image/upload/v1/shared.jpg",
            public_id=shared_pub_id,
            storage_provider="cloudinary",
            position=0,
            is_primary=True,
        )

        with patch("cloudinary.uploader.destroy", return_value={"result": "ok"}) as mock_destroy:
            res = self.client.delete(f"/api/admin/products/{self.product.id}/images/{img1.id}/")

        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertFalse(ProductImage.objects.filter(pk=img1.pk).exists())
        mock_destroy.assert_not_called()

    # 10. DB failure after upload cleans up newly uploaded orphan on Cloudinary
    @override_settings(
        MEDIA_STORAGE_PROVIDER="cloudinary",
        CLOUDINARY_CLOUD_NAME="studio-demo-cloud",
        CLOUDINARY_API_KEY="test_api_key",
        CLOUDINARY_API_SECRET="test_api_secret",
    )
    def test_db_failure_cleans_up_orphaned_cloudinary_upload(self):
        self.client.force_authenticate(user=self.admin)
        orphan_pub_id = f"studio/products/product-{self.product.id}/orphan_asset"
        fake_resp = {
            "public_id": orphan_pub_id,
            "secure_url": "https://res.cloudinary.com/studio-demo-cloud/image/upload/v1/orphan.jpg",
            "width": 200,
            "height": 250,
            "format": "jpg",
            "bytes": 512,
        }

        with patch("cloudinary.uploader.upload", return_value=fake_resp), patch(
            "apps.catalog.models.ProductImage.objects.create", side_effect=RuntimeError("DB crash")
        ), patch("cloudinary.uploader.destroy", return_value={"result": "ok"}) as mock_destroy:
            with self.assertRaises(RuntimeError):
                self.client.post(
                    f"/api/admin/products/{self.product.id}/images/",
                    {"file": _uploaded_image("front.jpg")},
                    format="multipart",
                )

        mock_destroy.assert_called_once()
        self.assertEqual(mock_destroy.call_args[0][0], orphan_pub_id)

    # 11. Missing Cloudinary credentials returns clear 503 error & non-sensitive config status
    @override_settings(
        MEDIA_STORAGE_PROVIDER="cloudinary",
        CLOUDINARY_CLOUD_NAME="",
        CLOUDINARY_API_KEY="",
        CLOUDINARY_API_SECRET="",
    )
    def test_missing_cloudinary_credentials_error_and_config_endpoint(self):
        self.client.force_authenticate(user=self.admin)

        cfg_res = self.client.get("/api/admin/media/config/")
        self.assertEqual(cfg_res.status_code, status.HTTP_200_OK)
        self.assertEqual(cfg_res.data["provider"], "cloudinary")
        self.assertFalse(cfg_res.data["configured"])
        self.assertIn("CLOUDINARY_CLOUD_NAME", cfg_res.data["error"])
        self.assertNotIn("api_secret", cfg_res.data)
        self.assertNotIn("api_key", cfg_res.data)

        # Even when configured, secret values must never appear in config response
        with override_settings(
            CLOUDINARY_CLOUD_NAME="demo",
            CLOUDINARY_API_KEY="my_key_999",
            CLOUDINARY_API_SECRET="super_secret_val_xyz",
        ):
            cfg_ok = self.client.get("/api/admin/media/config/")
            self.assertEqual(cfg_ok.status_code, status.HTTP_200_OK)
            self.assertTrue(cfg_ok.data["configured"])
            self.assertNotIn("super_secret_val_xyz", str(cfg_ok.data))
            self.assertNotIn("my_key_999", str(cfg_ok.data))

        upload_res = self.client.post(
            f"/api/admin/products/{self.product.id}/images/",
            {"file": _uploaded_image("front.jpg")},
            format="multipart",
        )
        self.assertEqual(upload_res.status_code, status.HTTP_503_SERVICE_UNAVAILABLE)
        self.assertIn("CLOUDINARY_CLOUD_NAME", upload_res.data["detail"])
