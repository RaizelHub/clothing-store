from .base import *  # noqa: F401,F403

DEBUG = False

# Railway/Render sit behind a proxy that terminates TLS — trust their forwarded header.
SECURE_PROXY_SSL_HEADER = ("HTTP_X_FORWARDED_PROTO", "https")

SECURE_SSL_REDIRECT = True
SESSION_COOKIE_SECURE = True
CSRF_COOKIE_SECURE = True
SECURE_HSTS_SECONDS = 60 * 60 * 24 * 7
SECURE_HSTS_INCLUDE_SUBDOMAINS = True

# WhiteNoise for static files added in Phase 10 (production hardening),
# along with the rest of the deployment checklist.
