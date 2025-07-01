import React, { useState, useEffect } from 'react';
import { Link as RouterLink, useLocation } from 'react-router-dom';
import {
  Drawer,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Divider,
  Box,
  Typography,
  Toolbar,
  Collapse,
  IconButton
} from '@mui/material';
import {
  Dashboard as DashboardIcon,
  Inventory2 as InventoryIcon,
  MenuBook as RecipesIcon,
  Factory as ProductionIcon,
  Receipt as OrdersIcon,
  Assessment as ReportsIcon,
  Settings as SettingsIcon,
  ExpandLess,
  ExpandMore,
  CalendarToday as PlanningIcon,
  Assignment as ShiftIcon,
  ListAlt as ProductionListIcon,
  Add as AddProductionIcon
} from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';

const SideMenu = ({ open, mobileOpen, toggleMobileDrawer }) => {
  const location = useLocation();
  const { hasPermission, user } = useAuth();
  const [expandedMenus, setExpandedMenus] = useState({});
  
  // Define all menu items with their permission requirements and submenus
  const menuItems = [
    { 
      label: 'Dashboard', 
      path: '/', 
      icon: <DashboardIcon />, 
      permission: 'dashboard' 
    },
    { 
      label: 'Inventory', 
      path: '/inventory', 
      icon: <InventoryIcon />, 
      permission: 'inventory' 
    },
    { 
      label: 'Recipes', 
      path: '/recipes', 
      icon: <RecipesIcon />, 
      permission: 'recipes' 
    },
    { 
      label: 'Production', 
      path: '/production', 
      icon: <ProductionIcon />, 
      permission: 'production',
      hasSubmenu: true,
      submenu: [
        {
          label: 'Planning Dashboard',
          icon: <PlanningIcon />,
          path: '/production/planning'
        },
         
        {
          label: 'Production List',
          icon: <ProductionListIcon />,
          path: '/production/list'
        },
        {
          label: 'Create Order',
          icon: <AddProductionIcon />,
          path: '/production/new'
        }
      ]
    },
    { 
      label: 'Orders', 
      path: user?.is_customer ? '/orders/new' : '/orders',
      icon: <OrdersIcon />, 
      permission: 'orders' 
    },
    { 
      label: 'Reports', 
      path: '/reports', 
      icon: <ReportsIcon />, 
      permission: 'reports' 
    },
    { 
      label: 'Settings', 
      path: '/settings', 
      icon: <SettingsIcon />, 
      permission: 'settings' 
    }
  ];
  
  // Filter menu items based on user permissions
  const allowedMenuItems = menuItems.filter(item => hasPermission(item.permission));
  
  // Check if a path is active
  const isActive = (path) => {
    if (path === '/') {
      return location.pathname === '/';
    }
    return location.pathname.startsWith(path);
  };
  
  // Check if any submenu item is active
  const isSubmenuActive = (submenuItems) => {
    return submenuItems.some(item => isActive(item.path));
  };
  
  // Toggle submenu expansion
  const toggleSubmenu = (label) => {
    setExpandedMenus(prev => ({
      ...prev,
      [label]: !prev[label]
    }));
  };
  
  // Auto-expand production menu if on production page
  useEffect(() => {
    if (location.pathname.startsWith('/production')) {
      setExpandedMenus(prev => ({
        ...prev,
        'Production': true
      }));
    }
  }, [location.pathname]);
  
  // Render menu item
  const renderMenuItem = (item) => {
    const hasSubmenu = item.hasSubmenu && item.submenu;
    const isMenuActive = isActive(item.path);
    const isExpanded = expandedMenus[item.label];
    const isSubmenuItemActive = hasSubmenu && isSubmenuActive(item.submenu);
    
    return (
      <React.Fragment key={item.path}>
        <ListItem disablePadding sx={{ mb: 0.5 }}>
          <ListItemButton
            component={hasSubmenu ? 'div' : RouterLink}
            to={hasSubmenu ? undefined : item.path}
            selected={hasSubmenu ? isSubmenuItemActive : isMenuActive}
            onClick={hasSubmenu ? () => toggleSubmenu(item.label) : undefined}
            sx={{
              borderRadius: 1,
              mx: 1,
              '&.Mui-selected': {
                backgroundColor: 'primary.light',
                color: 'primary.contrastText',
                '&:hover': {
                  backgroundColor: 'primary.main',
                },
                '& .MuiListItemIcon-root': {
                  color: 'primary.contrastText',
                }
              }
            }}
          >
            <ListItemIcon sx={{ minWidth: 40 }}>
              {item.icon}
            </ListItemIcon>
            <ListItemText primary={item.label} />
            {hasSubmenu && (
              isExpanded ? <ExpandLess /> : <ExpandMore />
            )}
          </ListItemButton>
        </ListItem>
        
        {/* Submenu */}
        {hasSubmenu && (
          <Collapse in={isExpanded} timeout="auto" unmountOnExit>
            <List component="div" disablePadding>
              {item.submenu.map((subItem) => (
                <ListItem key={subItem.path} disablePadding sx={{ pl: 2, mb: 0.5 }}>
                  <ListItemButton
                    component={RouterLink}
                    to={subItem.path}
                    selected={isActive(subItem.path)}
                    sx={{
                      borderRadius: 1,
                      mx: 1,
                      py: 0.75,
                      '&.Mui-selected': {
                        backgroundColor: 'primary.light',
                        color: 'primary.contrastText',
                        '&:hover': {
                          backgroundColor: 'primary.main',
                        },
                        '& .MuiListItemIcon-root': {
                          color: 'primary.contrastText',
                        }
                      }
                    }}
                  >
                    <ListItemIcon sx={{ minWidth: 32 }}>
                      {subItem.icon}
                    </ListItemIcon>
                    <ListItemText 
                      primary={subItem.label}
                      primaryTypographyProps={{ variant: 'body2' }}
                    />
                  </ListItemButton>
                </ListItem>
              ))}
            </List>
          </Collapse>
        )}
      </React.Fragment>
    );
  };
  
  const drawerContent = (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <Toolbar />
      
      {/* User info */}
      <Box sx={{ p: 2, textAlign: 'center', bgcolor: 'grey.50' }}>
        <Typography variant="subtitle2" fontWeight="bold">
          {user?.username}
        </Typography>
        <Typography variant="caption" color="text.secondary">
          {user?.role?.charAt(0).toUpperCase() + user?.role?.slice(1)}
        </Typography>
      </Box>
      
      <Divider />
      
      <List sx={{ py: 1 }}>
        {allowedMenuItems.map(renderMenuItem)}
      </List>
      
      {allowedMenuItems.length === 0 && (
        <Box sx={{ p: 3, textAlign: 'center' }}>
          <Typography variant="body2" color="text.secondary">
            No pages available. Contact admin for access.
          </Typography>
        </Box>
      )}
      
      <Box sx={{ flexGrow: 1 }} />
      
      {/* Application version footer */}
      <Box sx={{ p: 2, textAlign: 'center' }}>
        <Typography variant="caption" color="text.secondary">
          CLOUD LOUNGE v1.0.0
        </Typography>
      </Box>
    </Box>
  );

  return (
    <>
      {/* Desktop Drawer */}
      <Drawer
        variant="permanent"  // Changed from "permanent"
        sx={{
          display: { xs: 'none', sm: 'block' },
          '& .MuiDrawer-paper': {
            boxSizing: 'border-box',
            width: open ? 240 : 60,
            transition: 'width 0.3s',
            overflowX: 'hidden'
          },
        }}
        open={open}
      >
        {drawerContent}
      </Drawer>
      
      {/* Mobile Drawer */}
      <Drawer
        variant="temporary"
        open={mobileOpen}
        onClose={toggleMobileDrawer}
        ModalProps={{ keepMounted: true }}
        sx={{
          display: { xs: 'block', sm: 'none' },
          '& .MuiDrawer-paper': { boxSizing: 'border-box', width: 240 },
        }}
      >
        {drawerContent}
      </Drawer>
    </>
  );
};

export default SideMenu;