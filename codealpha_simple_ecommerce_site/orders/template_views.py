from django.shortcuts import render, get_object_or_404
from .models import Order


def order_list_view(request):
    return render(request, 'orders/orders.html')


def order_detail_view(request, pk):
    return render(request, 'orders/order_detail.html', {'order_id': pk})
