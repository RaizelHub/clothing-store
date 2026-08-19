import re
from datetime import timedelta
from decimal import Decimal

from django.db.models import Min, Q
from django.db.models.functions import Coalesce
from django.utils import timezone
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.exceptions import NotFound, PermissionDenied, ValidationError
from rest_framework.pagination import PageNumberPagination
from rest_framework.permissions import AllowAny
from rest_framework.response import Response

from apps.common.money import from_cents, placeholder_image
from apps.orders.models import CartItem

from .models import (
    Category,
    Collection,
    Color,
    Product,
    ProductImage,
    ProductVariant,
    Review,
    Size,
    StoreSettings,
)
from .serializers import (
    AdminProductInputSerializer,
    CategorySerializer,
    CollectionSerializer,
    ColorSerializer,
    InventoryRowSerializer,
    ProductDetailSerializer,
    ProductSummarySerializer,
    ReviewSerializer,
    SizeSerializer,
    StoreSettingsSerializer,
    units_sold_annotation,
)

SLUG_RE = re.compile(r"[^a-z0-9]+")


def slugify(s: str) -> str:
    return SLUG_RE.sub("-", s.lower()).strip("-")


def product_qs():
    return (
        Product.objects.select_related("category")
        .prefetch_related("images", "variants__color", "variants__size")
        .annotate(units_sold=units_sold_annotation())
        .annotate(
            min_variant_price=Min(
                Coalesce(
                    "variants__price_override",
                    Coalesce("sale_price", "base_price"),
                )
            )
        )
    )


def _require_staff(request):
    user = request.user
    if not user or not user.is_authenticated:
        raise PermissionDenied("Authentication credentials were not provided.")
    if not user.is_staff:
        raise PermissionDenied("Staff only.")
    return user


# --- Lookups -----------------------------------------------------------------


@api_view(["GET"])
@permission_classes([AllowAny])
def lookups_colors(request):
    return Response(ColorSerializer(Color.objects.all(), many=True).data)


@api_view(["GET"])
@permission_classes([AllowAny])
def lookups_sizes(request):
    return Response(SizeSerializer(Size.objects.all(), many=True).data)


@api_view(["GET"])
@permission_classes([AllowAny])
def categories(request):
    roots = Category.objects.filter(parent__isnull=True).select_related("parent").prefetch_related("children")
    return Response(CategorySerializer(roots, many=True).data)


# --- Collections --------------------------------------------------------------


@api_view(["GET"])
@permission_classes([AllowAny])
def collections(request):
    qs = Collection.objects.all().prefetch_related("products")
    return Response(CollectionSerializer(qs, many=True).data)


@api_view(["GET"])
@permission_classes([AllowAny])
def collection_detail(request, slug):
    coll = Collection.objects.filter(slug=slug).prefetch_related("products").first()
    if not coll:
        raise NotFound("Not found.")
    data = CollectionSerializer(coll).data
    products = product_qs().filter(collections=coll)
    data["products"] = ProductSummarySerializer(products, many=True).data
    return Response(data)


# --- Products -----------------------------------------------------------------


@api_view(["GET"])
@permission_classes([AllowAny])
def product_list(request):
    qs = product_qs()
    p = request.query_params

    if p.get("ids"):
        ids = [int(x) for x in p["ids"].split(",") if x.strip().isdigit()]
        qs = qs.filter(id__in=ids)

    cat_slug = p.get("category")
    if cat_slug:
        cat = Category.objects.filter(slug=cat_slug).first()
        if cat:
            children = list(Category.objects.filter(parent=cat).values_list("id", flat=True))
            qs = qs.filter(category_id__in=[cat.id, *children])

    if p.get("collection"):
        qs = qs.filter(collections__slug=p["collection"])

    if p.get("color"):
        ids = [int(x) for x in p["color"].split(",") if x.strip().isdigit()]
        qs = qs.filter(variants__color_id__in=ids)

    if p.get("size"):
        ids = [int(x) for x in p["size"].split(",") if x.strip().isdigit()]
        qs = qs.filter(variants__size_id__in=ids)

    if p.get("min_price"):
        qs = qs.filter(min_variant_price__gte=Decimal(p["min_price"]))
    if p.get("max_price"):
        qs = qs.filter(min_variant_price__lte=Decimal(p["max_price"]))

    if p.get("new") == "true" or p.get("new") == "1":
        qs = qs.filter(Q(is_new=True) | Q(created_at__gte=timezone.now() - timedelta(days=30)))
    if p.get("featured") in ("true", "1"):
        qs = qs.filter(is_featured=True)

    q = p.get("q")
    if q:
        qs = qs.filter(Q(name__icontains=q) | Q(tagline__icontains=q) | Q(description__icontains=q))

    sort = p.get("sort", "featured")
    ordering = {
        "newest": "-created_at",
        "price-asc": "min_variant_price",
        "price-desc": "-min_variant_price",
        "featured": ("-is_featured", "-created_at"),
        "bestselling": ("-units_sold", "-created_at"),
    }.get(sort, "-is_featured")
    qs = qs.order_by(*ordering) if isinstance(ordering, tuple) else qs.order_by(ordering)

    paginator = PageNumberPagination()
    page = paginator.paginate_queryset(qs.distinct(), request)
    data = ProductSummarySerializer(page, many=True).data
    return Response({"count": qs.distinct().count(), "next": paginator.get_next_link(), "previous": paginator.get_previous_link(), "results": data})


@api_view(["GET"])
@permission_classes([AllowAny])
def product_detail(request, slug):
    product = product_qs().filter(slug=slug).first()
    if not product:
        raise NotFound("Not found.")
    return Response(ProductDetailSerializer(product).data)


@api_view(["GET", "POST"])
@permission_classes([AllowAny])
def product_reviews(request, slug):
    product = Product.objects.filter(slug=slug).first()
    if not product:
        raise NotFound("Not found.")
    if request.method == "GET":
        reviews = product.reviews.filter(status=Review.STATUS_APPROVED)
        return Response(ReviewSerializer(reviews, many=True).data)
    user = request.user
    if not user or not user.is_authenticated:
        raise ValidationError({"detail": "Authentication credentials were not provided."})
    rating = request.data.get("rating")
    comment = request.data.get("comment", "")
    try:
        rating = int(rating)
    except (TypeError, ValueError):
        rating = 0
    if rating < 1 or rating > 5:
        raise ValidationError({"rating": ["Rating must be between 1 and 5."]})
    name = f"{user.first_name} {user.last_name}".strip() or user.email
    review = Review.objects.create(
        product=product, user=user, user_name=name, rating=rating, comment=str(comment), status=Review.STATUS_PENDING
    )
    return Response(ReviewSerializer(review).data, status=status.HTTP_201_CREATED)


# --- Admin: products -----------------------------------------------------------


def _create_images_for_colors(product: Product, colors: list[tuple[Color, str]]) -> None:
    for color, hex_value in colors:
        if not product.images.filter(color=color).exists():
            position = product.images.count()
            ProductImage.objects.create(
                product=product,
                image=placeholder_image(product.slug, hex_value, position),
                alt=f"{product.slug} in {color.name}",
                color=color,
                position=position,
            )


def _apply_admin_input(product: Product, data: dict) -> None:
    if "name" in data:
        product.name = data["name"]
    if "tagline" in data:
        product.tagline = data.get("tagline", "")
    if "description" in data:
        product.description = data.get("description", "")
    if "care" in data:
        product.care = data.get("care", "")
    if "fit" in data:
        product.fit = data.get("fit", "")
    if "base_price" in data:
        product.base_price = Decimal(data["base_price"]).quantize(Decimal("0.01"))
    if "sale_price" in data:
        raw = data["sale_price"]
        product.sale_price = Decimal(raw).quantize(Decimal("0.01")) if raw else None
    if "category_id" in data:
        product.category_id = data["category_id"]
    if "is_featured" in data:
        product.is_featured = bool(data["is_featured"])
    if "is_new" in data:
        product.is_new = bool(data["is_new"])
    product.save()

    if "colors" in data:
        for item in data["colors"]:
            Color.objects.filter(pk=item["color_id"]).update(hex=item["hex"])

    if "variants" in data:
        product.variants.all().delete()
        for v in data["variants"]:
            color = Color.objects.filter(pk=v["color_id"]).first()
            size = Size.objects.filter(pk=v["size_id"]).first()
            if not color or not size:
                raise ValidationError({"variants": ["Unknown color or size id."]})
            sku = v.get("sku") or f"STU-{color.name[:3].upper()}-{size.name}"
            ProductVariant.objects.create(
                product=product,
                sku=sku,
                color=color,
                size=size,
                price_override=from_cents(v["price_override_cents"]) if v.get("price_override_cents") is not None else None,
                stock=int(v.get("stock", 0)),
            )

    if "colors" in data and product.images.count() == 0:
        colors_with_hex = [(Color.objects.get(pk=i["color_id"]), i["hex"]) for i in data["colors"]]
        _create_images_for_colors(product, colors_with_hex)


@api_view(["GET", "POST"])
def admin_products_view(request):
    _require_staff(request)
    if request.method == "GET":
        q = request.query_params.get("q")
        qs = product_qs().order_by("id")
        if q:
            qs = qs.filter(name__icontains=q)
        return Response([ProductDetailSerializer(p).data for p in qs])
    ser = AdminProductInputSerializer(data=request.data)
    ser.is_valid(raise_exception=True)
    data = ser.validated_data
    base = slugify(data["name"])
    slug, suffix = base, 2
    while Product.objects.filter(slug=slug).exists():
        slug = f"{base}-{suffix}"
        suffix += 1
    product = Product.objects.create(
        name=data["name"],
        slug=slug,
        category_id=data["category_id"],
        base_price=Decimal(data["base_price"]).quantize(Decimal("0.01")),
        sale_price=Decimal(data.get("sale_price")).quantize(Decimal("0.01")) if data.get("sale_price") else None,
        tagline=data.get("tagline", ""),
        description=data.get("description", ""),
        care=data.get("care", ""),
        fit=data.get("fit", ""),
        is_featured=bool(data.get("is_featured", False)),
        is_new=bool(data.get("is_new", False)),
    )
    _apply_admin_input(product, data)
    return Response(ProductDetailSerializer(product_qs().get(pk=product.pk)).data, status=status.HTTP_201_CREATED)


@api_view(["GET", "PATCH", "DELETE"])
def admin_product_detail(request, pk):
    _require_staff(request)
    product = product_qs().filter(pk=pk).first()
    if not product:
        raise NotFound("Not found.")
    if request.method == "GET":
        return Response(ProductDetailSerializer(product).data)
    if request.method == "DELETE":
        CartItem.objects.filter(variant__product=product).delete()
        product.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)
    ser = AdminProductInputSerializer(data=request.data, partial=True)
    ser.is_valid(raise_exception=True)
    _apply_admin_input(product, ser.validated_data)
    return Response(ProductDetailSerializer(product_qs().get(pk=product.pk)).data)


# --- Admin: inventory ------------------------------------------------------------


@api_view(["GET"])
def admin_inventory(request):
    _require_staff(request)
    threshold = StoreSettings.get_solo().low_stock_threshold
    low_only = request.query_params.get("low") in ("true", "1")
    rows = []
    variants = ProductVariant.objects.select_related("product", "color", "size").order_by("product_id", "id")
    for v in variants:
        low = v.stock < threshold
        if low_only and not low:
            continue
        rows.append(
            {
                "variant_id": v.id,
                "sku": v.sku,
                "product_id": v.product_id,
                "product_name": v.product.name,
                "color_name": v.color.name,
                "size_name": v.size.name,
                "stock": v.stock,
                "low": low,
                "threshold": threshold,
            }
        )
    return Response(InventoryRowSerializer(rows, many=True).data)


@api_view(["PATCH"])
def admin_inventory_variant(request, pk):
    _require_staff(request)
    v = ProductVariant.objects.filter(pk=pk).first()
    if not v:
        raise NotFound("Not found.")
    try:
        stock = int(request.data.get("stock"))
    except (TypeError, ValueError):
        raise ValidationError({"stock": ["A valid integer is required."]})
    if stock < 0:
        raise ValidationError({"stock": ["Stock cannot be negative."]})
    v.stock = stock
    v.save(update_fields=["stock"])
    return Response({"variant_id": v.pk, "stock": v.stock})


# --- Admin: collections / reviews / settings ---------------------------------------


@api_view(["GET", "POST"])
def admin_collections_view(request):
    _require_staff(request)
    if request.method == "GET":
        qs = Collection.objects.all().prefetch_related("products")
        return Response(CollectionSerializer(qs, many=True).data)
    data = request.data
    if not data.get("name"):
        raise ValidationError({"name": ["This field is required."]})
    coll = Collection.objects.create(
        name=data["name"],
        slug=slugify(data["name"]),
        tagline=data.get("tagline", ""),
        description=data.get("description", ""),
    )
    _set_collection_products(coll, data.get("product_ids", []))
    return Response(CollectionSerializer(coll).data, status=status.HTTP_201_CREATED)


def _set_collection_products(coll: Collection, product_ids) -> None:
    if product_ids is None:
        return
    ids = [int(x) for x in product_ids if str(x).strip().isdigit()]
    coll.products.set(Product.objects.filter(id__in=ids))


@api_view(["GET", "PATCH", "DELETE"])
def admin_collection_detail(request, pk):
    _require_staff(request)
    coll = Collection.objects.filter(pk=pk).first()
    if not coll:
        raise NotFound("Not found.")
    if request.method == "GET":
        return Response(CollectionSerializer(coll).data)
    if request.method == "DELETE":
        coll.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)
    data = request.data
    if data.get("name") and data["name"] != coll.name:
        coll.name = data["name"]
        coll.slug = slugify(data["name"])
    if "tagline" in data:
        coll.tagline = data.get("tagline", "")
    if "description" in data:
        coll.description = data.get("description", "")
    coll.save()
    _set_collection_products(coll, data.get("product_ids"))
    return Response(CollectionSerializer(coll).data)


@api_view(["GET"])
def admin_reviews_view(request):
    _require_staff(request)
    qs = Review.objects.select_related("product").all()
    s = request.query_params.get("status")
    if s and s != "all":
        qs = qs.filter(status=s)
    return Response(ReviewSerializer(qs, many=True).data)


@api_view(["PATCH", "DELETE"])
def admin_review_detail(request, pk):
    _require_staff(request)
    review = Review.objects.filter(pk=pk).first()
    if not review:
        raise NotFound("Not found.")
    if request.method == "DELETE":
        review.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)
    s = request.data.get("status")
    if s not in dict(Review.STATUS_CHOICES):
        raise ValidationError({"status": ["Invalid status."]})
    review.status = s
    review.save(update_fields=["status"])
    return Response(ReviewSerializer(review).data)


@api_view(["GET", "PATCH"])
def admin_settings(request):
    _require_staff(request)
    solo = StoreSettings.get_solo()
    if request.method == "GET":
        return Response(StoreSettingsSerializer(solo).data)
    ser = StoreSettingsSerializer(solo, data=request.data, partial=True)
    ser.is_valid(raise_exception=True)
    ser.save()
    return Response(StoreSettingsSerializer(StoreSettings.get_solo()).data)