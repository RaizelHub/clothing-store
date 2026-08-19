from django.urls import path

from . import views

urlpatterns = [
    path("", views.addresses, name="address-list"),
    path("<int:pk>/", views.address_detail, name="address-detail"),
]