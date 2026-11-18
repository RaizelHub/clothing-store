import logging
import uuid
from pathlib import Path
from typing import Dict, Optional

from django.conf import settings

from .base import BaseMediaProvider, UploadedAsset
from .cloudinary_provider import IMAGE_TRANSFORM_PRESETS
from .exceptions import MediaUploadError
from .validators import ValidatedImage

logger = logging.getLogger(__name__)


class LocalMediaProvider(BaseMediaProvider):
    """
    Safe local filesystem media storage for development/offline usage
    when Cloudinary credentials are not configured.
    """

    def __init__(self, media_root: Optional[Path] = None, media_url: Optional[str] = None):
        self.media_root = Path(media_root or getattr(settings, "MEDIA_ROOT", Path("media"))).resolve()
        raw_url = media_url if media_url is not None else getattr(settings, "MEDIA_URL", "media/")
        self.media_url = "/" + raw_url.strip("/") + "/"

    @property
    def name(self) -> str:
        return "local"

    def upload_image(
        self,
        validated: ValidatedImage,
        *,
        product_id: int,
        product_slug: str = "",
        color_id: Optional[int] = None,
    ) -> UploadedAsset:
        ext = "jpg" if validated.format == "jpeg" else validated.format
        rel_dir = Path("products") / f"product-{int(product_id)}"
        filename = f"{uuid.uuid4().hex}.{ext}"
        rel_path = (rel_dir / filename).as_posix()

        target_dir = (self.media_root / rel_dir).resolve()
        if self.media_root not in target_dir.parents and target_dir != self.media_root:
            raise MediaUploadError("Resolved storage path escapes MEDIA_ROOT.")

        try:
            target_dir.mkdir(parents=True, exist_ok=True)
            dest_file = (target_dir / filename).resolve()
            if self.media_root not in dest_file.parents:
                raise MediaUploadError("Resolved file path escapes MEDIA_ROOT.")
            dest_file.write_bytes(validated.raw_bytes)
        except OSError as exc:
            logger.error("Local media save failed for product %s: %s", product_id, exc)
            raise MediaUploadError("Failed to save image locally.") from exc

        return UploadedAsset(
            url=f"{self.media_url}{rel_path}",
            public_id=rel_path,
            storage_provider="local",
            width=validated.width,
            height=validated.height,
            format=validated.format,
            bytes=validated.size_bytes,
            metadata={"folder": rel_dir.as_posix()},
        )

    def delete_image(self, public_id: str) -> bool:
        if not public_id or not public_id.startswith("products/"):
            return False
        try:
            candidate = (self.media_root / public_id).resolve()
            if self.media_root not in candidate.parents:
                logger.warning("Blocked local media deletion outside MEDIA_ROOT: %s", public_id)
                return False
            if candidate.is_file():
                candidate.unlink()
            return True
        except OSError as exc:
            logger.error("Local media delete failed for %s: %s", public_id, exc)
            return False

    def build_delivery_urls(self, url: str, public_id: str = "") -> Dict[str, str]:
        return {name: url for name in IMAGE_TRANSFORM_PRESETS}
