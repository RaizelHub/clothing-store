from decimal import Decimal
from datetime import timedelta

from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand
from django.utils import timezone

from apps.catalog.models import (
    Category,
    Collection,
    Color,
    Outfit,
    OutfitItem,
    Product,
    ProductImage,
    ProductVariant,
    Review,
    Size,
    StoreSettings,
)
from apps.orders.models import Coupon, NewsletterSubscription, Order, OrderItem

User = get_user_model()

# Curated photography map for all catalog items and colorways (from the mock seed).
PRODUCT_IMAGE_MAP = {
    "essential-oversized-tee": {
        "Black": [
            "https://images.unsplash.com/photo-1521572267360-ee0c2909d518?auto=format&fit=crop&w=1000&q=80",
            "https://images.unsplash.com/photo-1503342217505-b0a15ec3261c?auto=format&fit=crop&w=1000&q=80",
        ],
        "White": [
            "https://images.unsplash.com/photo-1581655353564-df123a1eb820?auto=format&fit=crop&w=1000&q=80",
            "https://images.unsplash.com/photo-1521572267360-ee0c2909d518?auto=format&fit=crop&w=1000&q=80",
        ],
        "Stone": [
            "https://images.unsplash.com/photo-1583743814966-8936f5b7be1a?auto=format&fit=crop&w=1000&q=80",
            "https://images.unsplash.com/photo-1503342217505-b0a15ec3261c?auto=format&fit=crop&w=1000&q=80",
        ],
    },
    "relaxed-linen-shirt": {
        "White": [
            "https://images.unsplash.com/photo-1602810318383-e386cc2a3ccf?auto=format&fit=crop&w=1000&q=80",
            "https://images.unsplash.com/photo-1596755094514-f87e34085b2c?auto=format&fit=crop&w=1000&q=80",
        ],
        "Stone": [
            "https://images.unsplash.com/photo-1598033129183-c4f50c736f10?auto=format&fit=crop&w=1000&q=80",
            "https://images.unsplash.com/photo-1602810318383-e386cc2a3ccf?auto=format&fit=crop&w=1000&q=80",
        ],
        "Olive": [
            "https://images.unsplash.com/photo-1603252109303-2751441dd157?auto=format&fit=crop&w=1000&q=80",
            "https://images.unsplash.com/photo-1596755094514-f87e34085b2c?auto=format&fit=crop&w=1000&q=80",
        ],
    },
    "merino-crewneck": {
        "Navy": [
            "https://images.unsplash.com/photo-1620799140408-edc6dcb6d633?auto=format&fit=crop&w=1000&q=80",
            "https://images.unsplash.com/photo-1614975058789-41316d0e2e9c?auto=format&fit=crop&w=1000&q=80",
        ],
        "Stone": [
            "https://images.unsplash.com/photo-1576871337622-98d48d1cf531?auto=format&fit=crop&w=1000&q=80",
            "https://images.unsplash.com/photo-1620799140408-edc6dcb6d633?auto=format&fit=crop&w=1000&q=80",
        ],
        "Black": [
            "https://images.unsplash.com/photo-1614975058789-41316d0e2e9c?auto=format&fit=crop&w=1000&q=80",
            "https://images.unsplash.com/photo-1576871337622-98d48d1cf531?auto=format&fit=crop&w=1000&q=80",
        ],
    },
    "selvedge-denim-jacket": {
        "Navy": [
            "https://images.unsplash.com/photo-1576995853123-5a10305d93c0?auto=format&fit=crop&w=1000&q=80",
            "https://images.unsplash.com/photo-1551028719-00167b16eac5?auto=format&fit=crop&w=1000&q=80",
        ],
        "Stone": [
            "https://images.unsplash.com/photo-1548883354-7622d03aca27?auto=format&fit=crop&w=1000&q=80",
            "https://images.unsplash.com/photo-1576995853123-5a10305d93c0?auto=format&fit=crop&w=1000&q=80",
        ],
    },
    "wool-blend-overcoat": {
        "Black": [
            "https://images.unsplash.com/photo-1544923246-77307dd654cb?auto=format&fit=crop&w=1000&q=80",
            "https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?auto=format&fit=crop&w=1000&q=80",
        ],
        "Olive": [
            "https://images.unsplash.com/photo-1512436991641-6745cdb1723f?auto=format&fit=crop&w=1000&q=80",
            "https://images.unsplash.com/photo-1544923246-77307dd654cb?auto=format&fit=crop&w=1000&q=80",
        ],
    },
    "straight-leg-trouser": {
        "Black": [
            "https://images.unsplash.com/photo-1624378439575-d8705ad7ae80?auto=format&fit=crop&w=1000&q=80",
            "https://images.unsplash.com/photo-1506629082955-511b1aa562c8?auto=format&fit=crop&w=1000&q=80",
        ],
        "Stone": [
            "https://images.unsplash.com/photo-1479064555552-3ef4979f8908?auto=format&fit=crop&w=1000&q=80",
            "https://images.unsplash.com/photo-1624378439575-d8705ad7ae80?auto=format&fit=crop&w=1000&q=80",
        ],
    },
    "boxy-oxford-shirt": {
        "White": [
            "https://images.unsplash.com/photo-1596755094514-f87e34085b2c?auto=format&fit=crop&w=1000&q=80",
            "https://images.unsplash.com/photo-1602810318383-e386cc2a3ccf?auto=format&fit=crop&w=1000&q=80",
        ],
        "Black": [
            "https://images.unsplash.com/photo-1603252109303-2751441dd157?auto=format&fit=crop&w=1000&q=80",
            "https://images.unsplash.com/photo-1596755094514-f87e34085b2c?auto=format&fit=crop&w=1000&q=80",
        ],
    },
    "silk-slip-dress": {
        "Black": [
            "https://images.unsplash.com/photo-1595777457583-95e059d581b8?auto=format&fit=crop&w=1000&q=80",
            "https://images.unsplash.com/photo-1568252542512-9fe8fe9c87bb?auto=format&fit=crop&w=1000&q=80",
        ],
        "Stone": [
            "https://images.unsplash.com/photo-1572804013309-59a88b7e92f1?auto=format&fit=crop&w=1000&q=80",
            "https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?auto=format&fit=crop&w=1000&q=80",
        ],
        "Bordeaux": [
            "https://images.unsplash.com/photo-1566174053879-31528523f8ae?auto=format&fit=crop&w=1000&q=80",
            "https://images.unsplash.com/photo-1515372039744-b8f02a3ae446?auto=format&fit=crop&w=1000&q=80",
        ],
    },
    "ribbed-knit-midi-dress": {
        "Olive": [
            "https://images.unsplash.com/photo-1539109136881-3be0616acf4b?auto=format&fit=crop&w=1000&q=80",
            "https://images.unsplash.com/photo-1550614000-4895a10e1bfd?auto=format&fit=crop&w=1000&q=80",
        ],
        "Stone": [
            "https://images.unsplash.com/photo-1502716119720-b23a93e5fe1b?auto=format&fit=crop&w=1000&q=80",
            "https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&w=1000&q=80",
        ],
        "Black": [
            "https://images.unsplash.com/photo-1509631179647-0177331693ae?auto=format&fit=crop&w=1000&q=80",
            "https://images.unsplash.com/photo-1529139574466-a303027c1d8b?auto=format&fit=crop&w=1000&q=80",
        ],
    },
    "tiered-linen-maxi-dress": {
        "White": [
            "https://images.unsplash.com/photo-1515372039744-b8f02a3ae446?auto=format&fit=crop&w=1000&q=80",
            "https://images.unsplash.com/photo-1572804013309-59a88b7e92f1?auto=format&fit=crop&w=1000&q=80",
        ],
        "Stone": [
            "https://images.unsplash.com/photo-1496747611176-843222e1e57c?auto=format&fit=crop&w=1000&q=80",
            "https://images.unsplash.com/photo-1490481651871-ab68de25d43d?auto=format&fit=crop&w=1000&q=80",
        ],
        "Bordeaux": [
            "https://images.unsplash.com/photo-1566174053879-31528523f8ae?auto=format&fit=crop&w=1000&q=80",
            "https://images.unsplash.com/photo-1585487000160-6ebcfceb0d03?auto=format&fit=crop&w=1000&q=80",
        ],
    },
    "sculpted-column-dress": {
        "Black": [
            "https://images.unsplash.com/photo-1583496661160-fb5886a0aaaa?auto=format&fit=crop&w=1000&q=80",
            "https://images.unsplash.com/photo-1568252542512-9fe8fe9c87bb?auto=format&fit=crop&w=1000&q=80",
        ],
        "Navy": [
            "https://images.unsplash.com/photo-1572804013309-59a88b7e92f1?auto=format&fit=crop&w=1000&q=80",
            "https://images.unsplash.com/photo-1595777457583-95e059d581b8?auto=format&fit=crop&w=1000&q=80",
        ],
        "Stone": [
            "https://images.unsplash.com/photo-1502716119720-b23a93e5fe1b?auto=format&fit=crop&w=1000&q=80",
            "https://images.unsplash.com/photo-1496747611176-843222e1e57c?auto=format&fit=crop&w=1000&q=80",
        ],
    },
    "high-rise-cropped-jean": {
        "Stone": [
            "https://images.unsplash.com/photo-1541099649105-f69ad21f3246?auto=format&fit=crop&w=1000&q=80",
            "https://images.unsplash.com/photo-1582418702059-97ebafb35d09?auto=format&fit=crop&w=1000&q=80",
        ],
        "Navy": [
            "https://images.unsplash.com/photo-1584370848010-d7fe6bc767ec?auto=format&fit=crop&w=1000&q=80",
            "https://images.unsplash.com/photo-1541099649105-f69ad21f3246?auto=format&fit=crop&w=1000&q=80",
        ],
    },
    "cable-knit-cardigan": {
        "Stone": [
            "https://images.unsplash.com/photo-1434389677669-e08b4cac3105?auto=format&fit=crop&w=1000&q=80",
            "https://images.unsplash.com/photo-1576566588028-4147f3842f27?auto=format&fit=crop&w=1000&q=80",
        ],
        "Olive": [
            "https://images.unsplash.com/photo-1608234808654-2a8875fa7665?auto=format&fit=crop&w=1000&q=80",
            "https://images.unsplash.com/photo-1434389677669-e08b4cac3105?auto=format&fit=crop&w=1000&q=80",
        ],
        "Black": [
            "https://images.unsplash.com/photo-1583743814966-8936f5b7be1a?auto=format&fit=crop&w=1000&q=80",
            "https://images.unsplash.com/photo-1576566588028-4147f3842f27?auto=format&fit=crop&w=1000&q=80",
        ],
    },
    "tailored-blazer": {
        "Black": [
            "https://images.unsplash.com/photo-1584273143981-41c073dfe8f8?auto=format&fit=crop&w=1000&q=80",
            "https://images.unsplash.com/photo-1591047139829-d91aecb6caea?auto=format&fit=crop&w=1000&q=80",
        ],
        "Stone": [
            "https://images.unsplash.com/photo-1591047139829-d91aecb6caea?auto=format&fit=crop&w=1000&q=80",
            "https://images.unsplash.com/photo-1584273143981-41c073dfe8f8?auto=format&fit=crop&w=1000&q=80",
        ],
    },
    "poplin-blouse": {
        "White": [
            "https://images.unsplash.com/photo-1604176354204-9268737828e4?auto=format&fit=crop&w=1000&q=80",
            "https://images.unsplash.com/photo-1598554747436-c9293d6a588f?auto=format&fit=crop&w=1000&q=80",
        ],
        "Stone": [
            "https://images.unsplash.com/photo-1598554747436-c9293d6a588f?auto=format&fit=crop&w=1000&q=80",
            "https://images.unsplash.com/photo-1604176354204-9268737828e4?auto=format&fit=crop&w=1000&q=80",
        ],
    },
}

COLORS = [
    (1, "Black", "#181715"),
    (2, "White", "#efede7"),
    (3, "Stone", "#c7bda9"),
    (4, "Olive", "#5f5c49"),
    (5, "Navy", "#2b3248"),
    (6, "Bordeaux", "#5d2a30"),
]

SIZES = [
    (1, "XS", 1),
    (2, "S", 2),
    (3, "M", 3),
    (4, "L", 4),
    (5, "XL", 5),
    (6, "XXL", 6),
]

CATEGORIES = [
    (1, "Men", "men", None),
    (2, "Women", "women", None),
    (3, "Tops", "men-tops", 1),
    (4, "Outerwear", "men-outerwear", 1),
    (5, "Trousers", "men-trousers", 1),
    (6, "Tops", "women-tops", 2),
    (7, "Outerwear", "women-outerwear", 2),
    (8, "Dresses", "women-dresses", 2),
    (9, "Denim", "women-denim", 2),
]

SIZE_NAMES = [s[1] for s in SIZES]


def hash_string(s: str) -> int:
    h = 5381
    for ch in s:
        h = ((h * 33) ^ ord(ch)) & 0xFFFFFFFF
    return h


def stock_for(seed: int) -> list[tuple[str, int]]:
    h = hash_string(str(seed))
    base = [3, 8, 12, 22, 15, 6]
    return [(SIZE_NAMES[i], max(0, base[(i + h) % 6] + ((h >> i) % 5) - 2)) for i in range(6)]


PRODUCTS = [
    {
        "slug": "essential-oversized-tee",
        "name": "Essential Oversized Tee",
        "tagline": "Heavyweight cotton, dropped shoulders, a shape that ages well.",
        "description": "A 260gsm combed-cotton tee cut long and loose. Reinforced collar, side-seamed, garment-washed for softness from the first wear.",
        "care": "Machine wash cold. Dry flat. Do not bleach.",
        "fit": "Relaxed — designed to be worn true to size for a slouch, or one down for a cleaner line.",
        "base_price": "45.00",
        "category": 3,
        "is_featured": True,
        "days_ago": 40,
        "color_stock": {"Black": stock_for(101), "White": stock_for(102), "Stone": stock_for(103)},
    },
    {
        "slug": "relaxed-linen-shirt",
        "name": "Relaxed Linen Shirt",
        "tagline": "Washer-soft European linen with a lived-in drape.",
        "description": "Mid-weight washed linen with a natural crease it keeps on purpose. Mother-of-pearl buttons, curved hem, single chest pocket.",
        "care": "Machine wash gentle. Hang dry.",
        "fit": "Relaxed through the body; sizes down for a tailored look.",
        "base_price": "95.00",
        "category": 3,
        "is_new": True,
        "days_ago": 24,
        "color_stock": {"White": stock_for(111), "Stone": stock_for(112), "Olive": stock_for(113)},
    },
    {
        "slug": "merino-crewneck",
        "name": "Merino Crewneck",
        "tagline": "Fine-gauge merino that layers under anything.",
        "description": "17.5-micron merino knitted at a 12-gauge, fully fashioned. Ribbed trim that keeps its shape, and a hand that feels like nothing else against the skin.",
        "care": "Hand wash cold, dry flat. Or dry clean.",
        "fit": "Regular fit with clean shoulders.",
        "base_price": "120.00",
        "category": 3,
        "is_featured": True,
        "days_ago": 60,
        "color_stock": {"Navy": stock_for(121), "Stone": stock_for(122), "Black": stock_for(123)},
    },
    {
        "slug": "selvedge-denim-jacket",
        "name": "Selvedge Denim Jacket",
        "tagline": "Raw selvedge that breaks in like a second skin.",
        "description": "14oz North-Carolina selvedge denim, boxy cut, chain-stitched hems. Buy it stiff and watch it shape to you over a year of wear.",
        "care": "Wash rarely and cold. Air dry.",
        "fit": "Boxy, cropped at the waist.",
        "base_price": "195.00",
        "sale_price": "155.00",
        "category": 4,
        "days_ago": 80,
        "color_stock": {"Navy": stock_for(131), "Stone": stock_for(132)},
    },
    {
        "slug": "wool-blend-overcoat",
        "name": "Wool Blend Overcoat",
        "tagline": "The coat you will reach for every day of winter.",
        "description": "A 78% wool, 22% cashmere blend, cut with a soft shoulder and enough room for a knit or blazer beneath. Milled in Prato, finished by hand.",
        "care": "Dry clean only.",
        "fit": "Relaxed, slightly oversized through the body.",
        "base_price": "480.00",
        "category": 4,
        "is_featured": True,
        "is_new": True,
        "days_ago": 15,
        "color_stock": {"Black": stock_for(141), "Olive": stock_for(142)},
    },
    {
        "slug": "straight-leg-trouser",
        "name": "Straight-Leg Trouser",
        "tagline": "A clean trouser with a tailored hold.",
        "description": "Wool-linen twill with a flat front, hidden hook closure and a straight leg from hip to hem. Sits at the true waist.",
        "care": "Dry clean or hand wash.",
        "fit": "True waist, straight fit, full length.",
        "base_price": "110.00",
        "category": 5,
        "days_ago": 45,
        "color_stock": {"Black": stock_for(151), "Stone": stock_for(152)},
    },
    {
        "slug": "boxy-oxford-shirt",
        "name": "Boxy Oxford Shirt",
        "tagline": "The classic oxford, cut with intent.",
        "description": "Heavy 3-ply oxford in a boxy cut with a button-down collar and corozo buttons. Pre-shrunk so the fit stays put.",
        "care": "Machine wash warm. Tumble dry low.",
        "fit": "Boxy in the chest, straight through the hem.",
        "base_price": "105.00",
        "category": 3,
        "days_ago": 50,
        "color_stock": {"White": stock_for(161), "Black": stock_for(162)},
    },
    {
        "slug": "silk-slip-dress",
        "name": "Silk Slip Dress",
        "tagline": "Bias-cut 22-momme silk that moves like liquid.",
        "description": "A bias-cut slip in 22-momme sandwashed silk. Adjustable straps, a slit that stops just above the knee, and a weight that hangs beautifully.",
        "care": "Hand wash cold or dry clean.",
        "fit": "Bias cut — skims, never clings.",
        "base_price": "185.00",
        "category": 8,
        "is_featured": True,
        "is_new": True,
        "days_ago": 20,
        "color_stock": {"Black": stock_for(171), "Stone": stock_for(172), "Bordeaux": stock_for(173)},
    },
    {
        "slug": "high-rise-cropped-jean",
        "name": "High-Rise Cropped Jean",
        "tagline": "A hard-wearing jean with a 90s silhouette.",
        "description": "14oz rigid denim, high rise, straight through the hip and cropped at the ankle. Sits where jeans should: high, and proud.",
        "care": "Wash cold, hang dry.",
        "fit": "High rise, cropped at ankle.",
        "base_price": "145.00",
        "sale_price": "118.00",
        "category": 9,
        "days_ago": 70,
        "color_stock": {"Stone": stock_for(181), "Navy": stock_for(182)},
    },
    {
        "slug": "cable-knit-cardigan",
        "name": "Cable Knit Cardigan",
        "tagline": "A chunky knit the colour of a winter afternoon.",
        "description": "Wool-and-mohair blend, chunky cable knit, horn buttons down the front. Shrunken, washed and dried to lock the texture.",
        "care": "Hand wash cold, dry flat.",
        "fit": "Oversized and slouchy by design.",
        "base_price": "135.00",
        "category": 6,
        "is_featured": True,
        "is_new": True,
        "days_ago": 10,
        "color_stock": {"Stone": stock_for(191), "Olive": stock_for(192), "Black": stock_for(193)},
    },
    {
        "slug": "tailored-blazer",
        "name": "Tailored Double-Breasted Blazer",
        "tagline": "Structured shoulders, a waist that doesn't disappear.",
        "description": "Wool-blend twill with a soft-structured shoulder, double-breasted closure and a hint of peplum at the waist.",
        "care": "Dry clean only.",
        "fit": "Fitted through the waist, hits below the hip.",
        "base_price": "320.00",
        "category": 7,
        "is_new": True,
        "days_ago": 12,
        "color_stock": {"Black": stock_for(201), "Stone": stock_for(202)},
    },
    {
        "slug": "poplin-blouse",
        "name": "Structured Poplin Blouse",
        "tagline": "Crisp cotton poplin with second-skin sleeves.",
        "description": "High-twist cotton poplin, shaping darts at the waist and a French cuff. Crisp where it should be, soft where it counts.",
        "care": "Machine wash cold. Iron on low.",
        "fit": "Fitted bodice, slightly cropped.",
        "base_price": "85.00",
        "category": 6,
        "is_new": True,
        "days_ago": 18,
        "color_stock": {"White": stock_for(211), "Stone": stock_for(212)},
    },
    {
        "slug": "ribbed-knit-midi-dress",
        "name": "Ribbed Knit Midi Dress",
        "tagline": "Form-fitting ribbed merino that hugs and moves.",
        "description": "Spun from ultra-fine Australian merino wool with a body-skimming rib construction. High neckline, slight slit at the left calf, and rich texture from collar to hem.",
        "care": "Hand wash cold. Dry flat.",
        "fit": "Close fit with plenty of natural stretch.",
        "base_price": "165.00",
        "category": 8,
        "is_featured": True,
        "is_new": True,
        "days_ago": 8,
        "color_stock": {"Olive": stock_for(221), "Stone": stock_for(222), "Black": stock_for(223)},
    },
    {
        "slug": "tiered-linen-maxi-dress",
        "name": "Tiered Linen Maxi Dress",
        "tagline": "Breezy washed European linen with delicate tiers.",
        "description": "Airy 100% Normandy linen gathered in three gentle tiers. Features discreet side pockets, a soft scoop neck, and a billowing drape perfect for warmer days or layered with knitwear.",
        "care": "Machine wash cold gentle. Line dry.",
        "fit": "Flowy, relaxed silhouette.",
        "base_price": "195.00",
        "sale_price": "155.00",
        "category": 8,
        "is_new": True,
        "days_ago": 5,
        "color_stock": {"White": stock_for(231), "Stone": stock_for(232), "Bordeaux": stock_for(233)},
    },
    {
        "slug": "sculpted-column-dress",
        "name": "Sculpted Column Dress",
        "tagline": "Architectural silhouette in heavyweight matte crepe.",
        "description": "Cut from Japanese bonded matte crepe that holds an intentional straight line without clinging. Clean square neckline and invisible back closure.",
        "care": "Dry clean only.",
        "fit": "Straight column fit, true to size.",
        "base_price": "220.00",
        "category": 8,
        "is_featured": True,
        "is_new": True,
        "days_ago": 3,
        "color_stock": {"Black": stock_for(241), "Navy": stock_for(242), "Stone": stock_for(243)},
    },
]

USERS = [
    {
        "email": "admin@studio.test",
        "password": "admin12345",
        "first_name": "Studio",
        "last_name": "Admin",
        "role": "admin",
        "is_staff": True,
        "email_verified": True,
        "days_ago": 400,
        "addresses": [],
    },
    {
        "email": "elena@example.com",
        "password": "password123",
        "first_name": "Elena",
        "last_name": "Marino",
        "role": "customer",
        "email_verified": True,
        "days_ago": 210,
        "addresses": [
            {
                "label": "Home",
                "recipient": "Elena Marino",
                "line1": "412 Amsterdam Ave",
                "line2": "Apt 4B",
                "city": "New York",
                "state": "NY",
                "postal_code": "10024",
                "country": "US",
                "phone": "+1 212 555 0184",
                "is_default": True,
            }
        ],
    },
    {
        "email": "jonas@example.com",
        "password": "password123",
        "first_name": "Jonas",
        "last_name": "Ferreira",
        "role": "customer",
        "email_verified": True,
        "days_ago": 150,
        "addresses": [
            {
                "label": "Home",
                "recipient": "Jonas Ferreira",
                "line1": "88 Chaussee d'Antin",
                "line2": "",
                "city": "Paris",
                "state": "",
                "postal_code": "75009",
                "country": "FR",
                "phone": "+33 1 42 66 00 89",
                "is_default": True,
            }
        ],
    },
    {
        "email": "sasha@example.com",
        "password": "password123",
        "first_name": "Sasha",
        "last_name": "Kim",
        "role": "customer",
        "email_verified": True,
        "days_ago": 90,
        "addresses": [],
    },
]

ORDERS = [
    {
        "id": 1,
        "user": "elena@example.com",
        "customer_name": "Elena Marino",
        "status": "delivered",
        "days_ago": 52,
        "items": [
            {"product": 1, "color": "Black", "size": "M", "qty": 1},
            {"product": 6, "color": "Stone", "size": "S", "qty": 1},
        ],
    },
    {
        "id": 2,
        "user": "elena@example.com",
        "customer_name": "Elena Marino",
        "status": "delivered",
        "days_ago": 30,
        "items": [{"product": 8, "color": "Bordeaux", "size": "S", "qty": 1}],
    },
    {
        "id": 3,
        "user": "jonas@example.com",
        "customer_name": "Jonas Ferreira",
        "status": "shipped",
        "days_ago": 12,
        "items": [
            {"product": 5, "color": "Black", "size": "L", "qty": 1},
            {"product": 12, "color": "White", "size": "M", "qty": 1},
        ],
    },
    {
        "id": 4,
        "user": None,
        "customer_name": "Guest Customer",
        "status": "delivered",
        "days_ago": 35,
        "items": [{"product": 3, "color": "Navy", "size": "M", "qty": 2}],
    },
    {
        "id": 5,
        "user": "jonas@example.com",
        "customer_name": "Jonas Ferreira",
        "status": "paid",
        "days_ago": 2,
        "items": [
            {"product": 10, "color": "Olive", "size": "M", "qty": 1},
            {"product": 11, "color": "Black", "size": "S", "qty": 1},
        ],
    },
    {
        "id": 6,
        "user": "elena@example.com",
        "customer_name": "Elena Marino",
        "status": "pending",
        "days_ago": 0,
        "items": [{"product": 4, "color": "Navy", "size": "M", "qty": 1}],
    },
]

REVIEWS = [
    {
        "product": 1,
        "user_name": "Elena M.",
        "rating": 5,
        "comment": "Perfect weight. Washed it six times and it hasn't changed shape once.",
        "status": "approved",
        "days_ago": 20,
    },
    {
        "product": 5,
        "user_name": "Jonas F.",
        "rating": 5,
        "comment": "Feels like twice the price. The drape is unreal in person.",
        "status": "approved",
        "days_ago": 16,
    },
    {
        "product": 8,
        "user_name": "Sasha K.",
        "rating": 4,
        "comment": "Beautiful colour and weight. Runs slightly large at the bust.",
        "status": "approved",
        "days_ago": 11,
    },
    {
        "product": 10,
        "user_name": "Maya R.",
        "rating": 5,
        "comment": "Warm in a way wool should be. The stone colour is impossible to photograph, better in person.",
        "status": "approved",
        "days_ago": 5,
    },
    {
        "product": 9,
        "user_name": "First Time Buyer",
        "rating": 3,
        "comment": "Stiff as promised - sizing runs small, size up a full size.",
        "status": "pending",
        "days_ago": 1,
    },
    {
        "product": 2,
        "user_name": "Anonymous",
        "rating": 2,
        "comment": "Collar is floppier than the photos suggest.",
        "status": "pending",
        "days_ago": 0.5,
    },
]

COUPONS = [
    ("WELCOME10", "percent", "10.00", "0.00", 1000, 214, None, True),
    ("TRUNK15", "fixed", "15.00", "150.00", 200, 37, None, True),
    ("ARCHIVE20", "percent", "20.00", "200.00", 100, 100, None, True),
]

NEWSLETTER = ["early@list.test", "field@notes.test"]


def iso(days_ago: float) -> "datetime":
    return timezone.now() - timedelta(days=days_ago)


class Command(BaseCommand):
    help = "Seeds colors, sizes, categories, products, users, orders, coupons, reviews and settings (mirrors frontend/src/mocks/seed.ts)."

    def handle(self, *args, **options):
        self._wipe()
        self._settings()
        self._lookups()
        self._users()
        products = self._products()
        self._orders(products)
        self._coupons()
        self._reviews()
        self._collections()
        self._outfits(products)
        self._newsletter()
        self.stdout.write(self.style.SUCCESS("Seed complete."))

    def _wipe(self):
        Orders: list[type] = [Order, OrderItem, Coupon, NewsletterSubscription]
        from apps.orders.models import Cart, CartItem, WishlistItem

        CartItem.objects.all().delete()
        Cart.objects.all().delete()
        WishlistItem.objects.all().delete()
        Review.objects.all().delete()
        for model in Orders:
            model.objects.all().delete()
        OutfitItem.objects.all().delete()
        Outfit.objects.all().delete()
        Collection.objects.all().delete()
        ProductImage.objects.all().delete()
        ProductVariant.objects.all().delete()
        Product.objects.all().delete()
        Category.objects.all().delete()
        Color.objects.all().delete()
        Size.objects.all().delete()

    def _settings(self):
        StoreSettings.objects.update_or_create(
            pk=1,
            defaults={
                "store_name": "Studio",
                "currency": "PHP",
                "tax_rate": Decimal("0.08"),
                "shipping_flat_rate": Decimal("12.00"),
                "free_shipping_threshold": Decimal("150.00"),
                "low_stock_threshold": 5,
            },
        )

    def _lookups(self):
        for pk, name, hex_value in COLORS:
            Color.objects.update_or_create(pk=pk, defaults={"name": name, "hex": hex_value})
        for pk, name, sort in SIZES:
            Size.objects.update_or_create(pk=pk, defaults={"name": name, "sort_order": sort})
        for pk, name, slug, parent_pk in CATEGORIES:
            parent = Category.objects.get(pk=parent_pk) if parent_pk else None
            Category.objects.update_or_create(pk=pk, defaults={"name": name, "slug": slug, "parent": parent})

    def _users(self):
        for spec in USERS:
            user, created = User.objects.update_or_create(
                email=spec["email"],
                defaults={
                    "first_name": spec["first_name"],
                    "last_name": spec["last_name"],
                    "role": spec.get("role", "customer"),
                    "is_staff": spec.get("is_staff", False),
                    "email_verified": spec["email_verified"],
                },
            )
            user.set_password(spec["password"])
            user.save()
            User.objects.filter(pk=user.pk).update(created_at=iso(spec["days_ago"]))
            user.addresses.all().delete()
            for a in spec["addresses"]:
                user.addresses.create(**a)

    def _products(self):
        products_by_id: dict[int, Product] = {}
        variant_pk = 0
        for idx, spec in enumerate(PRODUCTS, start=1):
            product = Product.objects.create(
                pk=idx,
                name=spec["name"],
                slug=spec["slug"],
                tagline=spec["tagline"],
                description=spec["description"],
                care=spec["care"],
                fit=spec["fit"],
                base_price=Decimal(spec["base_price"]),
                sale_price=Decimal(spec["sale_price"]) if spec.get("sale_price") else None,
                category_id=spec["category"],
                is_featured=spec.get("is_featured", False),
                is_new=spec.get("is_new", False),
            )
            Product.objects.filter(pk=product.pk).update(created_at=iso(spec["days_ago"]))
            products_by_id[idx] = product

            colors_by_name = {}
            position = 0
            for color_name, size_stock in spec["color_stock"].items():
                color = Color.objects.get(name=color_name)
                colors_by_name[color_name] = color
                code = color_name[:3].upper()
                for size_name, stock in size_stock:
                    variant_pk = variant_pk + 1
                    ProductVariant.objects.create(
                        pk=variant_pk,
                        product=product,
                        sku=f"STU-{code}-{size_name}",
                        color=color,
                        size=Size.objects.get(name=size_name),
                        price_override=None,
                        stock=stock,
                    )
                photos = PRODUCT_IMAGE_MAP.get(spec["slug"], {}).get(color_name)
                for i in range(2):
                    if photos:
                        url = photos[i]
                    else:
                        from apps.common.money import placeholder_image

                        url = placeholder_image(spec["slug"], color.hex, position)
                    ProductImage.objects.create(
                        product=product,
                        image=url,
                        alt=f"{spec['slug']} in {color_name}" + ("", ", detail")[i == 1],
                        color=color,
                        position=position,
                    )
                    position += 1
        return products_by_id

    def _orders(self, products: dict[int, Product]):
        Product.objects.update(units_sold_baseline=0)
        baseline: dict[int, int] = {}
        for spec in ORDERS:
            user = User.objects.filter(email=spec["user"]).first() if spec["user"] else None
            shipping = {"recipient": "Guest Customer", "line1": "19 Motomachi", "line2": "", "city": "Naka-ku", "state": "", "postal_code": "231-0005", "country": "JP", "phone": "+1 212 555 0184"}
            if user and user.email == "elena@example.com":
                shipping = {"recipient": "Elena Marino", "line1": "412 Amsterdam Ave", "line2": "", "city": "New York", "state": "NY", "postal_code": "10024", "country": "US", "phone": "+1 212 555 0184"}

            created = iso(spec["days_ago"])
            pending_at = iso(spec["days_ago"] + 0.1)
            paid_at = iso(spec["days_ago"] + 0.05)
            timeline = [
                {"status": "pending", "at": pending_at.isoformat(), "note": None},
                {"status": "paid", "at": paid_at.isoformat(), "note": "Payment confirmed"},
            ]
            if spec["status"] in ("shipped", "delivered"):
                timeline.append({"status": "processing", "at": iso(spec["days_ago"] - 1).isoformat(), "note": None})
            if spec["status"] in ("shipped", "delivered"):
                timeline.append({"status": "shipped", "at": iso(spec["days_ago"] - 3).isoformat(), "note": None})
            if spec["status"] == "delivered":
                timeline.append({"status": "delivered", "at": iso(spec["days_ago"] - 6).isoformat(), "note": "Left at door"})

            items = []
            subtotal = Decimal("0.00")
            for it in spec["items"]:
                product = products[it["product"]]
                variant = product.variants.get(color__name=it["color"], size__name=it["size"])
                price = variant.price_override or product.sale_price or product.base_price
                image = product.images.filter(color=variant.color).first() or product.images.first()
                items.append(
                    {
                        "product": product,
                        "variant": variant,
                        "price": price,
                        "qty": it["qty"],
                        "image": image.image if image else "",
                        "placeholder": {
                            "product_name": product.name,
                            "sku": variant.sku,
                            "color_name": it["color"],
                            "size_name": it["size"],
                            "unit_price": price,
                            "quantity": it["qty"],
                        },
                    }
                )
                subtotal += price * it["qty"]
                baseline[it["product"]] = baseline.get(it["product"], 0) + it["qty"]

            shipping_c = 0 if subtotal >= Decimal("150.00") else Decimal("1200.00") / 100
            tax_c = round((subtotal + shipping_c) * Decimal("0.08"))
            total = subtotal + shipping_c + tax_c
            status = spec["status"]
            order = Order.objects.create(
                order_number=f"ST-{1000 + spec['id'] * 17}",
                user=user,
                customer_email=user.email if user else "guest@example.com",
                customer_name="Jonas Ferreira" if (user and user.email == "jonas@example.com") else (spec["customer_name"] if user else "Guest Customer"),
                status=status,
                subtotal=subtotal,
                shipping=shipping_c,
                discount=Decimal("0.00"),
                tax=tax_c,
                total=total,
                shipping_address=shipping,
                billing_address=shipping,
                billing_same_as_shipping=True,
                shipping_method="standard",
                payment_method="PM Card",
                tracking_number=f"PM{70000000000 + spec['id'] * 31}" if status in ("shipped", "delivered") else None,
                carrier="DHL Express" if status in ("shipped", "delivered") else None,
                timeline=timeline,
            )
            Order.objects.filter(pk=order.pk).update(created_at=created)
            for pos, i in enumerate(items, start=1):
                OrderItem.objects.create(
                    order=order,
                    product=i["product"],
                    product_name=i["placeholder"]["product_name"],
                    sku=i["placeholder"]["sku"],
                    color_name=i["placeholder"]["color_name"],
                    size_name=i["placeholder"]["size_name"],
                    unit_price=i["price"],
                    quantity=i["qty"],
                    image=i["image"],
                )
        for product_id, qty in baseline.items():
            Product.objects.filter(pk=product_id).update(units_sold_baseline=qty)

    def _coupons(self):
        for code, ctype, value, min_order, max_uses, uses, expires_at, active in COUPONS:
            Coupon.objects.update_or_create(
                code=code,
                defaults={
                    "type": ctype,
                    "value": value,
                    "min_order_value": min_order,
                    "max_uses": max_uses,
                    "uses": uses,
                    "expires_at": expires_at,
                    "is_active": active,
                },
            )

    def _reviews(self):
        for spec in REVIEWS:
            review = Review.objects.create(
                product_id=spec["product"],
                user_name=spec["user_name"],
                rating=spec["rating"],
                comment=spec["comment"],
                status=spec["status"],
            )
            Review.objects.filter(pk=review.pk).update(created_at=iso(spec["days_ago"]))

    def _collections(self):
        coll = Collection.objects.create(
            name="Autumn Capsule 01",
            slug="autumn-capsule-01",
            tagline="Ten pieces, layered, non-seasonal.",
            description="Our first capsule: a considered edit of overcoats, knits and tailored shapes chosen to work on their own and together. Built around the wardrobes that don't change with the weather.",
            hero_image="https://images.unsplash.com/photo-1445205170230-053b83016050?auto=format&fit=crop&w=1600&q=80",
        )
        coll.products.set(Product.objects.filter(pk__in=[5, 3, 10, 6, 8, 11, 13, 14, 15]))

    def _newsletter(self):
        for email in NEWSLETTER:
            NewsletterSubscription.objects.get_or_create(email=email)

    def _outfits(self, products: dict[int, Product]):
        # 1. Weekend Neutrals
        o1 = Outfit.objects.create(
            name="Weekend Neutrals",
            slug="weekend-neutrals",
            description="A tonal silhouette designed for unhurried weekend mornings. Crisp linen relaxed over an essential heavyweight tee, grounded by tailored trousers.",
            cover_image="https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&w=1200&q=80",
            cover_image_alt="Model wearing Relaxed Linen Shirt and Trousers in tonal stone",
            status=Outfit.STATUS_PUBLISHED,
            is_featured=True,
            sort_order=1,
            bundle_discount_type=Outfit.DISCOUNT_PERCENT,
            bundle_discount_value=Decimal("15.00"),
            bundle_min_items=2,
        )
        OutfitItem.objects.create(
            outfit=o1,
            product=Product.objects.get(slug="relaxed-linen-shirt"),
            position=0,
            styling_note="Wear unbuttoned over the tee with sleeves rolled once.",
            is_featured_item=True,
        )
        OutfitItem.objects.create(
            outfit=o1,
            product=Product.objects.get(slug="essential-oversized-tee"),
            position=1,
            styling_note="Tucked cleanly at the front waist.",
            is_featured_item=False,
        )
        OutfitItem.objects.create(
            outfit=o1,
            product=Product.objects.get(slug="straight-leg-trouser"),
            position=2,
            styling_note="Tailored break sitting slightly above the ankle.",
            is_featured_item=False,
        )

        # 2. Atelier Monochrome
        o2 = Outfit.objects.create(
            name="Atelier Monochrome",
            slug="atelier-monochrome",
            description="Refined proportions cut in charcoal and midnight. The soft-shouldered wool overcoat layers effortlessly across fine-gauge merino and structured trousers.",
            cover_image="https://images.unsplash.com/photo-1490481651871-ab68de25d43d?auto=format&fit=crop&w=1200&q=80",
            cover_image_alt="Atelier Monochrome styling with wool overcoat and merino knit",
            status=Outfit.STATUS_PUBLISHED,
            is_featured=True,
            sort_order=2,
            bundle_discount_type=Outfit.DISCOUNT_FIXED,
            bundle_discount_value=Decimal("500.00"),
            bundle_min_items=2,
        )
        OutfitItem.objects.create(
            outfit=o2,
            product=Product.objects.get(slug="wool-blend-overcoat"),
            position=0,
            styling_note="Statement outer piece; soft drape across shoulders.",
            is_featured_item=True,
        )
        OutfitItem.objects.create(
            outfit=o2,
            product=Product.objects.get(slug="merino-crewneck"),
            position=1,
            styling_note="Close-to-skin layer in ultra-fine 17.5 micron merino.",
            is_featured_item=False,
        )
        OutfitItem.objects.create(
            outfit=o2,
            product=Product.objects.get(slug="straight-leg-trouser"),
            position=2,
            styling_note="Flat front drape complementing the coat length.",
            is_featured_item=False,
        )

        # 3. Urban Minimalist
        o3 = Outfit.objects.create(
            name="Urban Minimalist",
            slug="urban-minimalist",
            description="Boxy 14oz selvedge denim paired with an oversized cotton foundation. Built for enduring city movements.",
            cover_image="https://images.unsplash.com/photo-1509631179647-0177331693ae?auto=format&fit=crop&w=1200&q=80",
            cover_image_alt="Urban Minimalist selvedge denim styling",
            status=Outfit.STATUS_PUBLISHED,
            is_featured=False,
            sort_order=3,
            bundle_discount_type=Outfit.DISCOUNT_PERCENT,
            bundle_discount_value=Decimal("10.00"),
            bundle_min_items=0,
        )
        OutfitItem.objects.create(
            outfit=o3,
            product=Product.objects.get(slug="selvedge-denim-jacket"),
            position=0,
            styling_note="Rigid raw selvedge; button middle two buttons only.",
            is_featured_item=True,
        )
        OutfitItem.objects.create(
            outfit=o3,
            product=Product.objects.get(slug="essential-oversized-tee"),
            position=1,
            styling_note="Contrasting white hem showing beneath the jacket.",
            is_featured_item=False,
        )

        # 4. Studio Casual Edit (Draft for testing unpublished security)
        o4 = Outfit.objects.create(
            name="Studio Casual Edit",
            slug="studio-casual-edit",
            description="An upcoming seasonal capsule pairing effortless shirting with lightweight layering.",
            cover_image="https://images.unsplash.com/photo-1485230895905-ec40ba36b9bc?auto=format&fit=crop&w=1200&q=80",
            cover_image_alt="Studio Casual Edit draft shoot",
            status=Outfit.STATUS_DRAFT,
            is_featured=False,
            sort_order=4,
            bundle_discount_type=Outfit.DISCOUNT_NONE,
        )
        OutfitItem.objects.create(
            outfit=o4,
            product=Product.objects.get(slug="relaxed-linen-shirt"),
            position=0,
            styling_note="Lightweight linen for warmer climates.",
            is_featured_item=True,
        )
