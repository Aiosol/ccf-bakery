// App.jsx - Fixed version
import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Box, CssBaseline, ThemeProvider, createTheme } from '@mui/material';

// Import components
import Navigation from './components/Navigation';
import SideMenu from './components/SideMenu';
import ProtectedRoute from './components/ProtectedRoute';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Login from './pages/Login';

// Import pages
import Dashboard from './pages/Dashboard';
import Inventory from './pages/Inventory';

import RecipeList from './pages/RecipeList';
import RecipeDetail from './pages/RecipeDetail';
import RecipeForm from './components/RecipeForm';
import Order from './pages/Order';
import OrderList from './pages/OrderList';
import OrderDetail from './pages/OrderDetail';

import ManualOrder from './pages/ManualOrder';
import ProductionList from './pages/ProductionList_old';
import ProductionDetail from './pages/ProductionDetail_old';

import ProductionPlanningDashboard from './pages/ProductionPlanningDashboard';
 

// Your existing theme
const theme = createTheme({
  palette: {
    primary: { main: '#5E35B1' },
    secondary: { main: '#E64A19' },
    success: { main: '#4CAF50' },
    warning: { main: '#FF9800' },
    info: { main: '#03A9F4' }
  },
  typography: {
    fontFamily: ['"Poppins"', 'sans-serif'].join(','),
    h4: { fontWeight: 600 },
    h5: { fontWeight: 600 },
    h6: { fontWeight: 600 }
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: { borderRadius: 8, textTransform: 'none', fontWeight: 600 }
      }
    },
    MuiCard: {
      styleOverrides: {
        root: { borderRadius: 12, boxShadow: '0px 2px 10px rgba(0, 0, 0, 0.05)' }
      }
    },
    MuiPaper: {
      styleOverrides: {
        root: { borderRadius: 12, boxShadow: '0px 2px 10px rgba(0, 0, 0, 0.05)' }
      }
    }
  }
});

function AppContent() {
  const { isAuthenticated, logout, hasPermission, user } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  
  const toggleSidebar = () => setSidebarOpen(!sidebarOpen);
  const toggleMobileDrawer = () => setMobileDrawerOpen(!mobileDrawerOpen);
  
  // Show login if not authenticated
  if (!isAuthenticated) {
    return <Login />;
  }

  return (
    <Box sx={{ display: 'flex' }}>
      <CssBaseline />
      
      {/* Navigation */}
      <Navigation 
        sidebarOpen={sidebarOpen} 
        toggleSidebar={toggleSidebar}
        toggleMobileDrawer={toggleMobileDrawer}
        onLogout={logout}
      />
      
      {/* Sidebar */}
      <SideMenu 
        open={sidebarOpen} 
        mobileOpen={mobileDrawerOpen}
        toggleMobileDrawer={toggleMobileDrawer}
      />
      
      {/* Main Content */}
      <Box
          component="main"
          sx={{
            flexGrow: 1,
            p: 3,
            width: { sm: `calc(100% - ${sidebarOpen ? 240 : 60}px)` },
            ml: { sm: `${sidebarOpen ? 240 : 60}px` },
            mt: 8,
            transition: 'margin 0.3s, width 0.3s'
          }}
        >
        <Routes>
          {/* Dashboard */}
          <Route path="/" element={
            <ProtectedRoute requiredRole={null}>
              <Dashboard />
            </ProtectedRoute>
          } />
          
          {/* Inventory */}
          <Route path="/inventory" element={
            <ProtectedRoute requiredRole={null}>
              <Inventory />
            </ProtectedRoute>
          } />
          
          {/* Recipes */}
          <Route path="/recipes" element={
            <ProtectedRoute requiredRole={null}>
              <RecipeList />
            </ProtectedRoute>
          } />
          <Route path="/recipes/new" element={
            <ProtectedRoute requiredRole={null}>
              <RecipeForm />
            </ProtectedRoute>
          } />
          <Route path="/recipes/:id" element={
            <ProtectedRoute requiredRole={null}>
              <RecipeDetail />
            </ProtectedRoute>
          } />
          <Route path="/recipes/:id/edit" element={
            <ProtectedRoute requiredRole={null}>
              <RecipeForm />
            </ProtectedRoute>
          } />
          
          {/* Production Routes - FIXED */}
          <Route path="/production" element={
            <ProtectedRoute requiredRole={null}>
              <ProductionList />
            </ProtectedRoute>
          } />
          <Route path="/production/planning" element={
            <ProtectedRoute requiredRole={null}>
              <ProductionPlanningDashboard />
            </ProtectedRoute>
          } />
          <Route path="/production/list" element={
            <ProtectedRoute requiredRole={null}>
              <ProductionList />
            </ProtectedRoute>
          } />
          <Route path="/production/new" element={
            <ProtectedRoute requiredRole={null}>
              <ManualOrder />
            </ProtectedRoute>
          } />
          <Route path="/production/:id" element={
            <ProtectedRoute requiredRole={null}>
              <ProductionDetail />
            </ProtectedRoute>
          } />
          
          {/*  orders  */}
          <Route path="/orders" element={
            <ProtectedRoute requiredRole="admin" customerRedirect="/orders/new">
              <OrderList />
            </ProtectedRoute>
          } />

          {/* Both admin and customer can create orders */}
          <Route path="/orders/new" element={
            <ProtectedRoute requiredRole={null}>
              <Order />
            </ProtectedRoute>
          } />

          {/* Only admin can view order details */}
          <Route path="/orders/:id" element={
            <ProtectedRoute requiredRole="admin" customerRedirect="/orders/new">
              <OrderDetail />
            </ProtectedRoute>
          } />
          
          {/* Reports */}
          <Route path="/reports" element={
            <ProtectedRoute requiredRole={null}>
              <div style={{ padding: '20px' }}>
                <h2>Reports</h2>
                <p>Reports functionality coming soon...</p>
              </div>
            </ProtectedRoute>
          } />
          
          {/* Settings */}
          <Route path="/settings" element={
            <ProtectedRoute requiredRole={null}>
              <div style={{ padding: '20px' }}>
                <h2>Settings</h2>
                <p>Settings functionality coming soon...</p>
              </div>
            </ProtectedRoute>
          } />
          
          {/* Fallback routes */}
          <Route path="*" element={
            user?.is_customer ? <Navigate to="/orders/new" replace /> :
            hasPermission('orders') ? <Navigate to="/orders" replace /> : 
            <Navigate to="/" replace />
          } />
        </Routes>
      </Box>
    </Box>
  );
}

function App() {
  return (
    <ThemeProvider theme={theme}>
      <Router>
        <AuthProvider>
          <AppContent />
        </AuthProvider>
      </Router>
    </ThemeProvider>
  );
}

export default App;