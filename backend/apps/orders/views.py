from datetime import timedelta
from decimal import Decimal

from django.db.models import Count, DecimalField, F, Sum

from django.db.models.functions import Coalesce
from django.utils import timezone
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.exceptions import NotFound, PermissionDenied, ValidationError
from rest_framework.permissions import AllowAny
from rest_framework.response import Response

from apps.accounts.serializers import AddressSerializer, UserSerializer
from apps.catalog.models import Product, ProductVariant, StoreSettings
from apps.common.money import cents_to_str, from_cents, to_cents
from apps.orders.models import Cart, CartItem, Coupon, NewsletterSubscription, Order, OrderItem, WishlistItem

from .serializers import (
    CartItemSerializer,
    CouponInputSerializer,
    CouponSerializer,
    LowStockSerializer,
    OrderSerializer,
    OrderUpdateSerializer,
    NewsletterSerializer,
    WishlistItemSerializer,
    shipping_cost_cents,
    shipping_quote_data,
    validate_coupon,
)

GUEST_KEY = "guest"


def _owner(request):
    """(user_or_None, owner_key)"""
    user = request.user
    if user and user.is_authenticated:
        return user, None
    return None, GUEST_KEY


def _cart(request):
    user, key = _owner(request)
    if user:
        cart, _ = Cart.objects.get_or_create(user=user)
    else:
        cart, _ = Cart.objects.get_or_create(owner_key=key)
    return cart


def _cart_data(cart: Cart) -> dict:
    items = cart.items.select_related("variant__product", "variant__color", "variant__size").all()
    serialized = CartItemSerializer(items, many=True).data
    subtotal_cents = sum(to_cents(i["unit_price"]) * i["quantity"] for i in serialized)
    return {
        "item_count": sum(i["quantity"] for i in serialized),
        "subtotal": cents_to_str(subtotal_cents),
        "items": serialized,
    }


def _require_staff(request):
    user = request.user
    if not user or not user.is_authenticated:
        raise PermissionDenied("Authentication credentials were not provided.")
    if not user.is_staff:
        raise PermissionDenied("Staff only.")
    return user


# --- Cart -----------------------------------------------------------------------


@api_view(["GET"])
@permission_classes([AllowAny])
def cart_view(request):
    return Response(_cart_data(_cart(request)))


@api_view(["POST"])
@permission_classes([AllowAny])
def cart_add_item(request):
    variant = ProductVariant.objects.filter(pk=request.data.get("variant_id")).first()
    if not variant:
        raise ValidationError({"variant_id": ["Variant not found."]})
    if variant.stock <= 0:
        raise ValidationError({"variant_id": ["This size is out of stock."]})
    try:
        quantity = int(request.data.get("quantity", 1))
    except (TypeError, ValueError):
        quantity = 1
    quantity = max(1, quantity)
    cart = _cart(request)
    item, created = CartItem.objects.get_or_create(cart=cart, variant=variant, defaults={"quantity": quantity})
    if not created:
        item.quantity = min(item.quantity + quantity, variant.stock)
        item.save(update_fields=["quantity"])
    return Response(_cart_data(cart), status=status.HTTP_201_CREATED)


@api_view(["PATCH", "DELETE"])
@permission_classes([AllowAny])
def cart_item_detail(request, pk):
    cart = _cart(request)
    item = cart.items.filter(pk=pk).first()
    if not item:
        raise NotFound("Not found.")
    if request.method == "DELETE":
        item.delete()
        return Response(_cart_data(cart))
    try:
        quantity = int(request.data.get("quantity", 1))
    except (TypeError, ValueError):
        quantity = 1
    if quantity < 1:
        item.delete()
        return Response(_cart_data(cart))
    item.quantity = min(quantity, item.variant.stock)
    item.save(update_fields=["quantity"])
    return Response({"cart": _cart_data(cart), "item": CartItemSerializer(item).data})


@api_view(["POST"])
@permission_classes([AllowAny])
def cart_merge(request):
    user, _ = _owner(request)
    if not user:
        raise PermissionDenied("Authentication credentials were not provided.")
    guest, _ = Cart.objects.get_or_create(owner_key=GUEST_KEY)
    mine, _ = Cart.objects.get_or_create(user=user)
    for g in guest.items.all():
        existing = mine.items.filter(variant=g.variant).first()
        if existing:
            existing.quantity = min(existing.quantity + g.quantity, 99)
            existing.save(update_fields=["quantity"])
        else:
            mine.items.add(g)
    guest.items.all().delete()
    return Response(_cart_data(mine))


# --- Wishlist --------------------------------------------------------------------


@api_view(["GET", "POST"])
@permission_classes([AllowAny])
def wishlist_view(request):
    user, key = _owner(request)
    if request.method == "GET":
        items = WishlistItem.objects.filter(user=user) if user else WishlistItem.objects.filter(owner_key=key)
        return Response(WishlistItemSerializer(items, many=True).data)
    product = Product.objects.filter(pk=request.data.get("product_id")).first()
    if not product:
        raise NotFound("Not found.")
    created = WishlistItem.objects.get_or_create(
        user=user if user else None, owner_key=None if user else key, product=product,
        defaults={"owner_key": None if user else key},
    )
    return Response({"product_id": product.pk}, status=status.HTTP_201_CREATED)


@api_view(["DELETE"])
@permission_classes([AllowAny])
def wishlist_delete(request, product_id):
    user, key = _owner(request)
    WishlistItem.objects.filter(user=user, product_id=product_id) if user else WishlistItem.objects.filter(
        owner_key=key, product_id=product_id
    ).delete()
    return Response(status=status.HTTP_204_NO_CONTENT)


# --- Checkout -----------------------------------------------------------------------


@api_view(["GET"])
@permission_classes([AllowAny])
def shipping_quote(request):
    return Response(shipping_quote_data())


@api_view(["POST"])
@permission_classes([AllowAny])
def checkout_coupon(request):
    cart = _cart(request)
    subtotal = _cart_subtotal_cents(cart)
    return Response(validate_coupon(str(request.data.get("code", "")), subtotal))


@api_view(["POST"])
@permission_classes([AllowAny])
def checkout_validate(request):
    cart = _cart(request)
    errors = []
    for item in cart.items.select_related("variant").all():
        if item.quantity > item.variant.stock:
            errors.append({"sku": item.variant.sku, "message": f"Only {item.variant.stock} available."})
    subtotal = _cart_subtotal_cents(cart)
    coupon_code = request.data.get("coupon_code") or None
    return Response(
        {
            "ok": len(errors) == 0,
            "errors": errors,
            "coupon": validate_coupon(coupon_code, subtotal) if coupon_code else None,
        }
    )


def _cart_subtotal_cents(cart: Cart) -> int:
    total = Decimal("0.00")
    for item in cart.items.select_related("variant").all():
        total += item.variant.effective_price() * item.quantity
    return to_cents(total)


def _next_order_number() -> str:
    latest = Order.objects.order_by("-id").first()
    seq = (latest.id if latest else 0) + 1
    return f"ST-{1000 + seq * 17}"


def _address_from_payload(payload: dict) -> dict:
    keys = ["recipient", "line1", "line2", "city", "state", "postal_code", "country", "phone"]
    return {k: str(payload.get(k, "")) for k in keys}


@api_view(["POST"])
@permission_classes([AllowAny])
def place_order(request):
    body = request.data
    payment = body.get("payment") or {}
    card_number = str(payment.get("number", "")).replace(" ", "")
    last4 = card_number[-4:] if len(card_number) >= 4 else "4242"
    if card_number == "4242424242424444":
        return Response({"detail": "Your card was declined. Try 4242 4242 4242 4242."}, status=status.HTTP_402_PAYMENT_REQUIRED)
    if last4 and int(last4[-1]) % 5 == 0:
        return Response({"detail": "Your card was declined."}, status=status.HTTP_402_PAYMENT_REQUIRED)

    cart = _cart(request)
    items = list(cart.items.select_related("variant__product", "variant__color", "variant__size").all())
    if not items:
        raise ValidationError({"detail": "Cart is empty."})

    subtotal_c = _cart_subtotal_cents(cart)
    coupon = validate_coupon(body.get("coupon_code"), subtotal_c)
    if body.get("coupon_code") and (not coupon or not coupon["valid"]):
        raise ValidationError({"coupon": [coupon["error"] or "Invalid coupon."]})
    discount_c = to_cents(coupon["discount"]) if coupon and coupon["valid"] else 0
    shipping_c = shipping_cost_cents(str(body.get("shipping_method", "standard")), max(0, subtotal_c - discount_c))
    settings = StoreSettings.get_solo()
    tax_c = round((subtotal_c - discount_c + shipping_c) * settings.tax_rate)
    total_c = max(0, subtotal_c - discount_c) + shipping_c + tax_c

    user, _ = _owner(request)
    shipping_address = _address_from_payload(body.get("shipping_address") or {})
    billing_same = bool(body.get("billing_same_as_shipping", True))
    billing_address = shipping_address if billing_same else _address_from_payload(body.get("billing_address") or {})
    now = timezone.now()

    order = Order.objects.create(
        order_number=_next_order_number(),
        user=user,
        customer_email=user.email if user else (shipping_address.get("recipient") or ""),
        customer_name=(f"{user.first_name} {user.last_name}".strip() if user else shipping_address.get("recipient") or ""),
        status=Order.STATUS_PAID,
        subtotal=from_cents(subtotal_c),
        shipping=from_cents(shipping_c),
        discount=from_cents(discount_c),
        tax=from_cents(tax_c),
        total=from_cents(total_c),
        coupon=Coupon.objects.filter(code__iexact=coupon["code"]).first() if coupon and coupon["valid"] else None,
        shipping_address=shipping_address,
        billing_address=billing_address,
        billing_same_as_shipping=billing_same,
        shipping_method=str(body.get("shipping_method", "standard")),
        payment_method=f"{payment.get('provider', 'paymongo')} {payment.get('method', 'card')} \u2022\u2022\u2022\u2022 {last4}",
        timeline=[
            {"status": "pending", "at": now.isoformat(), "note": None},
            {"status": "paid", "at": now.isoformat(), "note": "Payment confirmed"},
        ],
    )
    for item in items:
        v = item.variant
        img = v.product.images.filter(color=v.color).first() or v.product.images.first()
        OrderItem.objects.create(
            order=order,
            product=v.product,
            product_name=v.product.name,
            sku=v.sku,
            color_name=v.color.name,
            size_name=v.size.name,
            unit_price=v.effective_price(),
            quantity=item.quantity,
            image=img.image if img else "",
        )
        ProductVariant.objects.filter(pk=v.pk).update(stock=max(0, v.stock - item.quantity))
    if order.coupon:
        Coupon.objects.filter(pk=order.coupon.pk).update(uses=order.coupon.uses + 1)
    cart.items.all().delete()
    return Response(OrderSerializer(order).data, status=status.HTTP_201_CREATED)


# --- Customer orders ---------------------------------------------------------------


def _customer_order_or_404(request, order_number):
    user = _require_auth(request)
    order = Order.objects.filter(order_number=order_number, user=user).prefetch_related("items").first()
    if not order:
        raise NotFound("Not found.")
    return order


def _require_auth(request):
    user = request.user
    if not user or not user.is_authenticated:
        raise PermissionDenied("Authentication credentials were not provided.")
    return user


@api_view(["GET"])
def my_orders(request):
    _require_auth(request)
    orders = Order.objects.filter(user=request.user).prefetch_related("items").all()
    return Response(OrderSerializer(orders, many=True).data)


@api_view(["GET"])
def my_order(request, order_number):
    return Response(OrderSerializer(_customer_order_or_404(request, order_number)).data)


@api_view(["POST"])
def cancel_order(request, order_number):
    order = _customer_order_or_404(request, order_number)
    if order.status not in (Order.STATUS_PENDING, Order.STATUS_PAID):
        raise ValidationError({"detail": "Only pending or paid orders can be cancelled."})
    order.status = Order.STATUS_CANCELLED
    order.timeline = [*order.timeline, {"status": "cancelled", "at": timezone.now().isoformat(), "note": "Cancelled by customer"}]
    order.save(update_fields=["status", "timeline"])
    return Response(OrderSerializer(order).data)


# --- Newsletter -----------------------------------------------------------------------


@api_view(["POST"])
@permission_classes([AllowAny])
def newsletter(request):
    ser = NewsletterSerializer(data=request.data)
    if not ser.is_valid():
        return Response({"ok": False, "message": "Enter a valid email address."}, status=status.HTTP_400_BAD_REQUEST)
    NewsletterSubscription.objects.get_or_create(email=ser.validated_data["email"].lower())
    return Response({"ok": True, "message": "Welcome to the list. Consider this your confirmation email."})


# --- Admin: stats, orders, customers ------------------------------------------------------


@api_view(["GET"])
def admin_stats(request):
    _require_staff(request)
    now = timezone.now()
    thirty_days_ago = now - timedelta(days=30)
    paid_statuses = [Order.STATUS_PAID, Order.STATUS_PROCESSING, Order.STATUS_SHIPPED, Order.STATUS_DELIVERED]

    active_orders = Order.objects.filter(status__in=paid_statuses)
    revenue_total = cents_to_str(to_cents(active_orders.aggregate(t=Coalesce(Sum("total"), Decimal("0.00")))["t"]))
    recent = active_orders.filter(created_at__gte=thirty_days_ago)
    revenue_30d = cents_to_str(to_cents(recent.aggregate(t=Coalesce(Sum("total"), Decimal("0.00")))["t"]))
    orders_30d = recent.count()

    status_counts = {s: 0 for s in [s[0] for s in Order.STATUS_CHOICES]}
    for row in Order.objects.values("status").annotate(n=Count("id")):
        status_counts[row["status"]] = row["n"]

    top = []
    top_rows = (
        OrderItem.objects.filter(order__status__in=paid_statuses)
        .values("product_name")
        .annotate(
            units=Sum("quantity"),
            revenue=Sum(F("quantity") * F("unit_price"), output_field=DecimalField(max_digits=10, decimal_places=2)),
        )
        .order_by("-units")[:5]
    )
    top = [
        {"name": r["product_name"], "units": r["units"], "revenue": cents_to_str(to_cents(Decimal(str(r["revenue"]))))}
        for r in top_rows
    ]

    threshold = StoreSettings.get_solo().low_stock_threshold
    low = []
    for v in ProductVariant.objects.select_related("product", "color", "size").order_by("stock"):
        if v.stock < threshold:
            low.append(
                {
                    "sku": v.sku,
                    "product_name": v.product.name,
                    "color_name": v.color.name,
                    "size_name": v.size.name,
                    "stock": v.stock,
                    "threshold": threshold,
                }
            )

    recent_orders = Order.objects.prefetch_related("items").order_by("-created_at")[:5]

    from django.contrib.auth import get_user_model

    return Response(
        {
            "revenue_total": revenue_total,
            "revenue_30d": revenue_30d,
            "orders_30d": orders_30d,
            "orders_by_status": status_counts,
            "top_products": top,
            "low_stock": LowStockSerializer(low, many=True).data,
            "recent_orders": OrderSerializer(recent_orders, many=True).data,
            "customer_count": get_user_model().objects.filter(is_staff=False).count(),
        }
    )


@api_view(["GET"])
def admin_orders_view(request):
    _require_staff(request)
    qs = Order.objects.prefetch_related("items").all()
    s = request.query_params.get("status")
    if s and s != "all":
        qs = qs.filter(status=s)
    return Response(OrderSerializer(qs, many=True).data)


@api_view(["GET", "PATCH"])
def admin_order_detail(request, order_number):
    _require_staff(request)
    order = Order.objects.filter(order_number=order_number).prefetch_related("items").first()
    if not order:
        raise NotFound("Not found.")
    if request.method == "PATCH":
        ser = OrderUpdateSerializer(data=request.data, partial=True)
        ser.is_valid(raise_exception=True)
        data = ser.validated_data
        new_status = data.get("status")
        if new_status and new_status != order.status:
            order.status = new_status
            note = data.get("note") or None
            order.timeline = [*order.timeline, {"status": new_status, "at": timezone.now().isoformat(), "note": note}]
        if "tracking_number" in data:
            order.tracking_number = data["tracking_number"] or None
            if data.get("carrier"):
                order.carrier = data["carrier"]
        order.save(update_fields=["status", "timeline", "tracking_number", "carrier"])
    return Response(OrderSerializer(order).data)


@api_view(["GET"])
def admin_customer_list(request):
    _require_staff(request)
    from django.contrib.auth import get_user_model

    users = get_user_model().objects.filter(is_staff=False).annotate(order_count=Count("orders"))
    out = []
    for u in users:
        spent = Decimal("0.00")
        for o in u.orders.filter(status__in=["paid", "processing", "shipped", "delivered"]):
            spent += o.total
        out.append({**UserSerializer(u).data, "order_count": u.order_count, "total_spent": cents_to_str(to_cents(spent))})
    return Response(out)


@api_view(["GET"])
def admin_customer_detail(request, pk):
    _require_staff(request)
    from django.contrib.auth import get_user_model

    u = get_user_model().objects.filter(pk=pk, is_staff=False).first()
    if not u:
        raise NotFound("Not found.")
    spent = Decimal("0.00")
    orders = Order.objects.filter(user=u).prefetch_related("items").all()
    for o in orders.filter(status__in=["paid", "processing", "shipped", "delivered"]):
        spent += o.total
    data = {
        **UserSerializer(u).data,
        "order_count": orders.count(),
        "total_spent": cents_to_str(to_cents(spent)),
        "addresses": AddressSerializer(u.addresses.all(), many=True).data,
        "orders": OrderSerializer(orders, many=True).data,
    }
    return Response(data)


# --- Admin: coupons ---------------------------------------------------------------------


@api_view(["GET", "POST"])
def admin_coupons_view(request):
    _require_staff(request)
    if request.method == "GET":
        return Response(CouponSerializer(Coupon.objects.all(), many=True).data)
    ser = CouponInputSerializer(data=request.data)
    ser.is_valid(raise_exception=True)
    coupon = Coupon.objects.create(
        code=ser.validated_data["code"].upper(),
        **{k: v for k, v in ser.validated_data.items() if k != "code"}
    )
    return Response(CouponSerializer(coupon).data, status=status.HTTP_201_CREATED)


@api_view(["GET", "PATCH", "DELETE"])
def admin_coupon_detail(request, pk):
    _require_staff(request)
    coupon = Coupon.objects.filter(pk=pk).first()
    if not coupon:
        raise NotFound("Not found.")
    if request.method == "DELETE":
        coupon.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)
    if request.method == "PATCH":
        ser = CouponInputSerializer(data=request.data, partial=True)
        ser.is_valid(raise_exception=True)
        for field, value in ser.validated_data.items():
            if field == "code":
                value = value.upper()
            setattr(coupon, field, value)
        coupon.save()
    return Response(CouponSerializer(coupon).data)