from rest_framework.test import APITestCase
from rest_framework import status
from django.contrib.auth import get_user_model
from products.models import Product, Category
from cart.models import Cart, CartItem

User = get_user_model()


class CartAPITests(APITestCase):
    def setUp(self):
        self.cart_url = '/api/cart/'
        self.add_url = '/api/cart/add/'
        
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
            price="999.99",
            stock=5,
            category=Category.ELECTRONICS
        )
        self.product2 = Product.objects.create(
            name="T-Shirt",
            description="Cotton t-shirt",
            price="19.99",
            stock=10,
            category=Category.CLOTHING
        )

    def test_get_cart_unauthenticated(self):
        response = self.client.get(self.cart_url)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_get_cart_authenticated_empty(self):
        self.client.force_authenticate(user=self.user)
        response = self.client.get(self.cart_url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['item_count'], 0)
        self.assertEqual(float(response.data['total']), 0.0)
        self.assertEqual(len(response.data['items']), 0)

    def test_add_to_cart_success(self):
        self.client.force_authenticate(user=self.user)
        data = {
            "product_id": self.product1.id,
            "quantity": 2
        }
        response = self.client.post(self.add_url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['item_count'], 1)
        self.assertEqual(float(response.data['total']), 1999.98)
        self.assertEqual(len(response.data['items']), 1)
        self.assertEqual(response.data['items'][0]['quantity'], 2)
        self.assertEqual(response.data['items'][0]['product']['id'], self.product1.id)

    def test_add_to_cart_insufficient_stock(self):
        self.client.force_authenticate(user=self.user)
        data = {
            "product_id": self.product1.id,
            "quantity": 6  # stock is 5
        }
        response = self.client.post(self.add_url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("error", response.data)
        self.assertTrue(response.data['error'].startswith("Only 5 unit(s) available."))

    def test_add_to_cart_accumulate(self):
        self.client.force_authenticate(user=self.user)
        # First add
        self.client.post(self.add_url, {"product_id": self.product1.id, "quantity": 2}, format='json')
        # Second add of the same item
        response = self.client.post(self.add_url, {"product_id": self.product1.id, "quantity": 2}, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['items'][0]['quantity'], 4)
        
        # Third add exceeding remaining stock (total would be 6, stock is 5)
        response_fail = self.client.post(self.add_url, {"product_id": self.product1.id, "quantity": 2}, format='json')
        self.assertEqual(response_fail.status_code, status.HTTP_400_BAD_REQUEST)

    def test_update_cart_item_quantity(self):
        self.client.force_authenticate(user=self.user)
        # Add item
        self.client.post(self.add_url, {"product_id": self.product1.id, "quantity": 2}, format='json')
        cart = Cart.objects.get(user=self.user)
        item = CartItem.objects.get(cart=cart, product=self.product1)
        
        update_url = f'/api/cart/update/{item.id}/'
        
        # Valid update
        response = self.client.patch(update_url, {"quantity": 4}, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['items'][0]['quantity'], 4)
        
        # Invalid update exceeding stock
        response_fail = self.client.patch(update_url, {"quantity": 6}, format='json')
        self.assertEqual(response_fail.status_code, status.HTTP_400_BAD_REQUEST)

    def test_remove_cart_item(self):
        self.client.force_authenticate(user=self.user)
        # Add item
        self.client.post(self.add_url, {"product_id": self.product1.id, "quantity": 2}, format='json')
        cart = Cart.objects.get(user=self.user)
        item = CartItem.objects.get(cart=cart, product=self.product1)
        
        remove_url = f'/api/cart/remove/{item.id}/'
        
        response = self.client.delete(remove_url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['item_count'], 0)
        self.assertFalse(CartItem.objects.filter(id=item.id).exists())
