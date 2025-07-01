// Navigation.jsx
import React, { useState } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import {
  AppBar,
  Box,
  Toolbar,
  IconButton,
  Typography,
  Menu,
  MenuItem,
  Badge,
  Button,
  Avatar,
  Tooltip,
  Divider,
  ListItemIcon,
  ListItemText
} from '@mui/material';
import {
  Menu as MenuIcon,
  Notifications as NotificationsIcon,
  AccountCircle,
  Settings as SettingsIcon,
  ExitToApp as LogoutIcon,
  Person as ProfileIcon,
  BreakfastDining as BakeryIcon
} from '@mui/icons-material';

const Navigation = ({ sidebarOpen, toggleSidebar, toggleMobileDrawer, onLogout }) => {
  // State for user menu
  const [userMenuAnchor, setUserMenuAnchor] = useState(null);
  const [notificationMenuAnchor, setNotificationMenuAnchor] = useState(null);
  
  // Get user data from localStorage
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  
  // Sample notifications - in a real app, these would come from your backend
  const notifications = [
    { id: 1, message: 'Low stock alert: Flour (2.3 kg remaining)', read: false },
    { id: 2, message: 'Production of Sourdough Bread completed', read: true },
    { id: 3, message: 'New recipe added: Chocolate Croissants', read: true }
  ];
  
  // Handle opening user menu
  const handleUserMenuOpen = (event) => {
    setUserMenuAnchor(event.currentTarget);
  };
  
  // Handle closing user menu
  const handleUserMenuClose = () => {
    setUserMenuAnchor(null);
  };
  
  // Handle opening notification menu
  const handleNotificationMenuOpen = (event) => {
    setNotificationMenuAnchor(event.currentTarget);
  };
  
  // Handle closing notification menu
  const handleNotificationMenuClose = () => {
    setNotificationMenuAnchor(null);
  };
  
  // Handle logout
  const handleLogout = () => {
    handleUserMenuClose();
    onLogout();
  };
  
  return (
    <AppBar 
      position="fixed" 
      sx={{ 
        zIndex: (theme) => theme.zIndex.drawer + 1,
        backgroundColor: 'white',
        color: 'text.primary',
        boxShadow: '0px 1px 4px rgba(0, 0, 0, 0.05)'
      }}
    >
      <Toolbar>
        {/* Menu Toggle Button */}
        <IconButton
          color="inherit"
          aria-label="open drawer"
          edge="start"
          onClick={toggleSidebar}
          sx={{ mr: 2, display: { xs: 'none', sm: 'block' } }}
        >
          <MenuIcon />
        </IconButton>
        
        {/* Mobile Menu Toggle */}
        <IconButton
          color="inherit"
          aria-label="open mobile drawer"
          edge="start"
          onClick={toggleMobileDrawer}
          sx={{ mr: 2, display: { xs: 'block', sm: 'none' } }}
        >
          <MenuIcon />
        </IconButton>
        
        {/* Logo */}
        <BakeryIcon sx={{ display: 'flex', mr: 1, color: 'primary.main' }} />
        <Typography
          variant="h6"
          noWrap
          component={RouterLink}
          to="/"
          sx={{
            mr: 2,
            fontWeight: 700,
            color: 'primary.main',
            textDecoration: 'none',
            display: { xs: 'none', md: 'flex' }
          }}
        >
          CLOUD LOUNGE
        </Typography>
        
        {/* Spacer */}
        <Box sx={{ flexGrow: 1 }} />
        
        {/* Notifications */}
        <Tooltip title="Notifications">
          <IconButton
            size="large"
            aria-label="show notifications"
            color="inherit"
            onClick={handleNotificationMenuOpen}
          >
            <Badge badgeContent={notifications.filter(n => !n.read).length} color="error">
              <NotificationsIcon />
            </Badge>
          </IconButton>
        </Tooltip>
        
        {/* User Menu */}
        <Tooltip title="Account settings">
          <IconButton
            size="large"
            edge="end"
            aria-label="account of current user"
            aria-haspopup="true"
            onClick={handleUserMenuOpen}
            color="inherit"
            sx={{ ml: 1 }}
          >
            {user.avatar ? (
              <Avatar alt={user.name} src={user.avatar} />
            ) : (
              <AccountCircle />
            )}
          </IconButton>
        </Tooltip>
        
        {/* Notification Menu */}
        <Menu
          anchorEl={notificationMenuAnchor}
          id="notification-menu"
          keepMounted
          open={Boolean(notificationMenuAnchor)}
          onClose={handleNotificationMenuClose}
          PaperProps={{
            sx: { width: 320, maxHeight: 450 }
          }}
          transformOrigin={{ horizontal: 'right', vertical: 'top' }}
          anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
        >
          <Typography variant="subtitle1" sx={{ px: 2, py: 1, fontWeight: 600 }}>
            Notifications
          </Typography>
          <Divider />
          
          {notifications.length === 0 ? (
            <MenuItem>
              <Typography variant="body2" color="text.secondary">
                No notifications
              </Typography>
            </MenuItem>
          ) : (
            notifications.map((notification) => (
              <MenuItem 
                key={notification.id}
                onClick={handleNotificationMenuClose}
                sx={{ 
                  py: 1.5,
                  px: 2,
                  borderLeft: notification.read ? 'none' : '4px solid',
                  borderLeftColor: 'primary.main',
                  bgcolor: notification.read ? 'inherit' : 'rgba(0, 0, 0, 0.02)'
                }}
              >
                <Typography variant="body2" sx={{ whiteSpace: 'normal' }}>
                  {notification.message}
                </Typography>
              </MenuItem>
            ))
          )}
          
          <Divider />
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 1 }}>
            <Button size="small">View All</Button>
          </Box>
        </Menu>
        
        {/* User Account Menu */}
        <Menu
          anchorEl={userMenuAnchor}
          id="account-menu"
          keepMounted
          open={Boolean(userMenuAnchor)}
          onClose={handleUserMenuClose}
          PaperProps={{
            sx: { width: 220 }
          }}
          transformOrigin={{ horizontal: 'right', vertical: 'top' }}
          anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
        >
          <Box sx={{ px: 2, py: 1 }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
              {user.name || 'User'}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {user.email || 'user@example.com'}
            </Typography>
          </Box>
          <Divider />
          
          <MenuItem onClick={handleUserMenuClose} component={RouterLink} to="/profile">
            <ListItemIcon>
              <ProfileIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText primary="Profile" />
          </MenuItem>
          
          <MenuItem onClick={handleUserMenuClose} component={RouterLink} to="/settings">
            <ListItemIcon>
              <SettingsIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText primary="Settings" />
          </MenuItem>
          
          <Divider />
          
          <MenuItem onClick={handleLogout}>
            <ListItemIcon>
              <LogoutIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText primary="Logout" />
          </MenuItem>
        </Menu>
      </Toolbar>
    </AppBar>
  );
};

export default Navigation;