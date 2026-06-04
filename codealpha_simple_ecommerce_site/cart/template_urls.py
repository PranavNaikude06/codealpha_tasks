from django.urls import path
from . import template_views

urlpatterns = [
    path('', template_views.cart_view, name='cart-page'),
    path('checkout/', template_views.checkout_view, name='checkout-page'),
]
