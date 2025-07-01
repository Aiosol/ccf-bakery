// Updated RecipeDetail.jsx - WITH WORKING PRICE HISTORY INTEGRATION
import React, { useState, useEffect } from 'react';
import { 
  Box, 
  Container, 
  Typography, 
  Paper, 
  Button, 
  Chip, 
  Grid, 
  Table, 
  TableBody, 
  TableCell, 
  TableContainer, 
  TableHead, 
  TableRow, 
  Divider,
  CircularProgress,
  Alert,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  IconButton,
  Card,
  CardContent,
  Snackbar
} from '@mui/material';
import { 
  Edit as EditIcon, 
  Delete as DeleteIcon, 
  ArrowBack as BackIcon,
  Print as PrintIcon,
  Restaurant as RestaurantIcon,
  Refresh as RefreshIcon,
  History as HistoryIcon,
  TrendingUp as TrendingUpIcon,
  Assessment as AssessmentIcon,
  Warning as WarningIcon
} from '@mui/icons-material';
import { useNavigate, useParams } from 'react-router-dom';
import axios from 'axios';

// Import the new price history component
import RecipePriceHistoryAnalysis from '../components/RecipePriceHistoryAnalysis';

const formatCurrency = (value, locale = 'en-US', currency = 'BDT') => {
  if (value == null) return 'N/A';
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 2
  }).format(value);
};

const RecipeDetail = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const [recipe, setRecipe] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [notification, setNotification] = useState(null);
  
  // NEW: Price history states
  const [priceHistoryDialogOpen, setPriceHistoryDialogOpen] = useState(false);
  const [priceAlert, setPriceAlert] = useState(null);
  
  const API_BASE_URL = 'http://localhost:8000/api';
  
  const fetchRecipe = async (showRefreshing = false) => {
    try {
      if (showRefreshing) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      
      const response = await axios.get(`${API_BASE_URL}/recipes/${id}/`);
      const recipeData = response.data;
      
      console.log("Recipe data from API:", recipeData);
      
      // Normalize the recipe data structure
      if (!recipeData.ingredients && recipeData.recipeingredient_set) {
        recipeData.ingredients = recipeData.recipeingredient_set;
      } else if (!recipeData.ingredients) {
        recipeData.ingredients = [];
      }
      
      setRecipe(recipeData);
      setError(null);
      
      // NEW: Check for significant price changes
      if (recipeData.cost_history_summary && 
          Math.abs(recipeData.cost_history_summary.total_cost_impact) > 100) {
        setPriceAlert({
          type: recipeData.cost_history_summary.total_cost_impact > 0 ? 'warning' : 'info',
          message: `Recipe cost has ${recipeData.cost_history_summary.total_cost_impact > 0 ? 'increased' : 'decreased'} by ${formatCurrency(Math.abs(recipeData.cost_history_summary.total_cost_impact))} in the last 30 days.`
        });
      }
      
    } catch (err) {
      console.error('Error fetching recipe:', err);
      setError('Failed to load recipe. Please try again.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };
  
  useEffect(() => {
    fetchRecipe();
  }, [id, API_BASE_URL]);
  
  const handleRefresh = async () => {
    console.log("Refreshing recipe data to get latest costs...");
    try {
      setRefreshing(true);
      
      // Try to trigger inventory sync, but handle errors gracefully
      try {
        const response = await axios.post(`${API_BASE_URL}/inventory/sync/`);
        
        // Check if response is JSON
        const contentType = response.headers['content-type'];
        if (contentType && contentType.includes('application/json')) {
          setNotification('Inventory prices updated successfully');
        } else {
          console.warn('Inventory sync endpoint returned non-JSON response');
          setNotification('Inventory sync not yet available');
        }
      } catch (syncError) {
        if (syncError.response?.status === 404) {
          console.warn('Inventory sync endpoint not found');
          setNotification('Inventory sync not yet available');
        } else {
          console.warn('Inventory sync failed:', syncError.message);
          setNotification('Inventory sync not yet available');
        }
      }
      
      // Always refresh recipe data
      await fetchRecipe(true);
      
    } catch (err) {
      console.error('Error refreshing data:', err);
      setError('Failed to refresh data. Please try again.');
    } finally {
      setRefreshing(false);
    }
  };
  
  // NEW: Show price history analysis
  const handleShowPriceHistory = () => {
    setPriceHistoryDialogOpen(true);
  };
  
  const handleEdit = () => {
    navigate(`/recipes/${id}/edit`);
  };
  
  const handleBack = () => {
    navigate('/recipes');
  };
  
  const handlePrint = () => {
    // Create a new window for printing
    const printWindow = window.open('', '_blank');
    
    const printContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>${recipeName} - Recipe</title>
        <style>
          body {
            font-family: Arial, sans-serif;
            font-size: 12pt;
            color: black;
            margin: 20px;
            background: white;
          }
          h1 { font-size: 18pt; margin: 0 0 10px 0; text-align: center; }
          h2 { font-size: 14pt; margin: 15px 0 8px 0; }
          .header { text-align: center; margin-bottom: 20px; }
          .info { font-size: 11pt; margin: 5px 0; }
          table { 
            width: 100%; 
            border-collapse: collapse; 
            margin: 10px 0;
            font-size: 10pt;
          }
          th, td { 
            border: 1px solid #333; 
            padding: 4px 6px; 
            text-align: left; 
          }
          th { background-color: #f0f0f0; font-weight: bold; }
          .right { text-align: right; }
          .total-row { background-color: #f9f9f9; font-weight: bold; }
          .instructions { font-size: 10pt; line-height: 1.3; margin-top: 15px; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>${recipeName}</h1>
          <div class="info">Category: ${categoryName} | Yield: ${yieldQuantity} ${yieldUnit}</div>
          <div class="info">Total Cost: ${formatCurrency(totalCost)} | Cost per ${yieldUnit}: ${formatCurrency(unitCost)}</div>
        </div>
        
        <h2>Ingredients</h2>
        <table>
          <thead>
            <tr>
              <th>Ingredient</th>
              <th class="right">Quantity</th>
              <th class="right">Unit Cost</th>
              <th class="right">Total</th>
            </tr>
          </thead>
          <tbody>
            ${ingredients.map(ingredient => {
              const name = ingredient.inventory_item?.name || ingredient.name || 'Unknown';
              const quantity = ingredient.quantity || 0;
              const unit = ingredient.inventory_item?.unit || ingredient.unit || 'unit';
              const unitCost = ingredient.unit_cost || 0;
              const itemTotal = quantity * unitCost;
              
              return `
                <tr>
                  <td>${name}</td>
                  <td class="right">${quantity} ${unit}</td>
                  <td class="right">${formatCurrency(unitCost)}</td>
                  <td class="right">${formatCurrency(itemTotal)}</td>
                </tr>
              `;
            }).join('')}
            <tr class="total-row">
            <td class="right"></td>
            <td class="right"></td>
              <td class="right">${formatCurrency(totalCost / yieldQuantity)}</td>
              <td class="right">${formatCurrency(totalCost)}</td>

              

            </tr>
          </tbody>
        </table>
        
        ${instructions ? `
          <div class="instructions">
            <h2>Instructions</h2>
            <div>${instructions}</div>
          </div>
        ` : ''}
      </body>
      </html>
    `;
    
    printWindow.document.write(printContent);
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
    printWindow.close();
  };
  
  const openDeleteDialog = () => {
    setDeleteDialogOpen(true);
  };
  
  const closeDeleteDialog = () => {
    setDeleteDialogOpen(false);
  };
  
  const handleDelete = async () => {
    try {
      setDeleting(true);
      await axios.delete(`${API_BASE_URL}/recipes/${id}/`);
      closeDeleteDialog();
      navigate('/recipes');
    } catch (err) {
      console.error('Error deleting recipe:', err);
      setError('Failed to delete recipe. Please try again.');
      setDeleting(false);
      closeDeleteDialog();
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
      <Box sx={{ mt: 3 }}>
        <Alert severity="error" action={
          <Button color="inherit" size="small" onClick={() => fetchRecipe()}>
            Retry
          </Button>
        }>
          {error}
        </Alert>
        <Button 
          sx={{ mt: 2 }}
          variant="outlined" 
          startIcon={<BackIcon />}
          onClick={handleBack}
        >
          Back to Recipes
        </Button>
      </Box>
    );
  }
  
  if (!recipe) {
    return (
      <Box sx={{ mt: 3 }}>
        <Alert severity="warning">Recipe not found</Alert>
        <Button 
          sx={{ mt: 2 }}
          variant="outlined" 
          startIcon={<BackIcon />}
          onClick={handleBack}
        >
          Back to Recipes
        </Button>
      </Box>
    );
  }
  
  // Safely get recipe data with fallbacks for null values
  const recipeName = recipe.name || '';
  const recipeDescription = recipe.description || '';
  const categoryName = recipe.category_name || 'Uncategorized';
  const yieldQuantity = recipe.yield_quantity || 0;
  const yieldUnit = recipe.yield_unit || 'items';
  const prepTime = recipe.prep_time_minutes || 0;
  const cookTime = recipe.cook_time_minutes || 0;
  const totalTime = prepTime + cookTime;
  const instructions = recipe.instructions || '';
  
  // Handle ingredients - use the normalized ingredients array
  const ingredients = recipe.ingredients || [];
  
  // Use the API-provided costs which are always live
  const totalCost = recipe.total_cost || 0;
  const unitCost = recipe.unit_cost || 0;
  
  // NEW: Calculate price volatility indicators
  const hasRecentChanges = recipe.cost_history_summary && 
                          recipe.cost_history_summary.affected_ingredients && 
                          recipe.cost_history_summary.affected_ingredients.length > 0;
  
  const volatilityLevel = hasRecentChanges ? 
    (Math.abs(recipe.cost_history_summary.total_cost_impact) > 200 ? 'high' : 
     Math.abs(recipe.cost_history_summary.total_cost_impact) > 50 ? 'medium' : 'low') : 'none';
  
  console.log("Displaying costs - Total:", totalCost, "Unit:", unitCost);
  
  return (
    <Box sx={{ pb: 6 }}>
      {/* Price Alert */}
      {priceAlert && (
        <Alert 
          severity={priceAlert.type} 
          sx={{ mb: 3 }}
          onClose={() => setPriceAlert(null)}
          action={
            <Button color="inherit" size="small" onClick={handleShowPriceHistory}>
              View Details
            </Button>
          }
        >
          {priceAlert.message}
        </Alert>
      )}
      
      {/* Header with actions */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3, flexWrap: 'wrap', gap: 2 }}>        <Box>
          <Button 
            startIcon={<BackIcon />} 
            onClick={handleBack}
            sx={{ mb: 1 }}
          >
            Back to Recipes
          </Button>
          <Typography variant="h4" component="h1">
            {recipeName}
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', mt: 1, gap: 1, flexWrap: 'wrap' }}>
            <Chip 
              label={categoryName}
              color="primary" 
              size="small" 
            />
            <Chip 
              icon={<TrendingUpIcon />}
              label="Live Pricing" 
              color="success" 
              size="small" 
            />
            {/* NEW: Volatility indicator */}
            {volatilityLevel !== 'none' && (
              <Chip 
                icon={<WarningIcon />}
                label={`${volatilityLevel.toUpperCase()} volatility`}
                color={volatilityLevel === 'high' ? 'error' : volatilityLevel === 'medium' ? 'warning' : 'info'}
                size="small" 
              />
            )}
            <Typography variant="body2" color="text.secondary">
              Created: {new Date(recipe.created_at).toLocaleDateString()}
            </Typography>
            {refreshing && (
              <Chip 
                icon={<CircularProgress size={16} />}
                label="Refreshing..." 
                size="small" 
                color="info"
              />
            )}
          </Box>
        </Box>
        
        <Box sx={{ display: 'flex', gap: 1, alignItems: 'start', flexWrap: 'wrap' }}>
          {/* NEW: Price History Button */}
          <Button
            variant="outlined"
            startIcon={<AssessmentIcon />}
            onClick={handleShowPriceHistory}
            size="small"
            color={volatilityLevel === 'high' ? 'error' : 'primary'}
          >
            Price Analysis
          </Button>
          <Button
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={handleRefresh}
            disabled={refreshing}
            size="small"
          >
            Refresh Costs
          </Button>
          <Button
            variant="outlined"
            startIcon={<PrintIcon />}
            onClick={handlePrint}
          >
            Print
          </Button>
          <Button
            variant="outlined"
            startIcon={<EditIcon />}
            onClick={handleEdit}
          >
            Edit
          </Button>
          <Button
            variant="outlined"
            color="error"
            startIcon={<DeleteIcon />}
            onClick={openDeleteDialog}
          >
            Delete
          </Button>
        </Box>
      </Box>
      
      {/* Main content */}
      <Grid container spacing={3}>
        {/* Left column - Recipe details */}
        <Grid item xs={12} md={8}>
          {/* Description */}
          {recipeDescription && (
            <Paper sx={{ p: 3, mb: 3 }}>
              <Typography variant="h6" gutterBottom>
                Description
              </Typography>
              <Typography variant="body1">
                {recipeDescription}
              </Typography>
            </Paper>
          )}
          
          {/* Ingredients */}
          <Paper sx={{ p: 3, mb: 3 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="h6">
                Ingredients
              </Typography>
              <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                {refreshing && (
                  <Typography variant="caption" color="info.main">
                    Updating costs...
                  </Typography>
                )}
                <Chip 
                  icon={<TrendingUpIcon />}
                  label="All Live Pricing" 
                  color="success" 
                  size="small"
                />
                {/* NEW: Price volatility indicator for ingredients */}
                {hasRecentChanges && (
                  <Chip 
                    icon={<HistoryIcon />}
                    label={`${recipe.cost_history_summary.affected_ingredients.length} changed`}
                    color="warning" 
                    size="small"
                    onClick={handleShowPriceHistory}
                    clickable
                  />
                )}
              </Box>
            </Box>
            
            {ingredients.length > 0 ? (
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Ingredient</TableCell>
                      <TableCell align="right">Quantity</TableCell>
                      <TableCell align="right">Unit</TableCell>
                      <TableCell align="right">Unit Cost</TableCell>
                      <TableCell align="right">Total</TableCell>
                      <TableCell align="center">Status</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {ingredients.map((ingredient, index) => {
                      const name = ingredient.inventory_item?.name || ingredient.name || 'Unknown Ingredient';
                      const quantity = ingredient.quantity || 0;
                      const unit = ingredient.inventory_item?.unit || ingredient.unit || 'unit';
                      const unitCost = ingredient.unit_cost || 0;
                      const totalCost = quantity * unitCost;
                      
                      // NEW: Check if this ingredient has recent price changes
                      const hasChanges = hasRecentChanges && 
                        recipe.cost_history_summary.affected_ingredients.some(
                          affected => affected.name === name
                        );
                      
                      console.log(`Ingredient ${name}: unit_cost=${unitCost}, total=${totalCost}`);
                      
                      return (
                        <TableRow key={index} sx={hasChanges ? { bgcolor: 'warning.50' } : {}}>
                          <TableCell>
                            <Box>
                              <Typography variant="body2">{name}</Typography>
                              <Typography variant="caption" color="success.main">
                                📈 Live pricing from inventory
                              </Typography>
                            </Box>
                          </TableCell>
                          <TableCell align="right">{quantity}</TableCell>
                          <TableCell align="right">{unit}</TableCell>
                          <TableCell align="right">
                            {formatCurrency(unitCost)}
                          </TableCell>
                          <TableCell align="right">{formatCurrency(totalCost)}</TableCell>
                          <TableCell align="center">
                            {hasChanges ? (
                              <Chip 
                                icon={<WarningIcon />}
                                label="Changed" 
                                color="warning" 
                                size="small"
                              />
                            ) : (
                              <Chip 
                                label="Stable" 
                                color="success" 
                                size="small"
                              />
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                    
                    {/* Total row */}
                    <TableRow>
                      <TableCell colSpan={4} align="right" sx={{ fontWeight: 'bold' }}>
                        <Typography variant="body1" sx={{ fontWeight: 'bold' }}>
                          Total Recipe Cost (Live Pricing):
                        </Typography>
                      </TableCell>
                      <TableCell align="right" sx={{ fontWeight: 'bold' }}>
                        {formatCurrency(totalCost)}
                      </TableCell>
                      <TableCell />
                    </TableRow>
                  </TableBody>
                </Table>
              </TableContainer>
            ) : (
              <Typography variant="body1" color="text.secondary">
                No ingredients added to this recipe.
              </Typography>
            )}
          </Paper>
          
          {/* Instructions */}
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Instructions
            </Typography>
            
            {instructions ? (
              <Typography variant="body1" sx={{ whiteSpace: 'pre-line' }}>
                {instructions}
              </Typography>
            ) : (
              <Typography variant="body1" color="text.secondary">
                No instructions provided for this recipe.
              </Typography>
            )}
          </Paper>
        </Grid>
        
        {/* Right column - Summary */}
        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 3, mb: 3 }}>
            <Typography variant="h6" gutterBottom>
              Recipe Summary
            </Typography>
            
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <Box>
                <Typography variant="subtitle2" color="text.secondary">
                  Yield
                </Typography>
                <Typography variant="body1">
                  {yieldQuantity} {yieldUnit}
                </Typography>
              </Box>
              
              <Box>
                <Typography variant="subtitle2" color="text.secondary">
                  Preparation Time
                </Typography>
                <Typography variant="body1">
                  {prepTime} minutes
                </Typography>
              </Box>
              
              <Box>
                <Typography variant="subtitle2" color="text.secondary">
                  Cooking Time
                </Typography>
                <Typography variant="body1">
                  {cookTime} minutes
                </Typography>
              </Box>
              
              <Box>
                <Typography variant="subtitle2" color="text.secondary">
                  Total Time
                </Typography>
                <Typography variant="body1">
                  {totalTime} minutes
                </Typography>
              </Box>
              
              <Divider />
              
              <Box>
                <Typography variant="subtitle2" color="text.secondary">
                  Total Recipe Cost
                </Typography>
                <Typography variant="h5" color="primary.main">
                  {formatCurrency(totalCost)}
                </Typography>
              </Box>
              
              <Box>
                <Typography variant="subtitle2" color="text.secondary">
                  Cost Per {yieldUnit}
                </Typography>
                <Typography variant="h5" color="primary.main">
                  {formatCurrency(unitCost)}
                </Typography>
              </Box>
              
              <Alert severity="info" sx={{ mt: 2 }}>
                <Typography variant="body2">
                  💡 All costs are live and update automatically when ingredient prices change.
                </Typography>
              </Alert>
            </Box>
          </Paper>
          
          {/* NEW: Enhanced Cost History Summary */}
          {hasRecentChanges && (
            <Paper sx={{ p: 3, mb: 3 }}>
              <Typography variant="h6" gutterBottom>
                Cost Impact (Last 30 Days)
              </Typography>
              
              <Box>
                <Typography 
                  variant="h6" 
                  color={recipe.cost_history_summary.total_cost_impact > 0 ? 'error.main' : 'success.main'}
                >
                  {recipe.cost_history_summary.total_cost_impact > 0 ? '+' : ''}
                  {formatCurrency(recipe.cost_history_summary.total_cost_impact)}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {recipe.cost_history_summary.affected_ingredients.length} ingredients changed
                </Typography>
                
                {/* NEW: List most impactful changes */}
                <Box sx={{ mt: 2 }}>
                  {recipe.cost_history_summary.affected_ingredients
                    .sort((a, b) => Math.abs(b.recipe_impact || 0) - Math.abs(a.recipe_impact || 0))
                    .slice(0, 3)
                    .map((ingredient, index) => (
                      <Box key={index} sx={{ display: 'flex', justifyContent: 'space-between', py: 0.5 }}>
                        <Typography variant="caption">
                          {ingredient.name}
                        </Typography>
                        <Typography 
                          variant="caption" 
                          color={ingredient.recipe_impact > 0 ? 'error.main' : 'success.main'}
                        >
                          {ingredient.recipe_impact > 0 ? '+' : ''}{formatCurrency(ingredient.recipe_impact)}
                        </Typography>
                      </Box>
                    ))}
                </Box>
                
                <Button
                  variant="outlined"
                  size="small"
                  startIcon={<HistoryIcon />}
                  onClick={handleShowPriceHistory}
                  sx={{ mt: 2 }}
                  fullWidth
                >
                  View Full Analysis
                </Button>
              </Box>
            </Paper>
          )}
          
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Production
            </Typography>
            
            <Button
              variant="contained"
              fullWidth
              startIcon={<RestaurantIcon />}
              onClick={() => navigate(`/production/new?recipe=${id}`)}
              sx={{ mt: 1 }}
            >
              Create Production Order
            </Button>
          </Paper>
        </Grid>
      </Grid>
      
      {/* Delete Confirmation Dialog */}
      <Dialog
        open={deleteDialogOpen}
        onClose={closeDeleteDialog}
      >
        <DialogTitle>
          Delete Recipe
        </DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to delete the recipe "{recipeName}"? This action cannot be undone.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={closeDeleteDialog} autoFocus>
            Cancel
          </Button>
          <Button 
            onClick={handleDelete} 
            color="error"
            disabled={deleting}
          >
            {deleting ? 'Deleting...' : 'Delete'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* NEW: Price History Analysis Dialog */}
      <RecipePriceHistoryAnalysis
        recipeId={id}
        recipeName={recipeName}
        isOpen={priceHistoryDialogOpen}
        onClose={() => setPriceHistoryDialogOpen(false)}
      />

      {/* Success Notification */}
      <Snackbar
        open={!!notification}
        autoHideDuration={6000}
        onClose={() => setNotification(null)}
        message={notification}
      />


    
     
    
 
    </Box>
  );
};

export default RecipeDetail;