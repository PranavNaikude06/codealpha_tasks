/**
 * auth.js — JWT token management, auth state, and global layouts updater
 * Tokens stored in sessionStorage (clears on tab close, more secure than localStorage)
 */

const AUTH = {
    // Store tokens after login
    setTokens(access, refresh) {
        sessionStorage.setItem('access_token', access);
        sessionStorage.setItem('refresh_token', refresh);
        this.updateNavState();
        this.updateCartBadge();
    },

    // Get current access token
    getToken() {
        return sessionStorage.getItem('access_token');
    },

    getRefreshToken() {
        return sessionStorage.getItem('refresh_token');
    },

    // Check if user is logged in
    isLoggedIn() {
        return !!this.getToken();
    },

    // Clear tokens on logout
    clearTokens() {
        sessionStorage.removeItem('access_token');
        sessionStorage.removeItem('refresh_token');
        sessionStorage.removeItem('user');
        this.updateNavState();
        this.updateCartBadge();
    },

    // Store user info
    setUser(user) {
        sessionStorage.setItem('user', JSON.stringify(user));
    },

    getUser() {
        const u = sessionStorage.getItem('user');
        return u ? JSON.parse(u) : null;
    },

    // Build Authorization header for fetch() calls
    authHeader() {
        const token = this.getToken();
        return token ? { 'Authorization': `Bearer ${token}` } : {};
    },

    // Helper: authenticated fetch with auto-redirect on 401
    async fetchAuth(url, options = {}) {
        const headers = {
            'Content-Type': 'application/json',
            ...this.authHeader(),
            ...(options.headers || {}),
        };

        const response = await fetch(url, { ...options, headers });

        if (response.status === 401) {
            // Try to refresh the token
            const refreshed = await this.refreshToken();
            if (refreshed) {
                // Retry with new token
                headers['Authorization'] = `Bearer ${this.getToken()}`;
                return fetch(url, { ...options, headers });
            } else {
                // Redirect to login
                this.clearTokens();
                window.location.href = `/auth/login/?next=${encodeURIComponent(window.location.pathname)}`;
                return null;
            }
        }
        return response;
    },

    // Attempt to refresh access token using refresh token
    async refreshToken() {
        const refresh = this.getRefreshToken();
        if (!refresh) return false;

        try {
            const response = await fetch('/api/auth/refresh/', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ refresh }),
            });

            if (response.ok) {
                const data = await response.json();
                sessionStorage.setItem('access_token', data.access);
                return true;
            }
        } catch (e) {
            console.error('Token refresh failed:', e);
        }
        return false;
    },

    // Update nav to show correct links based on auth state
    updateNavState() {
        const loggedOutSection = document.getElementById('nav-auth-logged-out');
        const loggedInSection = document.getElementById('nav-auth-logged-in');
        const ordersLink = document.getElementById('nav-orders-link');
        const userEmailSpan = document.getElementById('nav-user-email');

        if (this.isLoggedIn()) {
            if (loggedOutSection) loggedOutSection.style.display = 'none';
            if (loggedInSection) loggedInSection.style.display = 'flex';
            if (ordersLink) ordersLink.style.display = 'inline-block';
            
            const user = this.getUser();
            if (userEmailSpan && user && user.email) {
                userEmailSpan.textContent = user.email;
            }
        } else {
            if (loggedOutSection) loggedOutSection.style.display = 'flex';
            if (loggedInSection) loggedInSection.style.display = 'none';
            if (ordersLink) ordersLink.style.display = 'none';
            if (userEmailSpan) userEmailSpan.textContent = '';
        }
    },

    // Fetch and update the shopping cart badge count
    async updateCartBadge() {
        const badge = document.getElementById('cart-count');
        if (!badge) return;

        if (!this.isLoggedIn()) {
            badge.textContent = '0';
            badge.classList.add('hidden');
            return;
        }

        try {
            const response = await fetch('/api/cart/', {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    ...this.authHeader()
                }
            });

            if (response.ok) {
                const data = await response.json();
                const count = data.item_count || 0;
                badge.textContent = count;
                if (count > 0) {
                    badge.classList.remove('hidden');
                } else {
                    badge.classList.add('hidden');
                }
            } else {
                badge.classList.add('hidden');
            }
        } catch (err) {
            console.error('Error updating cart badge:', err);
            badge.classList.add('hidden');
        }
    },

    // Redirect to login if not authenticated
    requireAuth() {
        if (!this.isLoggedIn()) {
            window.location.href = `/auth/login/?next=${encodeURIComponent(window.location.pathname)}`;
            return false;
        }
        return true;
    },
};

// Wire logout button and fetch initial state
document.addEventListener('DOMContentLoaded', () => {
    AUTH.updateNavState();
    AUTH.updateCartBadge();

    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', async (e) => {
            e.preventDefault();
            const refresh = AUTH.getRefreshToken();
            if (refresh) {
                try {
                    await fetch('/api/auth/logout/', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            ...AUTH.authHeader(),
                        },
                        body: JSON.stringify({ refresh }),
                    });
                } catch (err) {
                    // Silent fail — clear tokens regardless
                }
            }
            AUTH.clearTokens();
            window.location.href = '/';
        });
    }
});
