/**
 * orders.js — Manages listing order history and displaying single order detail confirmation
 */

function formatDate(isoString) {
    const options = { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' };
    return new Date(isoString).toLocaleDateString(undefined, options);
}

function getStatusBadgeClass(status) {
    status = status.toLowerCase();
    if (status === 'placed') {
        return 'bg-blue-100 text-blue-700 border border-blue-200';
    } else if (status === 'processing') {
        return 'bg-amber-100 text-amber-700 border border-amber-200';
    } else if (status === 'delivered') {
        return 'bg-green-100 text-green-700 border border-green-200';
    } else if (status === 'cancelled') {
        return 'bg-red-100 text-red-700 border border-red-200';
    }
    return 'bg-outline-variant/20 text-outline border border-outline-variant/30';
}

async function loadOrderDetail() {
    const loader = document.getElementById('order-loading-container');
    const card = document.getElementById('order-detail-card');
    const actions = document.getElementById('order-actions');
    const successHeader = document.getElementById('order-success-header');

    try {
        const response = await AUTH.fetchAuth(`/api/orders/${ORDER_ID}/`);
        if (!response || !response.ok) {
            loader.innerHTML = `
                <span class="material-symbols-outlined text-[48px] text-error">error</span>
                <p class="text-on-surface-variant font-body-md mt-sm">We couldn't retrieve this order's history.</p>
                <a href="/orders/" class="mt-md text-primary font-semibold hover:underline">Go to my orders</a>
            `;
            return;
        }

        const order = await response.json();

        // Check if redirected from checkout success
        if (document.referrer.includes('/checkout/') || window.location.search.includes('success=1')) {
            successHeader.classList.remove('hidden');
        }

        // Set metadata
        document.getElementById('order-number-title').textContent = `ID: #ORD-${order.id}`;
        document.getElementById('order-date').textContent = `Ordered on ${formatDate(order.created_at)}`;
        
        const statusBadge = document.getElementById('order-status-badge');
        statusBadge.textContent = order.status;
        statusBadge.className = `px-sm py-xs rounded-full text-label-sm font-label-sm font-bold ${getStatusBadgeClass(order.status)}`;

        // Populate Shipping Address
        const addr = order.shipping_address || {};
        document.getElementById('shipping-name').textContent = addr.full_name || 'N/A';
        document.getElementById('shipping-address').textContent = addr.address || '';
        document.getElementById('shipping-city-zip').textContent = `${addr.city || ''}, PIN ${addr.pin_code || ''}`;
        document.getElementById('shipping-phone').textContent = `Phone: ${addr.phone || 'N/A'}`;

        // Populate calculation prices
        const price = parseFloat(order.total_price);
        document.getElementById('order-subtotal').textContent = `₹${price.toFixed(2)}`;
        document.getElementById('order-total').textContent = `₹${price.toFixed(2)}`;

        // Populate items list
        const items = order.items || [];
        const itemsList = document.getElementById('order-items-list');

        itemsList.innerHTML = items.map(item => `
            <div class="flex items-center gap-md border-b border-surface-variant/20 pb-sm last:border-b-0 last:pb-0">
                <div class="w-16 h-16 rounded-lg bg-surface-container flex items-center justify-center flex-shrink-0 text-primary">
                    <span class="material-symbols-outlined text-[32px]">shopping_bag</span>
                </div>
                <div class="flex-1">
                    <h4 class="font-body-md text-body-md font-semibold text-on-surface">${item.product_name}</h4>
                    <p class="text-body-sm font-body-sm text-on-surface-variant">Qty: ${item.quantity} • Price: ₹${parseFloat(item.price_at_purchase).toFixed(2)}</p>
                </div>
                <p class="font-body-md text-body-md font-bold text-on-surface">₹${parseFloat(item.subtotal).toFixed(2)}</p>
            </div>
        `).join('');

        // Switch layouts
        loader.classList.add('hidden');
        card.classList.remove('hidden');
        actions.classList.remove('hidden');
    } catch (err) {
        console.error('Error fetching order details:', err);
        loader.innerHTML = `
            <span class="material-symbols-outlined text-[48px] text-error">cloud_off</span>
            <p class="text-on-surface-variant font-body-md mt-sm">Network error while fetching details.</p>
        `;
    }
}

async function loadOrdersList() {
    const loader = document.getElementById('orders-loading-container');
    const emptyContainer = document.getElementById('orders-empty-container');
    const listContainer = document.getElementById('orders-list-container');

    try {
        const response = await AUTH.fetchAuth('/api/orders/list/');
        if (!response || !response.ok) {
            loader.innerHTML = `
                <span class="material-symbols-outlined text-[48px] text-error">error</span>
                <p class="text-on-surface-variant font-body-md mt-sm">Failed to retrieve order history.</p>
            `;
            return;
        }

        const data = await response.json();
        const orders = data.results || [];

        if (orders.length === 0) {
            loader.classList.add('hidden');
            listContainer.classList.add('hidden');
            emptyContainer.classList.remove('hidden');
            return;
        }

        // Render orders stack
        listContainer.innerHTML = orders.map(order => {
            const firstItemName = order.items && order.items.length > 0 ? order.items[0].product_name : 'Purchase';
            const extraItemsCount = order.items && order.items.length > 1 ? order.items.length - 1 : 0;
            const itemsText = extraItemsCount > 0 ? `${firstItemName} + ${extraItemsCount} more item(s)` : firstItemName;
            
            return `
                <div class="bg-white rounded-xl shadow-[0_2px_4px_rgba(0,0,0,0.05)] p-lg flex flex-col md:flex-row gap-lg items-center transition-all hover:shadow-[0_4px_8px_rgba(0,0,0,0.1)] border border-surface-variant/30">
                    <div class="flex-shrink-0 w-20 h-20 rounded-lg overflow-hidden bg-surface-container-low flex items-center justify-center text-primary">
                        <span class="material-symbols-outlined text-[36px]">receipt_long</span>
                    </div>
                    <div class="flex-grow grid grid-cols-2 md:grid-cols-4 gap-md w-full">
                        <div class="flex flex-col">
                            <span class="font-label-sm text-label-sm text-outline uppercase tracking-wider">Order Reference</span>
                            <span class="font-headline-sm text-headline-sm font-semibold text-on-surface">#ORD-${order.id}</span>
                        </div>
                        <div class="flex flex-col">
                            <span class="font-label-sm text-label-sm text-outline uppercase tracking-wider">Items summary</span>
                            <span class="font-body-md text-body-md text-on-surface line-clamp-1">${itemsText}</span>
                        </div>
                        <div class="flex flex-col">
                            <span class="font-label-sm text-label-sm text-outline uppercase tracking-wider">Total amount</span>
                            <span class="font-body-md text-body-md text-secondary font-bold">₹${parseFloat(order.total_price).toFixed(2)}</span>
                        </div>
                        <div class="flex flex-col items-start md:items-end justify-center">
                            <span class="px-md py-xs rounded-full font-label-md text-label-md font-bold ${getStatusBadgeClass(order.status)}">
                                ${order.status}
                            </span>
                        </div>
                    </div>
                    <div class="flex-shrink-0 md:pl-lg w-full md:w-auto text-right">
                        <a class="flex items-center justify-end gap-xs font-label-md text-label-md text-primary hover:underline font-bold group" href="/orders/${order.id}/">
                            Details
                            <span class="material-symbols-outlined text-[18px] group-hover:translate-x-1 transition-transform">arrow_forward</span>
                        </a>
                    </div>
                </div>
            `;
        }).join('');

        loader.classList.add('hidden');
        emptyContainer.classList.add('hidden');
        listContainer.classList.remove('hidden');
    } catch (err) {
        console.error('Error fetching orders list:', err);
        loader.innerHTML = `
            <span class="material-symbols-outlined text-[48px] text-error">cloud_off</span>
            <p class="text-on-surface-variant font-body-md mt-sm">Network query error. Try checking connection.</p>
        `;
    }
}

document.addEventListener('DOMContentLoaded', () => {
    if (ORDER_ID) {
        loadOrderDetail();
    } else {
        loadOrdersList();
    }
});
