from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework import status
from django.shortcuts import get_object_or_404

from products.models import Product
from .models import Cart, CartItem
from .serializers import CartSerializer, AddToCartSerializer, UpdateCartItemSerializer


class CartView(APIView):
    """
    GET /api/cart/
    Returns the current user's cart with all items, subtotals, and total.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        cart, _ = Cart.objects.get_or_create(user=request.user)
        serializer = CartSerializer(cart)
        return Response(serializer.data)


class AddToCartView(APIView):
    """
    POST /api/cart/add/
    Add a product to the cart. If already in cart, increments quantity.
    """
    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = AddToCartSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        product_id = serializer.validated_data['product_id']
        quantity = serializer.validated_data['quantity']

        product = get_object_or_404(Product, pk=product_id, is_active=True)

        if product.stock < quantity:
            return Response(
                {"error": f"Only {product.stock} unit(s) available."},
                status=status.HTTP_400_BAD_REQUEST
            )

        cart, _ = Cart.objects.get_or_create(user=request.user)

        cart_item, created = CartItem.objects.get_or_create(
            cart=cart,
            product=product,
            defaults={'quantity': quantity}
        )

        if not created:
            # Already in cart — increment
            new_qty = cart_item.quantity + quantity
            if product.stock < new_qty:
                return Response(
                    {"error": f"Only {product.stock} unit(s) available."},
                    status=status.HTTP_400_BAD_REQUEST
                )
            cart_item.quantity = new_qty
            cart_item.save()

        return Response(CartSerializer(cart).data, status=status.HTTP_200_OK)


class UpdateCartItemView(APIView):
    """
    PATCH /api/cart/update/<item_id>/
    Update the quantity of a specific cart item.
    """
    permission_classes = [IsAuthenticated]

    def patch(self, request, item_id):
        serializer = UpdateCartItemSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        cart = get_object_or_404(Cart, user=request.user)
        item = get_object_or_404(CartItem, pk=item_id, cart=cart)

        new_qty = serializer.validated_data['quantity']

        if item.product.stock < new_qty:
            return Response(
                {"error": f"Only {item.product.stock} unit(s) available."},
                status=status.HTTP_400_BAD_REQUEST
            )

        item.quantity = new_qty
        item.save()

        return Response(CartSerializer(cart).data)


class RemoveCartItemView(APIView):
    """
    DELETE /api/cart/remove/<item_id>/
    Remove a specific item from the cart.
    """
    permission_classes = [IsAuthenticated]

    def delete(self, request, item_id):
        cart = get_object_or_404(Cart, user=request.user)
        item = get_object_or_404(CartItem, pk=item_id, cart=cart)
        item.delete()
        return Response(CartSerializer(cart).data)
