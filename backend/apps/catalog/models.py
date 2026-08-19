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
    product = models.ForeignKey(Product, on_delete=models.CASCADE, related_name="images")
    image = models.URLField(max_length=600)
    alt = models.CharField(max_length=220, blank=True)
    color = models.ForeignKey(Color, null=True, blank=True, on_delete=models.SET_NULL, related_name="+")
    position = models.PositiveIntegerField(default=0)

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
    currency = models.CharField(max_length=8, default="USD")
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