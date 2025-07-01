import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Box, CircularProgress } from '@mui/material';

const ProtectedRoute = ({ children, requiredRole, customerRedirect = '/orders/new', fallbackPath = '/login' }) => {
  const { isAuthenticated, user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to={fallbackPath} state={{ from: location }} replace />;
  }

  // If admin role required and user is customer, redirect to customer page
  if (requiredRole === 'admin' && user?.is_customer) {
    return <Navigate to={customerRedirect} replace />;
  }

  // If specific role required and user doesn't have it (but not customer)
  if (requiredRole && user?.role !== requiredRole && !user?.is_customer) {
    return <Navigate to="/unauthorized" replace />;
  }

  return children;
};

export default ProtectedRoute;