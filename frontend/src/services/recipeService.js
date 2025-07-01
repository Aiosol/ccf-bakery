// recipeService.js
import axios from 'axios';

const API_BASE_URL = 'http://localhost:8000/api';

/**
 * Service for handling recipe-related API calls
 */
const recipeService = {
  /**
   * Get all recipes with optional filtering
   * @param {Object} filters - Optional filter parameters
   * @returns {Promise<Array>} Promise that resolves to an array of recipes
   */
  getRecipes: async (filters = {}) => {
    try {
      console.log('Fetching recipes with filters:', filters);
      
      // Build query parameters from filters
      const params = new URLSearchParams();
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          params.append(key, value);
        }
      });
      
      // Make API call
      const url = `${API_BASE_URL}/recipes/${params.toString() ? `?${params.toString()}` : ''}`;
      console.log('Fetching from URL:', url);
      
      const response = await axios.get(url);
      
      // Handle paginated response
      if (response.data && typeof response.data === 'object' && 'results' in response.data) {
        console.log(`Fetched ${response.data.results.length} recipes (paginated)`);
        return response.data.results;
      }
      
      console.log(`Fetched ${response.data.length} recipes`);
      return response.data;
    } catch (error) {
      console.error('Error fetching recipes:', error);
      throw error;
    }
  },

  /**
   * Get a single recipe by ID
   * @param {string|number} id - Recipe ID
   * @returns {Promise<Object>} Promise that resolves to the recipe
   */
  getRecipeById: async (id) => {
    try {
      console.log(`Fetching recipe with ID ${id}`);
      const response = await axios.get(`${API_BASE_URL}/recipes/${id}/`);
      
      console.log('Recipe data:', response.data);
      return response.data;
    } catch (error) {
      console.error(`Error fetching recipe ${id}:`, error);
      throw error;
    }
  },

  /**
   * Create a new recipe
   * @param {Object} recipeData - Recipe data
   * @returns {Promise<Object>} Promise that resolves to the created recipe
   */
  createRecipe: async (recipeData) => {
    try {
      console.log('Creating recipe with data:', recipeData);
      const response = await axios.post(`${API_BASE_URL}/recipes/`, recipeData);
      
      console.log('Created recipe:', response.data);
      return response.data;
    } catch (error) {
      console.error('Error creating recipe:', error);
      
      // Enhanced error logging
      if (error.response) {
        console.error('Error response:', error.response.data);
      }
      
      throw error;
    }
  },

  /**
   * Update an existing recipe
   * @param {string|number} id - Recipe ID
   * @param {Object} recipeData - Updated recipe data
   * @returns {Promise<Object>} Promise that resolves to the updated recipe
   */
  updateRecipe: async (id, recipeData) => {
    try {
      console.log(`Updating recipe ${id} with data:`, recipeData);
      const response = await axios.put(`${API_BASE_URL}/recipes/${id}/`, recipeData);
      
      console.log('Updated recipe:', response.data);
      return response.data;
    } catch (error) {
      console.error(`Error updating recipe ${id}:`, error);
      
      // Enhanced error logging
      if (error.response) {
        console.error('Error response:', error.response.data);
      }
      
      throw error;
    }
  },

  /**
   * Delete a recipe
   * @param {string|number} id - Recipe ID
   * @returns {Promise<boolean>} Promise that resolves to true on success
   */
  deleteRecipe: async (id) => {
    try {
      console.log(`Deleting recipe ${id}`);
      await axios.delete(`${API_BASE_URL}/recipes/${id}/`);
      
      console.log(`Recipe ${id} deleted successfully`);
      return true;
    } catch (error) {
      console.error(`Error deleting recipe ${id}:`, error);
      throw error;
    }
  },

  /**
   * Get recipe categories
   * @returns {Promise<Array>} Promise that resolves to an array of categories
   */
  getCategories: async () => {
    try {
      console.log('Fetching recipe categories');
      const response = await axios.get(`${API_BASE_URL}/recipe-categories/`);
      
      console.log(`Fetched ${response.data.length} categories`);
      return response.data;
    } catch (error) {
      console.error('Error fetching recipe categories:', error);
      throw error;
    }
  },
  
  /**
   * Add an ingredient to a recipe
   * @param {string|number} recipeId - Recipe ID
   * @param {Object} ingredientData - Ingredient data
   * @returns {Promise<Object>} Promise that resolves to the result
   */
  addIngredient: async (recipeId, ingredientData) => {
    try {
      console.log(`Adding ingredient to recipe ${recipeId}:`, ingredientData);
      const response = await axios.post(`${API_BASE_URL}/recipes/${recipeId}/add_ingredient/`, ingredientData);
      
      console.log('Ingredient added successfully:', response.data);
      return response.data;
    } catch (error) {
      console.error(`Error adding ingredient to recipe ${recipeId}:`, error);
      throw error;
    }
  }
};

export default recipeService;