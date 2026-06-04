from django.db import models
from django.conf import settings
from products.models import Product


class Cart(models.Model):
    """
    One active cart per user. Created automatically on first add-to-cart.
    Cleared (items deleted) after a successful order.
    """
    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='cart'
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'carts'

    def __str__(self):
        return f"Cart for {self.user.email}"

    @property
    def total(self):
        """Total price of all items in the cart."""
        return sum(item.subtotal for item in self.items.all())

    @property
    def item_count(self):
        return self.items.count()

    def clear(self):
        """Remove all items from the cart (called after order is placed)."""
        self.items.all().delete()


class CartItem(models.Model):
    """
    A single product line in a Cart.
    quantity is validated >= 1 at the API layer.
    """
    cart = models.ForeignKey(Cart, on_delete=models.CASCADE, related_name='items')
    product = models.ForeignKey(Product, on_delete=models.CASCADE)
    quantity = models.PositiveIntegerField(default=1)
    added_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'cart_items'
        unique_together = ('cart', 'product')  # one row per product per cart

    def __str__(self):
        return f"{self.quantity}x {self.product.name}"

    @property
    def subtotal(self):
        return self.product.price * self.quantity
