# Product Image Management Guide

This guide explains how merchants and administrators manage product photography and variant images in Studio.

---

## 1. Supported Photography & Validation Rules

* **Accepted Formats**: JPEG (`.jpg`, `.jpeg`), PNG (`.png`), WEBP (`.webp`), AVIF (`.avif`).
* **Maximum File Size**: `8 MB` per image (configurable via `MEDIA_MAX_UPLOAD_SIZE_MB`).
* **Dimensions**: Minimum `10 × 10` px, maximum `10000 × 10000` px.
* **Security Checks**: Every upload is validated server-side by inspecting binary magic bytes and decoding the image stream with Pillow. Spoofed extensions, SVG scripts, HTML files, corrupted images, and arbitrary remote URL uploads are rejected.

---

## 2. Managing Product Galleries in Admin

Navigate to **Admin $\to$ Products $\to$ New product** or click **Edit** on an existing product.

### Uploading Multiple Images
1. Choose an optional **Default color tag** (`All colors` for general photography or a specific color such as *Black* or *Stone*).
2. Drag and drop one or more images into the upload area, or click **Select Images**.
3. **Preview Before Uploading**: Selected files appear in the **Ready to Upload** staging section with instant thumbnails.
   * Add descriptive alt text or click quick fashion-view presets (**Front view**, **Back view**, **Side view**, **Detail shot**, **Lifestyle**).
   * Adjust color tags, reorder queued files, or mark a queued image as **Primary**.
4. Click **Upload Images** (for existing products) or **Create product** (for new products) and monitor the live progress bar.

### Ordering, Primary Selection, Replacement & Removal
* **Primary Image**: Click **Set Primary** on any image to designate it as the product's cover image across product cards, search results, and admin listings.
* **Reorder Images**: Drag and drop gallery cards or use the **← / →** buttons to control gallery sequence without losing unsaved edits to product details or variants.
* **Replace an Image**: Click **Replace** on a card to upload a new file in place. The replacement is uploaded and saved to the database before the old file is cleaned up.
* **Edit Alt Text & Color Link**: Changes to alt text save on blur; color link changes save immediately.
* **Delete an Image**: Click the trash icon to remove the image from the gallery and safely clean up the underlying asset if unreferenced elsewhere.

---

## 3. Variant-Specific Color Images

Studio separates **color imagery** from **size SKU inventory**:

* **Main Gallery Images (`All colors`)**: Shared across all variants (e.g., fabric close-ups, care details, lifestyle shots).
* **Color-Linked Images (e.g. `Black`, `Stone`)**:
  * On **Product Cards**, hovering or clicking a color swatch previews that color's primary image immediately.
  * On **Product Detail Pages**, selecting a color displays that color's dedicated images first, followed by shared general gallery shots.
  * **Graceful Fallback**: If a color has no dedicated photos, the product detail page automatically displays the main product gallery without blank placeholders.
  * **Independent SKU Stock & Pricing**: Selecting sizes continues to update SKU, stock count, and price overrides independently of imagery.

---

## 4. API Endpoints (Staff Only)

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/admin/media/config/` | Non-sensitive storage provider status & limits |
| `GET` | `/api/admin/products/<id>/images/` | List ordered images for a product |
| `POST` | `/api/admin/products/<id>/images/` | Multipart upload (`file` or `files`) |
| `PATCH` | `/api/admin/products/<id>/images/<img_id>/` | Update `alt`, `color_id`, `is_primary`, or replace `file` |
| `DELETE` | `/api/admin/products/<id>/images/<img_id>/` | Remove image and clean up unreferenced asset |
| `POST` | `/api/admin/products/<id>/images/reorder/` | Reorder gallery with `{"image_ids": [...]}` |
