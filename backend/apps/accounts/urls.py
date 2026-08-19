from django.urls import path
from rest_framework_simplejwt.views import TokenRefreshView

from . import views

urlpatterns = [
    path("register/", views.register),
    path("token/", views.login),
    path("token/refresh/", TokenRefreshView.as_view()),
    path("logout/", views.logout),
    path("me/", views.me),
    path("profile/", views.profile),
    path("password/change/", views.change_password),
    path("password/reset/", views.request_password_reset),
    path("password/reset/confirm/", views.confirm_password_reset),
    path("email/verify/", views.verify_email),
    path("email/resend/", views.resend_verification),
]