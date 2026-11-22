from decimal import Decimal
from django.conf import settings
from django.db import models



class Color(models.Model):
    name = models.CharField(max_length=40, unique=True)
    hex = models.CharField(max_length=7)

    class Meta:
        ordering = ["id"]

    def __str__(self):
        return self.name


class Size(models.Model):
    name = models.CharField(max_length=10, unique=True)
    sort_order = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ["sort_order", "id"]

    def __str__(self):
        return self.name


class Category(models.Model):
    name = models.CharField(max_length=80)
    slug = models.SlugField(unique=True)
    parent = models.ForeignKey("self", null=True, blank=True, on_delete=models.CASCADE, related_name="children")

    def __str__(self):
        return self.name


class Collection(models.Model):
    name = models.CharField(max_length=120)
    slug = models.SlugField(unique=True)
    description = models.TextField(blank=True)
    tagline = models.CharField(max_length=200, blank=True)
    hero_image = models.URLField(blank=True, null=True)
    products = models.ManyToManyField("Product", related_name="collections", blank=True)

    def __str__(self):
        return self.name


class Product(models.Model):
    name = models.CharField(max_length=160)
    slug = models.SlugField(unique=True, max_length=180)
    tagline = models.CharField(max_length=220, blank=True)
    description = models.TextField(blank=True)
    care = models.TextField(blank=True)
    fit = models.TextField(blank=True)
    base_price = models.DecimalField(max_digits=10, decimal_places=2)
    sale_price = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    category = models.ForeignKey(Category, on_delete=models.PROTECT, related_name="products")
    is_featured = models.BooleanField(default=False)
    is_new = models.BooleanField(default=False)
    units_sold_baseline = models.PositiveIntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.name


class ProductVariant(models.Model):
    product = models.ForeignKey(Product, on_delete=models.CASCADE, related_name="variants")
    sku = models.CharField(max_length=40)
    color = models.ForeignKey(Color, on_delete=models.PROTECT, related_name="variants")
    size = models.ForeignKey(Size, on_delete=models.PROTECT, related_name="variants")
    price_override = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    stock = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ["id"]
        constraints = [
            models.UniqueConstraint(fields=["product", "color", "size"], name="uniq_product_variant")
        ]

    def effective_price(self):
        return self.price_override or self.product.sale_price or self.product.base_price

    def effective_price_str(self):
        from apps.common.money import to_str

        return to_str(self.effective_price())

    def __str__(self):
        return self.sku


class ProductImage(models.Model):
    PROVIDER_CLOUDINARY = "cloudinary"
    PROVIDER_LOCAL = "local"
    PROVIDER_EXTERNAL = "external"
    PROVIDER_CHOICES = [
        (PROVIDER_CLOUDINARY, "Cloudinary"),
        (PROVIDER_LOCAL, "Local"),
        (PROVIDER_EXTERNAL, "External"),
    ]

    product = models.ForeignKey(Product, on_delete=models.CASCADE, related_name="images")
    image = models.CharField(max_length=1000)
    alt = models.CharField(max_length=220, blank=True)
    color = models.ForeignKey(Color, null=True, blank=True, on_delete=models.SET_NULL, related_name="+")
    position = models.PositiveIntegerField(default=0)
    is_primary = models.BooleanField(default=False)
    public_id = models.CharField(max_length=255, blank=True, default="", db_index=True)
    storage_provider = models.CharField(max_length=20, choices=PROVIDER_CHOICES, default=PROVIDER_EXTERNAL)
    width = models.PositiveIntegerField(null=True, blank=True)
    height = models.PositiveIntegerField(null=True, blank=True)
    format = models.CharField(max_length=20, blank=True, default="")
    bytes = models.PositiveIntegerField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True, null=True)

    class Meta:
        ordering = ["position", "id"]
        constraints = [
            models.UniqueConstraint(fields=["product", "position"], name="uniq_product_position")
        ]

    def __str__(self):
        return f"{self.product.slug} @ {self.position}"


class Review(models.Model):
    STATUS_PENDING = "pending"
    STATUS_APPROVED = "approved"
    STATUS_HIDDEN = "hidden"
    STATUS_CHOICES = [
        (STATUS_PENDING, "Pending"),
        (STATUS_APPROVED, "Approved"),
        (STATUS_HIDDEN, "Hidden"),
    ]

    product = models.ForeignKey(Product, on_delete=models.CASCADE, related_name="reviews")
    user = models.ForeignKey(settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.SET_NULL, related_name="reviews")
    user_name = models.CharField(max_length=160)
    rating = models.PositiveSmallIntegerField()
    comment = models.TextField(blank=True)
    status = models.CharField(max_length=10, choices=STATUS_CHOICES, default=STATUS_PENDING)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.product.name} — {self.rating}★"


class StoreSettings(models.Model):
    """Singleton — a single row holds store-level configuration."""

    store_name = models.CharField(max_length=120, default="Studio")
    currency = models.CharField(max_length=8, default="PHP")
    tax_rate = models.DecimalField(max_digits=6, decimal_places=4, default="0.08")
    shipping_flat_rate = models.DecimalField(max_digits=8, decimal_places=2, default="12.00")
    free_shipping_threshold = models.DecimalField(max_digits=8, decimal_places=2, null=True, blank=True, default="150.00")
    low_stock_threshold = models.PositiveIntegerField(default=5)

    class Meta:
        verbose_name_plural = "store settings"

    def __str__(self):
        return self.store_name

    @classmethod
    def get_solo(cls) -> "StoreSettings":
        obj, _ = cls.objects.get_or_create(pk=1)
        return obj


class Outfit(models.Model):
    STATUS_DRAFT = "draft"
    STATUS_PUBLISHED = "published"
    STATUS_ARCHIVED = "archived"
    STATUS_CHOICES = [
        (STATUS_DRAFT, "Draft"),
        (STATUS_PUBLISHED, "Published"),
        (STATUS_ARCHIVED, "Archived"),
    ]

    DISCOUNT_NONE = "none"
    DISCOUNT_PERCENT = "percent"
    DISCOUNT_FIXED = "fixed"
    DISCOUNT_CHOICES = [
        (DISCOUNT_NONE, "No Discount"),
        (DISCOUNT_PERCENT, "Percentage Off"),
        (DISCOUNT_FIXED, "Fixed Amount Off"),
    ]

    name = models.CharField(max_length=160)
    slug = models.SlugField(max_length=180, unique=True)
    description = models.TextField(blank=True)
    cover_image = models.CharField(max_length=1000, blank=True)
    cover_image_alt = models.CharField(max_length=220, blank=True)
    hero_image = models.CharField(max_length=1000, blank=True)
    gallery_images = models.JSONField(default=list, blank=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default=STATUS_DRAFT, db_index=True)
    is_featured = models.BooleanField(default=False, db_index=True)
    sort_order = models.PositiveIntegerField(default=0, db_index=True)

    # Optional bundle discount
    bundle_discount_type = models.CharField(max_length=10, choices=DISCOUNT_CHOICES, default=DISCOUNT_NONE)
    bundle_discount_value = models.DecimalField(max_digits=10, decimal_places=2, default=Decimal("0.00"))
    bundle_min_items = models.PositiveIntegerField(
        default=0,
        help_text="Minimum selected items required for bundle discount (0 = all items required)",
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["sort_order", "-created_at", "id"]

    def __str__(self):
        return self.name

    def calculate_bundle_pricing(self, selected_items_count: int, subtotal: Decimal) -> dict:
        """
        Calculates bundle discount and final total given selected item count and subtotal.
        Returns dict with original_total, discount_amount, final_total, is_eligible, savings_label.
        """
        total_items_in_look = self.items.count()
        req_count = self.bundle_min_items if self.bundle_min_items > 0 else total_items_in_look

        is_eligible = (
            self.bundle_discount_type != self.DISCOUNT_NONE
            and self.bundle_discount_value > Decimal("0.00")
            and selected_items_count >= req_count
            and selected_items_count > 0
        )

        discount_amount = Decimal("0.00")
        savings_label = ""

        if is_eligible:
            if self.bundle_discount_type == self.DISCOUNT_PERCENT:
                discount_amount = round(subtotal * (self.bundle_discount_value / Decimal("100.00")), 2)
                savings_label = f"Bundle Savings: {int(self.bundle_discount_value) if self.bundle_discount_value == int(self.bundle_discount_value) else self.bundle_discount_value}% Off"
            elif self.bundle_discount_type == self.DISCOUNT_FIXED:
                discount_amount = min(self.bundle_discount_value, subtotal)
                savings_label = f"Bundle Savings: ₱{self.bundle_discount_value:,.2f} Off"

        # Prevent negative totals
        discount_amount = min(discount_amount, subtotal)
        final_total = max(Decimal("0.00"), subtotal - discount_amount)

        return {
            "is_eligible": is_eligible,
            "bundle_discount_type": self.bundle_discount_type,
            "bundle_discount_value": self.bundle_discount_value,
            "discount_amount": discount_amount,
            "subtotal": subtotal,
            "final_total": final_total,
            "savings_label": savings_label,
            "required_items_count": req_count,
        }


class OutfitItem(models.Model):
    outfit = models.ForeignKey(Outfit, on_delete=models.CASCADE, related_name="items")
    product = models.ForeignKey(Product, on_delete=models.CASCADE, related_name="outfit_items")
    position = models.PositiveIntegerField(default=0)
    styling_note = models.CharField(max_length=300, blank=True)
    is_featured_item = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["position", "id"]
        constraints = [
            models.UniqueConstraint(fields=["outfit", "product"], name="uniq_outfit_product"),
        ]

    def __str__(self):
        return f"{self.outfit.name} — {self.product.name} (pos {self.position})"
