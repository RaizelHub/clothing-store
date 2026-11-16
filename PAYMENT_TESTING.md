# Payment Testing Guide

This guide covers running automated payment tests, manual mock testing, and end-to-end testing with PayMongo test credentials.

---

## 1. Automated Test Suite

The automated test suite runs completely offline with mocked provider responses and does not require active PayMongo API credentials or internet access.

### Running Backend Payment Tests

From the `clothing-store/backend` directory:

```powershell
cd d:\MySystems\clothing-store-phase\clothing-store\backend
.\.venv\Scripts\python manage.py test apps.orders.tests_payments
```

To run the entire Django test suite:

```powershell
.\.venv\Scripts\python manage.py test
```

### Automated Coverage Summary

The test suite in `apps/orders/tests_payments.py` verifies:
* **Mock payment flow**: Direct order creation with stock reservation and payment completion.
* **PayMongo session creation**: Correct session parameters, line items calculation, and checkout URL extraction.
* **Missing / invalid credentials**: Clean failure with HTTP 400 without corrupting stock or deleting cart items.
* **Invalid webhook signature**: HMAC-SHA256 signature verification rejection.
* **Expired webhook timestamp**: Replay attack rejection when timestamp is older than 300 seconds.
* **Verified webhook execution**: Order status transition to `paid` and payment transaction ID recording.
* **No duplicate stock deduction**: Ensures stock is decremented only once across reservation and webhook verification.
* **Idempotency**: Duplicate webhook event deliveries return HTTP 200 without reprocessing.
* **Payment failure**: Stock restored to variant upon `payment.failed` event.
* **Payment expiration**: Stock restored and coupon uses decremented upon `checkout_session.expired` event.
* **Customer cancellation**: Stock restored and coupon uses released when an order is cancelled.
* **Line items precision**: Verifies `sum(line_items)` matches `order.total` centavos exactly with coupon discounts and taxes.
* **Admin auditing**: Requires staff to submit an auditable note when manually marking an order as paid.
* **Public status endpoint**: Safe polling endpoint returning non-sensitive payment and order state.

---

## 2. Frontend Build & Type Verification

From `clothing-store/frontend`:

```powershell
cd d:\MySystems\clothing-store-phase\clothing-store\frontend
npm run lint
npx tsc -b
npm run build
```

---

## 3. Manual Testing in Mock Mode

When `PAYMENTS_PROVIDER=mock` (default):
1. Start the development servers:
   ```powershell
   .\start.ps1
   ```
2. Navigate to <http://localhost:5173/>, select an item, choose a size and color, and click **Add to Bag**.
3. Open Bag and click **Checkout**.
4. In **Contact & Delivery**, enter shipping details and click **Continue to Payment**.
5. Select **Test / Mock Payment**:
   * Enter test card `4242 4242 4242 4242` with any future expiry date and any 3-digit CVC.
   * Click **Place order**.
   * Observe immediate navigation to `/checkout/success/:orderNumber` with status "Order confirmed".
6. Test Decline Simulation:
   * Enter test card ending in `4444` (`4242 4242 4242 4444`).
   * Click **Place order** -> Notice "Your card was declined" error banner.

---

## 4. Manual Testing with PayMongo Test Credentials

To test real PayMongo hosted checkout in test mode:

### Step 1: Set Test Environment Variables

Edit `backend/.env`:

```ini
PAYMENTS_PROVIDER=paymongo
PAYMONGO_SECRET_KEY=sk_test_YOUR_PAYMONGO_TEST_SECRET_KEY
PAYMONGO_PUBLIC_KEY=pk_test_YOUR_PAYMONGO_TEST_PUBLIC_KEY
PAYMONGO_WEBHOOK_SECRET=whsk_YOUR_WEBHOOK_SIGNING_SECRET
FRONTEND_URL=http://localhost:5173
```

### Step 2: Start Local Servers & Webhook Tunnel

1. Start application servers:
   ```powershell
   .\start.ps1
   ```
2. In a separate terminal, forward webhook traffic via ngrok:
   ```bash
   ngrok http 8000
   ```
3. Set your PayMongo Dashboard Webhook URL to:
   `https://YOUR_NGROK_DOMAIN/api/orders/webhooks/paymongo/`

### Step 3: Run the Checkout Flow

1. In the browser, navigate to <http://localhost:5173/> and add items to bag.
2. Proceed to Checkout and complete contact and shipping details.
3. In Payment step, choose **PayMongo Checkout**.
4. Click **Proceed to PayMongo · ₱...**.
5. You will be redirected to the secure hosted PayMongo checkout page (`https://checkout.paymongo.com/cs_...`).

### Step 4: PayMongo Test Checkout Simulation

* **Credit Card Test**:
  * Card Number: `4242 4242 4242 4242`
  * Expiry: Any future date (e.g., `12/28`)
  * CVC: `123`
  * Complete 3D Secure simulation by clicking "Authorize Payment".
* **GCash / Maya Simulation**:
  * Select GCash or Maya on PayMongo hosted page.
  * Click "Authorize Payment" on the mock OTP verification screen.
* **Cancellation Test**:
  * On PayMongo checkout page, click the back/cancel button.
  * You will be redirected back to `http://localhost:5173/checkout?cancelled=true`.
  * Studio displays a notice that payment was interrupted and your bag items remain intact.

### Step 5: Verification on Return

1. After authorizing payment on PayMongo, you are redirected back to Studio at `/checkout/success/ST-...`.
2. The page displays the real-time payment status:
   * "Verifying payment" while polling the status.
   * As soon as the webhook is processed, the status badge and icon automatically transition to "Order confirmed".
3. Check the Admin Dashboard at <http://localhost:5173/admin/orders>:
   * Log in with `admin@studio.test` / `admin12345`.
   * Click on the order to verify the **Payment Details** section:
     * Provider: `PAYMONGO`
     * Status: `paid`
     * Session ID: `cs_...`
     * Transaction ID: `pay_...`
     * Stock status: `Inventory Deducted`

