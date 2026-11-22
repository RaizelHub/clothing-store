# Studio — Coordinated Outfit Bundles & Discount Engine

## 1. Overview

Studio's **Outfit Bundle Engine** allows stylists and merchandisers to configure dynamic discounts for curated looks. This incentivizes complete-wardrobe purchasing while preserving the flexibility of individual garment selection.

---

## 2. Supported Bundle Discount Types

Every `Outfit` defines three bundle parameters:
- `bundle_discount_type`: The algorithm used to compute savings.
- `bundle_discount_value`: The magnitude (percentage or flat currency value).
- `bundle_min_items`: The minimum quantity of garments the customer must select to unlock the promotion.

### 1. Percentage Off (`bundle_discount_type = "percent"`)
Applies a flat percentage deduction across all selected garments belonging to the look.
- **Example**: 15% off when buying 2 or more garments from "Weekend Neutrals".
- **Formula**:
  $$\text{Savings} = \left(\sum_{i=1}^{k} \text{price}_i \times \text{qty}_i\right) \times \frac{\text{bundle\_discount\_value}}{100}$$
  $$\text{Final Total} = \left(\sum_{i=1}^{k} \text{price}_i \times \text{qty}_i\right) - \text{Savings}$$

### 2. Fixed Amount Off (`bundle_discount_type = "fixed"`)
Deducts a flat currency discount off the bundle subtotal.
- **Example**: ₱500 off when selecting at least 2 pieces from "Studio Casual Edit".
- **Formula**:
  $$\text{Savings} = \min\left(\text{bundle\_discount\_value}, \sum_{i=1}^{k} \text{price}_i \times \text{qty}_i\right)$$
  $$\text{Final Total} = \left(\sum_{i=1}^{k} \text{price}_i \times \text{qty}_i\right) - \text{Savings}$$

### 3. No Bundle Discount (`bundle_discount_type = "none"`)
The outfit serves purely as an editorial curation. Customers can still select sizes/colorways and add all garments to their bag with 1 click at full catalog price.

---

## 3. Atomic Cart Addition Architecture

When a shopper clicks **"Add Entire Look to Bag"**, the frontend sends a batch request to:
`POST /api/looks/<slug>/add-to-cart/`

### Atomic Validation Flow:
```
[Frontend "Add Entire Look to Bag"]
                 │
                 ▼
[POST /api/looks/<slug>/add-to-cart/]
                 │
       ┌─────────┴─────────┐
       ▼                   ▼
1. Validate Look     2. Check Products
   Exists & Published   Must belong to Outfit
       │                   │
       └─────────┬─────────┘
                 ▼
3. Transaction Atomic Block
   - For every submitted (product, variant, qty):
     a. Fetch ProductVariant with lock (select_for_update)
     b. Verify variant.stock >= requested_qty
     c. If any variant has insufficient stock:
        -> ROLLBACK transaction immediately
        -> Return 400 Bad Request with:
           {
             "error": "Insufficient stock for variant <name>",
             "unavailable_variant_id": <id>
           }
     d. Add / increment CartItem in customer's Cart
                 │
                 ▼
4. Bundle Promotion Realization
   - If selected pieces >= bundle_min_items:
     a. Auto-ensure Coupon with code "BUNDLE-<SLUG>"
     b. Apply coupon code to Cart
                 │
                 ▼
5. Commit Transaction & Return Updated Cart
```

### Guarantees:
- **No Partial Fills**: If 3 garments are requested and 1 is out of stock, zero garments are added. The user's cart is never left in an inconsistent half-filled state.
- **Race Condition Safety**: Inventory checks happen inside `transaction.atomic()` with database-level isolation.

---

## 4. Promotion Realization via Existing Coupons

To comply with the critical constraint of **zero model duplication**, bundle discounts do not invent a secondary coupon/order discount database table.

Instead, the backend automatically provisions a deterministic `Coupon` record:
- **Code**: `BUNDLE-<UPPERCASE_SLUG>` (e.g. `BUNDLE-WEEKEND-NEUTRALS`)
- **Type**: Matches `bundle_discount_type` (`percent` or `fixed`)
- **Value**: Matches `bundle_discount_value`
- **Active**: `True`

When the customer checks out via **PayMongo** (credit card, GCash, Maya) or in **Mock Mode**, the order total calculation seamlessly applies the coupon without altering existing checkout engines.

---

## 5. Storefront Reactive Calculations

On the outfit detail page (`LookDetailPage.tsx`), price changes are calculated live in browser memory as the user interacts:

1. **Garment Inclusion Toggle**: Users can uncheck pieces they already own or don't want.
2. **Dynamic Savings Indicator**:
   - Displays how many more items are needed to unlock the discount (e.g., *"Select 1 more item to unlock 15% savings"*).
   - Once unlocked, shows a green badge displaying exact currency saved.
3. **Button Text**: Reflects live garment count and final calculated price.
