from typing import Any, Dict, Optional

from django.conf import settings

from .base import BaseMediaProvider
from .cloudinary_provider import IMAGE_TRANSFORM_PRESETS, CloudinaryMediaProvider
from .exceptions import MediaConfigurationError
from .local_provider import LocalMediaProvider
from .validators import ALLOWED_FORMATS


def get_media_provider(name: Optional[str] = None) -> BaseMediaProvider:
    """
    Resolve configured media storage provider ('cloudinary' or 'local').
    When 'cloudinary' is selected, required credentials are validated strictly.
    """
    provider_name = (name or getattr(settings, "MEDIA_STORAGE_PROVIDER", "local")).strip().lower()
    if provider_name == "cloudinary":
        provider = CloudinaryMediaProvider()
        provider.validate_config()
        return provider
    return LocalMediaProvider()


def get_media_status() -> Dict[str, Any]:
    """Return non-sensitive media configuration summary for the Admin UI."""
    provider_name = getattr(settings, "MEDIA_STORAGE_PROVIDER", "local").strip().lower()
    max_mb = int(getattr(settings, "MEDIA_MAX_UPLOAD_SIZE_MB", 8))
    allowed = sorted(f.lower() for f in ALLOWED_FORMATS)

    if provider_name == "cloudinary":
        try:
            CloudinaryMediaProvider().validate_config()
            return {
                "provider": "cloudinary",
                "configured": True,
                "max_file_size_mb": max_mb,
                "allowed_formats": allowed,
                "error": None,
            }
        except MediaConfigurationError as exc:
            return {
                "provider": "cloudinary",
                "configured": False,
                "max_file_size_mb": max_mb,
                "allowed_formats": allowed,
                "error": str(exc),
            }

    return {
        "provider": "local",
        "configured": True,
        "max_file_size_mb": max_mb,
        "allowed_formats": allowed,
        "error": None,
    }


def build_product_image_urls(image_obj) -> Dict[str, str]:
    """
    Build responsive delivery URLs for a ProductImage instance.
    Uses Cloudinary SDK transformations for Cloudinary-stored assets;
    gracefully returns original URL for local/legacy/seeded assets.
    """
    url = getattr(image_obj, "image", "") or ""
    storage_provider = getattr(image_obj, "storage_provider", "external")
    public_id = getattr(image_obj, "public_id", "") or ""

    if storage_provider == "cloudinary" and public_id:
        provider = CloudinaryMediaProvider()
        if provider.cloud_name:
            return provider.build_delivery_urls(url, public_id)

    return {name: url for name in IMAGE_TRANSFORM_PRESETS}


def delete_managed_asset(storage_provider: str, public_id: str) -> bool:
    """Safely delete an asset from its storage provider without raising on transient provider failure."""
    if not public_id:
        return False
    if storage_provider == "cloudinary":
        return CloudinaryMediaProvider().delete_image(public_id)
    if storage_provider == "local":
        return LocalMediaProvider().delete_image(public_id)
    return False
