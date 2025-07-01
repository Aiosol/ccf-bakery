import React, { createContext, useContext, useState, useEffect } from 'react';
import authService from '../services/authService';

const AuthContext = createContext({});

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [permissions, setPermissions] = useState([]);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    initializeAuth();
  }, []);

  const initializeAuth = async () => {
    try {
      if (authService.isAuthenticated()) {
        const storedUser = authService.getStoredUser();
        const storedPermissions = authService.getStoredPermissions();
        
        if (storedUser) {
          setUser(storedUser);
          setPermissions(storedPermissions);
          setIsAuthenticated(true);
          
          // Try to refresh permissions
          try {
            const freshPermissions = await authService.getUserPermissions();
            setPermissions(freshPermissions);
          } catch (error) {
            console.log('Could not refresh permissions');
          }
        }
      }
    } catch (error) {
      console.error('Auth initialization error:', error);
      authService.clearAuth();
    } finally {
      setLoading(false);
    }
  };

  const login = async (username, password) => {
    try {
      const data = await authService.login(username, password);
      setUser(data.user);
      setIsAuthenticated(true);
      
      // Get user permissions
      const userPermissions = await authService.getUserPermissions();
      setPermissions(userPermissions);
      
      return data;
    } catch (error) {
      throw error;
    }
  };

  const logout = async () => {
    try {
      await authService.logout();
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      setUser(null);
      setPermissions([]);
      setIsAuthenticated(false);
    }
  };

  const hasPermission = (page) => {
    return permissions.includes(page);
  };

  const value = {
    user,
    permissions,
    isAuthenticated,
    loading,
    login,
    logout,
    hasPermission,
    isAdmin: user?.is_admin || false,
    isCustomer: user?.is_customer || false,
    isManager: user?.is_manager || false
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};