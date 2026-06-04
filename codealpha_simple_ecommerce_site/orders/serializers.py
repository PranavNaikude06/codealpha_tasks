from rest_framework import serializers
from products.serializers import ProductListSerializer
from .models import Order, OrderItem


class ShippingAddressSerializer(serializers.Serializer):
    """Validates the shipping address fields at checkout."""
    full_name = serializers.CharField(max_length=255)
    address = serializers.CharField(max_length=500)
    city = serializers.CharField(max_length=100)
    pin_code = serializers.CharField(max_length=20)
    phone = serializers.CharField(max_length=20)


class OrderItemSerializer(serializers.ModelSerializer):
    subtotal = serializers.DecimalField(max_digits=10, decimal_places=2, read_only=True)

    class Meta:
        model = OrderItem
        fields = ('id', 'product', 'product_name', 'quantity', 'price_at_purchase', 'subtotal')


class OrderSerializer(serializers.ModelSerializer):
    items = OrderItemSerializer(many=True, read_only=True)
    shipping_address = serializers.JSONField()

    class Meta:
        model = Order
        fields = ('id', 'status', 'total_price', 'shipping_address', 'items', 'created_at')
        read_only_fields = ('id', 'status', 'total_price', 'created_at')


class PlaceOrderSerializer(serializers.Serializer):
    """Validates the checkout request body."""
    shipping_address = ShippingAddressSerializer()
