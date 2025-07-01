// ManualOrder.jsx - Super Simple Functional Version
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Container,
  Paper,
  Typography,
  TextField,
  Button,
  Grid,
  Alert,
  CircularProgress, MenuItem, Select, InputLabel,FormControl,
  Autocomplete
} from '@mui/material';
import {
  ArrowBack as BackIcon,
  PlayArrow as StartIcon
} from '@mui/icons-material';

// Import services
import djangoApiService from '../services/djangoApiService';
import productionService from '../services/productionApiService';
import inventoryService from '../services/inventoryService';


const ManualOrder = () => {
  const navigate = useNavigate();
  
  // State
  const [selectedShift, setSelectedShift] = useState('');
  const [finishedGoods, setFinishedGoods] = useState([]);
  const [selectedItem, setSelectedItem] = useState('');
  const [selectedItemData, setSelectedItemData] = useState(null);
  const [productionQuantity, setProductionQuantity] = useState('');
  const [assignedTo, setAssignedTo] = useState('');
  const [notes, setNotes] = useState('');
  const [scheduledDate, setScheduledDate] = useState(
    new Date().toISOString().split('T')[0] // Today
  );
  
  // UI State
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState(null);
  
  // Load finished goods on mount
  useEffect(() => {
    loadFinishedGoods();
  }, []);
  
  const loadFinishedGoods = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Get both inventory items AND recipes
      const [inventoryItems, recipes] = await Promise.all([
        inventoryService.fetchInventoryItems(),
        djangoApiService.getRecipes()
      ]);
      
      // Filter finished goods from inventory
      const fgItems = inventoryItems.filter(item => 
        (item.code && item.code.toLowerCase().startsWith('fg')) || 
        (item.type && item.type.toLowerCase() === 'finished_good')
      );
      
      // Map recipes to their corresponding finished goods
      const enrichedFinishedGoods = fgItems.map(fgItem => {
        // Find matching recipe by name or code
        const matchingRecipe = recipes.find(recipe => 
          recipe.name === fgItem.name || 
          recipe.finished_good_code === fgItem.code ||
          recipe.manager_inventory_item_id === fgItem.id
        );
        
        return {
          // Inventory item properties (for production order)
          ...fgItem,
          // Recipe properties (for ingredient calculation)
          recipe: matchingRecipe,
          recipe_id: matchingRecipe?.id,
          recipe_name: matchingRecipe?.name,
          yield_quantity: matchingRecipe?.yield_quantity || 1,
          yield_unit: matchingRecipe?.yield_unit || 'units',
          ingredients: matchingRecipe?.ingredients || []
        };
      });
      
      setFinishedGoods(enrichedFinishedGoods);
      
    } catch (err) {
      console.error('Error loading finished goods:', err);
      setError(`Failed to load data: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };
  
  const handleItemSelect = (event, newValue) => {
    setSelectedItem(newValue ? newValue.id : '');
    setSelectedItemData(newValue);
  };
  
  const handleCreateOrder = async () => {
    if (!selectedItemData || !productionQuantity || productionQuantity <= 0) {
      setError('Please select an item and enter a valid production quantity');
      return;
    }
    
    if (!assignedTo.trim()) {
      setError('Please enter who this production is assigned to');
      return;
    }
    
    setCreating(true);
    setError(null);
    
    try {
      console.log('Creating production order...');
      
      // Prepare production data
      const productionItems = [{
        // Finished Good Info (from inventory)
        item_name: selectedItemData.name,
        item_code: selectedItemData.code || '',
        inventory_item_id: selectedItemData.id,
        manager_inventory_item_id: selectedItemData.manager_uuid || selectedItemData.manager_item_id,
        
        // Recipe Info (for ingredient calculation)
        recipe_id: selectedItemData.recipe_id,
        recipe_name: selectedItemData.recipe_name,
        
        // Production Details
        production_quantity: parseFloat(productionQuantity),
        production_category_code: 'A',
        assigned_to: assignedTo.trim(),
        notes: notes || `Manual production order for ${selectedItemData.name}`,
        orders: [],
        is_manual_order: true
      }];
      
      //  Create Manual Production Order
      const result = await productionService.createDirectProductionOrders(
        productionItems,
        scheduledDate
      );
      
      console.log('Production order result:', result);
      
      if (result.success) {
        console.log('Production order created successfully!');
        
        // Navigate to production list with success message
        navigate('/production', { 
          state: { 
            message: `Production order created for ${selectedItemData.name} - ${productionQuantity} units assigned to ${assignedTo}` 
          } 
        });
      } else {
        throw new Error(result.message || 'Failed to  Create Manual Production Order');
      }
      
    } catch (err) {
      console.error('Error creating production order:', err);
      setError(`Failed to  Create Manual Production Order: ${err.message}`);
    } finally {
      setCreating(false);
    }
  };
  
  if (loading) {
    return (
      <Container maxWidth="md" sx={{ mt: 4, display: 'flex', justifyContent: 'center' }}>
        <CircularProgress />
        <Typography sx={{ ml: 2 }}>Loading recipes...</Typography>
      </Container>
    );
  }
  
  return (
    <Container maxWidth="md" sx={{ mt: 4, mb: 8 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 4 }}>
        <Button 
          startIcon={<BackIcon />} 
          onClick={() => navigate(-1)}
          sx={{ mr: 2 }}
        >
          Back
        </Button>
        <Typography variant="h4" component="h1">
           Create Manual Production Order
        </Typography>
      </Box>
      
      {/* Error Alert */}
      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}
      
      {/* Main Form */}
      <Paper sx={{ p: 4 }}>
        <Typography variant="h5" gutterBottom>
          Production Planning
        </Typography>
        
        <Grid container spacing={3}>
          {/* Select Finished Good with Search */}
          <Grid item xs={12}>
            <Autocomplete
              options={finishedGoods}
              getOptionLabel={(option) => `${option.name} (${option.category || 'Recipe'})`}
              value={selectedItemData}
              onChange={handleItemSelect}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="Select Recipe"
                  placeholder="Search and select recipe to produce..."
                  helperText="Type to search for the recipe you want to produce"
                  required
                />
              )}
              renderOption={(props, option) => (
                <Box component="li" {...props}>
                  <Box>
                    <Typography variant="body1">
                      {option.name}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Code: {option.code || 'No Code'} | 
                      Available: {option.availableQty || 0} units
                      {option.recipe && ` | Recipe: ${option.recipe.name}`}
                    </Typography>
                    {option.recipe && (
                      <Typography variant="caption" color="primary">
                        Yield: {option.yield_quantity} {option.yield_unit} per batch
                      </Typography>
                    )}
                  </Box>
                </Box>
              )}
              isOptionEqualToValue={(option, value) => option.id === value?.id}
              filterOptions={(options, { inputValue }) => {
                const filtered = options.filter(option => {
                  const name = (option.name || '').toLowerCase();
                  const category = (option.category || '').toLowerCase();
                  const search = inputValue.toLowerCase();
                  return name.includes(search) || category.includes(search);
                });
                return filtered;
              }}
            />
          </Grid>
          
          {/* Selected Item Info */}
          {selectedItemData && (
            <Grid item xs={12}>
              <Paper variant="outlined" sx={{ p: 2, bgcolor: 'background.paper' }}>
                <Typography variant="h6">{selectedItemData.name}</Typography>
                <Typography variant="body2" color="text.secondary">
                  Code: {selectedItemData.code || 'No Code'} | 
                  Available: {selectedItemData.availableQty || 0} units
                </Typography>
                {selectedItemData.recipe ? (
                  <Typography variant="body2" color="primary">
                    Recipe: {selectedItemData.recipe_name} | 
                    Yield: {selectedItemData.yield_quantity} {selectedItemData.yield_unit} per batch |
                    Ingredients: {selectedItemData.ingredients?.length || 0} items
                  </Typography>
                ) : (
                  <Typography variant="body2" color="warning.main">
                    ⚠️ No recipe found for this item - manual costing required
                  </Typography>
                )}
              </Paper>
            </Grid>
          )}
          
          {/* Production Quantity */}
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label="Production Quantity"
              type="number"
              value={productionQuantity}
              onChange={(e) => setProductionQuantity(e.target.value)}
              inputProps={{ min: 1, step: 1 }}
              required
              helperText="Enter the quantity to produce"
            />
          </Grid>
          
          {/* Assigned To */}
          <Grid item xs={12} sm={6}>
            <FormControl fullWidth required>
              <InputLabel>Assigned To</InputLabel>
              <Select
                value={assignedTo}
                label="Assigned To"
                onChange={(e) => setAssignedTo(e.target.value)}
              >
                <MenuItem value="Mr. Rakib">Mr. Rakib</MenuItem>
                <MenuItem value="Mr. Sabuz">Mr. Sabuz</MenuItem>
                <MenuItem value="Mr. Justin">Mr. Justin</MenuItem>
              </Select>
            </FormControl>
          </Grid>

          {/* Shift Selection */}
          <Grid item xs={12} sm={6}>
            <FormControl fullWidth required>
              <InputLabel>Shift</InputLabel>
              <Select
                value={selectedShift}
                label="Shift"
                onChange={(e) => setSelectedShift(e.target.value)}
              >
                <MenuItem value="Morning">Morning</MenuItem>
                <MenuItem value="Afternoon">Afternoon</MenuItem>
                <MenuItem value="Night">Night</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          
          {/* Scheduled Date */}
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label="Scheduled Date"
              type="date"
              value={scheduledDate}
              onChange={(e) => setScheduledDate(e.target.value)}
              InputLabelProps={{ shrink: true }}
            />
          </Grid>
          
          {/* Notes */}
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label="Production Notes (Optional)"
              multiline
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add any special instructions..."
            />
          </Grid>
        </Grid>
        
        {/* Summary */}
        {selectedItemData && productionQuantity && assignedTo && (
          <Paper sx={{ p: 2, mt: 3, bgcolor: 'primary.50' }}>
            <Typography variant="h6" gutterBottom>
              Production Summary
            </Typography>
            <Typography>
              <strong>Item:</strong> {selectedItemData.name}
            </Typography>
            <Typography>
              <strong>Quantity:</strong> {productionQuantity} units
            </Typography>
            <Typography>
              <strong>Assigned To:</strong> {assignedTo}
            </Typography>
            <Typography>
              <strong>Date:</strong> {scheduledDate}
            </Typography>
          </Paper>
        )}
        
        {/* Create Button */}
        <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 4 }}>
          <Button
            variant="contained"
            onClick={handleCreateOrder}
            startIcon={creating ? <CircularProgress size={20} /> : <StartIcon />}
            disabled={creating || !selectedItemData || !productionQuantity || !assignedTo}
            color="success"
            size="large"
          >
            {creating ? 'Creating...' : ' Create Manual Production Order'}
          </Button>
        </Box>
      </Paper>
    </Container>
  );
};

export default ManualOrder;