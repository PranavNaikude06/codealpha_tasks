/**
 * cart.js — Manages cart items listing, item updates, deletes, and calculates pricing summaries
 */

// Toast notifier
function showCartToast(message, type = 'success') {
    const existing = document.getElementById('global-toast');
    if (existing) existing.remove();

    const toast = document.createElement('div');
    toast.id = 'global-toast';
    toast.className = `fixed bottom-6 right-6 ${type === 'success' ? 'bg-on-background text-on-secondary' : 'bg-error text-on-error'} px-lg py-md rounded-xl shadow-2xl flex items-center gap-md transform translate-y-20 transition-all duration-300 z-50`;
    
    const icon = type === 'success' ? 'task_alt' : 'error';
    const iconColor = type === 'success' ? 'text-green-400' : 'text-white';
    
    toast.innerHTML = `<span class="material-symbols-outlined ${iconColor}">${icon}</span> <span class="font-body-md">${message}</span>`;
    document.body.appendChild(toast);
    
    setTimeout(() => {
        toast.classList.remove('translate-y-20');
    }, 50);
    
    setTimeout(() => {
        toast.classList.add('translate-y-20', 'opacity-0');
        setTimeout(() => toast.remove(), 400);
    }, 3000);
}

async function loadCart() {
    if (!AUTH.isLoggedIn()) {
        AUTH.requireAuth();
        return;
    }

    const loader = document.getElementById('cart-loading-container');
    const emptyContainer = document.getElementById('cart-empty-container');
    const contentGrid = document.getElementById('cart-content-grid');
    const itemsContainer = document.getElementById('cart-items-container');

    try {
        const response = await AUTH.fetchAuth('/api/cart/');
        if (!response || !response.ok) {
            loader.innerHTML = `
                <span class="material-symbols-outlined text-[48px] text-error">error</span>
                <p class="text-on-surface-variant font-body-md mt-sm">Error loading your cart details.</p>
            `;
            return;
        }

        const cart = await response.json();
        const items = cart.items || [];

        if (items.length === 0) {
            loader.classList.add('hidden');
            contentGrid.classList.add('hidden');
            emptyContainer.classList.remove('hidden');
            AUTH.updateCartBadge();
            return;
        }

        // Populate items
        itemsContainer.innerHTML = items.map(item => {
            const product = item.product;
            const categoryClean = product.category.charAt(0).toUpperCase() + product.category.slice(1);
            return `
                <div class="bg-surface-container-lowest p-md md:p-lg rounded-xl shadow-soft flex flex-col md:flex-row gap-md items-center group transition-all duration-200 hover:shadow-md border border-surface-variant/30">
                    <div class="w-full md:w-32 h-32 flex-shrink-0 bg-surface-container-low rounded-lg overflow-hidden cursor-pointer" onclick="window.location.href='/products/${product.id}/'">
                        <img class="w-full h-full object-cover" src="${product.image_src || 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&q=80&w=600'}" alt="${product.name}"/>
                    </div>
                    <div class="flex-grow flex flex-col md:flex-row items-center md:items-start w-full gap-md">
                        <div class="flex-grow text-center md:text-left">
                            <span class="inline-block px-3 py-1 rounded-full bg-primary-fixed text-on-primary-fixed font-label-sm text-label-sm mb-xs font-bold uppercase tracking-wider">${categoryClean}</span>
                            <h3 class="font-headline-sm text-headline-sm text-on-surface font-semibold mb-xs hover:text-primary transition-colors cursor-pointer" onclick="window.location.href='/products/${product.id}/'">${product.name}</h3>
                            <p class="text-on-surface-variant text-body-sm line-clamp-1">${product.description}</p>
                        </div>
                        <div class="flex items-center gap-lg">
                            <div class="flex items-center bg-surface-container border border-outline-variant rounded-lg overflow-hidden">
                                <button onclick="updateQty(${item.id}, ${item.quantity - 1}, ${product.stock})" class="p-2 hover:bg-surface-container-high transition-colors active:scale-90">
                                    <span class="material-symbols-outlined text-body-md">remove</span>
                                </button>
                                <span class="w-10 text-center font-semibold text-label-md">${item.quantity}</span>
                                <button onclick="updateQty(${item.id}, ${item.quantity + 1}, ${product.stock})" class="p-2 hover:bg-surface-container-high transition-colors active:scale-90">
                                    <span class="material-symbols-outlined text-body-md">add</span>
                                </button>
                            </div>
                            <div class="text-right min-w-[100px]">
                                <p class="font-headline-sm text-headline-sm text-primary font-bold">₹${parseFloat(item.subtotal).toFixed(2)}</p>
                                <span class="text-on-surface-variant text-body-sm">(₹${parseFloat(product.price).toFixed(2)} ea)</span>
                            </div>
                            <button onclick="deleteItem(${item.id})" class="p-2 text-outline hover:text-error transition-colors active:scale-95">
                                <span class="material-symbols-outlined">delete</span>
                            </button>
                        </div>
                    </div>
                </div>
            `;
        }).join('');

        // Populate summary
        const subtotal = parseFloat(cart.total);
        const tax = 0.00; // Let's keep tax at 0.00 to match Stitch template and database order totals
        const total = subtotal + tax;

        document.getElementById('cart-subtotal').textContent = `₹${subtotal.toFixed(2)}`;
        document.getElementById('cart-tax').textContent = `₹${tax.toFixed(2)}`;
        document.getElementById('cart-total').textContent = `₹${total.toFixed(2)}`;

        // Show cart grid
        loader.classList.add('hidden');
        emptyContainer.classList.add('hidden');
        contentGrid.classList.remove('hidden');

        AUTH.updateCartBadge();
    } catch (err) {
        console.error('Error rendering cart:', err);
        loader.innerHTML = `
            <span class="material-symbols-outlined text-[48px] text-error">cloud_off</span>
            <p class="text-on-surface-variant font-body-md mt-sm">Network failure. Please refresh the page.</p>
        `;
    }
}

// Modify cart item quantity
async function updateQty(itemId, newQty, stockLimit) {
    if (newQty < 1) return;
    if (newQty > stockLimit) {
        showCartToast(`Only ${stockLimit} unit(s) available in stock.`, 'error');
        return;
    }

    try {
        const response = await AUTH.fetchAuth(`/api/cart/update/${itemId}/`, {
            method: 'PATCH',
            body: JSON.stringify({ quantity: newQty })
        });

        if (response && response.ok) {
            loadCart();
        } else {
            const data = await response.json();
            showCartToast(data.error || 'Failed to update quantity.', 'error');
        }
    } catch (err) {
        console.error('Error patching quantity:', err);
        showCartToast('Network error, please try again.', 'error');
    }
}

// Remove cart item
async function deleteItem(itemId) {
    try {
        const response = await AUTH.fetchAuth(`/api/cart/remove/${itemId}/`, {
            method: 'DELETE'
        });

        if (response && response.ok) {
            showCartToast('Item removed from cart.');
            loadCart();
        } else {
            showCartToast('Failed to remove item.', 'error');
        }
    } catch (err) {
        console.error('Error deleting item:', err);
        showCartToast('Network error, please try again.', 'error');
    }
}

document.addEventListener('DOMContentLoaded', () => {
    loadCart();

    const checkoutBtn = document.getElementById('checkout-btn');
    if (checkoutBtn) {
        checkoutBtn.addEventListener('click', () => {
            window.location.href = '/cart/checkout/';
        });
    }
});
