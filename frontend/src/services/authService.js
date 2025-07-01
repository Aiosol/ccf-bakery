const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';

const authService = {
  // Login with username and password
  login: async (username, password) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/login/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include', // Include cookies for session
        body: JSON.stringify({ username, password })
      });

      const data = await response.json();
      
      if (data.success) {
        // Store user data in localStorage
        localStorage.setItem('user', JSON.stringify(data.user));
        return data;
      } else {
        throw new Error(data.error || 'Login failed');
      }
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  },

  // Logout user
  logout: async () => {
    try {
      await fetch(`${API_BASE_URL}/api/auth/logout/`, {
        method: 'POST',
        credentials: 'include'
      });
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      localStorage.removeItem('user');
      localStorage.removeItem('permissions');
    }
  },

  // Get current user
  getCurrentUser: async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/user/`, {
        credentials: 'include'
      });
      
      const data = await response.json();
      
      if (data.success) {
        localStorage.setItem('user', JSON.stringify(data.user));
        return data.user;
      } else {
        throw new Error('Not authenticated');
      }
    } catch (error) {
      this.clearAuth();
      throw error;
    }
  },

  // Get user permissions
  getUserPermissions: async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/permissions/`, {
        credentials: 'include'
      });
      
      const data = await response.json();
      
      if (data.success) {
        localStorage.setItem('permissions', JSON.stringify(data.permissions));
        return data.permissions;
      } else {
        throw new Error('Could not get permissions');
      }
    } catch (error) {
      console.error('Permissions error:', error);
      return [];
    }
  },

  // Check if user is authenticated
  isAuthenticated: () => {
    return !!localStorage.getItem('user');
  },

  // Get stored user data
  getStoredUser: () => {
    const userStr = localStorage.getItem('user');
    return userStr ? JSON.parse(userStr) : null;
  },

  // Get stored permissions
  getStoredPermissions: () => {
    const permStr = localStorage.getItem('permissions');
    return permStr ? JSON.parse(permStr) : [];
  },

  // Clear auth data
  clearAuth: () => {
    localStorage.removeItem('user');
    localStorage.removeItem('permissions');
  }
};

export default authService;