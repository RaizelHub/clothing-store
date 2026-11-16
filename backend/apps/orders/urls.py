from django.urls import path

from . import views

urlpatterns = [
    path("cart/", views.cart_view),
    path("cart/items/", views.cart_add_item),
    path("cart/items/<int:pk>/", views.cart_item_detail),
    path("cart/merge/", views.cart_merge),
    path("wishlist/", views.wishlist_view),
    path("wishlist/<int:product_id>/", views.wishlist_delete),
    path("checkout/shipping-quote/", views.shipping_quote),
    path("checkout/coupon/", views.checkout_coupon),
    path("checkout/validate/", views.checkout_validate),
    path("checkout/place-order/", views.place_order),
    path("orders/webhooks/paymongo/", views.paymongo_webhook),
    path("orders/webhooks/", views.paymongo_webhook),
    path("webhooks/paymongo/", views.paymongo_webhook),
    path("webhooks/", views.paymongo_webhook),
    path("orders/<slug:order_number>/status/", views.order_status_view),
    path("orders/", views.my_orders),
    path("orders/<slug:order_number>/cancel/", views.cancel_order),
    path("orders/<slug:order_number>/", views.my_order),
    path("newsletter/", views.newsletter),
    path("admin/stats/", views.admin_stats),
    path("admin/orders/", views.admin_orders_view),
    path("admin/orders/<slug:order_number>/", views.admin_order_detail),
    path("admin/customers/", views.admin_customer_list),
    path("admin/customers/<int:pk>/", views.admin_customer_detail),
    path("admin/coupons/", views.admin_coupons_view),
    path("admin/coupons/<int:pk>/", views.admin_coupon_detail),
]