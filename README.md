# Clothing Store — Phase 1: Project Foundation

Monorepo layout:

```
clothing-store/
├── frontend/   React + TypeScript + Vite
└── backend/    Django + DRF + PostgreSQL
```

## What's in Phase 1

- Frontend scaffold: Vite, TS, Tailwind (editorial design tokens), TanStack
  Query, Zustand, routing, navbar (desktop + mobile) matching the agreed nav spec.
- Backend scaffold: Django project with split settings (`base` / `development`
  / `production`), DRF installed, CORS configured, Postgres via `DATABASE_URL`.
- A `/api/health/` endpoint the homepage calls on load, to prove the full
  chain (React → Vite proxy → Django → response) works before we build
  anything real on top of it.
- `.env.example` in both folders — copy to `.env` and fill in.

## Setup

### 1. PostgreSQL

Create a local database (adjust to taste):

```bash
createdb clothing_store
```

### 2. Backend

```bash
cd backend
python -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate
pip install -r requirements.txt

cp .env.example .env
# edit .env: set DJANGO_SECRET_KEY and DATABASE_URL

python manage.py migrate
python manage.py runserver      # http://localhost:8000
```

### 3. Frontend

```bash
cd frontend
npm install
cp .env.example .env            # leave VITE_API_URL blank for dev (proxy handles it)
npm run dev                     # http://localhost:5173
```

Open http://localhost:5173 — you should see "API connected — clothing-store-api (ok)"
under the hero text. If it says "API unreachable", confirm Django is running
on port 8000 and CORS_ALLOWED_ORIGINS in backend `.env` includes
`http://localhost:5173`.

## Why this structure

- **Split Django settings** (`base.py` shared, `development.py`/`production.py`
  thin overrides) avoids the classic "one settings.py with `if DEBUG` scattered
  everywhere" mess once we add Cloudinary, Stripe/PayMongo, and Sentry in later phases.
- **`apps/` namespace package** for Django apps keeps `accounts`, `products`,
  `orders`, etc. from cluttering the project root as the app grows — this is
  the pattern real Django e-commerce codebases converge on.
- **Vite dev proxy for `/api`** means the frontend never hardcodes `localhost:8000`
  — same code path works in dev and prod, only `VITE_API_URL` changes.
- **Zustand for UI-only state / TanStack Query for server state** — this
  split is set up now (see `store/useUIStore.ts`) so cart, wishlist, and auth
  state in later phases follow the same pattern instead of one giant store.

## Next: Phase 2 — Authentication

Custom user model (email as username), JWT via `djangorestframework-simplejwt`,
registration, login/logout, refresh flow, forgot password, email verification,
protected routes on the frontend, and the customer profile page.
