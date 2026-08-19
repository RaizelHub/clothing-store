from datetime import timedelta
from decimal import Decimal

from django.utils import timezone
from rest_framework import serializers

from apps.catalog.models import ProductVariant, StoreSettings
from apps.catalog.serializers import ProductSummarySerializer, VariantSummarySerializer
from apps.common.money import cents_to_str, to_cents, to_str

from .models import CartItem, Coupon, Order, OrderItem, NewsletterSubscription, WishlistItem

ORDER_STATUSES = [s[0] for s in Order.STATUS_CHOICES]


class CartItemSerializer(serializers.ModelSerializer):
    variant = VariantSummarySerializer(read_only=True)
    product_name = serializers.CharField(source="variant.product.name", read_only=True)
    product_slug = serializers.CharField(source="variant.product.slug", read_only=True)
    image = serializers.SerializerMethodField()
    unit_price = serializers.SerializerMethodField()
    available_stock = serializers.IntegerField(source="variant.stock", read_only=True)

    class Meta:
        model = CartItem
        fields = ["id", "variant", "product_name", "product_slug", "image", "unit_price", "quantity", "available_stock"]

    def get_image(self, obj):
        v = obj.variant
        img = v.product.images.filter(color=v.color).first()
        if img:
            return img.image
        img = v.product.images.first()
        return img.image if img else None

    def get_unit_price(self, obj):
        return obj.variant.effective_price_str()


    def get_item_count(self, obj):
        return sum(i["quantity"] for i in obj["items"])

    def get_subtotal(self, obj):
        cents = sum(to_cents(i["unit_price"]) * i["quantity"] for i in obj["items"])
        return cents_to_str(cents)


class WishlistItemSerializer(serializers.ModelSerializer):
    product = serializers.SerializerMethodField()
    variant_id = serializers.SerializerMethodField()

    class Meta:
        model = WishlistItem
        fields = ["id", "product", "variant_id", "created_at"]

    def get_product(self, obj):
        return ProductSummarySerializer(obj.product, context=self.context).data

    def get_variant_id(self, obj):
        return None


class CouponSerializer(serializers.ModelSerializer):
    class Meta:
        model = Coupon
        fields = [
            "id",
            "code",
            "type",
            "value",
            "min_order_value",
            "max_uses",
            "uses",
            "expires_at",
            "is_active",
        ]
        read_only_fields = ["id", "uses"]


class CouponInputSerializer(serializers.Serializer):
    code = serializers.CharField(max_length=40)
    type = serializers.ChoiceField(choices=Coupon.TYPE_CHOICES)
    value = serializers.DecimalField(max_digits=8, decimal_places=2)
    min_order_value = serializers.DecimalField(max_digits=8, decimal_places=2, required=False, default=Decimal("0.00"))
    max_uses = serializers.IntegerField(required=False, allow_null=True, min_value=1)
    expires_at = serializers.DateTimeField(required=False, allow_null=True)
    is_active = serializers.BooleanField(required=False, default=True)


class OrderItemSerializer(serializers.ModelSerializer):
    class Meta:
        model = OrderItem
        fields = ["id", "product_name", "sku", "color_name", "size_name", "unit_price", "quantity", "image"]


class OrderSerializer(serializers.ModelSerializer):
    items = OrderItemSerializer(many=True, read_only=True)
    coupon_code = serializers.SerializerMethodField()

    class Meta:
        model = Order
        fields = [
            "id",
            "order_number",
            "status",
            "items",
            "subtotal",
            "shipping",
            "discount",
            "tax",
            "total",
            "coupon_code",
            "shipping_address",
            "billing_address",
            "billing_same_as_shipping",
            "shipping_method",
            "payment_method",
            "tracking_number",
            "carrier",
            "timeline",
            "created_at",
            "customer_email",
            "customer_name",
        ]

    def get_coupon_code(self, obj):
        return obj.coupon.code if obj.coupon else None


class OrderUpdateSerializer(serializers.Serializer):
    status = serializers.ChoiceField(choices=ORDER_STATUSES, required=False)
    tracking_number = serializers.CharField(required=False, allow_null=True)
    carrier = serializers.CharField(required=False, allow_null=True)
    note = serializers.CharField(required=False, allow_blank=True)


# --- Coupon validation (mirrors frontend mock semantics) ----------------------


def validate_coupon(coupon_code: str | None, subtotal_cents: int) -> dict | None:
    if not coupon_code:
        return None
    code = coupon_code.strip().upper()
    coupon = Coupon.objects.filter(code__iexact=code).first()
    if not coupon:
        return {"valid": False, "code": code, "type": "percent", "value": 0, "discount": "0.00", "error": "Code not recognized."}
    if not coupon.is_active:
        return {"valid": False, "code": code, "type": coupon.type, "value": coupon.value, "discount": "0.00", "error": "This code is no longer active."}
    if coupon.expires_at and coupon.expires_at < timezone.now():
        return {"valid": False, "code": code, "type": coupon.type, "value": coupon.value, "discount": "0.00", "error": "This code has expired."}
    if coupon.max_uses is not None and coupon.uses >= coupon.max_uses:
        return {"valid": False, "code": code, "type": coupon.type, "value": coupon.value, "discount": "0.00", "error": "This code has reached its usage limit."}
    min_cents = to_cents(coupon.min_order_value)
    if subtotal_cents < min_cents:
        return {
            "valid": False,
            "code": code,
            "type": coupon.type,
            "value": coupon.value,
            "discount": "0.00",
            "error": f"Minimum order of {cents_to_str(min_cents)} required.",
        }
    discount_cents = (
        round(subtotal_cents * coupon.value / 100)
        if coupon.type == Coupon.TYPE_PERCENT
        else min(to_cents(coupon.value), subtotal_cents)
    )
    return {"valid": True, "code": coupon.code, "type": coupon.type, "value": coupon.value, "discount": cents_to_str(discount_cents), "error": None}


def shipping_quote_data() -> dict:
    s = StoreSettings.get_solo()
    flat = to_cents(s.shipping_flat_rate)
    return {
        "free_shipping_threshold": to_str(s.free_shipping_threshold) if s.free_shipping_threshold is not None else None,
        "tax_rate": float(s.tax_rate),
        "currency": s.currency,
        "methods": [
            {"id": "standard", "label": "Standard", "price": cents_to_str(flat), "eta": "3\u20135 business days"},
            {"id": "express", "label": "Express", "price": cents_to_str(flat * 2), "eta": "1\u20132 business days"},
        ],
    }


def shipping_cost_cents(method: str, subtotal_cents: int) -> int:
    s = StoreSettings.get_solo()
    free = to_cents(s.free_shipping_threshold) if s.free_shipping_threshold is not None else None
    if free is not None and subtotal_cents >= free and method == "standard":
        return 0
    flat = to_cents(s.shipping_flat_rate)
    return flat * 2 if method == "express" else flat


class NewsletterSerializer(serializers.ModelSerializer):
    class Meta:
        model = NewsletterSubscription
        fields = ["email"]


# --- Dashboard ------------------------------------------------------------------


class LowStockSerializer(serializers.Serializer):
    sku = serializers.CharField()
    product_name = serializers.CharField()
    color_name = serializers.CharField()
    size_name = serializers.CharField()
    stock = serializers.IntegerField()
    threshold = serializers.IntegerField()