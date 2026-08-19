import hmac
import secrets

from django.conf import settings
from django.contrib.auth.models import AbstractBaseUser, BaseUserManager, PermissionsMixin
from django.db import models


class UserManager(BaseUserManager):
    use_in_migrations = True

    def create_user(self, email, password=None, **extra_fields):
        if not email:
            raise ValueError("Users must have an email address.")
        email = self.normalize_email(email).lower()
        user = self.model(email=email, **extra_fields)
        user.set_password(password)
        user.save(using=self._db)
        return user

    def create_superuser(self, email, password=None, **extra_fields):
        extra_fields.setdefault("is_staff", True)
        extra_fields.setdefault("is_superuser", True)
        extra_fields.setdefault("role", "admin")
        extra_fields.setdefault("email_verified", True)
        return self.create_user(email, password, **extra_fields)


class User(AbstractBaseUser, PermissionsMixin):
    """Email-as-username customer model. Mirrors the User shape the
    frontend consumes (see frontend/src/types/api.ts)."""

    ROLE_CUSTOMER = "customer"
    ROLE_ADMIN = "admin"
    ROLE_CHOICES = [(ROLE_CUSTOMER, "Customer"), (ROLE_ADMIN, "Admin")]

    email = models.EmailField(unique=True)
    first_name = models.CharField(max_length=150, blank=True)
    last_name = models.CharField(max_length=150, blank=True)
    role = models.CharField(max_length=16, choices=ROLE_CHOICES, default=ROLE_CUSTOMER)
    is_active = models.BooleanField(default=True)
    is_staff = models.BooleanField(default=False)
    email_verified = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    objects = UserManager()

    USERNAME_FIELD = "email"
    REQUIRED_FIELDS = []

    def __str__(self):
        return self.email


class Address(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="addresses")
    label = models.CharField(max_length=60, default="Home")
    recipient = models.CharField(max_length=150, blank=True)
    line1 = models.CharField(max_length=255, blank=True)
    line2 = models.CharField(max_length=255, blank=True)
    city = models.CharField(max_length=120, blank=True)
    state = models.CharField(max_length=120, blank=True)
    postal_code = models.CharField(max_length=40, blank=True)
    country = models.CharField(max_length=4, default="US")
    phone = models.CharField(max_length=40, blank=True)
    is_default = models.BooleanField(default=False)

    class Meta:
        ordering = ["-is_default", "id"]

    def __str__(self):
        return f"{self.recipient} — {self.line1}, {self.city}"


# --- Demo email tokens ------------------------------------------------------
# No mailer yet (Phase 9). "Emails" are simulated the same way as the frontend
# mock: endpoints that would send email return a demo token the UI surfaces as
# a clickable banner link. Tokens encode the user id and are signed so a
# forged token won't work — deterministic, no storage, no expiry (demo only).

def demo_token(kind: str, user_id: int) -> str:
    """mverify.{uid}.{sig} / mreset.{uid}.{sig} — same format as the mock."""
    sig = hmac.new(settings.SECRET_KEY.encode(), str(user_id).encode(), "sha256").hexdigest()[:12]
    return f"{kind}.{user_id}.{sig}"


def check_demo_token(kind: str, token: str) -> int | None:
    prefix = f"{kind}."
    if not token or not token.startswith(prefix):
        return None
    parts = token.split(".")
    if len(parts) != 3:
        return None
    _, raw_uid, sig = parts
    if not raw_uid.isdigit():
        return None
    if not secrets.compare_digest(sig, demo_token(kind, int(raw_uid)).split(".")[2]):
        return None
    return int(raw_uid)