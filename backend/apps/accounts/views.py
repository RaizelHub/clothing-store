import re

from django.contrib.auth import authenticate, get_user_model
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.exceptions import AuthenticationFailed, NotFound, PermissionDenied, ValidationError
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework_simplejwt.tokens import RefreshToken

from .models import Address, check_demo_token, demo_token
from .serializers import (
    AddressSerializer,
    ChangePasswordSerializer,
    ConfirmResetSerializer,
    LoginSerializer,
    ProfileSerializer,
    RegisterSerializer,
    UserSerializer,
)

User = get_user_model()

EMAIL_RE = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")


def _issue_tokens(user) -> dict:
    refresh = RefreshToken.for_user(user)
    return {"access": str(refresh.access_token), "refresh": str(refresh)}


def _me_or_401(request):
    user = request.user
    if not user or not user.is_authenticated:
        raise AuthenticationFailed("Authentication credentials were not provided.")
    return user


@api_view(["POST"])
@permission_classes([AllowAny])
def register(request):
    ser = RegisterSerializer(data=request.data)
    ser.is_valid(raise_exception=True)
    email = ser.validated_data["email"].lower()
    if User.objects.filter(email=email).exists():
        raise ValidationError({"email": ["An account with this email already exists."]})
    user = User.objects.create_user(
        email=email,
        password=ser.validated_data["password"],
        first_name=ser.validated_data.get("first_name", ""),
        last_name=ser.validated_data.get("last_name", ""),
        email_verified=False,
    )
    data = {
        **_issue_tokens(user),
        "user": UserSerializer(user).data,
        "demo_verification_token": demo_token("mverify", user.pk),
    }
    return Response(data, status=status.HTTP_201_CREATED)


@api_view(["POST"])
@permission_classes([AllowAny])
def login(request):
    ser = LoginSerializer(data=request.data)
    ser.is_valid(raise_exception=True)
    user = authenticate(request, email=ser.validated_data["email"].lower(), password=ser.validated_data["password"])
    if not user:
        raise AuthenticationFailed("No active account found with the given credentials.")
    return Response(_issue_tokens(user))


@api_view(["POST"])
@permission_classes([AllowAny])
def logout(request):
    refresh = str(request.data.get("refresh", ""))
    if refresh:
        try:
            token = RefreshToken(refresh)
            token.blacklist()
        except Exception:
            pass
    return Response(status=status.HTTP_204_NO_CONTENT)


@api_view(["GET"])
def me(request):
    user = _me_or_401(request)
    return Response(UserSerializer(user).data)


@api_view(["PATCH"])
def profile(request):
    user = _me_or_401(request)
    ser = ProfileSerializer(data=request.data, partial=True)
    ser.is_valid(raise_exception=True)
    email = ser.validated_data.get("email", user.email).lower()
    if email != user.email:
        if not EMAIL_RE.match(email):
            raise ValidationError({"email": ["Enter a valid email address."]})
        if User.objects.filter(email=email).exclude(pk=user.pk).exists():
            raise ValidationError({"email": ["An account with this email already exists."]})
        user.email = email
        user.email_verified = False
    user.first_name = ser.validated_data.get("first_name", user.first_name)
    user.last_name = ser.validated_data.get("last_name", user.last_name)
    user.save(update_fields=["email", "first_name", "last_name", "email_verified"])
    return Response(UserSerializer(user).data)


@api_view(["POST"])
def change_password(request):
    user = _me_or_401(request)
    ser = ChangePasswordSerializer(data=request.data)
    ser.is_valid(raise_exception=True)
    if not user.check_password(ser.validated_data["current_password"]):
        raise ValidationError({"current_password": ["Current password is incorrect."]})
    user.set_password(ser.validated_data["new_password"])
    user.save(update_fields=["password"])
    return Response(status=status.HTTP_204_NO_CONTENT)


@api_view(["POST"])
@permission_classes([AllowAny])
def request_password_reset(request):
    email = str(request.data.get("email", "")).lower()
    user = User.objects.filter(email=email).first()
    if not user:
        return Response({"detail": "If an account with that email exists, a reset link has been sent."})
    return Response(
        {
            "detail": "Password reset email sent.",
            "demo_reset_token": demo_token("mreset", user.pk),
            "demo_email": email,
        }
    )


@api_view(["POST"])
@permission_classes([AllowAny])
def confirm_password_reset(request):
    ser = ConfirmResetSerializer(data=request.data)
    ser.is_valid(raise_exception=True)
    uid = check_demo_token("mreset", ser.validated_data["token"])
    if uid is None:
        raise ValidationError({"token": ["Invalid token."]})
    user = User.objects.filter(pk=uid).first()
    if not user:
        raise ValidationError({"token": ["Invalid token."]})
    user.set_password(ser.validated_data["new_password"])
    user.save(update_fields=["password"])
    return Response(status=status.HTTP_204_NO_CONTENT)


@api_view(["POST"])
@permission_classes([AllowAny])
def verify_email(request):
    uid = check_demo_token("mverify", str(request.data.get("token", "")))
    if uid is None:
        raise ValidationError({"token": ["Invalid verification token."]})
    user = User.objects.filter(pk=uid).first()
    if not user:
        raise ValidationError({"token": ["Invalid verification token."]})
    if not user.email_verified:
        user.email_verified = True
        user.save(update_fields=["email_verified"])
    return Response(status=status.HTTP_204_NO_CONTENT)


@api_view(["POST"])
@permission_classes([AllowAny])
def resend_verification(request):
    email = str(request.data.get("email", "")).lower()
    user = User.objects.filter(email=email).first()
    if not user:
        return Response({"detail": "If an account with that email exists, a verification email has been sent."})
    if user.email_verified:
        return Response({"detail": "Email already verified."})
    return Response({"demo_verification_token": demo_token("mverify", user.pk), "demo_email": email})


# --- Addresses ---------------------------------------------------------------


@api_view(["GET", "POST"])
def addresses(request):
    user = _me_or_401(request)
    if request.method == "GET":
        return Response(AddressSerializer(user.addresses.all(), many=True).data)
    ser = AddressSerializer(data=request.data)
    ser.is_valid(raise_exception=True)
    if ser.validated_data.get("is_default") or not user.addresses.exists():
        user.addresses.update(is_default=False)
    addr = ser.save(user=user)
    return Response(AddressSerializer(addr).data, status=status.HTTP_201_CREATED)


@api_view(["PATCH", "DELETE"])
def address_detail(request, pk):
    user = _me_or_401(request)
    addr = user.addresses.filter(pk=pk).first()
    if not addr:
        raise NotFound("Not found.")
    if request.method == "DELETE":
        addr.delete()
        if addr.is_default:
            first = user.addresses.first()
            if first:
                first.is_default = True
                first.save(update_fields=["is_default"])
        return Response(status=status.HTTP_204_NO_CONTENT)
    ser = AddressSerializer(addr, data=request.data, partial=True)
    ser.is_valid(raise_exception=True)
    if ser.validated_data.get("is_default"):
        user.addresses.exclude(pk=addr.pk).update(is_default=False)
    ser.save()
    return Response(AddressSerializer(addr).data)