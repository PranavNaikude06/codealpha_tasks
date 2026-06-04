/**
 * product_detail.js — Fetches single product spec, handles quantity selectors, and executes Cart additions
 */

// Toast notification helper (copied or resolved globally from base/products.js)
function showDetailToast(message, type = 'success') {
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

let productStock = 0;

async function loadProductDetails() {
    const loadingContainer = document.getElementById('product-loading-container');
    const detailContainer = document.getElementById('product-detail-container');

    try {
        const response = await fetch(`/api/products/${PRODUCT_ID}/`);
        if (!response.ok) {
            loadingContainer.innerHTML = `
                <span class="material-symbols-outlined text-[48px] text-error">error</span>
                <p class="text-on-surface-variant font-body-md">We couldn't retrieve this product's information.</p>
                <a href="/" class="mt-md text-primary font-semibold hover:underline">Return to homepage</a>
            `;
            return;
        }

        const product = await response.json();
        productStock = product.stock;

        // Set text & attributes
        document.title = product.name;
        document.getElementById('breadcrumb-title').textContent = product.name;
        
        const categoryClean = product.category.charAt(0).toUpperCase() + product.category.slice(1);
        const categoryBadge = document.getElementById('product-category-badge');
        const breadcrumbCat = document.getElementById('breadcrumb-category');
        categoryBadge.textContent = categoryClean;
        breadcrumbCat.textContent = categoryClean;
        
        // Category navigation click
        breadcrumbCat.onclick = () => {
            window.location.href = `/?category=${product.category}`;
        };

        document.getElementById('product-name').textContent = product.name;
        document.getElementById('product-price').textContent = `₹${parseFloat(product.price).toFixed(2)}`;
        document.getElementById('product-description').textContent = product.description;
        
        const imageEl = document.getElementById('product-image');
        imageEl.src = product.image_src || 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&q=80&w=600';
        imageEl.alt = product.name;

        // Stock status UI configuration
        const stockBadge = document.getElementById('stock-badge');
        const addToCartBtn = document.getElementById('add-to-cart-btn');
        const qtyInput = document.getElementById('quantity-input');

        if (product.stock > 0) {
            stockBadge.className = "inline-flex items-center px-md py-1 bg-green-100 text-green-700 rounded-full font-label-md text-label-md";
            stockBadge.innerHTML = `<span class="material-symbols-outlined text-[16px] mr-1" style="font-variation-settings: 'FILL' 1;">check_circle</span> In Stock (${product.stock} available)`;
            addToCartBtn.disabled = false;
        } else {
            stockBadge.className = "inline-flex items-center px-md py-1 bg-red-100 text-red-700 rounded-full font-label-md text-label-md";
            stockBadge.innerHTML = `<span class="material-symbols-outlined text-[16px] mr-1" style="font-variation-settings: 'FILL' 1;">cancel</span> Out of Stock`;
            addToCartBtn.disabled = true;
            addToCartBtn.className = "flex-grow py-md px-2xl bg-outline-variant/30 text-outline font-headline-sm text-headline-sm rounded-xl cursor-not-allowed flex items-center justify-center gap-md";
            addToCartBtn.innerHTML = `<span class="material-symbols-outlined">shopping_cart_off</span> Sold Out`;
            qtyInput.value = 0;
            qtyInput.disabled = true;
        }

        // Display contents
        loadingContainer.classList.add('hidden');
        detailContainer.classList.remove('hidden');
    } catch (err) {
        console.error('Error loading product details:', err);
        loadingContainer.innerHTML = `
            <span class="material-symbols-outlined text-[48px] text-error">cloud_off</span>
            <p class="text-on-surface-variant font-body-md">Network error while fetching details. Try refreshing.</p>
        `;
    }
}

document.addEventListener('DOMContentLoaded', () => {
    loadProductDetails();

    const qtyInput = document.getElementById('quantity-input');
    const decBtn = document.getElementById('qty-decrement');
    const incBtn = document.getElementById('qty-increment');
    const addToCartBtn = document.getElementById('add-to-cart-btn');

    // Quantity Increment click
    incBtn.addEventListener('click', () => {
        if (qtyInput.disabled) return;
        let val = parseInt(qtyInput.value) || 1;
        if (val < productStock) {
            qtyInput.value = val + 1;
        } else {
            showDetailToast(`Only ${productStock} unit(s) available in stock.`, 'error');
        }
    });

    // Quantity Decrement click
    decBtn.addEventListener('click', () => {
        if (qtyInput.disabled) return;
        let val = parseInt(qtyInput.value) || 1;
        if (val > 1) {
            qtyInput.value = val - 1;
        }
    });

    // Add to Cart submission
    addToCartBtn.addEventListener('click', async () => {
        if (!AUTH.isLoggedIn()) {
            showDetailToast('Please sign in to manage your cart.', 'error');
            setTimeout(() => {
                AUTH.requireAuth();
            }, 1200);
            return;
        }

        const qty = parseInt(qtyInput.value) || 1;
        if (qty > productStock) {
            showDetailToast('Insufficient stock available.', 'error');
            return;
        }

        // Set Loading state
        const originalContent = addToCartBtn.innerHTML;
        addToCartBtn.disabled = true;
        addToCartBtn.innerHTML = '<span class="material-symbols-outlined animate-spin">sync</span> Adding...';

        try {
            const response = await AUTH.fetchAuth('/api/cart/add/', {
                method: 'POST',
                body: JSON.stringify({
                    product_id: parseInt(PRODUCT_ID),
                    quantity: qty
                })
            });

            if (response && response.ok) {
                // Animate Success state
                addToCartBtn.innerHTML = '<span class="material-symbols-outlined">check_circle</span> Added to Cart';
                addToCartBtn.className = "flex-grow py-md px-2xl bg-green-600 text-on-primary font-headline-sm text-headline-sm rounded-xl shadow-lg flex items-center justify-center gap-md";
                AUTH.updateCartBadge();

                setTimeout(() => {
                    addToCartBtn.innerHTML = originalContent;
                    addToCartBtn.className = "flex-grow py-md px-2xl bg-gradient-to-r from-primary to-secondary text-on-primary font-headline-sm text-headline-sm rounded-xl shadow-lg hover:shadow-xl hover:opacity-95 transition-all active:scale-[0.98] flex items-center justify-center gap-md";
                    addToCartBtn.disabled = false;
                }, 2000);
            } else {
                const data = await response.json();
                showDetailToast(data.error || 'Failed to add item to cart.', 'error');
                addToCartBtn.innerHTML = originalContent;
                addToCartBtn.disabled = false;
            }
        } catch (err) {
            console.error('Add to cart submit error:', err);
            showDetailToast('Network failure. Please try again.', 'error');
            addToCartBtn.innerHTML = originalContent;
            addToCartBtn.disabled = false;
        }
    });
});
