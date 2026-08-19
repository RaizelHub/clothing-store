"""Shared money + placeholder-image helpers (mirrors frontend src/lib/format.ts)."""

import string
from decimal import Decimal, ROUND_HALF_UP
from urllib.parse import quote

CENT = Decimal("0.01")
HASH_CHARS = string.ascii_letters + string.digits + string.punctuation


def to_cents(value: Decimal | int | str) -> int:
    return int((Decimal(str(value)) * 100).quantize(Decimal("1"), rounding=ROUND_HALF_UP))


def from_cents(cents: int) -> Decimal:
    return (Decimal(cents) / 100).quantize(CENT)


def cents_to_str(cents: int) -> str:
    return f"{cents / 100:.2f}"


def to_str(value: Decimal) -> str:
    return str(value.quantize(CENT))


def hash_string(s: str) -> int:
    h = 5381
    for ch in s:
        h = ((h * 33) ^ ord(ch)) & 0xFFFFFFFF
    return h


def placeholder_image(text: str, hex_color: str, seed: int = 0) -> str:
    """Deterministic SVG data-URL placeholder, same generator as the frontend."""
    h = hash_string(f"{text}:{seed}")
    hue = h % 360
    loud = f"hsl({hue} 45% 60%)"
    muted = f"hsl({(hue + 40) % 360} 20% 70%)"
    label = (text or "item").replace("-", " ").title()
    svg = (
        f'<svg xmlns="http://www.w3.org/2000/svg" width="800" height="1000" viewBox="0 0 800 1000">'
        f'<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">'
        f'<stop offset="0" stop-color="{loud}"/><stop offset="1" stop-color="{muted}"/></linearGradient></defs>'
        f'<rect width="800" height="1000" fill="url(#g)"/>'
        f'<text x="400" y="480" font-family="Arial, sans-serif" font-size="44" fill="#ffffff" text-anchor="middle" dominant-baseline="middle">{label}</text>'
        f'<text x="400" y="540" font-family="Arial, sans-serif" font-size="26" fill="#ffffff" opacity="0.8" text-anchor="middle">{hex_color}</text>'
        f"</svg>"
    )
    return f"data:image/svg+xml;utf8,{quote(svg)}"