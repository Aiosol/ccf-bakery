// Dashboard.jsx
import React, { useState, useEffect } from 'react';
import { 
  Box, 
  Typography, 
  Grid, 
  Paper, 
  Button,
  Divider,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  IconButton,
  CircularProgress,
  Alert
} from '@mui/material';
import { 
  Dashboard as DashboardIcon, 
  Cake as RecipeIcon, 
  Inventory as InventoryIcon,
  Receipt as ProductionIcon,
  Warning as WarningIcon,
  Add as AddIcon,
  Refresh as RefreshIcon,
  ArrowForward as ArrowIcon
} from '@mui/icons-material';

// Import components
import RecipeCard from '../components/RecipeCard';

// Import mock service (replace with real service later)
import mockDashboardService from '../services/mockDashboardService';

// Import utilities
import { formatCurrency } from '../utils/formatters';

const Dashboard = () => {
  // State for dashboard data
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [syncingInventory, setSyncingInventory] = useState(false);
  const [syncResult, setSyncResult] = useState(null);

  // Fetch dashboard data on component mount
  useEffect(() => {
    loadDashboardData();
  }, []);

  // Function to load dashboard data
  const loadDashboardData = async () => {
    setLoading(true);
    setError(null);
    
    try {
      // Use mock service for now
      const data = await mockDashboardService.fetchDashboardData();
      setDashboardData(data);
    } catch (err) {
      console.error('Error loading dashboard data:', err);
      setError('Failed to load dashboard data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Function to sync inventory with Manager.io
  const handleSyncInventory = async () => {
    setSyncingInventory(true);
    setSyncResult(null);
    
    try {
      // Use mock service for now
      const result = await mockDashboardService.syncInventory();
      setSyncResult({
        status: 'success',
        message: `Successfully synced ${result.count} inventory items`
      });
      
      // Reload dashboard data after sync
      loadDashboardData();
    } catch (err) {
      console.error('Error syncing inventory:', err);
      setSyncResult({
        status: 'error',
        message: `Failed to sync inventory: ${err.message}`
      });
    } finally {
      setSyncingInventory(false);
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '70vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ width: '100%', mt: 4 }}>
        <Alert severity="error">{error}</Alert>
        <Button variant="outlined" onClick={loadDashboardData} sx={{ mt: 2 }}>
          Retry
        </Button>
      </Box>
    );
  }

  return (
    <Box sx={{ width: '100%', maxWidth: '100%' }}>
      {/* Header Section */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3, width: '100%' }}>
        <Typography variant="h4" component="h1">
          Dashboard
        </Typography>
        <Box>
          <Button 
            variant="outlined" 
            startIcon={<RefreshIcon />} 
            onClick={handleSyncInventory}
            disabled={syncingInventory}
            sx={{ mr: 2 }}
          >
            {syncingInventory ? 'Syncing...' : 'Sync Inventory'}
          </Button>
          <Button 
            variant="contained" 
            startIcon={<AddIcon />}
            href="/recipes/new"
          >
            New Recipe
          </Button>
        </Box>
      </Box>

      {/* Sync Result Alert */}
      {syncResult && (
        <Alert 
          severity={syncResult.status === 'success' ? 'success' : 'error'} 
          sx={{ mb: 3 }}
          onClose={() => setSyncResult(null)}
        >
          {syncResult.message}
        </Alert>
      )}

      {/* Dashboard Summary Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Paper
            sx={{
              p: 2,
              display: 'flex',
              flexDirection: 'column',
              height: 140,
              bgcolor: 'primary.light',
              color: 'white'
            }}
          >
            <Typography variant="h6" gutterBottom>
              Recipes
            </Typography>
            <Typography variant="h3" component="div" sx={{ flexGrow: 1 }}>
              {dashboardData?.recipesCount || 0}
            </Typography>
            <Typography variant="body2">
              Total recipes in your collection
            </Typography>
          </Paper>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Paper
            sx={{
              p: 2,
              display: 'flex',
              flexDirection: 'column',
              height: 140,
              bgcolor: 'success.light',
              color: 'white'
            }}
          >
            <Typography variant="h6" gutterBottom>
              Productions
            </Typography>
            <Typography variant="h3" component="div" sx={{ flexGrow: 1 }}>
              {dashboardData?.productionsCount || 0}
            </Typography>
            <Typography variant="body2">
              Production orders this month
            </Typography>
          </Paper>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Paper
            sx={{
              p: 2,
              display: 'flex',
              flexDirection: 'column',
              height: 140,
              bgcolor: 'info.light',
              color: 'white'
            }}
          >
            <Typography variant="h6" gutterBottom>
              Inventory Items
            </Typography>
            <Typography variant="h3" component="div" sx={{ flexGrow: 1 }}>
              {dashboardData?.inventoryCount || 0}
            </Typography>
            <Typography variant="body2">
              Ingredients in inventory
            </Typography>
          </Paper>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Paper
            sx={{
              p: 2,
              display: 'flex',
              flexDirection: 'column',
              height: 140,
              bgcolor: dashboardData?.lowInventoryCount > 0 ? 'warning.light' : 'grey.500',
              color: 'white'
            }}
          >
            <Typography variant="h6" gutterBottom>
              Low Stock Alerts
            </Typography>
            <Typography variant="h3" component="div" sx={{ flexGrow: 1 }}>
              {dashboardData?.lowInventoryCount || 0}
            </Typography>
            <Typography variant="body2">
              Ingredients below threshold
            </Typography>
          </Paper>
        </Grid>
      </Grid>

      {/* Main Content */}
      <Grid container spacing={4}>
        {/* Recent Recipes */}
        <Grid item xs={12} md={7}>
          <Paper sx={{ p: 3, height: '100%' }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="h5" component="h2">
                Recent Recipes
              </Typography>
              <Button 
                variant="text" 
                endIcon={<ArrowIcon />}
                href="/recipes"
              >
                View All
              </Button>
            </Box>
            <Divider sx={{ mb: 2 }} />
            
            {dashboardData?.recentRecipes?.length > 0 ? (
              <Grid container spacing={2}>
                {dashboardData.recentRecipes.map(recipe => (
                  <Grid item xs={12} sm={6} key={recipe.id}>
                    <RecipeCard recipe={recipe} />
                  </Grid>
                ))}
              </Grid>
            ) : (
              <Box sx={{ p: 4, textAlign: 'center' }}>
                <Typography variant="body1" color="text.secondary">
                  No recipes found. Create your first recipe to get started.
                </Typography>
                <Button 
                  variant="contained" 
                  startIcon={<AddIcon />}
                  href="/recipes/new"
                  sx={{ mt: 2 }}
                >
                  Create Recipe
                </Button>
              </Box>
            )}
          </Paper>
        </Grid>

        {/* Right Side Panels */}
        <Grid item xs={12} md={5}>
          <Grid container spacing={4} direction="column">
            {/* Low Inventory Alerts */}
            <Grid item>
              <Paper sx={{ p: 3 }}>
                <Typography variant="h5" component="h2" gutterBottom>
                  Low Inventory Alerts
                </Typography>
                <Divider sx={{ mb: 2 }} />
                
                {dashboardData?.lowInventoryItems?.length > 0 ? (
                  <List>
                    {dashboardData.lowInventoryItems.map(item => (
                      <ListItem key={item.manager_item_id}>
                        <ListItemIcon>
                          <WarningIcon color="warning" />
                        </ListItemIcon>
                        <ListItemText 
                          primary={item.name} 
                          secondary={`${item.quantity_available} ${item.unit} available (below ${item.threshold_quantity} ${item.unit})`} 
                        />
                      </ListItem>
                    ))}
                  </List>
                ) : (
                  <Box sx={{ p: 2, textAlign: 'center' }}>
                    <Typography variant="body1" color="text.secondary">
                      No low inventory alerts.
                    </Typography>
                  </Box>
                )}
              </Paper>
            </Grid>
            
            {/* Recent Production Orders */}
            <Grid item>
              <Paper sx={{ p: 3 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                  <Typography variant="h5" component="h2">
                    Recent Productions
                  </Typography>
                  <Button 
                    variant="text" 
                    endIcon={<ArrowIcon />}
                    href="/production"
                  >
                    View All
                  </Button>
                </Box>
                <Divider sx={{ mb: 2 }} />
                
                {dashboardData?.recentProductions?.length > 0 ? (
                  <List>
                    {dashboardData.recentProductions.map(production => (
                      <ListItem 
                        key={production.id}
                        secondaryAction={
                          <IconButton edge="end" href={`/production/${production.id}`}>
                            <ArrowIcon />
                          </IconButton>
                        }
                      >
                        <ListItemText 
                          primary={production.recipe_name} 
                          secondary={`${production.batch_quantity} batches - ${new Date(production.created_at).toLocaleDateString()}`} 
                        />
                      </ListItem>
                    ))}
                  </List>
                ) : (
                  <Box sx={{ p: 2, textAlign: 'center' }}>
                    <Typography variant="body1" color="text.secondary">
                      No recent production orders.
                    </Typography>
                    <Button 
                      variant="contained" 
                      startIcon={<ProductionIcon />}
                      href="/production/new"
                      sx={{ mt: 2 }}
                    >
                      Plan Production
                    </Button>
                  </Box>
                )}
              </Paper>
            </Grid>
          </Grid>
        </Grid>
      </Grid>
    </Box>
  );
};

export default Dashboard;