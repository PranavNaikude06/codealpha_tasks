from rest_framework import serializers
from .models import Product


class ProductListSerializer(serializers.ModelSerializer):
    """Lightweight serializer for product list/grid view."""
    in_stock = serializers.BooleanField(read_only=True)
    image_src = serializers.CharField(read_only=True)

    class Meta:
        model = Product
        fields = (
            'id', 'name', 'description', 'price',
            'category', 'image_src', 'in_stock', 'stock',
        )


class ProductDetailSerializer(serializers.ModelSerializer):
    """Full serializer for product detail view."""
    in_stock = serializers.BooleanField(read_only=True)
    image_src = serializers.CharField(read_only=True)

    class Meta:
        model = Product
        fields = (
            'id', 'name', 'description', 'price',
            'category', 'image_src', 'in_stock', 'stock',
            'created_at', 'updated_at',
        )
