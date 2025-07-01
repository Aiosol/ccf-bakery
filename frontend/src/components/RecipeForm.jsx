import React, { useState, useEffect } from 'react';
import { 
  Box, 
  Paper, 
  Typography, 
  TextField, 
  Button, 
  Grid, 
  MenuItem, 
  FormControl, 
  InputLabel, 
  Select,
  Divider,
  IconButton,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  CircularProgress,
  Alert,
  Snackbar,
  FormHelperText,
  Chip,
  Autocomplete,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle
} from '@mui/material';
import { 
  Add as AddIcon, 
  Delete as DeleteIcon,
  Save as SaveIcon,
  ArrowBack as BackIcon,
  Calculate as CalculateIcon,
  History as HistoryIcon,
  TrendingUp as TrendingUpIcon,
  Edit as EditIcon
} from '@mui/icons-material';
import { useNavigate, useParams } from 'react-router-dom';
import axios from 'axios';

// Import utilities for formatting currency
const formatCurrency = (value, locale = 'en-US', currency = 'BDT') => {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 2
  }).format(value);
};

const RecipeForm = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEditMode = !!id;
  const API_BASE_URL = 'http://localhost:8000/api';
  
  // Form state
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    category: '',
    instructions: '',
    yield_quantity: 1,
    yield_unit: 'PCs',
    prep_time_minutes: 0,
    cook_time_minutes: 0,
    ingredients: []
  });
  
  // Form errors state
  const [formErrors, setFormErrors] = useState({});
  
  // Calculated values
  const [totalCost, setTotalCost] = useState(0);
  const [unitCost, setUnitCost] = useState(0);
  
  // Inventory state
  const [inventoryItems, setInventoryItems] = useState([]);
  const [finishedGoods, setFinishedGoods] = useState([]);
  const [loadingInventory, setLoadingInventory] = useState(false);
  
  // Divisions state
  const [divisions, setDivisions] = useState([]);
  
  // UI state
  const [loading, setLoading] = useState(true);
  const [connectionChecked, setConnectionChecked] = useState(false);
  const [connectionError, setConnectionError] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [notification, setNotification] = useState(null);
  const [selectedFinishedGood, setSelectedFinishedGood] = useState(null);
  
  // NEW: Simple ingredient addition state
  const [selectedNewIngredient, setSelectedNewIngredient] = useState(null);
  const [newIngredientQuantity, setNewIngredientQuantity] = useState(1);
  
  // Inline editing state
  const [editingIngredientIndex, setEditingIngredientIndex] = useState(-1);
  const [editingQuantity, setEditingQuantity] = useState('');
  
  // Price history state
  const [priceHistoryDialogOpen, setPriceHistoryDialogOpen] = useState(false);
  const [selectedIngredientHistory, setSelectedIngredientHistory] = useState(null);
  const [priceHistoryData, setPriceHistoryData] = useState([]);
  
  // Function to extract unique divisions from inventory
  const extractDivisions = (inventoryItems) => {
    const divisionSet = new Set();
    
    // Extract from all inventory items
    [...inventoryItems, ...finishedGoods].forEach(item => {
      const division = item.division_name || item.Division || item.division;
      if (division && division !== 'Unknown') {
        divisionSet.add(division);
      }
    });
    
    // Convert to array and sort
    const uniqueDivisions = Array.from(divisionSet).sort();
    console.log("Extracted divisions:", uniqueDivisions);
    return uniqueDivisions;
  };
  
  // Check backend connectivity
  useEffect(() => {
    const checkBackendConnectivity = async () => {
      try {
        console.log('Checking backend connectivity...');
        const response = await axios.get(`${API_BASE_URL}/inventory/`, { timeout: 5000 });
        console.log('Backend connectivity check successful:', response.status);
        console.log('Inventory items:', response.data?.length || 'Unknown');
        setConnectionChecked(true);
        
        if (isEditMode) {
          loadRecipe();
        } else {
          setLoading(false);
          loadInventoryItems();
        }
      } catch (error) {
        console.error('Backend connectivity check failed:', error);
        let errorMessage = 'Could not connect to the backend server';
        
        if (error.response) {
          errorMessage = `Server error: ${error.response.status} ${error.response.statusText}`;
        } else if (error.request) {
          errorMessage = 'No response from server. Please check if the Django backend is running.';
        }
        
        setConnectionError(errorMessage);
        setConnectionChecked(true);
        setLoading(false);
      }
    };
    
    checkBackendConnectivity();
  }, []);
  
  // Load recipe data for editing
  const loadRecipe = async () => {
    try {
      console.log(`Loading recipe with ID: ${id}`);
      const response = await axios.get(`${API_BASE_URL}/recipes/${id}/`);
      const recipeData = response.data;
      console.log("Loaded recipe data:", recipeData);
      
      // Process ingredients to ensure they have the correct structure
      const processedIngredients = (recipeData.ingredients || []).map(ing => {
        // Handle different possible structures
        const inventoryItem = ing.inventory_item || {};
        
        return {
          inventory_item_id: ing.inventory_item_id || inventoryItem.id || inventoryItem.manager_item_id,
          name: ing.inventory_item_name || inventoryItem.name || ing.name || 'Unknown Item',
          quantity: Math.round((ing.quantity || 0) * 100) / 100,
          unit: ing.inventory_item_unit || inventoryItem.unit || ing.unit || 'unit',
          unit_cost: ing.unit_cost || inventoryItem.unit_cost || 0,
          // Include the full inventory item if available
          inventory_item: inventoryItem
        };
      });
      
      setFormData({
        name: recipeData.name || '',
        description: recipeData.description || '',
        category: recipeData.category || '',
        instructions: recipeData.instructions || '',
        yield_quantity: recipeData.yield_quantity || 1,
        yield_unit: recipeData.yield_unit || 'PCs',
        prep_time_minutes: recipeData.prep_time_minutes || 0,
        cook_time_minutes: recipeData.cook_time_minutes || 0,
        ingredients: processedIngredients,
        manager_inventory_item_id: recipeData.manager_inventory_item_id || null
      });
      
      setTotalCost(recipeData.total_cost || 0);
      setUnitCost(recipeData.unit_cost || 0);
      
      if (recipeData.manager_inventory_item_id) {
        setSelectedFinishedGood(recipeData.manager_inventory_item_id);
      }
      
      loadInventoryItems();
    } catch (err) {
      console.error('Error loading recipe for editing:', err);
      setError('Failed to load recipe. Please try again.');
      setLoading(false);
    }
  };
  
  // Load inventory items
  const loadInventoryItems = async () => {
    setLoadingInventory(true);
    setError(null);
    
    try {
      console.log("Fetching inventory items...");
      let response;
      let items = [];
      
      try {
        response = await axios.get(`${API_BASE_URL}/inventory/`);
        items = response.data;
        console.log("Used /inventory/ endpoint successfully");
      } catch (err) {
        console.warn("Error using /inventory/ endpoint, trying fallback:", err);
        response = await axios.get(`${API_BASE_URL}/inventory-items/`);
        items = response.data;
        console.log("Used /inventory-items/ fallback endpoint successfully");
      }
      
      console.log(`Fetched ${items.length} inventory items`);
      
      if (items.length > 0) {
        console.log("Sample item:", items[0]);
        console.log("Item field names:", Object.keys(items[0]));
      }
      
      // Filter for FG items
      const fgItems = items.filter(item => {
        const code = item.itemCode || item.ItemCode || item.manager_item_id || '';
        return code.toString().toLowerCase().startsWith('fg');
      });
      
      // Filter for RM items
      const rmItems = items.filter(item => {
        const code = item.itemCode || item.ItemCode || item.manager_item_id || '';
        return code.toString().toLowerCase().startsWith('rm');
      });
      
      console.log(`Found ${fgItems.length} finished goods and ${rmItems.length} raw materials`);
      
      if (fgItems.length === 0) {
        console.warn("No finished goods found in inventory. Check if itemCode fields exist and start with 'FG'");
      }
      
      setFinishedGoods(fgItems);
      setInventoryItems(rmItems);
      
      // Extract divisions from all items
      const extractedDivisions = extractDivisions(items);
      setDivisions(extractedDivisions);
      
    } catch (err) {
      console.error('Error loading inventory items:', err);
      setError('Failed to load inventory items. Please try again.');
    } finally {
      setLoadingInventory(false);
      setLoading(false);
    }
  };
  
  // Calculate costs when ingredients or yield changes
  useEffect(() => {
    calculateCosts();
  }, [formData.ingredients, formData.yield_quantity]);
  
  // Calculate recipe costs
  const calculateCosts = () => {
    const total = formData.ingredients.reduce(
      (sum, ingredient) => sum + (ingredient.quantity * ingredient.unit_cost), 
      0
    );
    
    setTotalCost(total);
    
    if (formData.yield_quantity > 0) {
      setUnitCost(total / formData.yield_quantity);
    } else {
      setUnitCost(0);
    }
  };
  
  // Handle finished good selection
  const handleFinishedGoodSelect = (event) => {
    const fgKey = event.target.value;
    setSelectedFinishedGood(fgKey || null);
    
    if (!fgKey) {
      console.log("No finished good selected - creating new recipe without linkage");
      return;
    }
    
    const selectedFG = finishedGoods.find(fg => 
      fg.key === fgKey || 
      fg.id === fgKey || 
      fg.manager_item_id === fgKey ||
      (typeof fg.id === 'string' && fg.id === fgKey.toString()) ||
      (typeof fgKey === 'string' && fgKey === fg.id?.toString())
    );
    
    if (selectedFG) {
      console.log("Selected finished good:", selectedFG);
      
      // Get division from the FG item
      const division = selectedFG.division_name || selectedFG.Division || selectedFG.division || '';
      const itemName = selectedFG.itemName || selectedFG.name || selectedFG.ItemName || '';
      
      console.log("Division from FG:", division);
      
      // Auto-set the form fields
      setFormData(prev => ({
        ...prev,
        name: itemName,
        category: division,
        manager_inventory_item_id: fgKey
      }));
      
      if (formErrors.finished_good) {
        setFormErrors(prev => ({
          ...prev,
          finished_good: undefined
        }));
      }
    } else {
      console.error("Finished good not found with key:", fgKey);
    }
  };
  
  // Handle form field changes
  const handleChange = (e) => {
    const { name, value } = e.target;
    
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    if (formErrors[name]) {
      setFormErrors(prev => ({
        ...prev,
        [name]: undefined
      }));
    }
  };
  
  // Handle numeric input changes
  const handleNumericChange = (e) => {
    const { name, value } = e.target;
    const numValue = parseFloat(value) || 0;
    
    setFormData(prev => ({
      ...prev,
      [name]: numValue
    }));
    
    if (formErrors[name]) {
      setFormErrors(prev => ({
        ...prev,
        [name]: undefined
      }));
    }
  };
  
  // NEW: Quick add ingredient function
  const handleQuickAddIngredient = () => {
    if (!selectedNewIngredient) return;
    
    // Check if ingredient already exists
    const existingIndex = formData.ingredients.findIndex(
      ing => ing.inventory_item_id === (selectedNewIngredient.key || selectedNewIngredient.id || selectedNewIngredient.manager_item_id)
    );
    
    if (existingIndex >= 0) {
      // Update existing ingredient quantity
      const updatedIngredients = [...formData.ingredients];
      updatedIngredients[existingIndex].quantity += parseFloat(newIngredientQuantity);
      
      setFormData(prev => ({
        ...prev,
        ingredients: updatedIngredients
      }));
      
      setNotification(`Updated ${selectedNewIngredient.itemName || selectedNewIngredient.name} quantity`);
    } else {
      // Add new ingredient
      const newIngredient = {
        inventory_item_id: selectedNewIngredient.key || selectedNewIngredient.id || selectedNewIngredient.manager_item_id,
        name: selectedNewIngredient.itemName || selectedNewIngredient.name || selectedNewIngredient.ItemName || 'Unknown Item',
        quantity: parseFloat(newIngredientQuantity),
        unit: selectedNewIngredient.unit || selectedNewIngredient.UnitName || 'unit',
        unit_cost: selectedNewIngredient.averageCost?.value || selectedNewIngredient.unit_cost || 0
      };
      
      setFormData(prev => ({
        ...prev,
        ingredients: [...prev.ingredients, newIngredient]
      }));
      
      setNotification(`Added ${newIngredient.name} to recipe`);
    }
    
    // Reset form
    setSelectedNewIngredient(null);
    setNewIngredientQuantity(1);
    
    // Clear ingredient errors if any
    if (formErrors.ingredients) {
      setFormErrors(prev => ({
        ...prev,
        ingredients: undefined
      }));
    }
  };
  
  // Handle removing ingredient
  const handleRemoveIngredient = (index) => {
    const updatedIngredients = [...formData.ingredients];
    const removedIngredient = updatedIngredients.splice(index, 1)[0];
    
    setFormData(prev => ({
      ...prev,
      ingredients: updatedIngredients
    }));
    
    setNotification(`Removed ${removedIngredient.name} from recipe`);
  };
  
  // Handle inline editing
  const startEditingQuantity = (index) => {
    setEditingIngredientIndex(index);
    setEditingQuantity(formData.ingredients[index].quantity.toString());
  };
  
  const saveEditingQuantity = () => {
    const newQuantity = parseFloat(editingQuantity);
    if (isNaN(newQuantity) || newQuantity <= 0) {
      setNotification('Please enter a valid quantity');
      return;
    }
    
    const updatedIngredients = [...formData.ingredients];
    updatedIngredients[editingIngredientIndex].quantity = newQuantity;
    
    setFormData(prev => ({
      ...prev,
      ingredients: updatedIngredients
    }));
    
    setEditingIngredientIndex(-1);
    setEditingQuantity('');
    setNotification('Quantity updated');
  };
  
  const cancelEditingQuantity = () => {
    setEditingIngredientIndex(-1);
    setEditingQuantity('');
  };
  
  // Show price history for an ingredient
  const showPriceHistory = async (ingredient) => {
    try {
      const response = await axios.get(
        `${API_BASE_URL}/inventory/${ingredient.inventory_item_id}/price_history/?days=30`
      );
      
      setSelectedIngredientHistory(ingredient);
      setPriceHistoryData(response.data);
      setPriceHistoryDialogOpen(true);
    } catch (error) {
      console.error('Error fetching price history:', error);
      setNotification('Failed to load price history');
    }
  };
  
  // Save recipe function
  const handleSaveRecipe = async () => {
    setFormErrors({});
    let hasErrors = false;
    const newErrors = {};
    
    if (!formData.name) {
      newErrors.name = 'Recipe name is required';
      hasErrors = true;
    }
    
    if (!selectedFinishedGood && !formData.manager_inventory_item_id) {
      newErrors.finished_good = 'Please select a finished good';
      hasErrors = true;
    }
    
    if (formData.ingredients.length === 0) {
      newErrors.ingredients = 'At least one ingredient is required';
      hasErrors = true;
    }
    
    if (hasErrors) {
      setFormErrors(newErrors);
      setError('Please correct the validation errors and try again');
      return;
    }
    
    setSaving(true);
    setError(null);
    
    try {
      const formattedIngredients = formData.ingredients.map(ingredient => ({
      inventory_item_id: ingredient.inventory_item_id,
      quantity: Math.round(ingredient.quantity * 100) / 100 // Round to 2 decimal places
    }));
    
    const recipeData = {
      name: formData.name,
      description: formData.description || "",
      category: formData.category || null,
      instructions: formData.instructions || "",
      yield_quantity: formData.yield_quantity,
      yield_unit: formData.yield_unit,
      prep_time_minutes: formData.prep_time_minutes,
      cook_time_minutes: formData.cook_time_minutes || 0,
      manager_inventory_item_id: formData.manager_inventory_item_id || selectedFinishedGood,
      recipeingredient_set: formattedIngredients
    };
      
      console.log("Saving recipe with data:", recipeData);
      
      let result;
      
      if (isEditMode) {
        const response = await axios.put(`${API_BASE_URL}/recipes/${id}/`, recipeData);
        result = response.data;
        setNotification('Recipe updated successfully');
      } else {
        const response = await axios.post(`${API_BASE_URL}/recipes/`, recipeData);
        result = response.data;
        setNotification('Recipe created successfully');
      }
      
      console.log("Recipe saved successfully:", result);
      
      setTimeout(() => {
        navigate(`/recipes/${result.id}`);
      }, 1500);
    } catch (err) {
      console.error('Error saving recipe:', err);
      
      if (err.response) {
        console.log("Server responded with error:", err.response);
        
        if (err.response.data) {
          if (typeof err.response.data === 'object') {
            const backendErrors = {};
            
            Object.entries(err.response.data).forEach(([field, errors]) => {
              if (Array.isArray(errors)) {
                backendErrors[field] = errors.join(', ');
              } else if (typeof errors === 'string') {
                backendErrors[field] = errors;
              } else if (typeof errors === 'object') {
                backendErrors[field] = JSON.stringify(errors);
              }
            });
            
            setFormErrors(backendErrors);
            
            if (err.response.status === 400) {
              setError('Please correct the validation errors and try again');
            } else {
              setError(`Error (${err.response.status}): ${err.response.statusText}`);
            }
            
            console.log("Processed backend validation errors:", backendErrors);
          } else {
            setError(`Failed to save recipe: ${err.response.data}`);
          }
        } else {
          setError(`Server error: ${err.response.status} ${err.response.statusText}`);
        }
      } else if (err.request) {
        setError('No response from server. Please check your connection.');
        console.log("No response received:", err.request);
      } else {
        setError('Failed to save recipe. Please try again.');
      }
    } finally {
      setSaving(false);
    }
  };
  
  // Display loading state
  if (loading) {
    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', height: '70vh' }}>
        <CircularProgress size={60} />
        <Box sx={{ mt: 4, textAlign: 'center' }}>
          <Typography variant="body1">
            {connectionChecked ? 'Loading recipe data...' : 'Connecting to backend server...'}
          </Typography>
        </Box>
      </Box>
    );
  }

  // Display connection error
  if (connectionError) {
    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', height: '70vh', maxWidth: '800px', mx: 'auto', p: 3 }}>
        <Alert severity="error" sx={{ mb: 3, width: '100%' }}>
          {connectionError}
        </Alert>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <Button variant="contained" color="primary" onClick={() => window.location.reload()}>
            Retry Connection
          </Button>
          <Button variant="outlined" onClick={() => navigate('/recipes')}>
            Go Back to Recipes
          </Button>
        </Box>
      </Box>
    );
  }
  
  return (
    <Box sx={{ width: '100%', maxWidth: '100%' }}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Button 
            startIcon={<BackIcon />}
 
            onClick={() => navigate('/recipes')}
            sx={{ mb: 1 }}
          >
            Back to Recipes
          </Button>
          <Typography variant="h4" component="h1">
            {isEditMode ? 'Edit Recipe' : 'Create New Recipe'}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            All ingredients automatically use live pricing from inventory
          </Typography>
        </Box>
        
        <Button
          variant="contained"
          color="primary"
          startIcon={saving ? <CircularProgress size={24} /> : <SaveIcon />}
          onClick={handleSaveRecipe}
          disabled={saving}
        >
          {saving ? 'Saving...' : 'Save Recipe'}
        </Button>
      </Box>
      
      {/* Error Alert */}
      {error && (
        <Alert 
          severity="error" 
          sx={{ mb: 3 }}
          onClose={() => setError(null)}
        >
          {error}
        </Alert>
      )}
      
      {/* Recipe Form */}
      <Grid container spacing={3}>
        {/* Left Column - Basic Info */}
        <Grid item xs={12} md={8}>
          <Paper sx={{ p: 3, mb: 3 }}>
            <Typography variant="h6" gutterBottom>
              Recipe Information
            </Typography>
            
            <Grid container spacing={2}>
              {/* Finished Good Selection */}
              <Grid item xs={12}>
              <Autocomplete
                options={[{ key: '', name: 'Create new recipe', itemCode: '' }, ...finishedGoods]}
                getOptionLabel={(option) => {
                  if (option.key === '') return 'Create new recipe';
                  return `${option.itemName || option.name || option.ItemName || 'Unknown Item'} (${option.itemCode || option.ItemCode || option.manager_item_id})`;
                }}
                value={finishedGoods.find(item => (item.key || item.id || item.manager_item_id) === selectedFinishedGood) || null}
                onChange={(event, newValue) => {
                  const value = newValue ? (newValue.key || newValue.id || newValue.manager_item_id || '') : '';
                  handleFinishedGoodSelect({ target: { value } });
                }}

                filterOptions={(options, { inputValue }) => {
                  const searchTerm = inputValue.toLowerCase().trim();
                  if (!searchTerm) return options;
                  
                  return options.filter(option => {
                    const name = (option.name || '').toLowerCase();
                    // Only match if the name starts with the search term (first word)
                    return name.startsWith(searchTerm);
                  });
                }}
                
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="Select Finished Good"
                    required
                    error={Boolean(formErrors.finished_good)}
                    helperText={formErrors.finished_good || "Type to search for finished goods"}
                    placeholder="Search and select finished good..."
                  />
                )}
                renderOption={(props, option) => (
                  <Box component="li" {...props}>
                    {option.key === '' ? (
                      <em>Create new recipe</em>
                    ) : (
                      <Box>
                        <Typography variant="body1">
                          {option.itemName || option.name || option.ItemName || 'Unknown Item'}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          Code: {option.itemCode || option.ItemCode || option.manager_item_id}
                        </Typography>
                      </Box>
                    )}
                  </Box>
                )}
                isOptionEqualToValue={(option, value) => (option.key || option.id) === (value?.key || value?.id)}
              />
              </Grid>
              
              <Grid item xs={12}>
                <TextField
                  name="name"
                  label="Recipe Name"
                  value={formData.name}
                  onChange={handleChange}
                  fullWidth
                  required
                  error={Boolean(formErrors.name)}
                  helperText={formErrors.name}
                />
              </Grid>
              
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth error={Boolean(formErrors.category)}>
                  <InputLabel>Division (Category)</InputLabel>
                  <Select
                    name="category"
                    value={formData.category || ''}
                    onChange={handleChange}
                    label="Division (Category)"
                  >
                    <MenuItem value="">
                      <em>Uncategorized</em>
                    </MenuItem>
                    {divisions.map(division => (
                      <MenuItem key={division} value={division}>
                        {division}
                      </MenuItem>
                    ))}
                  </Select>
                  <FormHelperText>
                    {formErrors.category || 'Auto-selected from finished good'}
                  </FormHelperText>
                </FormControl>
              </Grid>
              
              <Grid item xs={12} sm={6}>
                <TextField
                  name="description"
                  label="Description"
                  value={formData.description}
                  onChange={handleChange}
                  fullWidth
                  multiline
                  rows={1}
                  error={Boolean(formErrors.description)}
                  helperText={formErrors.description}
                />
              </Grid>
              
              <Grid item xs={12} sm={4}>
                <TextField
                  name="yield_quantity"
                  label="Yield Quantity"
                  type="number"
                  value={formData.yield_quantity}
                  onChange={handleNumericChange}
                  fullWidth
                  required
                  inputProps={{ min: 1, step: 1 }}
                  error={Boolean(formErrors.yield_quantity)}
                  helperText={formErrors.yield_quantity}
                />
              </Grid>
              
              <Grid item xs={12} sm={4}>
                <TextField
                  name="yield_unit"
                  label="Yield Unit"
                  value={formData.yield_unit}
                  onChange={handleChange}
                  fullWidth
                  required
                  placeholder="e.g., PCs, loaves, cookies"
                  error={Boolean(formErrors.yield_unit)}
                  helperText={formErrors.yield_unit}
                />
              </Grid>
              
              <Grid item xs={12} sm={4}>
                <TextField
                  name="prep_time_minutes"
                  label="Prep Time (minutes)"
                  type="number"
                  value={formData.prep_time_minutes}
                  onChange={handleNumericChange}
                  fullWidth
                  inputProps={{ min: 0, step: 5 }}
                  error={Boolean(formErrors.prep_time_minutes)}
                  helperText={formErrors.prep_time_minutes}
                />
              </Grid>
            </Grid>
          </Paper>
          
          <Paper sx={{ p: 3, mb: 3 }}>
            <Typography variant="h6" gutterBottom>
              Instructions
            </Typography>
            
            <TextField
              name="instructions"
              value={formData.instructions}
              onChange={handleChange}
              fullWidth
              multiline
              rows={8}
              placeholder="Enter step-by-step instructions..."
              error={Boolean(formErrors.instructions)}
              helperText={formErrors.instructions}
            />
          </Paper>
          
          <Paper sx={{ p: 3 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="h6">
                Ingredients
              </Typography>
              
              <Chip 
                icon={<TrendingUpIcon />}
                label="All Live Pricing" 
                color="success" 
                size="small"
              />
            </Box>
            
            {/* NEW: Simple ingredient addition */}
            <Box sx={{ 
              display: 'flex', 
              gap: 2, 
              mb: 3, 
              alignItems: 'flex-start', // Change from 'flex-end' to 'flex-start'
              p: 2,
              bgcolor: 'grey.50',
              borderRadius: 1
            }}>
              <Autocomplete
                options={inventoryItems}
                getOptionLabel={(option) => `${option.itemName || option.name || option.ItemName} (${option.itemCode || option.ItemCode})`}
                renderOption={(props, option) => (
                  <Box component="li" {...props}>
                    <Box sx={{ width: '100%' }}>
                      <Typography variant="body2" sx={{ fontWeight: 500 }}>
                        {option.itemName || option.name || option.ItemName}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {option.itemCode || option.ItemCode} • {formatCurrency(option.averageCost?.value || option.unit_cost || 0)} per {option.unit || option.UnitName}
                      </Typography>
                      <br />
                      <Chip 
                        icon={<TrendingUpIcon />}
                        label="Live pricing" 
                        color="success" 
                        size="small"
                        sx={{ mt: 0.5 }}
                      />
                    </Box>
                  </Box>
                )}
                sx={{ flex: 1 }}
                renderInput={(params) => (
                  <TextField 
                    {...params} 
                    label="Search ingredients..." 
                    placeholder="Type to search raw materials"
                    helperText="Search by name or item code"
                  />
                )}
                value={selectedNewIngredient}
                onChange={(event, value) => setSelectedNewIngredient(value)}
                loading={loadingInventory}
                noOptionsText="No ingredients found"
              />
              
              <TextField
                label="Quantity"
                type="number"
                value={newIngredientQuantity}
                onChange={(e) => setNewIngredientQuantity(e.target.value)}
                sx={{ width: 120 }}
                inputProps={{ min: 0.1, step: 0.1 }}
                helperText={selectedNewIngredient ? selectedNewIngredient.unit || selectedNewIngredient.UnitName || 'unit' : 'unit'}
              />
              
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={handleQuickAddIngredient}
                disabled={!selectedNewIngredient || !newIngredientQuantity || newIngredientQuantity <= 0}
                sx={{ height: 56 }}
              >
                Add
              </Button>
            </Box>
            
            {formErrors.ingredients && (
              <Alert severity="error" sx={{ mb: 2 }}>
                {formErrors.ingredients}
              </Alert>
            )}
            
            {formData.ingredients.length > 0 ? (
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Ingredient</TableCell>
                      <TableCell align="right">Quantity</TableCell>
                      <TableCell align="right">Unit</TableCell>
                      <TableCell align="right">Unit Cost</TableCell>
                      <TableCell align="right">Total</TableCell>
                      <TableCell align="center">Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {formData.ingredients.map((ingredient, index) => (
                      <TableRow key={index}>
                        <TableCell>
                          <Box>
                            <Typography variant="body2">
                              {ingredient.name || ingredient.inventory_item?.name || 'Unknown Item'}
                            </Typography>
                            <Typography variant="caption" color="success.main">
                              📈 Live pricing from inventory
                            </Typography>
                          </Box>
                        </TableCell>
                        <TableCell align="right">
                          {editingIngredientIndex === index ? (
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              <TextField
                                size="small"
                                type="number"
                                value={editingQuantity}
                                onChange={(e) => setEditingQuantity(e.target.value)}
                                inputProps={{ min: 0.1, step: 0.1 }}
                                sx={{ width: 80 }}
                                autoFocus
                                onKeyPress={(e) => {
                                  if (e.key === 'Enter') saveEditingQuantity();
                                  if (e.key === 'Escape') cancelEditingQuantity();
                                }}
                              />
                              <IconButton size="small" color="primary" onClick={saveEditingQuantity}>
                                <SaveIcon fontSize="small" />
                              </IconButton>
                              <IconButton size="small" onClick={cancelEditingQuantity}>
                                <DeleteIcon fontSize="small" />
                              </IconButton>
                            </Box>
                          ) : (
                            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 1 }}>
                              <Typography>{ingredient.quantity}</Typography>
                              <IconButton 
                                size="small" 
                                onClick={() => startEditingQuantity(index)}
                                title="Edit quantity"
                              >
                                <EditIcon fontSize="small" />
                              </IconButton>
                            </Box>
                          )}
                        </TableCell>
                        <TableCell align="right">{ingredient.unit}</TableCell>
                        <TableCell align="right">
                          {formatCurrency(ingredient.unit_cost)}
                        </TableCell>
                        <TableCell align="right">
                          {formatCurrency(ingredient.quantity * ingredient.unit_cost)}
                        </TableCell>
                        <TableCell align="center">
                          <Box sx={{ display: 'flex', justifyContent: 'center' }}>
                            <IconButton 
                              size="small" 
                              onClick={() => showPriceHistory(ingredient)}
                              title="View price history"
                            >
                              <HistoryIcon fontSize="small" />
                            </IconButton>
                            <IconButton size="small" color="error" onClick={() => handleRemoveIngredient(index)}>
                              <DeleteIcon fontSize="small" />
                            </IconButton>
                          </Box>
                        </TableCell>
                      </TableRow>
                    ))}
                    
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
              <Box sx={{ p: 4, textAlign: 'center', bgcolor: 'grey.50', borderRadius: 1 }}>
                <Typography variant="body1" color="text.secondary" paragraph>
                  No ingredients added yet. Use the search box above to add ingredients.
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  All ingredients will automatically use live pricing from inventory.
                </Typography>
              </Box>
            )}
          </Paper>
        </Grid>
        
        {/* Right Column - Cost Summary */}
        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 3, mb: 3 }}>
            <Typography variant="h6" gutterBottom>
              Cost Summary
            </Typography>
            
            <Box sx={{ mt: 3 }}>
              <Grid container spacing={2}>
                <Grid item xs={6}>
                  <Typography variant="subtitle2" color="text.secondary">
                    Total Recipe Cost
                  </Typography>
                  <Typography variant="h5" color="primary.main">
                    {formatCurrency(totalCost)}
                  </Typography>
                </Grid>
                
                <Grid item xs={6}>
                  <Typography variant="subtitle2" color="text.secondary">
                    Cost Per {formData.yield_unit}
                  </Typography>
                  <Typography variant="h5" color="primary.main">
                    {formatCurrency(unitCost)}
                  </Typography>
                </Grid>
              </Grid>
              
              <Divider sx={{ my: 3 }} />
              
              <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                Yield
              </Typography>
              <Typography variant="h6">
                {formData.yield_quantity} {formData.yield_unit}
              </Typography>
              
              <Divider sx={{ my: 3 }} />
              
              <Alert severity="info" sx={{ mt: 2 }}>
                <Typography variant="body2">
                  💡 All ingredients use live pricing - costs update automatically when inventory prices change.
                </Typography>
              </Alert>
            </Box>
          </Paper>
          
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Recipe Tips
            </Typography>
            
            <Typography variant="body2" paragraph>
              • Use the search box to quickly find and add ingredients
            </Typography>
            <Typography variant="body2" paragraph>
              • Click the edit icon to modify ingredient quantities
            </Typography>
            <Typography variant="body2" paragraph>
              • All ingredients automatically use current inventory costs
            </Typography>
            <Typography variant="body2" paragraph>
              • Recipe costs update when ingredient prices change in inventory
            </Typography>
            <Typography variant="body2" paragraph>
              • View price history to see how costs have changed over time
            </Typography>
            <Typography variant="body2" paragraph>
              • Select a finished good item before saving (required)
            </Typography>
          </Paper>
        </Grid>
      </Grid>

      {/* Price History Dialog */}
      <Dialog
        open={priceHistoryDialogOpen}
        onClose={() => setPriceHistoryDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          Price History - {selectedIngredientHistory?.name}
        </DialogTitle>
        <DialogContent>
          {priceHistoryData.length > 0 ? (
            <Box>
              <Typography variant="body2" color="text.secondary" paragraph>
                Price changes for the last 30 days:
              </Typography>
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Date</TableCell>
                      <TableCell align="right">Old Price</TableCell>
                      <TableCell align="right">New Price</TableCell>
                      <TableCell align="right">Change</TableCell>
                      <TableCell align="right">Impact</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {priceHistoryData.slice(0, 10).map((change, index) => (
                      <TableRow key={index}>
                        <TableCell>
                          {new Date(change.changed_at).toLocaleDateString()}
                        </TableCell>
                        <TableCell align="right">
                          {formatCurrency(change.old_price)}
                        </TableCell>
                        <TableCell align="right">
                          {formatCurrency(change.new_price)}
                        </TableCell>
                        <TableCell align="right">
                          <Typography 
                            color={change.change_amount > 0 ? 'error.main' : 'success.main'}
                          >
                            {change.change_amount > 0 ? '+' : ''}{change.change_percentage.toFixed(1)}%
                          </Typography>
                        </TableCell>
                        <TableCell align="right">
                          {formatCurrency(change.change_amount * selectedIngredientHistory?.quantity || 0)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </Box>
          ) : (
            <Typography variant="body1" color="text.secondary">
              No price changes recorded for this ingredient in the last 30 days.
            </Typography>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPriceHistoryDialogOpen(false)}>
            Close
          </Button>
        </DialogActions>
      </Dialog>

      {/* Notification Snackbar */}
      <Snackbar
        open={!!notification}
        autoHideDuration={6000}
        onClose={() => setNotification(null)}
        message={notification}
      />
    </Box>
  );
};

export default RecipeForm;