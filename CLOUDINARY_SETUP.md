# Cloudinary Setup Guide

This guide covers configuring Cloudinary for product image storage in Studio.

---

## 1. Create a Cloudinary Account

1. Sign up or log in at [https://cloudinary.com/](https://cloudinary.com/).
2. Open the **Programmable Media Dashboard** (or **Settings $\to$ API Keys**).
3. Locate your three backend credentials:
   * **Cloud Name** (`CLOUDINARY_CLOUD_NAME`)
   * **API Key** (`CLOUDINARY_API_KEY`)
   * **API Secret** (`CLOUDINARY_API_SECRET`)

> [!CAUTION]
> **Never expose `CLOUDINARY_API_SECRET` in frontend code, Vite `VITE_*` variables, or version control.** All uploads, signatures, and deletions are executed exclusively on the Django backend.

---

## 2. Environment Variables

Update `backend/.env` (using `backend/.env.example` as reference):

```ini
# Switch from "local" to "cloudinary" when ready to upload to Cloudinary
MEDIA_STORAGE_PROVIDER=cloudinary

CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
CLOUDINARY_SECURE=true
CLOUDINARY_UPLOAD_FOLDER=studio/products
MEDIA_MAX_UPLOAD_SIZE_MB=8
```

### Variable Reference

| Variable | Required When | Default | Purpose |
| :--- | :--- | :--- | :--- |
| `MEDIA_STORAGE_PROVIDER` | Always | `local` | `"local"` (dev filesystem) or `"cloudinary"` (cloud CDN) |
| `CLOUDINARY_CLOUD_NAME` | Provider is `cloudinary` | `""` | Cloudinary cloud identifier |
| `CLOUDINARY_API_KEY` | Provider is `cloudinary` | `""` | Backend API key |
| `CLOUDINARY_API_SECRET` | Provider is `cloudinary` | `""` | Backend API secret (strictly server-side) |
| `CLOUDINARY_SECURE` | Optional | `true` | Enforce HTTPS (`https://res.cloudinary.com/...`) URLs |
| `CLOUDINARY_UPLOAD_FOLDER` | Optional | `studio/products` | Base folder prefix isolating Studio assets |
| `MEDIA_MAX_UPLOAD_SIZE_MB` | Optional | `8` | Maximum allowed upload size per image in MB |

---

## 3. Local Development Without Cloudinary

You do **not** need Cloudinary credentials to develop or test locally:

1. Leave `MEDIA_STORAGE_PROVIDER=local` in `backend/.env`.
2. Start the servers (`.\start.ps1`).
3. Uploaded images are validated using the exact same security pipeline and stored under `backend/media/products/product-<id>/`.
4. Vite proxies `/media` to Django (`http://127.0.0.1:8000`) automatically in development mode.

---

## 4. Verifying Configuration

1. Sign in to the Admin dashboard (`/admin`) with a staff account.
2. Open any product in **Products $\to$ Edit**.
3. Check the storage badge at the top-right of the **Product Images & Gallery** panel:
   * **`CLOUDINARY`** (neutral border) — Cloudinary is active and configured.
   * **`CLOUDINARY`** (red warning banner) — `MEDIA_STORAGE_PROVIDER=cloudinary` is set, but one or more required credentials are missing.
   * **`LOCAL`** — Using local Django media storage.
   * **`MOCK`** — Frontend mock adapter mode (`VITE_USE_MOCKS=true`).

---

## 5. Folder Organization in Cloudinary

Studio automatically stores product photography under predictable per-product folders:

```text
studio/products/
├── product-1/
│   ├── <random-unique-id>.jpg
│   └── <random-unique-id>.webp
└── product-2/
    └── <random-unique-id>.png
```

Every upload is tagged with `studio-catalog`, `product:<id>`, `slug:<product-slug>`, and (when color-linked) `color:<color-id>` for easy filtering in the Cloudinary Media Library.
