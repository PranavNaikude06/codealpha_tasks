from django.urls import path
from . import template_views

urlpatterns = [
    path('', template_views.product_list_view, name='home'),
    path('products/<int:pk>/', template_views.product_detail_view, name='product-detail-page'),
]
