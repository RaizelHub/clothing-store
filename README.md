# Studio Clothing Store

A full-stack clothing storefront with a React + TypeScript frontend and a Django REST Framework backend.

The current app includes:

- Product catalog, search, filters, collections, product variants, and reviews
- Cart, wishlist, coupons, shipping quotes, checkout, and order history
- Registration, JWT login, profile management, addresses, and password reset demo flows
- Admin dashboard, products, inventory, orders, customers, collections, discounts, reviews, and store settings
- A browser-local mock API for frontend-only demos

## Quick start on Windows

The repository is already configured with a seeded SQLite development database.

From this folder, run:

```powershell
.\start.ps1
```

Then open <http://127.0.0.1:5173>. Press `Ctrl+C` in the terminal to stop both servers.

The default `frontend/.env` uses the real Django API. To run the entire UI without Django data, use:

```powershell
.\start.ps1 -Mocks
```

## Demo accounts

These credentials are development fixtures only:

| Access | Email | Password |
| --- | --- | --- |
| Admin | `admin@studio.test` | `admin12345` |
| Customer | `elena@example.com` | `password123` |

Admin screens are available at <http://127.0.0.1:5173/admin> after signing in with the admin account.

## First-time setup

Requirements:

- Python 3.10 or newer
- Node.js 20 or newer

Set up Django:

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install -r requirements.txt
Copy-Item .env.example .env
python manage.py migrate
python manage.py seed
cd ..
```

Set up React:

```powershell
cd frontend
npm install
Copy-Item .env.example .env
cd ..
```

For the real local API, make sure `frontend/.env` contains:

```dotenv
VITE_USE_MOCKS=false
```

The backend defaults to SQLite when `DATABASE_URL` is empty. PostgreSQL can be used by setting a PostgreSQL `DATABASE_URL` in `backend/.env`.

## Run each service separately

Backend terminal:

```powershell
cd backend
.\.venv\Scripts\python.exe manage.py runserver
```

Frontend terminal:

```powershell
cd frontend
npm run dev
```

The Vite development server proxies `/api` requests to Django on port 8000.

## Verification & Quality Assurance

Run the automated test suite and deployment audits:

```powershell
# Backend automated tests (13 tests covering guest isolation, concurrency, auth):
cd backend
.\.venv\Scripts\python.exe manage.py test

# Django production settings & security check:
.\.venv\Scripts\python.exe manage.py check --deploy --settings=config.settings.production

# Frontend type analysis, linting, and optimized production build:
cd ..\frontend
npm run lint
npm run build
```

## Production & Container Deployment

### Docker Compose
Run the entire production stack (PostgreSQL + Django API + Nginx SPA) with:

```powershell
docker compose up -d --build
```

### PaaS Deployment (Render / Railway / Heroku)
- **Backend**: Uses `backend/Procfile` with Gunicorn and automatic `release: python manage.py migrate --no-input`.
- **Static files**: Handled natively by WhiteNoise with compressed manifest storage (`collectstatic`).
- **Frontend**: Served with Nginx or static hosting (Vercel / Cloudflare Pages) with SPA routing fallback.

Useful URLs:

- Storefront: <http://127.0.0.1:5173>
- API health: <http://127.0.0.1:8000/api/health/>
- Django admin: <http://127.0.0.1:8000/admin/>

Do not use the included secret key, SQLite database, fixture passwords, or simulated payment/email flows in production.
