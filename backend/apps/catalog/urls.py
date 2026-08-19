from django.urls import path

from . import views

urlpatterns = [
    path("lookups/colors/", views.lookups_colors),
    path("lookups/sizes/", views.lookups_sizes),
    path("categories/", views.categories),
    path("collections/", views.collections),
    path("collections/<slug:slug>/", views.collection_detail),
    path("products/", views.product_list),
    path("products/<slug:slug>/reviews/", views.product_reviews),
    path("products/<slug:slug>/", views.product_detail),
    path("admin/products/", views.admin_products_view),
    path("admin/products/<int:pk>/", views.admin_product_detail),
    path("admin/inventory/", views.admin_inventory),
    path("admin/inventory/<int:pk>/", views.admin_inventory_variant),
    path("admin/collections/", views.admin_collections_view),
    path("admin/collections/<int:pk>/", views.admin_collection_detail),
    path("admin/reviews/", views.admin_reviews_view),
    path("admin/reviews/<int:pk>/", views.admin_review_detail),
    path("admin/settings/", views.admin_settings),
]