from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import AllowAny
from rest_framework import status
from django.shortcuts import get_object_or_404

from .models import Product
from .serializers import ProductListSerializer, ProductDetailSerializer


class ProductListView(APIView):
    """
    GET /api/products/
    Returns all active products. Supports optional ?category= filter.
    """
    permission_classes = [AllowAny]

    def get(self, request):
        queryset = Product.objects.filter(is_active=True)

        # Optional category filter
        category = request.query_params.get('category')
        if category and category != 'all':
            queryset = queryset.filter(category=category)

        # Optional search
        search = request.query_params.get('search')
        if search:
            queryset = queryset.filter(name__icontains=search)

        serializer = ProductListSerializer(queryset, many=True)
        return Response({
            'count': queryset.count(),
            'results': serializer.data,
        })


class ProductDetailView(APIView):
    """
    GET /api/products/<id>/
    Returns full product detail for a single product.
    """
    permission_classes = [AllowAny]

    def get(self, request, pk):
        product = get_object_or_404(Product, pk=pk, is_active=True)
        serializer = ProductDetailSerializer(product)
        return Response(serializer.data)
