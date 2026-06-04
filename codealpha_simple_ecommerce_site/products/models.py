from django.db import models


class Category(models.TextChoices):
    ELECTRONICS = 'electronics', 'Electronics'
    CLOTHING = 'clothing', 'Clothing'
    BOOKS = 'books', 'Books'
    HOME_KITCHEN = 'home-kitchen', 'Home & Kitchen'
    SPORTS = 'sports', 'Sports'
    BEAUTY = 'beauty', 'Beauty'
    OTHER = 'other', 'Other'


class Product(models.Model):
    """
    Product model. Images are stored as URLs (external links or uploaded via Admin).
    price_at_purchase is NOT stored here — it's captured on OrderItem at time of purchase.
    """
    name = models.CharField(max_length=255)
    description = models.TextField()
    price = models.DecimalField(max_digits=10, decimal_places=2)
    stock = models.PositiveIntegerField(default=0)
    category = models.CharField(
        max_length=50,
        choices=Category.choices,
        default=Category.OTHER
    )
    image = models.ImageField(upload_to='products/', blank=True, null=True)
    image_url = models.URLField(max_length=500, blank=True, null=True,
                                help_text="External image URL (used if no uploaded image)")
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'products'
        ordering = ['-created_at']
        verbose_name = 'Product'
        verbose_name_plural = 'Products'

    def __str__(self):
        return f"{self.name} (₹{self.price})"

    @property
    def in_stock(self):
        return self.stock > 0

    @property
    def image_src(self):
        """Return the best available image URL."""
        if self.image:
            return self.image.url
        return self.image_url or ''
