# Media Storage Troubleshooting

Common issues and solutions when uploading or rendering product images in Studio.

---

## 1. "Cloudinary is enabled but required environment variables are missing" (HTTP 503)

**Cause**: `MEDIA_STORAGE_PROVIDER=cloudinary` is set in `backend/.env`, but one or more of `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, or `CLOUDINARY_API_SECRET` is empty.

**Fix**:
* Either fill in all three Cloudinary variables in `backend/.env` and restart Django, **or**
* Set `MEDIA_STORAGE_PROVIDER=local` for local development without Cloudinary credentials.

---

## 2. "Unsupported or invalid image file" (HTTP 400)

**Cause**: The file failed server-side magic-byte or Pillow binary validation. Common triggers:
* Uploading `.svg`, `.gif`, `.heic`, `.bmp`, or `.pdf` files.
* Renaming a non-image file to `.jpg` or `.png`.
* A corrupted or truncated image file.

**Fix**: Convert the image to standard JPEG, PNG, WEBP, or AVIF format and re-upload.

---

## 3. "File exceeds the maximum allowed size" (HTTP 400)

**Cause**: The uploaded image is larger than `MEDIA_MAX_UPLOAD_SIZE_MB` (default `8 MB`).

**Fix**: Export the product photo at web-ready resolution (e.g. `1600 × 2000` JPEG/WEBP, typically 200 KB–1.5 MB) or raise `MEDIA_MAX_UPLOAD_SIZE_MB` in `backend/.env` if high-res source uploads are required.

---

## 4. "Arbitrary remote image URLs are not permitted" (HTTP 400)

**Cause**: A client attempted to submit an external `http://` or `https://` URL directly instead of uploading an image file through the authenticated upload endpoint.

**Fix**: Upload files via `POST /api/admin/products/<id>/images/` using `multipart/form-data`.

---

## 5. Local Uploaded Images Return 404 in Development

**Cause**: When `MEDIA_STORAGE_PROVIDER=local`, Django serves `/media/` only when `DEBUG=True` (`config.settings.development`), and Vite proxies `/media` to `http://127.0.0.1:8000`.

**Fix**:
1. Confirm `DJANGO_SETTINGS_MODULE=config.settings.development` in `backend/.env`.
2. Confirm both Django (`8000`) and Vite (`5173`) are running (`.\start.ps1`).
3. Confirm `frontend/vite.config.ts` includes the `/media` proxy entry pointing to `http://127.0.0.1:8000`.

---

## 6. "Failed to upload image to Cloudinary" (HTTP 502)

**Cause**: Cloudinary rejected the upload (invalid API key/secret, clock skew, account quota limit, or temporary network outage).

**Fix**:
1. Check Django server logs for the exact Cloudinary exception message.
2. Verify `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, and `CLOUDINARY_API_SECRET` match your Cloudinary dashboard.
3. Confirm outbound HTTPS access to `api.cloudinary.com`.

---

## 7. Known Limitations

* **Unsigned Client Direct Uploads Not Enabled**: Uploads intentionally route through the Django backend so binary validation, Pillow inspection, staff authorization, and atomic DB association are strictly enforced without exposing secrets.
* **No Automated Bulk Orphan Sweep**: Deleted/failed assets are cleaned up immediately per request; any asset orphaned by a hard server crash during a network timeout requires manual audit against the Cloudinary Media Library before deletion.
* **Mock Mode Persistence**: In browser-only mock mode (`VITE_USE_MOCKS=true`), uploaded file previews use browser `URL.createObjectURL()` which is valid for the current tab session and resets on hard page reload.
