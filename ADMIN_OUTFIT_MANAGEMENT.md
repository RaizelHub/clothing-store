# Studio — Admin Outfit Management & Curation Guide

## 1. Overview

The **Admin Outfit Management** interface allows Studio administrators and editorial stylists to curate outfits, configure bundle discount promotions, set garment styling notes, and manage publishing states.

- **Admin Looks Dashboard**: `/admin/looks`
- **Create New Outfit**: `/admin/looks/new`
- **Edit Existing Outfit**: `/admin/looks/:id/edit`

---

## 2. Admin Looks Dashboard (`/admin/looks`)

The dashboard provides a central view of all curated looks in the catalog.

### Features:
1. **Status Tabs**:
   - `All`: View every look in the system.
   - `Published`: Live outfits visible to storefront shoppers.
   - `Draft`: In-progress edits and seasonal concepts hidden from customers.
   - `Archived`: Retired seasonal looks.
2. **Instant Search**: Real-time debounced search by look name and URL slug.
3. **Outfit Card Summary**:
   - Cover photograph thumbnail with aspect ratio preview.
   - Status badge (`published`, `draft`, `archived`).
   - `Featured` badge indicating hero spotlight status.
   - Curated garments count (e.g. "3 garments").
   - Total retail price for the complete outfit.
   - Bundle discount summary pill.
4. **Quick Actions**:
   - **Edit**: Direct link to the outfit editor.
   - **View**: One-click preview of the live storefront page in a new tab.
   - **Delete**: Opens a modal confirmation to delete the curation (catalog products and inventory remain intact).

---

## 3. Outfit Editor (`/admin/looks/new` & `/admin/looks/:id/edit`)

The editor is split into 5 structured sections:

### Section 1: Editorial Overview
- **Look Name**: Descriptive name (e.g. "Weekend Neutrals", "Atelier Monochrome").
- **URL Slug**: Unique URL slug. Automatically generated from the title upon creation, or custom-configured.
- **Editorial Narrative**: Long-form styling concept, silhouette descriptions, and seasonal occasion notes shown prominently on the storefront.

### Section 2: Curated Garments Manager
- **Add Product Dropdown**: Selects any product from the catalog and appends it to the outfit.
- **Display Ordering**:
  - `▲` / `▼` buttons to reorder garments.
  - Automatically updates position numbers (`#1`, `#2`, `#3`).
- **Styling Note / Wear Tip**:
  - Stylist instructions for wearing each individual piece (e.g., *"Front-tuck loosely into trousers; pair with brown leather loafers"*).
- **Signature Garment Toggle**:
  - Highlights the focal piece or centerpiece of the ensemble with a `Signature Garment` badge on the storefront.
- **Remove Piece**: Trash icon removes the product from the outfit.

### Section 3: Bundle Discount Rules
- **Discount Type**:
  - `No Bundle Discount`: Pure editorial curation; sold at regular prices.
  - `Percentage Off (%)`: Percentage deducted from all selected garments.
  - `Fixed Amount Off ($ / PHP)`: Flat currency deduction off the bundle subtotal.
- **Discount Value**: Magnitude (e.g., `15` for 15% or `500.00` for ₱500 off).
- **Min Items Required**: Minimum quantity of garments required to qualify for the discount (typically 2 or 3).
- **Bundle Summary Card**: Live preview explaining the customer proposition.

### Section 4: Publishing & Spotlight
- **Status Selector**:
  - `Draft`: Visible only to authenticated staff users (enables testing before release).
  - `Published`: Publicly visible in `/looks` and search.
  - `Archived`: Hidden from public listings.
- **Display Sort Order**: Numeric sort weighting (lower numbers appear first).
- **Featured Checkbox**: When checked, the look is prioritized in the hero spotlight banner on `/looks`.

### Section 5: Editorial Imagery
- **Cover Image URL**: Portrait photograph URL (Cloudinary preset or CDN URL). Shows an instant visual preview upon entry.
- **Cover Image Alt Text**: Accessibility description.
- **Hero Banner URL**: Optional widescreen photo for high-impact hero displays.
- **Gallery Images**: Multi-line list of secondary photography URLs for close-up details and alternative angles.

---

## 4. API Endpoints for Admin

All endpoints require JWT authentication and staff permissions (`is_staff = True`):

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/admin/looks/` | List all outfits with optional `?status=` filter |
| `POST` | `/api/admin/looks/` | Create a new outfit with attached items |
| `GET` | `/api/admin/looks/<id>/` | Fetch outfit details for editing |
| `PATCH` | `/api/admin/looks/<id>/` | Update outfit attributes and items |
| `DELETE` | `/api/admin/looks/<id>/` | Delete an outfit |

---

## 5. Security & Isolation

- **Non-Destructive Deletion**: Deleting an outfit only removes the `Outfit` and its `OutfitItem` mapping records. The underlying products, variants, and stock counts are **never deleted**.
- **Role-Based Access Control**: Storefront endpoints automatically reject draft looks unless the requesting user has valid staff credentials.
- **Protected Cart Integrity**: If a product linked to an outfit is modified or archived in the main product catalog, inventory checks prevent invalid cart transactions.
