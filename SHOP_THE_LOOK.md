# Studio — Shop the Look & Curated Outfit System

## 1. Feature Overview

**Shop the Look** is an editorial commerce feature designed for the Studio fashion platform (*Studio Atelier Manila*). It bridges high-fashion styling with friction-free e-commerce by allowing customers to:

1. **Discover complete outfits** curated by Studio stylists.
2. **Inspect styling notes & wear tips** for each coordinated garment.
3. **Select individual sizes and colorways** for every piece in the look.
4. **Benefit from coordinated bundle savings** when purchasing the full look or eligible combinations.
5. **Add the entire ensemble to their shopping bag with a single atomic click**.

---

## 2. Architecture & Design Principles

```
+-------------------------------------------------------------+
|                      STOREFRONT (React)                     |
|  /looks (Landing)           /looks/:slug (Editorial Detail)|
+------------------------------+------------------------------+
                               |
                               v
+-------------------------------------------------------------+
|                     API CLIENT / ROUTER                     |
|  GET /api/looks/               POST /api/looks/:slug/add/   |
+------------------------------+------------------------------+
                               |
                               v
+-------------------------------------------------------------+
|                 DJANGO BACKEND (Catalog App)                |
|  - Outfit & OutfitItem Models                               |
|  - Dynamic Bundle Pricing Engine                            |
|  - Atomic Cart Addition & Stock Verifier                    |
+------------------------------+------------------------------+
                               |
                               v
+-------------------------------------------------------------+
|                  EXISTING COMMERCE SYSTEMS                  |
|  - Orders & Cart Engine (Order, CartItem, Coupon)           |
|  - Phase 1: PayMongo & Mock Payment Providers               |
|  - Phase 2: Cloudinary Responsive Media Storage             |
+-------------------------------------------------------------+
```

### Critical Architecture Rules Followed:
- **Zero Model Duplication**: Reuses existing `Product`, `ProductVariant`, `Cart`, `CartItem`, and `Coupon` models. No separate checkout or cart system was created.
- **Atomic Operations**: Adding an outfit to the cart is 100% atomic. If any item is out of stock, no items are added and an exact error response is returned.
- **Provider Agnostic**: Fully compatible with Phase 1 payment gateways (PayMongo & Mock adapter) and Phase 2 media systems (Cloudinary & Local media).
- **100% Mock Mode Compatible**: Fully mirrored in `frontend/src/mocks/` with localStorage persistence and zero external API dependencies when `VITE_USE_MOCKS=true`.

---

## 3. Data Models

### `Outfit` (`apps.catalog.models.Outfit`)
Represents an editorial ensemble or coordinated look:

| Field | Type | Description |
|---|---|---|
| `name` | CharField(160) | Name of the look (e.g., "Weekend Neutrals") |
| `slug` | SlugField(180, unique=True) | URL identifier (`/looks/<slug>`) |
| `description` | TextField | Styling narrative and seasonal aesthetic notes |
| `cover_image` | CharField(500) | Primary portrait image (Cloudinary or CDN URL) |
| `cover_image_alt` | CharField(200) | Accessibility alt text |
| `hero_image` | CharField(500) | Optional widescreen editorial banner |
| `gallery_images` | JSONField(list) | Secondary angles, close-ups, and detail shots |
| `status` | CharField | `draft`, `published`, or `archived` |
| `is_featured` | BooleanField | Flag for hero spotlight on the landing page |
| `sort_order` | IntegerField | Display ordering in lookbooks |
| `bundle_discount_type` | CharField | `none`, `percent`, or `fixed` |
| `bundle_discount_value` | DecimalField(8,2) | Discount percentage (e.g. `15.00`) or amount |
| `bundle_min_items` | PositiveIntegerField | Minimum pieces required for bundle discount (default: `2`) |
| `created_at` / `updated_at` | DateTimeField | Timestamps |

### `OutfitItem` (`apps.catalog.models.OutfitItem`)
Associates a catalog product with an outfit:

| Field | Type | Description |
|---|---|---|
| `outfit` | ForeignKey(Outfit) | Parent outfit |
| `product` | ForeignKey(Product) | Linked catalog product |
| `position` | PositiveIntegerField | Display order within the outfit (1, 2, 3...) |
| `styling_note` | CharField(255) | Stylist advice (e.g., "Front-tuck loosely into trousers") |
| `is_featured_item` | BooleanField | Highlights the signature or anchor piece |

*Constraint*: `UniqueConstraint(fields=["outfit", "product"])` prevents duplicate garments in one outfit.

---

## 4. Storefront User Experience

### 1. Shop the Look Landing Page (`/looks`)
- **Hero Spotlight**: Large format editorial showcase highlighting current featured looks.
- **Filter Tabs**: Toggle between "All Outfits" and "Featured Edits".
- **Look Cards**:
  - Portrait photography with subtle hover zoom.
  - Garment count pill (e.g., "3 garments").
  - Bundle promotion badge (e.g., "15% Bundle Discount").
  - Full look estimated price.

### 2. Outfit Detail Page (`/looks/:slug`)
- **Split Editorial Layout**:
  - **Left Gallery**: High-resolution photography with main cover viewer and thumbnail switcher.
  - **Stylist Notes Card**: Editorial concept, fabric notes, and mood guidance.
  - **Garment Selector**:
    - Checkbox to include/exclude individual pieces from the bundle.
    - Colorway swatches.
    - Size selection pills with dynamic stock indicators (e.g., "Only 2 left" or "Out of Stock").
    - Individual garment styling note and "Signature Garment" badge.
- **Dynamic Bundle Pricing Summary**:
  - Live calculated subtotal based on active selections.
  - Instant bundle discount calculation when `min_items` threshold is met.
  - Clear savings pill (e.g., "Bundle savings: -₱1,250.00").
- **Atomic "Add Entire Look to Bag" Action**:
  - Button dynamically indicates count: *"Add 3 Pieces to Bag — ₱7,490.00"*.
  - Immediately synchronizes with cart drawer and header bag counter.

---

## 5. API Reference

### Public Endpoints

#### `GET /api/looks/` (or `/api/outfits/`)
Returns a list of published outfits.
- **Query Parameters**:
  - `featured=true`: Filter only featured outfits.
- **Response**: Array of `OutfitSummary` objects.

#### `GET /api/looks/<slug>/`
Returns detailed outfit information including all curated garments and variants.
- **Permissions**: Public for `status="published"`. Drafts require staff authentication.
- **Response**: `OutfitDetail` object.

#### `POST /api/looks/<slug>/add-to-cart/`
Atomically adds selected garments and chosen variants to the customer's cart.
- **Request Body**:
  ```json
  {
    "items": [
      { "product_id": 1, "variant_id": 4, "quantity": 1 },
      { "product_id": 2, "variant_id": 9, "quantity": 1 }
    ]
  }
  ```
- **Success Response (200 OK)**:
  ```json
  {
    "cart": { "id": 1, "items": [...], "subtotal": "7490.00" },
    "items_added": 2,
    "bundle_applied": true,
    "bundle_discount": "1123.50",
    "bundle_coupon_code": "BUNDLE-WEEKEND-NEUTRALS",
    "savings_label": "Bundle discount (15% off 2+ items): -₱1,123.50",
    "message": "2 items from \"Weekend Neutrals\" added to your bag."
  }
  ```
- **Error Responses**:
  - `400 Bad Request` if a variant has insufficient stock (`{"error": "...", "unavailable_variant_id": 4}`).
  - `400 Bad Request` if a submitted product is not part of the outfit.

---

## 6. Seeded Outfits

The catalog includes 4 curated outfits ready for immediate demonstration:

1. **Weekend Neutrals** (`weekend-neutrals`):
   - Relaxed Linen Shirt + Pleated Linen Shorts + Canvas Tote.
   - Bundle Rule: 15% off when purchasing 2+ items.
2. **Atelier Monochrome** (`atelier-monochrome`):
   - Tailored Oversized Blazer + Silk Slip Dress.
   - Bundle Rule: 10% off when purchasing 2+ items.
3. **Urban Minimalist** (`urban-minimalist`):
   - Cropped Boxy Tee + Wide-Leg Cotton Trousers + Leather Crossbody.
   - Bundle Rule: 15% off when purchasing 3 items.
4. **Studio Casual Edit** (`studio-casual-edit`):
   - Everyday Poplin Shirt + Pleated Linen Shorts.
   - Bundle Rule: Fixed ₱500 off when purchasing 2 items.
