import re
from dataclasses import dataclass
from io import BytesIO
from typing import Set

from django.conf import settings
from PIL import Image, UnidentifiedImageError

from .exceptions import MediaValidationError

ALLOWED_FORMATS: Set[str] = {"JPEG", "PNG", "WEBP", "AVIF"}
ALLOWED_EXTENSIONS: Set[str] = {"jpg", "jpeg", "png", "webp", "avif"}
MIN_DIMENSION = 10
MAX_DIMENSION = 10000
MAX_PIXELS = 40_000_000  # Prevent decompression bombs

SAFE_SEGMENT_RE = re.compile(r"[^a-zA-Z0-9_-]+")


@dataclass
class ValidatedImage:
    raw_bytes: bytes
    format: str
    width: int
    height: int
    size_bytes: int
    original_filename: str


def sanitize_folder_segment(value: str) -> str:
    cleaned = SAFE_SEGMENT_RE.sub("-", str(value or "").strip().lower()).strip("-")
    return cleaned[:64] or "item"


def _matches_magic_bytes(data: bytes) -> str | None:
    """Inspect leading magic bytes to verify genuine binary image signatures."""
    if len(data) < 12:
        return None
    if data[:3] == b"\xff\xd8\xff":
        return "JPEG"
    if data[:8] == b"\x89PNG\r\n\x1a\n":
        return "PNG"
    if data[:4] == b"RIFF" and data[8:12] == b"WEBP":
        return "WEBP"
    if data[4:8] == b"ftyp" and any(brand in data[8:16] for brand in (b"avif", b"avis", b"mif1", b"msf1")):
        return "AVIF"
    return None


def validate_image_file(uploaded_file) -> ValidatedImage:
    """
    Validate an uploaded file by size, magic bytes, and actual decoded binary image content.
    Never trusts the filename extension or HTTP Content-Type header alone.
    """
    if uploaded_file is None:
        raise MediaValidationError("No image file was provided.")

    max_mb = getattr(settings, "MEDIA_MAX_UPLOAD_SIZE_MB", 8)
    max_bytes = int(max_mb) * 1024 * 1024

    reported_size = getattr(uploaded_file, "size", None)
    if reported_size is not None and reported_size > max_bytes:
        raise MediaValidationError(f"File exceeds the maximum allowed size of {max_mb} MB.")

    # Read up to max_bytes + 1 to enforce exact byte cap even if reported_size is spoofed/missing
    if hasattr(uploaded_file, "seek"):
        uploaded_file.seek(0)
    raw_bytes = uploaded_file.read(max_bytes + 1)
    if hasattr(uploaded_file, "seek"):
        uploaded_file.seek(0)

    size_bytes = len(raw_bytes)
    if size_bytes == 0:
        raise MediaValidationError("Uploaded image file is empty.")
    if size_bytes > max_bytes:
        raise MediaValidationError(f"File exceeds the maximum allowed size of {max_mb} MB.")

    # Reject text/SVG/HTML/script files immediately via magic-byte inspection
    magic_format = _matches_magic_bytes(raw_bytes)
    if not magic_format or magic_format not in ALLOWED_FORMATS:
        raise MediaValidationError(
            "Unsupported or invalid image file. Only JPEG, PNG, WEBP, and AVIF images are allowed."
        )

    # Full binary decode verification with Pillow
    previous_max = Image.MAX_IMAGE_PIXELS
    Image.MAX_IMAGE_PIXELS = MAX_PIXELS
    try:
        with Image.open(BytesIO(raw_bytes)) as img:
            img.verify()

        with Image.open(BytesIO(raw_bytes)) as img:
            detected_format = (img.format or "").upper()
            width, height = img.size
            # Force pixel load on small header/decoder sanity check
            img.load()
    except Image.DecompressionBombError:
        raise MediaValidationError("Image resolution is too large and cannot be processed safely.")
    except (UnidentifiedImageError, OSError, SyntaxError, ValueError):
        raise MediaValidationError("File content is corrupted or not a valid image.")
    finally:
        Image.MAX_IMAGE_PIXELS = previous_max

    if detected_format not in ALLOWED_FORMATS:
        raise MediaValidationError(
            f"Unsupported image format '{detected_format}'. Allowed formats: JPEG, PNG, WEBP, AVIF."
        )

    if width < MIN_DIMENSION or height < MIN_DIMENSION:
        raise MediaValidationError(f"Image dimensions must be at least {MIN_DIMENSION}x{MIN_DIMENSION} pixels.")
    if width > MAX_DIMENSION or height > MAX_DIMENSION:
        raise MediaValidationError(f"Image dimensions cannot exceed {MAX_DIMENSION}x{MAX_DIMENSION} pixels.")

    filename = getattr(uploaded_file, "name", "") or f"upload.{detected_format.lower()}"
    return ValidatedImage(
        raw_bytes=raw_bytes,
        format=detected_format.lower(),
        width=width,
        height=height,
        size_bytes=size_bytes,
        original_filename=str(filename)[:180],
    )
