# Studio Media Storage Architecture

This document explains how Studio stores, validates, optimizes, and manages product imagery across Cloudinary, local development storage, and frontend mock mode.

---

## 1. Storage Provider Abstraction

Media operations are isolated behind `apps/catalog/media_storage/` so the application runs seamlessly in all environments without coupling core catalog logic to external cloud infrastructure:

| Mode | Configuration | Where Files Live | Use Case |
| :--- | :--- | :--- | :--- |
| **Cloudinary** | `MEDIA_STORAGE_PROVIDER=cloudinary` | Cloudinary CDN (`studio/products/product-<id>/...`) | Staging & Production |
| **Local Dev** | `MEDIA_STORAGE_PROVIDER=local` | Django `MEDIA_ROOT/products/product-<id>/...` (proxied at `/media/`) | Local backend development without Cloudinary credentials |
| **Frontend Mock** | `VITE_USE_MOCKS=true` | Browser `localStorage` + object/placeholder URLs | Frontend-only demos without Django or Cloudinary |

### Module Layout

```text
backend/apps/catalog/media_storage/
├── __init__.py             # Public exports
├── base.py                 # UploadedAsset dataclass & BaseMediaProvider ABC
├── exceptions.py           # MediaError, MediaConfigurationError, MediaValidationError, MediaUploadError
├── validators.py           # Size limits, magic bytes, Pillow binary verification, dimension guards
├── cloudinary_provider.py  # Official Cloudinary Python SDK uploader, destroyer & transformation builder
├── local_provider.py       # Local filesystem provider with path-traversal protection
└── factory.py              # get_media_provider(), get_media_status(), build_product_image_urls()
```

---

## 2. Database Model (`ProductImage`)

`ProductImage` tracks both presentation metadata and cloud storage lifecycle identifiers:

* `product`: ForeignKey to `Product` (`CASCADE`)
* `image`: Primary delivery URL (`CharField(max_length=1000)`)
* `alt`: Descriptive alt text for accessibility & SEO
* `color`: Optional ForeignKey to `Color` (`SET_NULL`) — `null` = shared main gallery image; set = color-variant image
* `position`: Zero-indexed display ordering (`UniqueConstraint` on `(product, position)`)
* `is_primary`: Boolean indicating the product cover photo (at most one primary per product)
* `public_id`: Cloudinary `public_id` (or local relative path), indexed for reference lookups
* `storage_provider`: `"cloudinary"`, `"local"`, or `"external"`
* `width`, `height`, `format`, `bytes`: Verified asset dimensions and metadata (prevents layout shift / CLS)

---

## 3. Image Optimization & Responsive Delivery

For Cloudinary-backed assets, `ProductImageSerializer` generates optimized delivery URLs using the official Cloudinary SDK (`cloudinary.utils.cloudinary_url`) with automatic format selection (`f_auto`) and automatic quality compression (`q_auto`):

| Preset | Dimensions | Crop Mode | Usage |
| :--- | :--- | :--- | :--- |
| `thumbnail` | `320 × 400` | `fill`, `g_auto` | Cart drawer, checkout summary, search overlay, mobile gallery thumbs |
| `card` | `640 × 800` | `fill`, `g_auto` | Storefront product cards, category grids, admin product grid |
| `mobile` | `750 × 938` | `limit` | Mobile product detail carousel |
| `detail` | `1200 × 1500` | `limit` | Desktop product detail editorial stack |
| `large` | `1800 × 2250` | `limit` | High-DPI displays & zoom views |
| `admin_preview` | `240 × 300` | `fill`, `g_auto` | Admin gallery editor thumbnails |

The frontend (`frontend/src/lib/images.ts`) emits responsive `srcSet` and `sizes` attributes for Cloudinary images, applies `loading="lazy"` on non-critical images (`eager` on the first PDP hero shot), and preserves `aspect-[4/5]` containers to eliminate Cumulative Layout Shift (CLS).

---

## 4. Storage Cleanup & Orphan Prevention

* **Reference-Safe Deletion**: Before deleting a Cloudinary `public_id`, the backend queries `ProductImage.objects.filter(public_id=public_id)` to verify no other product or image row references the asset.
* **Safe Replacement Order**: When replacing an image (`PATCH /api/admin/products/<id>/images/<img_id>/`), the new asset is uploaded first, the database row is updated inside an atomic transaction, and the old asset is deleted **only after** the database commit succeeds.
* **Database Failure Rollback**: If a database error occurs after a Cloudinary upload succeeds, the backend catches the exception and deletes the newly uploaded `public_id` so orphaned files are not abandoned.
* **Folder Containment**: `CloudinaryMediaProvider.delete_image()` refuses to delete any `public_id` outside the configured `CLOUDINARY_UPLOAD_FOLDER` prefix, preventing accidental deletion of unrelated Cloudinary assets.
* **Identifying & Cleaning Up Orphans**: If a transient network error occurs during a Cloudinary delete call, the deletion failure is logged without corrupting the database. Operators can reconcile orphans by listing assets under `CLOUDINARY_UPLOAD_FOLDER` via the Cloudinary Admin API (`cloudinary.api.resources(prefix="studio/products/")`), comparing `public_id`s against `ProductImage.objects.values_list("public_id", flat=True)`, reviewing the unmatched list manually, and deleting confirmed orphans only after human review.
