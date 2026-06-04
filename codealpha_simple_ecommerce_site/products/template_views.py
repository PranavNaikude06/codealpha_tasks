from django.shortcuts import render, get_object_or_404
from .models import Product


def product_list_view(request):
    """Homepage — renders the product listing template."""
    return render(request, 'products/product_list.html')


def product_detail_view(request, pk):
    """Product detail page — passes product ID to template for JS fetch."""
    product = get_object_or_404(Product, pk=pk, is_active=True)
    return render(request, 'products/product_detail.html', {'product_id': pk})
