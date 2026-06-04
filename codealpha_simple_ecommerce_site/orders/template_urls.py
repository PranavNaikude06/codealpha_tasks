from django.urls import path
from . import template_views

urlpatterns = [
    path('', template_views.order_list_view, name='order-list-page'),
    path('<int:pk>/', template_views.order_detail_view, name='order-detail-page'),
]
