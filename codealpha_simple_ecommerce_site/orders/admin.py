from django.contrib import admin
from .models import Order, OrderItem


class OrderItemInline(admin.TabularInline):
    model = OrderItem
    extra = 0
    readonly_fields = ('product_name', 'price_at_purchase', 'quantity', 'subtotal')


@admin.register(Order)
class OrderAdmin(admin.ModelAdmin):
    list_display = ('id', 'user', 'status', 'total_price', 'created_at')
    list_filter = ('status',)
    search_fields = ('user__email',)
    list_editable = ('status',)
    ordering = ('-created_at',)
    readonly_fields = ('total_price', 'shipping_address', 'created_at', 'updated_at')
    inlines = [OrderItemInline]
