const API_BASE = 'http://127.0.0.1:3000/api';

const api = {
  getToken: () => localStorage.getItem('nexus_token'),
  getUser: () => {
    try {
      return JSON.parse(localStorage.getItem('nexus_user'));
    } catch (e) {
      return null;
    }
  },
  setUser: (user) => localStorage.setItem('nexus_user', JSON.stringify(user)),
  setToken: (token) => localStorage.setItem('nexus_token', token),
  logout: () => {
    localStorage.removeItem('nexus_token');
    localStorage.removeItem('nexus_user');
    window.location.href = 'login.html';
  },
  isAuthenticated: () => !!localStorage.getItem('nexus_token'),

  // Redirect helpers
  checkAuth: () => {
    if (!api.isAuthenticated()) {
      window.location.href = 'login.html';
    }
  },
  redirectIfAuthenticated: () => {
    if (api.isAuthenticated()) {
      window.location.href = 'index.html';
    }
  },

  // Base request handler
  request: async (endpoint, method = 'GET', body = null) => {
    const headers = {};
    const token = api.getToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    if (body) {
      headers['Content-Type'] = 'application/json';
    }

    const options = {
      method,
      headers,
    };
    if (body) {
      options.body = JSON.stringify(body);
    }

    try {
      const response = await fetch(`${API_BASE}${endpoint}`, options);
      const data = await response.json();
      if (!response.ok) {
        // Handle expired token auto-logout
        if (response.status === 401 && token) {
          api.logout();
        }
        throw new Error(data.error || data.errors?.[0]?.msg || 'API Error');
      }
      return data;
    } catch (err) {
      console.error(`API Error: ${method} ${endpoint}:`, err);
      throw err;
    }
  },

  // Convenience methods
  get: (endpoint) => api.request(endpoint, 'GET'),
  post: (endpoint, body) => api.request(endpoint, 'POST', body),
  put: (endpoint, body) => api.request(endpoint, 'PUT', body),
  delete: (endpoint) => api.request(endpoint, 'DELETE'),

  // Relative time helper
  formatRelativeTime: (dateString) => {
    const now = new Date();
    const date = new Date(dateString);
    const seconds = Math.floor((now - date) / 1000);

    if (seconds < 5) return 'Just now';
    if (seconds < 60) return `${seconds}s ago`;

    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;

    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;

    const days = Math.floor(hours / 24);
    if (days < 7) return `${days}d ago`;

    return date.toLocaleDateString();
  }
};
