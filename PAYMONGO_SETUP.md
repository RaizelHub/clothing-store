# PayMongo Setup & Configuration Guide

This guide walks through configuring PayMongo with Studio / Fashion Commerce Platform in test mode and production mode.

---

## 1. Prerequisites

1. Sign up for a [PayMongo Dashboard account](https://dashboard.paymongo.com/).
2. Access the **Developers** tab in the PayMongo dashboard to retrieve API keys and manage webhooks.

---

## 2. Environment Variables Configuration

In `backend/.env`, configure the following variables:

```ini
# Payment Provider Setting
PAYMENTS_PROVIDER=paymongo

# PayMongo API Keys (Use test keys for development/staging)
PAYMONGO_SECRET_KEY=sk_test_your_secret_key_here
PAYMONGO_PUBLIC_KEY=pk_test_your_public_key_here

# PayMongo Webhook Signing Secret (from webhook endpoint registration)
PAYMONGO_WEBHOOK_SECRET=whsk_your_webhook_secret_here

# Base URL of the Frontend (used for success and cancel redirect URLs)
FRONTEND_URL=http://localhost:5173
```

> [!WARNING]
> **Never commit `.env` or production secret keys to version control.**
> Frontend bundles must **never** include `PAYMONGO_SECRET_KEY` or `PAYMONGO_WEBHOOK_SECRET`. All checkout session creation and webhook processing are executed exclusively on the Django backend.

---

## 3. Supported Payment Methods

PayMongo checkout sessions created by Studio support the following payment methods:

| Method | Identifier | Description |
| :--- | :--- | :--- |
| **Credit / Debit Cards** | `card` | Visa, Mastercard, JCB (with 3D Secure OTP verification) |
| **GCash** | `gcash` | Direct e-wallet payment via QR or mobile number authorization |
| **Maya** | `paymaya` | Direct e-wallet payment |
| **GrabPay** | `grab_pay` | GrabPay wallet checkout |
| **Online Banking (DOB)** | `dob` | Direct Online Banking (BPI, UnionBank) |
| **Billease** | `billease` | Buy Now Pay Later installment plans |

---

## 4. Webhook Endpoint Registration

To receive real-time notifications when a customer completes payment:

### Local Development (Using ngrok or local tunnel)

1. Start your local tunnel:
   ```bash
   ngrok http 8000
   ```
2. Note your forwarding URL (e.g., `https://abcdef.ngrok-free.app`).
3. Open the **PayMongo Dashboard** -> **Developers** -> **Webhooks** -> **Create Webhook**.
4. Set Webhook URL to:
   ```text
   https://abcdef.ngrok-free.app/api/orders/webhooks/paymongo/
   ```
5. Select the following events:
   * `checkout_session.payment.paid`
   * `payment.paid`
   * `payment.failed`
   * `checkout_session.expired`
6. Click **Create Webhook**.
7. Copy the generated **Signing Secret** (`whsk_...`) and paste it as `PAYMONGO_WEBHOOK_SECRET` in `backend/.env`.

---

## 5. Test Mode vs Production Mode

| Setting | Test Mode | Production Mode |
| :--- | :--- | :--- |
| Secret Key Prefix | `sk_test_...` | `sk_live_...` |
| Public Key Prefix | `pk_test_...` | `pk_live_...` |
| Webhook Signing Secret | `whsk_...` (from test webhook) | `whsk_...` (from live webhook) |
| Transactions | Simulated, no real money moved | Real financial charges |
| Test Cards & E-wallets | Mock authorization simulator | Real customer accounts |

### Production Activation Checklist

Before switching to live credentials:
- [ ] Complete PayMongo merchant account verification and business onboarding.
- [ ] Configure SSL/HTTPS with a valid TLS certificate on the backend domain.
- [ ] Set `PAYMENTS_PROVIDER=paymongo` and inject production secrets via environment variables (e.g. Railway, Render, AWS ECS).
- [ ] Register the live webhook endpoint on the PayMongo live dashboard.
- [ ] Verify database migrations are applied (`python manage.py migrate`).
- [ ] Ensure `FRONTEND_URL` points to your production storefront domain.

