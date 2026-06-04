"""
Management command to seed sample product data.
Run: python manage.py seed_products
"""
from django.core.management.base import BaseCommand
from products.models import Product


SAMPLE_PRODUCTS = [
    # Electronics
    {
        "name": "Wireless Bluetooth Headphones",
        "description": "Premium over-ear headphones with active noise cancellation, 30hr battery life, and crystal-clear audio.",
        "price": "79.99",
        "stock": 50,
        "category": "electronics",
        "image_url": "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=500",
    },
    {
        "name": "USB-C Fast Charger 65W",
        "description": "GaN technology fast charger compatible with laptops, tablets, and smartphones. Charges phone to 50% in 25 minutes.",
        "price": "29.99",
        "stock": 120,
        "category": "electronics",
        "image_url": "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=500",
    },
    {
        "name": "Mechanical Keyboard TKL",
        "description": "Tenkeyless mechanical keyboard with Cherry MX Red switches, RGB backlight, and aluminum top plate.",
        "price": "119.99",
        "stock": 30,
        "category": "electronics",
        "image_url": "https://images.unsplash.com/photo-1541140532154-b024d705b90a?w=500",
    },
    {
        "name": "Portable Power Bank 20000mAh",
        "description": "High-capacity power bank with dual USB-A and USB-C ports. Charges 3 devices simultaneously.",
        "price": "39.99",
        "stock": 75,
        "category": "electronics",
        "image_url": "https://images.unsplash.com/photo-1609592806596-fb9aecd9aa13?w=500",
    },
    # Clothing
    {
        "name": "Classic Cotton T-Shirt",
        "description": "100% organic cotton unisex t-shirt. Pre-shrunk, lightweight, and available in multiple colors.",
        "price": "19.99",
        "stock": 200,
        "category": "clothing",
        "image_url": "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=500",
    },
    {
        "name": "Slim-Fit Chinos",
        "description": "Versatile slim-fit chino pants made from stretch cotton. Great for casual and smart-casual looks.",
        "price": "49.99",
        "stock": 80,
        "category": "clothing",
        "image_url": "https://images.unsplash.com/photo-1552902865-b72c031ac5ea?w=500",
    },
    {
        "name": "Hooded Zip Sweatshirt",
        "description": "Cozy fleece-lined hoodie with kangaroo pocket and YKK zipper. Perfect for layering.",
        "price": "44.99",
        "stock": 60,
        "category": "clothing",
        "image_url": "https://images.unsplash.com/photo-1620799140408-edc6dcb6d633?w=500",
    },
    # Books
    {
        "name": "Clean Code by Robert C. Martin",
        "description": "A handbook of agile software craftsmanship. Essential reading for every professional developer.",
        "price": "34.99",
        "stock": 40,
        "category": "books",
        "image_url": "https://images.unsplash.com/photo-1532012197267-da84d127e765?w=500",
    },
    {
        "name": "The Pragmatic Programmer",
        "description": "Your journey to mastery. A classic guide to software development best practices.",
        "price": "29.99",
        "stock": 35,
        "category": "books",
        "image_url": "https://images.unsplash.com/photo-1495446815901-a7297e633e8d?w=500",
    },
    {
        "name": "Django for Professionals",
        "description": "Build production-ready web applications with Django. Covers Docker, PostgreSQL, custom user models, and deployment.",
        "price": "39.99",
        "stock": 25,
        "category": "books",
        "image_url": "https://images.unsplash.com/photo-1589998059171-988d887df646?w=500",
    },
    # Home & Kitchen
    {
        "name": "Bamboo Cutting Board Set",
        "description": "Set of 3 eco-friendly bamboo cutting boards in different sizes. Naturally antimicrobial and easy to clean.",
        "price": "24.99",
        "stock": 90,
        "category": "home-kitchen",
        "image_url": "https://images.unsplash.com/photo-1528735602780-2552fd46c7af?w=500",
    },
    {
        "name": "Stainless Steel Water Bottle 1L",
        "description": "Double-wall vacuum insulated bottle. Keeps drinks cold 24hr, hot 12hr. BPA-free, leak-proof.",
        "price": "27.99",
        "stock": 110,
        "category": "home-kitchen",
        "image_url": "https://images.unsplash.com/photo-1602143407151-7111542de6e8?w=500",
    },
    # Out of stock example
    {
        "name": "Limited Edition Smartwatch",
        "description": "Premium smartwatch with health monitoring, GPS, and 7-day battery. Currently out of stock.",
        "price": "199.99",
        "stock": 0,
        "category": "electronics",
        "image_url": "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=500",
    },
]


class Command(BaseCommand):
    help = 'Seed the database with sample products'

    def add_arguments(self, parser):
        parser.add_argument(
            '--clear',
            action='store_true',
            help='Delete all existing products before seeding',
        )

    def handle(self, *args, **options):
        if options['clear']:
            count = Product.objects.count()
            Product.objects.all().delete()
            self.stdout.write(self.style.WARNING(f'Deleted {count} existing products.'))

        created = 0
        for data in SAMPLE_PRODUCTS:
            _, was_created = Product.objects.get_or_create(
                name=data['name'],
                defaults=data
            )
            if was_created:
                created += 1

        self.stdout.write(
            self.style.SUCCESS(
                f'Success: Seeded {created} products ({len(SAMPLE_PRODUCTS) - created} already existed).'
            )
        )
