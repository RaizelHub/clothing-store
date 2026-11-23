from datetime import timedelta
from decimal import Decimal


from django.db import models
from django.db.models import Q, Sum
from django.utils import timezone
from rest_framework import serializers

from apps.common.money import from_cents, to_str

from .models import Category, Color, Collection, Outfit, OutfitItem, Product, ProductImage, ProductVariant, Review, Size, StoreSettings



class ColorSerializer(serializers.ModelSerializer):
    class Meta:
        model = Color
        fields = ["id", "name", "hex"]


class SizeSerializer(serializers.ModelSerializer):
    class Meta:
        model = Size
        fields = ["id", "name", "sort_order"]


class CategorySerializer(serializers.ModelSerializer):
    children = serializers.SerializerMethodField()

    class Meta:
        model = Category
        fields = ["id", "name", "slug", "parent", "children"]

    def get_children(self, obj):
        children = obj.children.all()
        if not children.exists():
            return None
        return CategorySerializer(children, many=True).data


class ProductImageSerializer(serializers.ModelSerializer):
    urls = serializers.SerializerMethodField()

    class Meta:
        model = ProductImage
        fields = [
            "id",
            "image",
            "alt",
            "color",
            "position",
            "is_primary",
            "public_id",
            "storage_provider",
            "width",
            "height",
            "format",
            "urls",
        ]

    def get_urls(self, obj):
        from .media_storage import build_product_image_urls

        return build_product_image_urls(obj)


class VariantSummarySerializer(serializers.ModelSerializer):
    price = serializers.SerializerMethodField()
    price_effective = serializers.SerializerMethodField()
    color = ColorSerializer(read_only=True)
    size = SizeSerializer(read_only=True)

    class Meta:
        model = ProductVariant
        fields = ["id", "sku", "price", "price_effective", "stock", "color", "size"]

    def get_price(self, obj):
        return to_str(obj.price_override) if obj.price_override is not None else None

    def get_price_effective(self, obj):
        return obj.effective_price_str()


class ReviewSerializer(serializers.ModelSerializer):
    product_name = serializers.CharField(source="product.name", read_only=True)

    class Meta:
        model = Review
        fields = ["id", "product", "product_name", "user_name", "rating", "comment", "status", "created_at"]
        read_only_fields = ["product", "product_name", "user_name", "rating", "comment", "status", "created_at"]


def units_sold_annotation():
    """Total units sold = seed baseline + quantities on non-cancelled/refunded orders.

    Imported lazily: orders app depends on catalog, not the reverse."""
    from apps.orders.models import OrderItem  # noqa: F401

    return Sum(
        "order_items__quantity",
        filter=~Q(order_items__order__status__in=["cancelled", "refunded"]),
        default=0,
    )


class ProductSummarySerializer(serializers.ModelSerializer):
    base_price = serializers.SerializerMethodField()
    sale_price = serializers.SerializerMethodField()
    price_effective = serializers.SerializerMethodField()
    category = serializers.IntegerField(source="category_id", read_only=True)
    category_name = serializers.CharField(source="category.name", read_only=True)
    category_slug = serializers.CharField(source="category.slug", read_only=True)
    is_new = serializers.SerializerMethodField()
    images = ProductImageSerializer(many=True, read_only=True)
    colors = serializers.SerializerMethodField()
    sizes = serializers.SerializerMethodField()
    min_price = serializers.SerializerMethodField()
    badges = serializers.SerializerMethodField()
    in_stock = serializers.SerializerMethodField()

    class Meta:
        model = Product
        fields = [
            "id",
            "name",
            "slug",
            "tagline",
            "base_price",
            "sale_price",
            "price_effective",
            "category",
            "category_name",
            "category_slug",
            "is_featured",
            "is_new",
            "in_stock",
            "images",
            "colors",
            "sizes",
            "min_price",
            "badges",
        ]

    def get_base_price(self, obj):
        return to_str(obj.base_price)

    def get_sale_price(self, obj):
        return to_str(obj.sale_price) if obj.sale_price is not None else None

    def get_price_effective(self, obj):
        return to_str(obj.sale_price if obj.sale_price is not None else obj.base_price)

    def get_is_new(self, obj):
        return obj.is_new or (obj.created_at >= timezone.now() - timedelta(days=30))

    def get_colors(self, obj):
        seen, out = set(), []
        for v in obj.variants.all():
            if v.color_id not in seen:
                seen.add(v.color_id)
                out.append(v.color)
        return ColorSerializer(out, many=True).data

    def get_sizes(self, obj):
        seen, out = set(), []
        for v in obj.variants.all():
            if v.size_id not in seen:
                seen.add(v.size_id)
                out.append(v.size)
        return SizeSerializer(out, many=True).data

    def get_min_price(self, obj):
        prices = [v.price_override or obj.sale_price or obj.base_price for v in obj.variants.all()]
        return to_str(min(prices, default=obj.base_price))

    def get_in_stock(self, obj):
        return any(v.stock > 0 for v in obj.variants.all())

    def get_badges(self, obj):
        if not any(v.stock > 0 for v in obj.variants.all()):
            return ["SOLD OUT"]
        badges = []
        if self.get_is_new(obj):
            badges.append("NEW")
        if obj.sale_price is not None:
            badges.append("SALE")
        units = getattr(obj, "units_sold", None)
        if units is None:
            units = obj.units_sold_baseline
        if units > 0:
            badges.append("BESTSELLER")
        return badges


class ProductDetailSerializer(ProductSummarySerializer):
    description = serializers.CharField()
    care = serializers.CharField()
    fit = serializers.CharField()
    variants = VariantSummarySerializer(many=True, read_only=True)
    collection_ids = serializers.SerializerMethodField()
    average_rating = serializers.SerializerMethodField()
    review_count = serializers.SerializerMethodField()
    reviews = serializers.SerializerMethodField()

    class Meta(ProductSummarySerializer.Meta):
        fields = ProductSummarySerializer.Meta.fields + [
            "description",
            "care",
            "fit",
            "variants",
            "collection_ids",
            "average_rating",
            "review_count",
            "reviews",
        ]

    def get_collection_ids(self, obj):
        return list(obj.collections.values_list("id", flat=True))

    def _approved_reviews(self, obj):
        return obj.reviews.filter(status=Review.STATUS_APPROVED)

    def get_average_rating(self, obj):
        agg = self._approved_reviews(obj).aggregate(avg=models.Avg("rating"))
        if agg["avg"] is None:
            return None
        return float(round(agg["avg"], 1))

    def get_review_count(self, obj):
        return self._approved_reviews(obj).count()

    def get_reviews(self, obj):
        return ReviewSerializer(self._approved_reviews(obj), many=True).data


class CollectionSerializer(serializers.ModelSerializer):
    product_ids = serializers.SerializerMethodField()
    product_count = serializers.SerializerMethodField()

    class Meta:
        model = Collection
        fields = ["id", "name", "slug", "description", "tagline", "hero_image", "product_ids", "product_count"]

    def get_product_ids(self, obj):
        return list(obj.products.order_by("id").values_list("id", flat=True))

    def get_product_count(self, obj):
        return obj.products.count()


class StoreSettingsSerializer(serializers.ModelSerializer):
    class Meta:
        model = StoreSettings
        fields = ["store_name", "currency", "tax_rate", "shipping_flat_rate", "free_shipping_threshold", "low_stock_threshold"]


# --- Admin input serializers -------------------------------------------------


class AdminVariantInputSerializer(serializers.Serializer):
    sku = serializers.CharField(max_length=40, required=False)
    color_id = serializers.IntegerField()
    size_id = serializers.IntegerField()
    price_override_cents = serializers.IntegerField(required=False, allow_null=True)
    stock = serializers.IntegerField(min_value=0)


class AdminColorInputSerializer(serializers.Serializer):
    color_id = serializers.IntegerField()
    hex = serializers.CharField(max_length=7)


class AdminProductImageInputSerializer(serializers.Serializer):
    id = serializers.IntegerField(required=False, allow_null=True)
    image = serializers.CharField(max_length=1000, required=False, allow_blank=True)
    alt = serializers.CharField(max_length=220, required=False, allow_blank=True)
    color_id = serializers.IntegerField(required=False, allow_null=True)
    is_primary = serializers.BooleanField(required=False)


class AdminProductInputSerializer(serializers.Serializer):
    name = serializers.CharField(max_length=160)
    tagline = serializers.CharField(required=False, allow_blank=True)
    description = serializers.CharField(required=False, allow_blank=True)
    care = serializers.CharField(required=False, allow_blank=True)
    fit = serializers.CharField(required=False, allow_blank=True)
    base_price = serializers.DecimalField(max_digits=10, decimal_places=2)
    sale_price = serializers.DecimalField(max_digits=10, decimal_places=2, required=False, allow_null=True)
    category_id = serializers.IntegerField()
    is_featured = serializers.BooleanField(required=False)
    is_new = serializers.BooleanField(required=False)
    variants = AdminVariantInputSerializer(many=True, required=False)
    colors = AdminColorInputSerializer(many=True, required=False)
    images = AdminProductImageInputSerializer(many=True, required=False)


class InventoryRowSerializer(serializers.Serializer):
    variant_id = serializers.IntegerField()
    sku = serializers.CharField()
    product_id = serializers.IntegerField()
    product_name = serializers.CharField()
    color_name = serializers.CharField()
    size_name = serializers.CharField()
    stock = serializers.IntegerField()
    low = serializers.BooleanField()
    threshold = serializers.IntegerField()


# --- Shop the Look / Outfit Serializers -------------------------------------


class OutfitItemSerializer(serializers.ModelSerializer):
    product = ProductDetailSerializer(read_only=True)
    product_id = serializers.PrimaryKeyRelatedField(queryset=Product.objects.all(), source="product", write_only=True)

    class Meta:
        model = OutfitItem
        fields = ["id", "product", "product_id", "position", "styling_note", "is_featured_item"]


class OutfitSummarySerializer(serializers.ModelSerializer):
    items_count = serializers.SerializerMethodField()
    items = serializers.SerializerMethodField()
    total_price = serializers.SerializerMethodField()
    bundle_pricing = serializers.SerializerMethodField()

    class Meta:
        model = Outfit
        fields = [
            "id",
            "name",
            "slug",
            "description",
            "cover_image",
            "cover_image_alt",
            "hero_image",
            "status",
            "is_featured",
            "sort_order",
            "bundle_discount_type",
            "bundle_discount_value",
            "bundle_min_items",
            "items_count",
            "items",
            "total_price",
            "bundle_pricing",
            "created_at",
            "updated_at",
        ]

    def get_items_count(self, obj):
        return obj.items.count()

    def get_items(self, obj):
        items = obj.items.select_related("product").all()
        return [
            {
                "id": it.id,
                "product_id": it.product_id,
                "product_name": it.product.name,
                "product_slug": it.product.slug,
                "price": to_str(it.product.sale_price or it.product.base_price),
                "is_featured_item": it.is_featured_item,
                "styling_note": it.styling_note,
            }
            for it in items
        ]

    def get_total_price(self, obj):
        items = obj.items.select_related("product").all()
        subtotal = sum((it.product.sale_price or it.product.base_price for it in items), Decimal("0.00"))
        return to_str(subtotal)

    def get_bundle_pricing(self, obj):
        items = obj.items.select_related("product").all()
        subtotal = sum((it.product.sale_price or it.product.base_price for it in items), Decimal("0.00"))
        calc = obj.calculate_bundle_pricing(len(items), subtotal)
        return {
            "is_eligible": calc["is_eligible"],
            "bundle_discount_type": calc["bundle_discount_type"],
            "bundle_discount_value": to_str(calc["bundle_discount_value"]),
            "discount_amount": to_str(calc["discount_amount"]),
            "subtotal": to_str(calc["subtotal"]),
            "final_total": to_str(calc["final_total"]),
            "savings_label": calc["savings_label"],
            "required_items_count": calc["required_items_count"],
        }


class OutfitDetailSerializer(serializers.ModelSerializer):
    items = OutfitItemSerializer(many=True, read_only=True)
    items_count = serializers.SerializerMethodField()
    bundle_pricing = serializers.SerializerMethodField()

    class Meta:
        model = Outfit
        fields = [
            "id",
            "name",
            "slug",
            "description",
            "cover_image",
            "cover_image_alt",
            "hero_image",
            "gallery_images",
            "status",
            "is_featured",
            "sort_order",
            "bundle_discount_type",
            "bundle_discount_value",
            "bundle_min_items",
            "items_count",
            "items",
            "bundle_pricing",
            "created_at",
            "updated_at",
        ]

    def get_items_count(self, obj):
        return obj.items.count()

    def get_bundle_pricing(self, obj):
        items = obj.items.select_related("product").all()
        subtotal = sum((it.product.sale_price or it.product.base_price for it in items), Decimal("0.00"))
        calc = obj.calculate_bundle_pricing(len(items), subtotal)
        return {
            "is_eligible": calc["is_eligible"],
            "bundle_discount_type": calc["bundle_discount_type"],
            "bundle_discount_value": to_str(calc["bundle_discount_value"]),
            "discount_amount": to_str(calc["discount_amount"]),
            "subtotal": to_str(calc["subtotal"]),
            "final_total": to_str(calc["final_total"]),
            "savings_label": calc["savings_label"],
            "required_items_count": calc["required_items_count"],
        }


class AdminOutfitItemInputSerializer(serializers.Serializer):
    product_id = serializers.IntegerField()
    position = serializers.IntegerField(default=0)
    styling_note = serializers.CharField(max_length=300, required=False, allow_blank=True)
    is_featured_item = serializers.BooleanField(default=False)


class AdminOutfitInputSerializer(serializers.Serializer):
    name = serializers.CharField(max_length=160)
    slug = serializers.CharField(max_length=180, required=False, allow_blank=True)
    description = serializers.CharField(required=False, allow_blank=True)
    cover_image = serializers.CharField(max_length=1000, required=False, allow_blank=True)
    cover_image_alt = serializers.CharField(max_length=220, required=False, allow_blank=True)
    hero_image = serializers.CharField(max_length=1000, required=False, allow_blank=True)
    gallery_images = serializers.ListField(child=serializers.DictField(), required=False)
    status = serializers.ChoiceField(choices=Outfit.STATUS_CHOICES, default=Outfit.STATUS_DRAFT)
    is_featured = serializers.BooleanField(default=False)
    sort_order = serializers.IntegerField(default=0)
    bundle_discount_type = serializers.ChoiceField(choices=Outfit.DISCOUNT_CHOICES, default=Outfit.DISCOUNT_NONE)
    bundle_discount_value = serializers.DecimalField(max_digits=10, decimal_places=2, default=Decimal("0.00"))
    bundle_min_items = serializers.IntegerField(default=0)
    items = AdminOutfitItemInputSerializer(many=True, required=False)


class AddOutfitToCartItemSerializer(serializers.Serializer):
    product_id = serializers.IntegerField()
    variant_id = serializers.IntegerField()
    quantity = serializers.IntegerField(default=1, min_value=1)


class AddOutfitToCartInputSerializer(serializers.Serializer):
    items = AddOutfitToCartItemSerializer(many=True)
