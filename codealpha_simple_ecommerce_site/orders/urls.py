from django.urls import path
from .views import PlaceOrderView, OrderListView, OrderDetailView

urlpatterns = [
    path('', PlaceOrderView.as_view(), name='place-order'),   # POST to place
    path('list/', OrderListView.as_view(), name='order-list'),  # GET list
    path('<int:pk>/', OrderDetailView.as_view(), name='order-detail'),
]
