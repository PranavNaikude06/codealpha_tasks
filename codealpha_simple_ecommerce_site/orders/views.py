from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework import status
from django.shortcuts import get_object_or_404
from django.db import transaction

from cart.models import Cart
from .models import Order, OrderItem
from .serializers import OrderSerializer, PlaceOrderSerializer


class PlaceOrderView(APIView):
    """
    POST /api/orders/
    Place an order from the user's current cart.

    Atomic transaction:
    1. Validate cart is not empty
    2. Validate all items have sufficient stock
    3. Create Order record
    4. Create OrderItem records (capture price_at_purchase + product_name)
    5. Decrement product stock for each item
    6. Clear the cart
    """
    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = PlaceOrderSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        try:
            cart = Cart.objects.get(user=request.user)
        except Cart.DoesNotExist:
            return Response(
                {"error": "No cart found. Add items before checking out."},
                status=status.HTTP_400_BAD_REQUEST
            )

        cart_items = cart.items.select_related('product').all()
        if not cart_items.exists():
            return Response(
                {"error": "Cart is empty. Add items before checking out."},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Validate all stock levels before touching DB
        stock_errors = []
        for item in cart_items:
            if item.product.stock < item.quantity:
                stock_errors.append(
                    f"'{item.product.name}': only {item.product.stock} unit(s) available "
                    f"(requested {item.quantity})."
                )
        if stock_errors:
            return Response(
                {"error": "Insufficient stock.", "details": stock_errors},
                status=status.HTTP_400_BAD_REQUEST
            )

        shipping_address = serializer.validated_data['shipping_address']
        total_price = cart.total

        # Atomic: order creation + stock decrement + cart clear
        with transaction.atomic():
            order = Order.objects.create(
                user=request.user,
                total_price=total_price,
                shipping_address=shipping_address,
            )

            for item in cart_items:
                OrderItem.objects.create(
                    order=order,
                    product=item.product,
                    product_name=item.product.name,   # snapshot
                    quantity=item.quantity,
                    price_at_purchase=item.product.price,  # snapshot
                )
                # Decrement stock
                item.product.stock -= item.quantity
                item.product.save(update_fields=['stock'])

            # Clear the cart
            cart.clear()

        return Response(
            OrderSerializer(order).data,
            status=status.HTTP_201_CREATED
        )


class OrderListView(APIView):
    """
    GET /api/orders/
    Returns all orders for the current user, most recent first.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        orders = Order.objects.filter(user=request.user).prefetch_related('items__product')
        serializer = OrderSerializer(orders, many=True)
        return Response({
            'count': orders.count(),
            'results': serializer.data,
        })


class OrderDetailView(APIView):
    """
    GET /api/orders/<id>/
    Returns a single order (must belong to the requesting user).
    """
    permission_classes = [IsAuthenticated]

    def get(self, request, pk):
        order = get_object_or_404(Order, pk=pk, user=request.user)
        serializer = OrderSerializer(order)
        return Response(serializer.data)
