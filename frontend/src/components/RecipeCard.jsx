// RecipeCard.jsx with improved data handling
import React from 'react';
import { Card, CardContent, CardActions, Typography, Button, Chip, Box } from '@mui/material';
import { RestaurantMenu as RecipeIcon, ArrowForward as ArrowIcon } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';

// Safe string helpers
const safeString = (str) => str || '';

// Calculate total cost from ingredients
const calculateTotalCost = (ingredients = []) => {
  if (!Array.isArray(ingredients)) return 0;
  
  return ingredients.reduce((sum, ingredient) => {
    const quantity = parseFloat(ingredient.quantity) || 0;
    const unitCost = parseFloat(ingredient.unit_cost) || 0;
    return sum + (quantity * unitCost);
  }, 0);
};

// Calculate unit cost
const calculateUnitCost = (totalCost, yieldQuantity) => {
  if (!yieldQuantity || yieldQuantity <= 0) return 0;
  return totalCost / yieldQuantity;
};

const RecipeCard = ({ recipe }) => {
  const navigate = useNavigate();
  
  // Debug the recipe data to help with troubleshooting
  if (process.env.NODE_ENV !== 'production') {
    console.log(`RecipeCard data for ${recipe?.name || 'unnamed recipe'}:`, recipe);
  }
  
  // Safely handle potential null/undefined values
  const recipeName = safeString(recipe?.name) || 'Unnamed Recipe';
  const recipeDescription = safeString(recipe?.description) || 'No description available';
  const categoryName = safeString(recipe?.category_name) || 'Uncategorized';
  const yieldQuantity = recipe?.yield_quantity || 0;
  const yieldUnit = safeString(recipe?.yield_unit) || 'items';
  const yieldInfo = `${yieldQuantity} ${yieldUnit}`;
  
  // Get ingredients from either ingredients or recipeingredient_set
  const ingredients = recipe?.ingredients || recipe?.recipeingredient_set || [];
  
  // Determine costs - use API provided values or calculate from ingredients
  let totalCost = recipe?.total_cost;
  let unitCost = recipe?.unit_cost;
  
  // Calculate costs if they're not provided
  if (totalCost === undefined) {
    totalCost = calculateTotalCost(ingredients);
  }
  
  if (unitCost === undefined && yieldQuantity > 0) {
    unitCost = totalCost / yieldQuantity;
  }
  
  // Format cost as currency - safely handle null values
  const formatCurrency = (value) => {
    if (value == null) return 'N/A';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'BDT',
      minimumFractionDigits: 2
    }).format(value);
  };
  
  const handleClick = () => {
    navigate(`/recipes/${recipe.id}`);
  };
  
  return (
    <Card 
      elevation={2}
      sx={{ 
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        transition: 'transform 0.2s, box-shadow 0.2s',
        '&:hover': {
          transform: 'translateY(-4px)',
          boxShadow: 6
        } 
      }}
    >
      <CardContent sx={{ flexGrow: 1 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
          <Typography variant="h6" component="h2" sx={{ fontWeight: 'bold' }}>
            {recipeName}
          </Typography>
          <Chip 
            label={categoryName} 
            size="small" 
            color="primary" 
            sx={{ ml: 1 }}
          />
        </Box>
        
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2, height: 60, overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {recipeDescription}
        </Typography>
        
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 2 }}>
          <Box>
            <Typography variant="caption" color="text.secondary">
              Yield
            </Typography>
            <Typography variant="body2" sx={{ fontWeight: 'medium' }}>
              {yieldInfo}
            </Typography>
          </Box>
          
          <Box sx={{ textAlign: 'right' }}>
            <Typography variant="caption" color="text.secondary">
              Cost per unit
            </Typography>
            <Typography variant="body2" sx={{ fontWeight: 'medium' }}>
              {formatCurrency(unitCost)}
            </Typography>
            
            {/* NEW: Pricing mode indicator */}
            {ingredients.length > 0 && (
              <Box sx={{ mt: 0.5 }}>
                {ingredients.some(ing => ing.use_live_pricing !== false) ? (
                  <Typography variant="caption" color="success.main" sx={{ fontSize: '0.65rem' }}>
                    📈 Live Pricing
                  </Typography>
                ) : (
                  <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.65rem' }}>
                    🔒 Fixed Pricing
                  </Typography>
                )}
              </Box>
            )}
          </Box>
        </Box>
      </CardContent>
      
      <CardActions>
        <Button 
          size="small" 
          endIcon={<ArrowIcon />}
          onClick={handleClick}
          sx={{ ml: 'auto' }}
        >
          View Details
        </Button>
      </CardActions>
    </Card>
  );
};

export default RecipeCard;