class MediaError(Exception):
    """Base exception for media storage operations."""


class MediaConfigurationError(MediaError):
    """Raised when media storage provider is enabled but required credentials are missing."""


class MediaValidationError(MediaError):
    """Raised when an uploaded image fails size, format, or binary content validation."""


class MediaUploadError(MediaError):
    """Raised when uploading or deleting an asset with the storage provider fails."""
