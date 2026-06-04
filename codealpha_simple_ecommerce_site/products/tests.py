from rest_framework import status
from rest_framework.test import APITestCase
from products.models import Product, Category


class ProductCatalogTests(APITestCase):
    def setUp(self):
        self.products_url = '/api/products/'
        
        self.product1 = Product.objects.create(
            name="SonicWave Headphones",
            description="Premium active noise cancelling wireless headphones.",
            price="299.99",
            stock=15,
            category=Category.ELECTRONICS
        )
        self.product2 = Product.objects.create(
            name="Classic Denim Jacket",
            description="Vintage styled pre-washed slim fit denim jacket.",
            price="89.50",
            stock=30,
            category=Category.CLOTHING
        )
        self.product3 = Product.objects.create(
            name="Clean Code",
            description="Handbook of software craftsmanship.",
            price="35.00",
            stock=0,  # Out of stock
            category=Category.BOOKS
        )

    def test_get_all_products(self):
        response = self.client.get(self.products_url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        # Results should return all active products (3 created)
        self.assertEqual(response.data['count'], 3)

    def test_filter_products_by_category(self):
        response = self.client.get(f"{self.products_url}?category=electronics")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['count'], 1)
        self.assertEqual(response.data['results'][0]['name'], "SonicWave Headphones")

    def test_search_products(self):
        response = self.client.get(f"{self.products_url}?search=Denim")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['count'], 1)
        self.assertEqual(response.data['results'][0]['name'], "Classic Denim Jacket")

    def test_get_product_detail_success(self):
        detail_url = f"{self.products_url}{self.product1.id}/"
        response = self.client.get(detail_url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['name'], self.product1.name)
        self.assertTrue(response.data['in_stock'])

    def test_get_product_detail_out_of_stock(self):
        detail_url = f"{self.products_url}{self.product3.id}/"
        response = self.client.get(detail_url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertFalse(response.data['in_stock'])

    def test_get_product_detail_not_found(self):
        response = self.client.get(f"{self.products_url}9999/")
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
