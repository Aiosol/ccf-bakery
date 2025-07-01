// Update RecipeList.jsx to use real divisions from recipes

import React, { useState, useEffect } from 'react';
import { 
  Box, 
  Container, 
  Grid, 
  Paper, 
  Typography, 
  Button, 
  TextField, 
  InputAdornment, 
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  Divider,
  CircularProgress,
  Alert,
  Chip
} from '@mui/material';
import { 
  Add as AddIcon, 
  Search as SearchIcon,
  FilterList as FilterIcon,
  Clear as ClearIcon
} from '@mui/icons-material';
import { useLocation, useNavigate } from 'react-router-dom';

// Import components and services
import RecipeCard from '../components/RecipeCard';
import recipeService from '../services/recipeService';

const RecipeList = () => {
  const location = useLocation();
  const navigate = useNavigate();
  
  // State for recipes and filtering
  const [recipes, setRecipes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [category, setCategory] = useState('');
  const [sortBy, setSortBy] = useState('-created_at');
  const [filteredRecipes, setFilteredRecipes] = useState([]);
  const [notification, setNotification] = useState(location.state?.message || null);
  
  // NEW: State for dynamic divisions
  const [divisions, setDivisions] = useState([]);
  
  const SORT_OPTIONS = [
    { value: 'name', label: 'Name (A-Z)' },
    { value: '-name', label: 'Name (Z-A)' },
    { value: 'unit_cost', label: 'Price (Low-High)' },
    { value: '-unit_cost', label: 'Price (High-Low)' },
    { value: '-created_at', label: 'Newest First' },
    { value: 'created_at', label: 'Oldest First' },
  ];
  
  // Fetch recipes on component mount
  useEffect(() => {
    loadRecipes();
  }, []);
  
  // Filter recipes when search, category, or recipes change
  useEffect(() => {
    filterRecipes();
  }, [searchQuery, category, recipes]);
  
  // Function to load recipes
  const loadRecipes = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const data = await recipeService.getRecipes();
      setRecipes(data);
      
      // Extract unique divisions from recipes
      const uniqueDivisions = new Set();
      data.forEach(recipe => {
        if (recipe.category && recipe.category !== 'Uncategorized') {
          uniqueDivisions.add(recipe.category);
        }
      });
      
      // Convert to array and sort
      const divisionsArray = Array.from(uniqueDivisions).sort();
      setDivisions(divisionsArray);
      console.log("Extracted divisions from recipes:", divisionsArray);
      
    } catch (err) {
      console.error('Error loading recipes:', err);
      setError('Failed to load recipes. Please try again.');
    } finally {
      setLoading(false);
    }
  };
  
  // Function to filter and sort recipes
  const filterRecipes = () => {
    // First filter by search query and category
    let filtered = recipes;
    
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(recipe => 
        recipe.name.toLowerCase().includes(query) || 
        (recipe.description && recipe.description.toLowerCase().includes(query))
      );
    }
    
    if (category) {
      filtered = filtered.filter(recipe => recipe.category === category);
    }
    
    // Then sort the filtered results
    filtered = sortRecipes(filtered, sortBy);
    
    setFilteredRecipes(filtered);
  };
  
  // Function to sort recipes
  const sortRecipes = (recipes, sortOption) => {
    const sorted = [...recipes];
    
    const isReverse = sortOption.startsWith('-');
    const field = isReverse ? sortOption.substring(1) : sortOption;
    
    sorted.sort((a, b) => {
      let valueA = a[field];
      let valueB = b[field];
      
      // Handle string comparison
      if (typeof valueA === 'string') {
        valueA = valueA.toLowerCase();
        valueB = valueB.toLowerCase();
      }
      
      // Handle the sorting direction
      if (valueA < valueB) return isReverse ? 1 : -1;
      if (valueA > valueB) return isReverse ? -1 : 1;
      return 0;
    });
    
    return sorted;
  };
  
  // Handle sorting change
  const handleSortChange = (event) => {
    const newSortBy = event.target.value;
    setSortBy(newSortBy);
    setFilteredRecipes(sortRecipes(filteredRecipes, newSortBy));
  };
  
  // Handle clearing all filters
  const handleClearFilters = () => {
    setSearchQuery('');
    setCategory('');
    setSortBy('-created_at');
  };
  
  if (loading && recipes.length === 0) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '70vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 8 }}>
      {/* Header Section */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" component="h1">
          Recipe Collection
        </Typography>
        <Button 
          variant="contained" 
          startIcon={<AddIcon />}
          onClick={() => navigate('/recipes/new')}
        >
          New Recipe
        </Button>
      </Box>
      
      {/* Success Notification */}
      {notification && (
        <Alert 
          severity="success" 
          sx={{ mb: 3 }}
          onClose={() => setNotification(null)}
        >
          {notification}
        </Alert>
      )}
      
      {/* Error Alert */}
      {error && (
        <Alert 
          severity="error" 
          sx={{ mb: 3 }}
          action={
            <Button color="inherit" size="small" onClick={loadRecipes}>
              Retry
            </Button>
          }
        >
          {error}
        </Alert>
      )}
      
      {/* Filter Bar */}
      <Paper sx={{ p: 2, mb: 4 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} md={4}>
            <TextField
              fullWidth
              placeholder="Search recipes..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon />
                  </InputAdornment>
                ),
                endAdornment: searchQuery && (
                  <InputAdornment position="end">
                    <Button 
                      size="small" 
                      onClick={() => setSearchQuery('')}
                      sx={{ minWidth: 'unset', p: '2px' }}
                    >
                      <ClearIcon fontSize="small" />
                    </Button>
                  </InputAdornment>
                )
              }}
            />
          </Grid>
          
          <Grid item xs={12} sm={6} md={3}>
            <FormControl fullWidth>
              <InputLabel>Category</InputLabel>
              <Select
                value={category}
                label="Category"
                onChange={(e) => setCategory(e.target.value)}
              >
                <MenuItem value="">
                  <em>All Categories</em>
                </MenuItem>
                {divisions.map(division => (
                  <MenuItem key={division} value={division}>
                    {division}
                  </MenuItem>
                ))}
                {divisions.length === 0 && (
                  <MenuItem disabled>
                    <em>No categories found</em>
                  </MenuItem>
                )}
              </Select>
            </FormControl>
          </Grid>
          
          <Grid item xs={12} sm={6} md={3}>
            <FormControl fullWidth>
              <InputLabel>Sort By</InputLabel>
              <Select
                value={sortBy}
                label="Sort By"
                onChange={handleSortChange}
              >
                {SORT_OPTIONS.map(option => (
                  <MenuItem key={option.value} value={option.value}>
                    {option.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          
          <Grid item xs={12} md={2} sx={{ display: 'flex', justifyContent: 'flex-end' }}>
            <Button 
              variant="outlined" 
              startIcon={<ClearIcon />}
              onClick={handleClearFilters}
              disabled={!searchQuery && !category && sortBy === '-created_at'}
            >
              Clear
            </Button>
          </Grid>
        </Grid>
      </Paper>
      
      {/* Results Summary */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="subtitle1">
          {filteredRecipes.length} {filteredRecipes.length === 1 ? 'recipe' : 'recipes'} found
        </Typography>
        
        {/* Active Filters */}
        <Box sx={{ display: 'flex', gap: 1 }}>
          {category && (
            <Chip 
              label={`Category: ${category}`}
              onDelete={() => setCategory('')}
              size="small"
            />
          )}
          {searchQuery && (
            <Chip 
              label={`Search: ${searchQuery}`}
              onDelete={() => setSearchQuery('')}
              size="small"
            />
          )}
          {sortBy !== '-created_at' && (
            <Chip 
              label={`Sort: ${SORT_OPTIONS.find(opt => opt.value === sortBy).label}`}
              onDelete={() => setSortBy('-created_at')}
              size="small"
            />
          )}
        </Box>
      </Box>
      
      {/* Recipe Grid */}
      {filteredRecipes.length > 0 ? (
        <Grid container spacing={3}>
          {filteredRecipes.map(recipe => (
            <Grid item xs={12} sm={6} md={4} key={recipe.id}>
              <RecipeCard recipe={recipe} />
            </Grid>
          ))}
        </Grid>
      ) : (
        <Paper sx={{ p: 6, textAlign: 'center' }}>
          <Typography variant="h6" color="text.secondary" gutterBottom>
            No recipes found
          </Typography>
          <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
            {recipes.length > 0 
              ? 'Try adjusting your search or filters to find what you\'re looking for.'
              : 'Create your first recipe to get started.'}
          </Typography>
          
          {recipes.length > 0 ? (
            <Button
              variant="outlined"
              startIcon={<ClearIcon />}
              onClick={handleClearFilters}
            >
              Clear Filters
            </Button>
          ) : (
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => navigate('/recipes/new')}
            >
              Create Recipe
            </Button>
          )}
        </Paper>
      )}
    </Container>
  );
};

export default RecipeList;