from rest_framework.test import APITestCase
from rest_framework import status
from django.contrib.auth import get_user_model
from products.models import Product, Category
from cart.models import Cart, CartItem
from orders.models import Order, OrderItem, OrderStatus

User = get_user_model()


class OrderAPITests(APITestCase):
    def setUp(self):
        self.place_order_url = '/api/orders/'
        self.order_list_url = '/api/orders/list/'
        
        self.user = User.objects.create_user(
            email="testuser@example.com",
            name="Test User",
            password="testpassword123"
        )
        self.other_user = User.objects.create_user(
            email="otheruser@example.com",
            name="Other User",
            password="testpassword123"
        )
        
        self.product1 = Product.objects.create(
            name="Laptop",
            description="Powerful laptop",
            price="1000.00",
            stock=5,
            category=Category.ELECTRONICS
        )
        
        self.shipping_address = {
            "full_name": "Test User",
            "address": "123 E-Commerce Lane",
            "city": "Tech City",
            "pin_code": "400001",
            "phone": "9876543210"
        }

    def test_place_order_empty_cart(self):
        self.client.force_authenticate(user=self.user)
        # Cart exists but has no items
        Cart.objects.get_or_create(user=self.user)
        
        data = {
            "shipping_address": self.shipping_address
        }
        response = self.client.post(self.place_order_url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("error", response.data)
        self.assertEqual(response.data['error'], "Cart is empty. Add items before checking out.")

    def test_place_order_success(self):
        self.client.force_authenticate(user=self.user)
        # Set up cart with 2 items
        cart, _ = Cart.objects.get_or_create(user=self.user)
        CartItem.objects.create(cart=cart, product=self.product1, quantity=2)
        
        data = {
            "shipping_address": self.shipping_address
        }
        response = self.client.post(self.place_order_url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['status'], OrderStatus.PLACED)
        self.assertEqual(float(response.data['total_price']), 2000.00)
        self.assertEqual(response.data['shipping_address']['full_name'], "Test User")
        self.assertEqual(len(response.data['items']), 1)
        self.assertEqual(response.data['items'][0]['product_name'], "Laptop")
        self.assertEqual(response.data['items'][0]['quantity'], 2)
        self.assertEqual(float(response.data['items'][0]['price_at_purchase']), 1000.00)
        
        # Verify product stock decrement (5 - 2 = 3)
        self.product1.refresh_from_db()
        self.assertEqual(self.product1.stock, 3)
        
        # Verify cart is empty
        cart.refresh_from_db()
        self.assertEqual(cart.items.count(), 0)

    def test_place_order_insufficient_stock(self):
        self.client.force_authenticate(user=self.user)
        cart, _ = Cart.objects.get_or_create(user=self.user)
        CartItem.objects.create(cart=cart, product=self.product1, quantity=6)
        
        data = {
            "shipping_address": self.shipping_address
        }
        response = self.client.post(self.place_order_url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("error", response.data)
        self.assertEqual(response.data['error'], "Insufficient stock.")
        
        # Stock should not change
        self.product1.refresh_from_db()
        self.assertEqual(self.product1.stock, 5)

    def test_order_list_authenticated(self):
        self.client.force_authenticate(user=self.user)
        
        # Create an order manually
        order = Order.objects.create(
            user=self.user,
            total_price="1000.00",
            shipping_address=self.shipping_address
        )
        OrderItem.objects.create(
            order=order,
            product=self.product1,
            product_name=self.product1.name,
            quantity=1,
            price_at_purchase=self.product1.price
        )
        
        response = self.client.get(self.order_list_url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['count'], 1)
        self.assertEqual(response.data['results'][0]['id'], order.id)

    def test_order_detail_authenticated(self):
        self.client.force_authenticate(user=self.user)
        
        order = Order.objects.create(
            user=self.user,
            total_price="1000.00",
            shipping_address=self.shipping_address
        )
        
        detail_url = f'/api/orders/{order.id}/'
        response = self.client.get(detail_url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['id'], order.id)

    def test_order_detail_unauthorized_user(self):
        # Authenticate other user
        self.client.force_authenticate(user=self.other_user)
        
        # Order belongs to self.user
        order = Order.objects.create(
            user=self.user,
            total_price="1000.00",
            shipping_address=self.shipping_address
        )
        
        detail_url = f'/api/orders/{order.id}/'
        response = self.client.get(detail_url)
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
