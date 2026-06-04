/**
 * products.js — Handles homepage product lists rendering, filtering, searching, and quick cart additions
 */

let currentCategory = 'all';
let currentSearch = '';
let debounceTimeout = null;

// Global Toast utility
function showToast(message, type = 'success') {
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

// Global Quick-Add to Cart handler
async function addProductToCart(productId) {
    if (!AUTH.isLoggedIn()) {
        showToast('Please sign in to add items to your cart.', 'error');
        setTimeout(() => {
            AUTH.requireAuth();
        }, 1000);
        return;
    }

    try {
        const response = await AUTH.fetchAuth('/api/cart/add/', {
            method: 'POST',
            body: JSON.stringify({
                product_id: productId,
                quantity: 1
            })
        });

        if (response && response.ok) {
            showToast('Added product to cart successfully!');
            AUTH.updateCartBadge();
        } else {
            const data = await response.json();
            showToast(data.error || 'Failed to add item.', 'error');
        }
    } catch (err) {
        console.error('Error adding to cart:', err);
        showToast('Network error, please try again.', 'error');
    }
}

// Fetch products from backend
async function fetchProducts() {
    const grid = document.getElementById('product-grid');
    const banner = document.getElementById('products-info-banner');
    if (!grid) return;

    // Render Skeletons
    grid.innerHTML = Array(8).fill(0).map(() => `
        <div class="animate-pulse bg-white rounded-xl shadow-sm border border-surface-variant/30 overflow-hidden flex flex-col h-[380px]">
            <div class="aspect-square bg-surface-container-low"></div>
            <div class="p-md flex-grow flex flex-col gap-sm">
                <div class="h-3 bg-surface-container-low rounded w-1/4"></div>
                <div class="h-5 bg-surface-container-low rounded w-3/4"></div>
                <div class="h-4 bg-surface-container-low rounded w-full"></div>
                <div class="h-6 bg-surface-container-low rounded w-1/3 mt-auto"></div>
            </div>
        </div>
    `).join('');

    try {
        let url = `/api/products/?category=${currentCategory}`;
        if (currentSearch) {
            url += `&search=${encodeURIComponent(currentSearch)}`;
        }

        const response = await fetch(url);
        const data = await response.json();

        if (response.ok) {
            const products = data.results || [];
            
            if (products.length === 0) {
                if (currentSearch) {
                    banner.textContent = `No products found matching "${currentSearch}". Showing all products instead.`;
                    banner.classList.remove('hidden');
                    // Reset search internally to show all
                    currentSearch = '';
                    setTimeout(fetchProducts, 3000);
                    return;
                }
                grid.innerHTML = `
                    <div class="col-span-full py-16 flex flex-col items-center justify-center text-center gap-md">
                        <span class="material-symbols-outlined text-[64px] text-outline">search_off</span>
                        <h3 class="font-headline-sm text-headline-sm text-on-surface">No products available</h3>
                        <p class="text-on-surface-variant font-body-md max-w-sm">We couldn't find any products in this category at the moment.</p>
                    </div>
                `;
                banner.classList.add('hidden');
                return;
            }

            banner.classList.add('hidden');
            grid.innerHTML = products.map(product => {
                const categoryClean = product.category.charAt(0).toUpperCase() + product.category.slice(1);
                return `
                    <div class="group bg-white rounded-xl shadow-sm hover:shadow-lg transition-all duration-300 flex flex-col border border-surface-variant/30 overflow-hidden cursor-pointer" onclick="window.location.href='/products/${product.id}/'">
                        <div class="aspect-square relative overflow-hidden bg-surface-container-low">
                            <img src="${product.image_src || 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&q=80&w=600'}" alt="${product.name}" class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                            ${!product.in_stock ? `
                                <div class="absolute inset-0 bg-background/80 backdrop-blur-[2px] flex items-center justify-center">
                                    <span class="px-md py-xs bg-error text-on-error text-label-sm rounded-full font-bold uppercase tracking-wider">Out of Stock</span>
                                </div>
                            ` : ''}
                        </div>
                        <div class="p-md flex-grow flex flex-col gap-sm">
                            <span class="inline-block self-start px-3 py-1 rounded-full bg-primary-fixed text-on-primary-fixed text-[11px] font-bold uppercase tracking-wider">${categoryClean}</span>
                            <h3 class="font-headline-sm text-headline-sm text-on-surface font-semibold line-clamp-1 group-hover:text-primary transition-colors">${product.name}</h3>
                            <p class="text-on-surface-variant text-body-sm line-clamp-2">${product.description}</p>
                            <div class="flex justify-between items-center mt-auto pt-sm border-t border-surface-variant/10">
                                <span class="font-headline-sm text-headline-sm text-primary font-bold">₹${parseFloat(product.price).toFixed(2)}</span>
                                ${product.in_stock ? `
                                    <button onclick="event.stopPropagation(); addProductToCart(${product.id})" class="px-md py-2 bg-primary text-on-primary rounded-lg text-label-sm font-bold hover:bg-primary-container active:scale-95 transition-all flex items-center gap-xs">
                                        <span class="material-symbols-outlined text-[16px]">shopping_cart</span>
                                        Add
                                    </button>
                                ` : `
                                    <button disabled class="px-md py-2 bg-outline-variant/30 text-outline rounded-lg text-label-sm font-bold cursor-not-allowed">
                                        Sold Out
                                    </button>
                                `}
                            </div>
                        </div>
                    </div>
                `;
            }).join('');
        } else {
            grid.innerHTML = `
                <div class="col-span-full py-16 flex flex-col items-center justify-center text-center gap-md">
                    <span class="material-symbols-outlined text-[64px] text-error">error</span>
                    <h3 class="font-headline-sm text-headline-sm text-on-surface">Failed to load products</h3>
                    <p class="text-on-surface-variant font-body-md">There was a problem querying the database.</p>
                </div>
            `;
        }
    } catch (err) {
        console.error('Error fetching products:', err);
        grid.innerHTML = `
            <div class="col-span-full py-16 flex flex-col items-center justify-center text-center gap-md">
                <span class="material-symbols-outlined text-[64px] text-error">cloud_off</span>
                <h3 class="font-headline-sm text-headline-sm text-on-surface">Network disconnect</h3>
                <p class="text-on-surface-variant font-body-md">Verify your server connection and try again.</p>
            </div>
        `;
    }
}

// Bind events
document.addEventListener('DOMContentLoaded', () => {
    fetchProducts();

    // Category chips selection
    const chips = document.querySelectorAll('.category-chip');
    chips.forEach(chip => {
        chip.addEventListener('click', (e) => {
            chips.forEach(c => {
                c.className = "category-chip px-6 py-2 bg-surface-container-high text-on-surface-variant hover:bg-primary-fixed-dim transition-all rounded-full font-label-md text-label-md whitespace-nowrap";
            });
            chip.className = "category-chip px-6 py-2 bg-primary text-on-primary rounded-full font-label-md text-label-md whitespace-nowrap shadow-md transition-all";
            
            currentCategory = chip.getAttribute('data-category');
            fetchProducts();
        });
    });

    // Global Search integration
    const searchInput = document.getElementById('global-search-input');
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            clearTimeout(debounceTimeout);
            currentSearch = e.target.value;
            debounceTimeout = setTimeout(() => {
                fetchProducts();
            }, 400); // 400ms debounce
        });
    }
});
