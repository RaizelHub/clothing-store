from django.urls import path

from .views import health, contact_inquiry

urlpatterns = [
    path("health/", health, name="health"),
    path("contact/", contact_inquiry, name="contact_inquiry"),
]

