import logging
from io import BytesIO
from typing import Dict, Optional

import cloudinary
import cloudinary.uploader
import cloudinary.utils
from django.conf import settings

from .base import BaseMediaProvider, UploadedAsset
from .exceptions import MediaConfigurationError, MediaUploadError
from .validators import ValidatedImage, sanitize_folder_segment

logger = logging.getLogger(__name__)

# Official Cloudinary transformation presets (f_auto, q_auto, responsive dimensions)
IMAGE_TRANSFORM_PRESETS: Dict[str, Dict] = {
    "thumbnail": {
        "width": 320,
        "height": 400,
        "crop": "fill",
        "gravity": "auto",
        "fetch_format": "auto",
        "quality": "auto",
    },
    "card": {
        "width": 640,
        "height": 800,
        "crop": "fill",
        "gravity": "auto",
        "fetch_format": "auto",
        "quality": "auto",
    },
    "detail": {
        "width": 1200,
        "height": 1500,
        "crop": "limit",
        "fetch_format": "auto",
        "quality": "auto",
    },
    "large": {
        "width": 1800,
        "height": 2250,
        "crop": "limit",
        "fetch_format": "auto",
        "quality": "auto",
    },
    "mobile": {
        "width": 750,
        "height": 938,
        "crop": "limit",
        "fetch_format": "auto",
        "quality": "auto",
    },
    "admin_preview": {
        "width": 240,
        "height": 300,
        "crop": "fill",
        "gravity": "auto",
        "fetch_format": "auto",
        "quality": "auto",
    },
}


class CloudinaryMediaProvider(BaseMediaProvider):
    def __init__(
        self,
        cloud_name: Optional[str] = None,
        api_key: Optional[str] = None,
        api_secret: Optional[str] = None,
        secure: Optional[bool] = None,
        base_folder: Optional[str] = None,
    ):
        self.cloud_name = (
            cloud_name if cloud_name is not None else getattr(settings, "CLOUDINARY_CLOUD_NAME", "")
        ).strip()
        self.api_key = (
            api_key if api_key is not None else getattr(settings, "CLOUDINARY_API_KEY", "")
        ).strip()
        self.api_secret = (
            api_secret if api_secret is not None else getattr(settings, "CLOUDINARY_API_SECRET", "")
        ).strip()
        self.secure = (
            secure if secure is not None else bool(getattr(settings, "CLOUDINARY_SECURE", True))
        )
        raw_folder = (
            base_folder
            if base_folder is not None
            else getattr(settings, "CLOUDINARY_UPLOAD_FOLDER", "studio/products")
        )
        segments = [sanitize_folder_segment(s) for s in str(raw_folder).split("/") if s.strip()]
        self.base_folder = "/".join(segments) if segments else "studio/products"

    @property
    def name(self) -> str:
        return "cloudinary"

    def validate_config(self) -> None:
        missing = []
        if not self.cloud_name:
            missing.append("CLOUDINARY_CLOUD_NAME")
        if not self.api_key:
            missing.append("CLOUDINARY_API_KEY")
        if not self.api_secret:
            missing.append("CLOUDINARY_API_SECRET")
        if missing:
            raise MediaConfigurationError(
                f"Cloudinary is enabled but required environment variables are missing: {', '.join(missing)}."
            )

    def _configure_sdk(self) -> None:
        self.validate_config()
        cloudinary.config(
            cloud_name=self.cloud_name,
            api_key=self.api_key,
            api_secret=self.api_secret,
            secure=self.secure,
        )

    def _target_folder(self, product_id: int) -> str:
        return f"{self.base_folder}/product-{int(product_id)}"

    def upload_image(
        self,
        validated: ValidatedImage,
        *,
        product_id: int,
        product_slug: str = "",
        color_id: Optional[int] = None,
    ) -> UploadedAsset:
        self._configure_sdk()
        folder = self._target_folder(product_id)
        tags = ["studio-catalog", f"product:{int(product_id)}"]
        if product_slug:
            tags.append(f"slug:{sanitize_folder_segment(product_slug)}")
        if color_id is not None:
            tags.append(f"color:{int(color_id)}")

        try:
            result = cloudinary.uploader.upload(
                BytesIO(validated.raw_bytes),
                folder=folder,
                resource_type="image",
                allowed_formats=["jpg", "jpeg", "png", "webp", "avif"],
                overwrite=False,
                unique_filename=True,
                use_filename=False,
                tags=tags,
                cloud_name=self.cloud_name,
                api_key=self.api_key,
                api_secret=self.api_secret,
            )
        except Exception as exc:
            logger.error("Cloudinary upload failed for product %s: %s", product_id, exc)
            raise MediaUploadError("Failed to upload image to Cloudinary. Please try again.") from exc

        public_id = result.get("public_id", "")
        secure_url = result.get("secure_url") or result.get("url") or ""
        if not public_id or not secure_url:
            raise MediaUploadError("Cloudinary upload returned incomplete asset metadata.")

        return UploadedAsset(
            url=secure_url,
            public_id=public_id,
            storage_provider="cloudinary",
            width=int(result.get("width") or validated.width),
            height=int(result.get("height") or validated.height),
            format=str(result.get("format") or validated.format).lower(),
            bytes=int(result.get("bytes") or validated.size_bytes),
            metadata={"folder": folder, "version": result.get("version")},
        )

    def delete_image(self, public_id: str) -> bool:
        if not public_id:
            return False
        # Safety check: never delete assets outside our predictable folder prefix
        if not public_id.startswith(f"{self.base_folder}/"):
            logger.warning("Refusing to delete Cloudinary asset outside managed folder: %s", public_id)
            return False
        try:
            self._configure_sdk()
            resp = cloudinary.uploader.destroy(
                public_id,
                resource_type="image",
                invalidate=True,
                cloud_name=self.cloud_name,
                api_key=self.api_key,
                api_secret=self.api_secret,
            )
            outcome = resp.get("result") if isinstance(resp, dict) else None
            if outcome not in ("ok", "not found"):
                logger.warning("Unexpected Cloudinary destroy result for %s: %s", public_id, resp)
                return False
            return True
        except Exception as exc:
            logger.error("Cloudinary delete failed for %s: %s", public_id, exc)
            return False

    def build_delivery_urls(self, url: str, public_id: str = "") -> Dict[str, str]:
        if not public_id or not self.cloud_name:
            return {name: url for name in IMAGE_TRANSFORM_PRESETS}
        urls: Dict[str, str] = {}
        for preset_name, params in IMAGE_TRANSFORM_PRESETS.items():
            transformed_url, _ = cloudinary.utils.cloudinary_url(
                public_id,
                cloud_name=self.cloud_name,
                secure=self.secure,
                resource_type="image",
                type="upload",
                **params,
            )
            urls[preset_name] = transformed_url
        return urls
