from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from typing import Any, Dict, Optional

from .validators import ValidatedImage


@dataclass
class UploadedAsset:
    url: str
    public_id: str
    storage_provider: str
    width: int
    height: int
    format: str
    bytes: int
    metadata: Dict[str, Any] = field(default_factory=dict)


class BaseMediaProvider(ABC):
    @property
    @abstractmethod
    def name(self) -> str:
        """Provider identifier: 'cloudinary' or 'local'."""

    @abstractmethod
    def upload_image(
        self,
        validated: ValidatedImage,
        *,
        product_id: int,
        product_slug: str = "",
        color_id: Optional[int] = None,
    ) -> UploadedAsset:
        """Upload a validated image and return asset metadata."""

    @abstractmethod
    def delete_image(self, public_id: str) -> bool:
        """Delete an asset by its public_id. Returns True if deleted or already gone."""

    @abstractmethod
    def build_delivery_urls(self, url: str, public_id: str = "") -> Dict[str, str]:
        """Build responsive optimized delivery URLs for storefront and admin previews."""
