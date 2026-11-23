import re
from datetime import timedelta
from decimal import Decimal

from django.db import transaction
from django.db.models import Min, Q
from django.db.models.functions import Coalesce
from django.utils import timezone
from rest_framework import status
from rest_framework.decorators import api_view, parser_classes, permission_classes
from rest_framework.exceptions import AuthenticationFailed, NotFound, PermissionDenied, ValidationError
from rest_framework.pagination import PageNumberPagination
from rest_framework.parsers import FormParser, JSONParser, MultiPartParser
from rest_framework.permissions import AllowAny
from rest_framework.response import Response

from apps.common.money import from_cents, placeholder_image
from apps.orders.models import CartItem

from .media_storage import (
    MediaConfigurationError,
    MediaUploadError,
    MediaValidationError,
    delete_managed_asset,
    get_media_provider,
    get_media_status,
    validate_image_file,
)
from .models import (
    Category,
    Collection,
    Color,
    Outfit,
    OutfitItem,
    Product,
    ProductImage,
    ProductVariant,
    Review,
    Size,
    StoreSettings,
)
from .serializers import (
    AddOutfitToCartInputSerializer,
    AdminOutfitInputSerializer,
    AdminProductInputSerializer,
    CategorySerializer,
    CollectionSerializer,
    ColorSerializer,
    InventoryRowSerializer,
    OutfitDetailSerializer,
    OutfitSummarySerializer,
    ProductDetailSerializer,
    ProductImageSerializer,
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
        raise AuthenticationFailed("Authentication credentials were not provided.")
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
        if ids:
            qs = qs.filter(id__in=ids)

    cat_slug = p.get("category")
    if cat_slug:
        cat = Category.objects.filter(slug=cat_slug).first()
        if not cat and cat_slug.isdigit():
            cat = Category.objects.filter(id=int(cat_slug)).first()
        if cat:
            to_visit = [cat.id]
            descendant_ids = [cat.id]
            while to_visit:
                curr_id = to_visit.pop(0)
                child_ids = list(Category.objects.filter(parent_id=curr_id).values_list("id", flat=True))
                descendant_ids.extend(child_ids)
                to_visit.extend(child_ids)
            qs = qs.filter(category_id__in=descendant_ids)

    if p.get("collection"):
        qs = qs.filter(collections__slug=p["collection"])

    if p.get("color"):
        ids = [int(x) for x in p["color"].split(",") if x.strip().isdigit()]
        if ids:
            qs = qs.filter(variants__color_id__in=ids)

    if p.get("size"):
        ids = [int(x) for x in p["size"].split(",") if x.strip().isdigit()]
        if ids:
            qs = qs.filter(variants__size_id__in=ids)

    if p.get("min_price"):
        try:
            qs = qs.filter(min_variant_price__gte=Decimal(p["min_price"]))
        except Exception:
            pass
    if p.get("max_price"):
        try:
            qs = qs.filter(min_variant_price__lte=Decimal(p["max_price"]))
        except Exception:
            pass

    if p.get("in_stock") in ("true", "1"):
        qs = qs.filter(variants__stock__gt=0)

    if p.get("new") == "true" or p.get("new") == "1":
        qs = qs.filter(Q(is_new=True) | Q(created_at__gte=timezone.now() - timedelta(days=30)))
    if p.get("featured") in ("true", "1"):
        qs = qs.filter(is_featured=True)

    q = p.get("q")
    if q:
        q_term = q.strip()
        qs = qs.filter(
            Q(name__icontains=q_term)
            | Q(tagline__icontains=q_term)
            | Q(description__icontains=q_term)
            | Q(category__name__icontains=q_term)
            | Q(category__slug__icontains=q_term)
            | Q(variants__color__name__icontains=q_term)
        )

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
        raise AuthenticationFailed("Authentication credentials were not provided.")
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


def _safe_delete_unreferenced_asset(storage_provider: str, public_id: str, exclude_id: int | None = None) -> None:
    """Delete a managed asset only if no other ProductImage record still references its public_id."""
    if not public_id or storage_provider not in (ProductImage.PROVIDER_CLOUDINARY, ProductImage.PROVIDER_LOCAL):
        return
    qs = ProductImage.objects.filter(public_id=public_id)
    if exclude_id is not None:
        qs = qs.exclude(pk=exclude_id)
    if not qs.exists():
        delete_managed_asset(storage_provider, public_id)


def _normalize_gallery_positions(product: Product, ordered_ids: list[int] | None = None, primary_id: int | None = None) -> list[ProductImage]:
    """
    Safely re-index ProductImage positions to 0..N-1 inside a transaction using a two-phase
    offset update so the (product, position) unique constraint never collides.
    Also guarantees at most one primary image exists per product.
    """
    existing = list(product.images.order_by("position", "id"))
    if not existing:
        return []

    if ordered_ids is not None:
        by_id = {img.id: img for img in existing}
        ordered = [by_id[i] for i in ordered_ids if i in by_id]
        # Append any remaining images not explicitly listed
        seen = {img.id for img in ordered}
        ordered.extend([img for img in existing if img.id not in seen])
    else:
        ordered = existing

    # Determine primary image
    chosen_primary_id = primary_id
    if chosen_primary_id is None:
        current_primary = next((img.id for img in ordered if img.is_primary), None)
        chosen_primary_id = current_primary if current_primary is not None else ordered[0].id

    # Phase 1: move to temporary non-conflicting positions
    offset = 10000
    for idx, img in enumerate(ordered):
        ProductImage.objects.filter(pk=img.pk).update(position=offset + idx)

    # Phase 2: assign final contiguous positions and primary flag
    for idx, img in enumerate(ordered):
        is_prim = img.id == chosen_primary_id
        ProductImage.objects.filter(pk=img.pk).update(position=idx, is_primary=is_prim)

    return list(product.images.order_by("position", "id"))


def _is_allowed_existing_or_placeholder_url(url: str) -> bool:
    """Allow local /media/ paths or built-in SVG data-URL placeholders; block arbitrary remote URLs."""
    trimmed = (url or "").strip()
    return trimmed.startswith("/media/") or trimmed.startswith("data:image/svg+xml")


def _create_images_for_colors(product: Product, colors: list[tuple[Color, str]]) -> None:
    has_primary = product.images.filter(is_primary=True).exists()
    for color, hex_value in colors:
        if not product.images.filter(color=color).exists():
            position = product.images.count()
            ProductImage.objects.create(
                product=product,
                image=placeholder_image(product.slug, hex_value, position),
                alt=f"{product.slug} in {color.name}",
                color=color,
                position=position,
                is_primary=not has_primary and position == 0,
                storage_provider=ProductImage.PROVIDER_EXTERNAL,
            )
            has_primary = True


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
        existing_variants = list(product.variants.all())
        seen_variant_ids = set()
        for v in data["variants"]:
            color = Color.objects.filter(pk=v["color_id"]).first()
            size = Size.objects.filter(pk=v["size_id"]).first()
            if not color or not size:
                raise ValidationError({"variants": ["Unknown color or size id."]})
            sku = v.get("sku") or f"STU-{color.name[:3].upper()}-{size.name}"
            price_override = from_cents(v["price_override_cents"]) if v.get("price_override_cents") is not None else None
            stock = int(v.get("stock", 0))

            matched = next((ex for ex in existing_variants if ex.color_id == color.id and ex.size_id == size.id), None)
            if matched:
                matched.sku = sku
                matched.price_override = price_override
                matched.stock = stock
                matched.save(update_fields=["sku", "price_override", "stock"])
                seen_variant_ids.add(matched.id)
            else:
                created = ProductVariant.objects.create(
                    product=product,
                    sku=sku,
                    color=color,
                    size=size,
                    price_override=price_override,
                    stock=stock,
                )
                seen_variant_ids.add(created.id)

        for old_v in existing_variants:
            if old_v.id not in seen_variant_ids:
                if CartItem.objects.filter(variant=old_v).exists():
                    old_v.stock = 0
                    old_v.save(update_fields=["stock"])
                else:
                    old_v.delete()

    if "images" in data:
        existing_by_id = {img.id: img for img in product.images.all()}
        existing_by_url = {img.image: img for img in existing_by_id.values()}
        kept_ids: list[int] = []
        explicit_primary_id: int | None = None

        with transaction.atomic():
            # Shift existing images to temporary positions so updates never collide
            for idx, existing_img in enumerate(existing_by_id.values()):
                ProductImage.objects.filter(pk=existing_img.pk).update(position=20000 + idx)

            for pos, img_data in enumerate(data["images"]):
                color = Color.objects.filter(pk=img_data["color_id"]).first() if img_data.get("color_id") else None
                raw_id = img_data.get("id")
                raw_url = (img_data.get("image") or "").strip()

                matched_img = existing_by_id.get(raw_id) if raw_id else existing_by_url.get(raw_url)
                if matched_img:
                    matched_img.alt = img_data.get("alt", "") or matched_img.alt or f"{product.name} image {pos + 1}"
                    matched_img.color = color
                    matched_img.position = pos
                    matched_img.save(update_fields=["alt", "color", "position"])
                    kept_ids.append(matched_img.id)
                    if img_data.get("is_primary"):
                        explicit_primary_id = matched_img.id
                else:
                    # Reject arbitrary untrusted remote URLs; require secure file uploads
                    if not _is_allowed_existing_or_placeholder_url(raw_url):
                        raise ValidationError(
                            {"images": ["Arbitrary remote image URLs are not permitted. Upload image files through the media upload endpoint."]}
                        )
                    created_img = ProductImage.objects.create(
                        product=product,
                        image=raw_url,
                        alt=img_data.get("alt", "") or f"{product.name} image {pos + 1}",
                        color=color,
                        position=pos,
                        storage_provider=ProductImage.PROVIDER_LOCAL if raw_url.startswith("/media/") else ProductImage.PROVIDER_EXTERNAL,
                    )
                    kept_ids.append(created_img.id)
                    if img_data.get("is_primary"):
                        explicit_primary_id = created_img.id

            # Remove images omitted from the updated list & collect managed assets for cleanup
            removed_assets = []
            for old_id, old_img in existing_by_id.items():
                if old_id not in kept_ids:
                    removed_assets.append((old_img.storage_provider, old_img.public_id))
                    old_img.delete()

            _normalize_gallery_positions(product, ordered_ids=kept_ids, primary_id=explicit_primary_id)

        # Safely clean up removed assets only after DB commit succeeds
        for prov, pub_id in removed_assets:
            _safe_delete_unreferenced_asset(prov, pub_id)
    elif "colors" in data and product.images.count() == 0:
        colors_with_hex = [(Color.objects.get(pk=i["color_id"]), i["hex"]) for i in data["colors"]]
        _create_images_for_colors(product, colors_with_hex)


@api_view(["GET", "POST"])
def admin_products_view(request):
    _require_staff(request)
    if request.method == "GET":
        q = request.query_params.get("q")
        qs = product_qs().prefetch_related("collections", "reviews").order_by("id")
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
        managed_assets = [
            (img.storage_provider, img.public_id)
            for img in product.images.all()
            if img.public_id
        ]
        with transaction.atomic():
            CartItem.objects.filter(variant__product=product).delete()
            product.delete()
        for prov, pub_id in managed_assets:
            _safe_delete_unreferenced_asset(prov, pub_id)
        return Response(status=status.HTTP_204_NO_CONTENT)
    ser = AdminProductInputSerializer(data=request.data, partial=True)
    ser.is_valid(raise_exception=True)
    _apply_admin_input(product, ser.validated_data)
    return Response(ProductDetailSerializer(product_qs().get(pk=product.pk)).data)


# --- Admin: product media & Cloudinary uploads -----------------------------------


def _parse_bool_flag(raw) -> bool:
    if isinstance(raw, bool):
        return raw
    return str(raw or "").strip().lower() in ("true", "1", "yes", "on")


def _parse_optional_color(raw) -> Color | None:
    if raw in (None, "", "null", "none"):
        return None
    try:
        cid = int(raw)
    except (TypeError, ValueError):
        raise ValidationError({"color_id": ["Invalid color ID."]})
    color = Color.objects.filter(pk=cid).first()
    if not color:
        raise ValidationError({"color_id": ["Color not found."]})
    return color


@api_view(["GET"])
def admin_media_config(request):
    """Return non-sensitive media storage status for admin product editor."""
    _require_staff(request)
    return Response(get_media_status())


@api_view(["GET", "POST"])
@parser_classes([MultiPartParser, FormParser, JSONParser])
def admin_product_images_view(request, product_id):
    """
    GET  /api/admin/products/<product_id>/images/ -> list product gallery images
    POST /api/admin/products/<product_id>/images/ -> securely upload one or multiple image files
    """
    _require_staff(request)
    product = Product.objects.filter(pk=product_id).first()
    if not product:
        raise NotFound("Product not found.")

    if request.method == "GET":
        imgs = product.images.order_by("position", "id")
        return Response(ProductImageSerializer(imgs, many=True).data)

    # Explicitly block arbitrary remote URL uploads on the upload endpoint
    if not request.FILES:
        if request.data.get("url") or request.data.get("image"):
            raise ValidationError(
                {"file": ["Arbitrary remote URL uploads are not permitted. Upload an image file instead."]}
            )
        raise ValidationError({"file": ["An image file is required."]})

    uploaded_files = request.FILES.getlist("files") or request.FILES.getlist("file")
    if not uploaded_files:
        raise ValidationError({"file": ["No image file found in request."]})

    color = _parse_optional_color(request.data.get("color_id"))
    alt_input = str(request.data.get("alt", "")).strip()[:220]
    make_primary = _parse_bool_flag(request.data.get("is_primary"))

    # Step 1: Validate ALL files before calling external storage provider
    validated_batch = []
    for f in uploaded_files:
        try:
            validated_batch.append(validate_image_file(f))
        except MediaValidationError as exc:
            raise ValidationError({"file": [str(exc)]})

    # Step 2: Resolve provider (fails clearly if Cloudinary enabled with missing credentials)
    try:
        provider = get_media_provider()
    except MediaConfigurationError as exc:
        return Response({"detail": str(exc)}, status=status.HTTP_503_SERVICE_UNAVAILABLE)

    # Step 3: Upload files and associate atomically; roll back remote assets on failure
    uploaded_assets = []
    created_records: list[ProductImage] = []
    try:
        for validated in validated_batch:
            asset = provider.upload_image(
                validated,
                product_id=product.id,
                product_slug=product.slug,
                color_id=color.id if color else None,
            )
            uploaded_assets.append(asset)

        with transaction.atomic():
            base_pos = (product.images.order_by("-position").values_list("position", flat=True).first())
            next_pos = 0 if base_pos is None else base_pos + 1
            had_existing = product.images.exists()

            for idx, asset in enumerate(uploaded_assets):
                alt_text = alt_input or f"{product.name} — view {next_pos + idx + 1}"
                rec = ProductImage.objects.create(
                    product=product,
                    image=asset.url,
                    alt=alt_text,
                    color=color,
                    position=next_pos + idx,
                    is_primary=False,
                    public_id=asset.public_id,
                    storage_provider=asset.storage_provider,
                    width=asset.width,
                    height=asset.height,
                    format=asset.format,
                    bytes=asset.bytes,
                )
                created_records.append(rec)

            primary_id = None
            if make_primary and created_records:
                primary_id = created_records[0].id
            elif not had_existing and created_records:
                primary_id = created_records[0].id

            _normalize_gallery_positions(product, primary_id=primary_id)
    except MediaUploadError as exc:
        for asset in uploaded_assets:
            delete_managed_asset(asset.storage_provider, asset.public_id)
        return Response({"detail": str(exc)}, status=status.HTTP_502_BAD_GATEWAY)
    except Exception:
        # Clean up any uploaded assets if DB association fails
        for asset in uploaded_assets:
            delete_managed_asset(asset.storage_provider, asset.public_id)
        raise

    refreshed = list(ProductImage.objects.filter(pk__in=[r.pk for r in created_records]).order_by("position", "id"))
    if len(refreshed) == 1 and "files" not in request.FILES:
        return Response(ProductImageSerializer(refreshed[0]).data, status=status.HTTP_201_CREATED)
    return Response(ProductImageSerializer(refreshed, many=True).data, status=status.HTTP_201_CREATED)


@api_view(["PATCH", "DELETE"])
@parser_classes([MultiPartParser, FormParser, JSONParser])
def admin_product_image_detail(request, product_id, image_id):
    """
    PATCH  /api/admin/products/<product_id>/images/<image_id>/ -> update metadata or replace file safely
    DELETE /api/admin/products/<product_id>/images/<image_id>/ -> delete image record and clean up unreferenced asset
    """
    _require_staff(request)
    product = Product.objects.filter(pk=product_id).first()
    if not product:
        raise NotFound("Product not found.")

    img = ProductImage.objects.filter(pk=image_id, product=product).first()
    if not img:
        raise NotFound("Image not found for this product.")

    if request.method == "DELETE":
        old_provider = img.storage_provider
        old_public_id = img.public_id
        was_primary = img.is_primary
        with transaction.atomic():
            img.delete()
            remaining = _normalize_gallery_positions(
                product,
                primary_id=None if was_primary else None,
            )
        _safe_delete_unreferenced_asset(old_provider, old_public_id)
        return Response(
            {
                "deleted_id": image_id,
                "images": ProductImageSerializer(remaining, many=True).data,
            },
            status=status.HTTP_200_OK,
        )

    # PATCH: optionally replace image binary AND/OR update alt, color_id, is_primary
    if "url" in request.data or "image" in request.data:
        if not request.FILES:
            raise ValidationError(
                {"file": ["Direct URL replacement is not permitted. Upload an image file to replace this asset."]}
            )

    new_file = request.FILES.get("file")
    new_asset = None
    old_provider = img.storage_provider
    old_public_id = img.public_id

    if new_file is not None:
        try:
            validated = validate_image_file(new_file)
        except MediaValidationError as exc:
            raise ValidationError({"file": [str(exc)]})

        try:
            provider = get_media_provider()
        except MediaConfigurationError as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_503_SERVICE_UNAVAILABLE)

        try:
            target_color = (
                _parse_optional_color(request.data.get("color_id"))
                if "color_id" in request.data
                else img.color
            )
            new_asset = provider.upload_image(
                validated,
                product_id=product.id,
                product_slug=product.slug,
                color_id=target_color.id if target_color else None,
            )
        except MediaUploadError as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_502_BAD_GATEWAY)

    try:
        with transaction.atomic():
            if "alt" in request.data:
                img.alt = str(request.data.get("alt") or "").strip()[:220]
            if "color_id" in request.data:
                img.color = _parse_optional_color(request.data.get("color_id"))
            if new_asset is not None:
                img.image = new_asset.url
                img.public_id = new_asset.public_id
                img.storage_provider = new_asset.storage_provider
                img.width = new_asset.width
                img.height = new_asset.height
                img.format = new_asset.format
                img.bytes = new_asset.bytes
            img.save()

            if "is_primary" in request.data and _parse_bool_flag(request.data.get("is_primary")):
                _normalize_gallery_positions(product, primary_id=img.id)
    except Exception:
        # Roll back newly uploaded asset so DB failure leaves zero orphans
        if new_asset is not None:
            delete_managed_asset(new_asset.storage_provider, new_asset.public_id)
        raise

    # Only delete the old asset AFTER replacement has been committed to the database
    if new_asset is not None and old_public_id and old_public_id != new_asset.public_id:
        _safe_delete_unreferenced_asset(old_provider, old_public_id, exclude_id=img.pk)

    img.refresh_from_db()
    return Response(ProductImageSerializer(img).data, status=status.HTTP_200_OK)


@api_view(["POST"])
def admin_product_images_reorder(request, product_id):
    """POST /api/admin/products/<product_id>/images/reorder/ with {'image_ids': [...]}."""
    _require_staff(request)
    product = Product.objects.filter(pk=product_id).first()
    if not product:
        raise NotFound("Product not found.")

    raw_ids = request.data.get("image_ids")
    if not isinstance(raw_ids, list) or not raw_ids:
        raise ValidationError({"image_ids": ["A non-empty list of image IDs is required."]})

    try:
        ordered_ids = [int(x) for x in raw_ids]
    except (TypeError, ValueError):
        raise ValidationError({"image_ids": ["All image IDs must be integers."]})

    valid_ids = set(product.images.values_list("id", flat=True))
    foreign_ids = [i for i in ordered_ids if i not in valid_ids]
    if foreign_ids:
        raise ValidationError({"image_ids": ["One or more image IDs do not belong to this product."]})

    with transaction.atomic():
        reordered = _normalize_gallery_positions(product, ordered_ids=ordered_ids)

    return Response(ProductImageSerializer(reordered, many=True).data, status=status.HTTP_200_OK)


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


# --- Shop the Look / Outfits & Coordinated Bundles --------------------------


@api_view(["GET"])
@permission_classes([AllowAny])
def outfit_list(request):
    """
    GET /api/looks/ and /api/outfits/
    Public listing of published Shop the Look outfits.
    """
    qs = Outfit.objects.filter(status=Outfit.STATUS_PUBLISHED).prefetch_related("items__product")
    if request.query_params.get("featured") == "true":
        qs = qs.filter(is_featured=True)
    return Response(OutfitSummarySerializer(qs, many=True).data)


@api_view(["GET"])
@permission_classes([AllowAny])
def outfit_detail(request, slug):
    """
    GET /api/looks/<slug>/ and /api/outfits/<slug>/
    Detailed outfit spread with all styled products, colorways, sizes, and bundle pricing.
    Draft outfits are accessible to staff for real-time editorial preview.
    """
    outfit = (
        Outfit.objects.filter(slug=slug)
        .prefetch_related(
            "items__product__images",
            "items__product__variants__color",
            "items__product__variants__size",
        )
        .first()
    )
    if not outfit:
        raise NotFound("Outfit not found.")

    if outfit.status != Outfit.STATUS_PUBLISHED and not (
        request.user and request.user.is_authenticated and request.user.is_staff
    ):
        raise NotFound("Outfit not found.")

    return Response(OutfitDetailSerializer(outfit).data)


@api_view(["POST"])
@permission_classes([AllowAny])
def outfit_add_to_cart(request, slug):
    """
    POST /api/looks/<slug>/add-to-cart/
    Atomically adds the selected outfit items to the customer's cart.
    Validates variants, inventory availability, pricing, and bundle discount qualifications.
    """
    outfit = Outfit.objects.filter(slug=slug).first()
    if not outfit:
        raise NotFound("Outfit not found.")

    if outfit.status != Outfit.STATUS_PUBLISHED and not (
        request.user and request.user.is_authenticated and request.user.is_staff
    ):
        raise NotFound("Outfit not found or is currently unavailable.")

    ser = AddOutfitToCartInputSerializer(data=request.data)
    ser.is_valid(raise_exception=True)
    submitted_items = ser.validated_data["items"]

    if not submitted_items:
        raise ValidationError({"items": ["At least one item must be selected from the look."]})

    # Verify every product belongs to this outfit
    outfit_product_ids = set(outfit.items.values_list("product_id", flat=True))

    from apps.orders.models import CartItem, Coupon
    from apps.orders.views import _cart, _cart_data

    variant_ids = [it["variant_id"] for it in submitted_items]
    variants_by_id = {
        v.id: v
        for v in ProductVariant.objects.select_related("product", "size", "color").filter(id__in=variant_ids)
    }

    # Validate stock and product association
    for it in submitted_items:
        p_id = it["product_id"]
        v_id = it["variant_id"]
        qty = it.get("quantity", 1)

        if p_id not in outfit_product_ids:
            raise ValidationError({"items": [f"Product ID {p_id} is not part of this look."]})

        v = variants_by_id.get(v_id)
        if not v or v.product_id != p_id:
            raise ValidationError({"items": [f"Selected variant {v_id} does not belong to product {p_id}."]})

        if v.stock < qty:
            raise ValidationError({
                "stock": [f"'{v.product.name}' ({v.color.name} / {v.size.name}) is out of stock ({v.stock} available)."],
                "unavailable_variant_id": v.id,
            })

    # Atomic cart update
    with transaction.atomic():
        cart = _cart(request)
        for it in submitted_items:
            v = variants_by_id[it["variant_id"]]
            qty = it.get("quantity", 1)
            cart_item, created = CartItem.objects.get_or_create(
                cart=cart, variant=v, defaults={"quantity": qty}
            )
            if not created:
                cart_item.quantity = min(cart_item.quantity + qty, v.stock)
                cart_item.save(update_fields=["quantity"])

    # Calculate bundle discount
    subtotal = sum(
        (variants_by_id[it["variant_id"]].effective_price() * it.get("quantity", 1) for it in submitted_items),
        Decimal("0.00"),
    )
    calc = outfit.calculate_bundle_pricing(len(submitted_items), subtotal)

    # If bundle discount applies, ensure an active Coupon exists
    coupon_code = None
    if calc["is_eligible"]:
        coupon_code = f"BUNDLE-{outfit.slug.upper()[:25]}"
        coupon_type = (
            Coupon.TYPE_PERCENT if outfit.bundle_discount_type == Outfit.DISCOUNT_PERCENT else Coupon.TYPE_FIXED
        )
        Coupon.objects.update_or_create(
            code=coupon_code,
            defaults={
                "type": coupon_type,
                "value": outfit.bundle_discount_value,
                "min_order_value": Decimal("0.00"),
                "is_active": True,
            },
        )

    return Response(
        {
            "cart": _cart_data(cart),
            "items_added": len(submitted_items),
            "bundle_applied": calc["is_eligible"],
            "bundle_discount": str(calc["discount_amount"]),
            "bundle_coupon_code": coupon_code,
            "savings_label": calc["savings_label"],
            "message": f"Added {len(submitted_items)} items from {outfit.name} to your bag.",
        },
        status=status.HTTP_201_CREATED,
    )


# --- Admin Outfit Endpoints -------------------------------------------------


def _sync_outfit_items(outfit: Outfit, items_data: list):
    outfit.items.all().delete()
    for idx, item_data in enumerate(items_data):
        product_id = item_data.get("product_id")
        product = Product.objects.filter(id=product_id).first()
        if product:
            OutfitItem.objects.create(
                outfit=outfit,
                product=product,
                position=item_data.get("position", idx),
                styling_note=item_data.get("styling_note", ""),
                is_featured_item=item_data.get("is_featured_item", False),
            )


@api_view(["GET", "POST"])
def admin_outfits_view(request):
    _require_staff(request)
    if request.method == "GET":
        qs = Outfit.objects.prefetch_related("items__product").all()
        status_param = request.query_params.get("status")
        if status_param and status_param != "all":
            qs = qs.filter(status=status_param)
        return Response(OutfitSummarySerializer(qs, many=True).data)

    ser = AdminOutfitInputSerializer(data=request.data)
    ser.is_valid(raise_exception=True)
    data = ser.validated_data

    slug_val = slugify(data.get("slug") or data["name"])
    base_slug = slug_val
    counter = 1
    while Outfit.objects.filter(slug=slug_val).exists():
        slug_val = f"{base_slug}-{counter}"
        counter += 1

    with transaction.atomic():
        outfit = Outfit.objects.create(
            name=data["name"],
            slug=slug_val,
            description=data.get("description", ""),
            cover_image=data.get("cover_image", ""),
            cover_image_alt=data.get("cover_image_alt", ""),
            hero_image=data.get("hero_image", ""),
            gallery_images=data.get("gallery_images", []),
            status=data.get("status", Outfit.STATUS_DRAFT),
            is_featured=data.get("is_featured", False),
            sort_order=data.get("sort_order", 0),
            bundle_discount_type=data.get("bundle_discount_type", Outfit.DISCOUNT_NONE),
            bundle_discount_value=data.get("bundle_discount_value", Decimal("0.00")),
            bundle_min_items=data.get("bundle_min_items", 0),
        )
        if "items" in data:
            _sync_outfit_items(outfit, data["items"])

    return Response(OutfitDetailSerializer(outfit).data, status=status.HTTP_201_CREATED)


@api_view(["GET", "PATCH", "PUT", "DELETE"])
def admin_outfit_detail(request, pk):
    _require_staff(request)
    outfit = Outfit.objects.filter(pk=pk).first()
    if not outfit:
        raise NotFound("Outfit not found.")

    if request.method == "GET":
        return Response(OutfitDetailSerializer(outfit).data)

    if request.method == "DELETE":
        outfit.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)

    ser = AdminOutfitInputSerializer(data=request.data, partial=True)
    ser.is_valid(raise_exception=True)
    data = ser.validated_data

    with transaction.atomic():
        if "name" in data and data["name"] != outfit.name:
            outfit.name = data["name"]
        if "slug" in data and data["slug"] and data["slug"] != outfit.slug:
            slug_cand = slugify(data["slug"])
            if Outfit.objects.filter(slug=slug_cand).exclude(pk=outfit.pk).exists():
                raise ValidationError({"slug": ["An outfit with this slug already exists."]})
            outfit.slug = slug_cand
        for f in [
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
        ]:
            if f in data:
                setattr(outfit, f, data[f])
        outfit.save()

        if "items" in data:
            _sync_outfit_items(outfit, data["items"])

    return Response(OutfitDetailSerializer(outfit).data)
