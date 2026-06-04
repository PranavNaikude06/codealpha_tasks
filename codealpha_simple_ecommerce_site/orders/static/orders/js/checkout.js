/**
 * checkout.js — Manages checkout validation, order summary rendering, and placing orders
 */

async function loadCheckoutSummary() {
    if (!AUTH.isLoggedIn()) {
        AUTH.requireAuth();
        return;
    }

    const loader = document.getElementById('checkout-loading-container');
    const checkoutGrid = document.getElementById('checkout-grid');
    const itemsList = document.getElementById('checkout-items');

    try {
        const response = await AUTH.fetchAuth('/api/cart/');
        if (!response || !response.ok) {
            loader.innerHTML = `
                <span class="material-symbols-outlined text-[48px] text-error">error</span>
                <p class="text-on-surface-variant font-body-md mt-sm">Error compiling order summary.</p>
            `;
            return;
        }

        const cart = await response.json();
        const items = cart.items || [];

        if (items.length === 0) {
            // Cart is empty, can't check out. Redirect back
            window.location.href = '/cart/';
            return;
        }

        // Render checkout items
        itemsList.innerHTML = items.map(item => {
            const product = item.product;
            return `
                <div class="flex gap-md items-center">
                    <div class="w-20 h-20 rounded-lg overflow-hidden flex-shrink-0 bg-surface-container-high cursor-pointer" onclick="window.location.href='/products/${product.id}/'">
                        <img src="${product.image_src || 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&q=80&w=600'}" alt="${product.name}" class="w-full h-full object-cover" />
                    </div>
                    <div class="flex-grow">
                        <h3 class="font-label-md text-label-md text-on-surface mb-xs font-semibold cursor-pointer" onclick="window.location.href='/products/${product.id}/'">${product.name}</h3>
                        <p class="font-body-sm text-body-sm text-on-surface-variant">Qty: ${item.quantity}</p>
                    </div>
                    <span class="font-label-md text-label-md font-semibold text-primary">₹${parseFloat(item.subtotal).toFixed(2)}</span>
                </div>
            `;
        }).join('');

        // Populate prices
        const subtotal = parseFloat(cart.total);
        const tax = 0.00;
        const total = subtotal + tax;

        document.getElementById('checkout-subtotal').textContent = `₹${subtotal.toFixed(2)}`;
        document.getElementById('checkout-tax').textContent = `₹${tax.toFixed(2)}`;
        document.getElementById('checkout-total').textContent = `₹${total.toFixed(2)}`;

        // Show grid
        loader.classList.add('hidden');
        checkoutGrid.classList.remove('hidden');
    } catch (err) {
        console.error('Error fetching checkout cart details:', err);
        loader.innerHTML = `
            <span class="material-symbols-outlined text-[48px] text-error">cloud_off</span>
            <p class="text-on-surface-variant font-body-md mt-sm">Network failure. Please try again.</p>
        `;
    }
}

document.addEventListener('DOMContentLoaded', () => {
    loadCheckoutSummary();

    const form = document.getElementById('shipping-form');
    const errorBanner = document.getElementById('checkout-error');
    const errorMsg = document.getElementById('checkout-error-msg');
    const placeBtn = document.getElementById('place-order-btn');

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        errorBanner.classList.add('hidden');

        // Extract form values
        const name = document.getElementById('full-name').value.trim();
        const address = document.getElementById('address').value.trim();
        const city = document.getElementById('city').value.trim();
        const pin = document.getElementById('zip').value.trim();
        const phone = document.getElementById('phone').value.trim();

        if (!name || !address || !city || !pin || !phone) {
            errorMsg.textContent = 'All shipping fields are required.';
            errorBanner.classList.remove('hidden');
            return;
        }

        // Set loader state on button
        placeBtn.disabled = true;
        placeBtn.innerHTML = '<span class="flex items-center justify-center gap-md"><svg class="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewbox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg> Placing Order...</span>';

        try {
            const payload = {
                shipping_address: {
                    full_name: name,
                    address: address,
                    city: city,
                    pin_code: pin,
                    phone: phone
                }
            };

            const response = await AUTH.fetchAuth('/api/orders/', {
                method: 'POST',
                body: JSON.stringify(payload)
            });

            const data = await response.json();

            if (response.status === 201) {
                // Success: Update cart badge immediately and show placed animation
                AUTH.updateCartBadge();

                placeBtn.innerHTML = '<span class="flex items-center justify-center gap-md"><span class="material-symbols-outlined text-[20px]">check_circle</span> Order Placed!</span>';
                placeBtn.className = "w-full py-md px-xl bg-green-600 text-on-primary font-headline-sm rounded-lg shadow-md font-bold";

                // Show a quick notification banner
                const toast = document.createElement('div');
                toast.className = 'fixed bottom-6 right-6 bg-on-background text-on-secondary px-lg py-md rounded-xl shadow-2xl flex items-center gap-md transform translate-y-20 transition-all duration-300 z-50';
                toast.innerHTML = '<span class="material-symbols-outlined text-green-400">task_alt</span> <span class="font-body-md">Redirecting to confirmation...</span>';
                document.body.appendChild(toast);
                
                setTimeout(() => {
                    toast.classList.remove('translate-y-20');
                }, 100);

                setTimeout(() => {
                    window.location.href = `/orders/${data.id}/`;
                }, 1500);
            } else {
                // Display error details if available
                let errDetails = '';
                if (data.error) errDetails += data.error + ' ';
                if (data.details) {
                    if (Array.isArray(data.details)) {
                        errDetails += data.details.join(' ');
                    } else {
                        errDetails += JSON.stringify(data.details);
                    }
                }
                
                errorMsg.textContent = errDetails || 'Failed to place order. Insufficient stock or invalid data.';
                errorBanner.classList.remove('hidden');
                
                // Reset button
                placeBtn.disabled = false;
                placeBtn.className = "w-full py-md px-xl bg-primary text-on-primary font-headline-sm rounded-lg hover:bg-secondary transition-all shadow-md active:scale-[0.98] font-bold";
                placeBtn.innerHTML = 'Place Order';
            }
        } catch (err) {
            console.error('Submit order error:', err);
            errorMsg.textContent = 'Server connection failed. Verify connection.';
            errorBanner.classList.remove('hidden');
            
            placeBtn.disabled = false;
            placeBtn.className = "w-full py-md px-xl bg-primary text-on-primary font-headline-sm rounded-lg hover:bg-secondary transition-all shadow-md active:scale-[0.98] font-bold";
            placeBtn.innerHTML = 'Place Order';
        }
    });
});
