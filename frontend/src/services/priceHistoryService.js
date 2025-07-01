// frontend/src/services/priceHistoryService.js - Fixed version
import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000/api';

/**
 * Service for handling price history related API calls
 */
class PriceHistoryService {
  constructor() {
    this.apiClient = axios.create({
      baseURL: API_BASE_URL,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
    });

    // Add request interceptor for authentication if needed
    this.apiClient.interceptors.request.use(
      (config) => {
        const token = localStorage.getItem('authToken');
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error) => Promise.reject(error)
    );

    // Add response interceptor for error handling
    this.apiClient.interceptors.response.use(
      (response) => response,
      (error) => {
        console.error('API Error:', error.response?.data || error.message);
        return Promise.reject(error);
      }
    );
  }

  /**
   * Check if response is HTML (error page) instead of JSON
   */
  isHtmlResponse(response) {
    const contentType = response.headers?.['content-type'] || '';
    return contentType.includes('text/html');
  }

  /**
   * Handle API errors gracefully and provide fallback data
   */
  handleApiError(error, fallbackData = null) {
    if (error.response?.status === 404) {
      console.warn('API endpoint not found - using fallback data');
      return fallbackData;
    }
    
    if (error.code === 'ECONNREFUSED') {
      console.warn('Backend server not running - using fallback data');
      return fallbackData;
    }
    
    throw error;
  }

  /**
   * Get price history for a specific inventory item
   */
  async getInventoryItemPriceHistory(itemId, days = 30) {
    try {
      const response = await this.apiClient.get(
        `/inventory/${itemId}/price_history/`,
        { params: { days } }
      );

      // Check for HTML response (error page)
      if (this.isHtmlResponse(response)) {
        throw new Error('API returned HTML instead of JSON');
      }

      return {
        success: true,
        data: response.data,
        item: response.data.item,
        priceHistory: response.data.price_history || [],
        periodDays: response.data.period_days || days,
      };
    } catch (error) {
      console.warn(`Price history API not available for item ${itemId}:`, error.message);
      
      // Return fallback data structure
      return {
        success: false,
        data: {
          item: { id: itemId, name: 'Unknown Item' },
          price_history: [],
          period_days: days,
          message: 'Price history API not yet implemented'
        },
        item: { id: itemId, name: 'Unknown Item' },
        priceHistory: [],
        periodDays: days,
        isUsingFallback: true
      };
    }
  }

  /**
   * Get detailed price history analysis for a recipe
   */
  async getRecipePriceHistory(recipeId, days = 30) {
    try {
      const response = await this.apiClient.get(
        `/recipes/${recipeId}/price_history/`,
        { params: { days } }
      );

      // Check for HTML response (error page)
      if (this.isHtmlResponse(response)) {
        throw new Error('API returned HTML instead of JSON');
      }

      return {
        success: true,
        recipe: response.data.recipe,
        costImpactSummary: response.data.cost_impact_summary,
        ingredientPriceChanges: response.data.recipe?.ingredient_price_changes || [],
        periodDays: response.data.period_days || days,
      };
    } catch (error) {
      console.warn(`Recipe price history API not available for recipe ${recipeId}:`, error.message);
      
      // Return fallback data structure
      return {
        success: false,
        recipe: {
          id: recipeId,
          total_cost: 0,
          ingredient_price_changes: []
        },
        costImpactSummary: {
          total_cost_impact: 0,
          affected_ingredients: [],
          period_days: days
        },
        ingredientPriceChanges: [],
        periodDays: days,
        isUsingFallback: true,
        message: 'Recipe price history API not yet implemented'
      };
    }
  }

  /**
   * Get significant price changes across all inventory items
   */
  async getSignificantPriceChanges(days = 30, threshold = 5.0) {
    try {
      const response = await this.apiClient.get('/price-history/significant_changes/', {
        params: { days, threshold }
      });

      if (this.isHtmlResponse(response)) {
        throw new Error('API returned HTML instead of JSON');
      }

      return {
        success: true,
        significantChanges: response.data.significant_changes || [],
        periodDays: response.data.period_days || days,
        thresholdPercentage: response.data.threshold_percentage || threshold,
      };
    } catch (error) {
      console.warn('Significant price changes API not available:', error.message);
      
      return {
        success: false,
        significantChanges: [],
        periodDays: days,
        thresholdPercentage: threshold,
        isUsingFallback: true,
        message: 'Significant price changes API not yet implemented'
      };
    }
  }

  /**
   * Get recipes most affected by recent price changes
   */
  async getMostAffectedRecipes(days = 30, limit = 10) {
    try {
      const response = await this.apiClient.get('/recipes/cost_volatility_report/', {
        params: { days, limit }
      });

      if (this.isHtmlResponse(response)) {
        throw new Error('API returned HTML instead of JSON');
      }

      return {
        success: true,
        mostAffectedRecipes: response.data.most_affected_recipes || [],
        periodDays: response.data.period_days || days,
        totalRecipesAnalyzed: response.data.total_recipes_analyzed || 0,
        recipesWithChanges: response.data.recipes_with_changes || 0,
      };
    } catch (error) {
      console.warn('Most affected recipes API not available:', error.message);
      
      return {
        success: false,
        mostAffectedRecipes: [],
        periodDays: days,
        totalRecipesAnalyzed: 0,
        recipesWithChanges: 0,
        isUsingFallback: true,
        message: 'Most affected recipes API not yet implemented'
      };
    }
  }

  /**
   * Get price history summary for dashboard
   */
  async getPriceHistorySummary(days = 7) {
    try {
      const [significantChanges, affectedRecipes] = await Promise.all([
        this.getSignificantPriceChanges(days, 3.0),
        this.getMostAffectedRecipes(days, 5)
      ]);

      return {
        success: true,
        recentChanges: significantChanges.significantChanges.slice(0, 10),
        affectedRecipes: affectedRecipes.mostAffectedRecipes,
        totalChanges: significantChanges.significantChanges.length,
        periodDays: days,
        isUsingFallback: significantChanges.isUsingFallback || affectedRecipes.isUsingFallback
      };
    } catch (error) {
      console.warn('Price history summary not available:', error.message);
      
      return {
        success: false,
        recentChanges: [],
        affectedRecipes: [],
        totalChanges: 0,
        periodDays: days,
        isUsingFallback: true,
        message: 'Price history summary API not yet implemented'
      };
    }
  }

  /**
   * Trigger manual inventory sync to update prices
   */
  async triggerInventorySync() {
    try {
      const response = await this.apiClient.post('/inventory/sync/');

      if (this.isHtmlResponse(response)) {
        throw new Error('API returned HTML instead of JSON');
      }

      return {
        success: true,
        message: response.data.message,
        details: response.data.details,
        priceChanges: response.data.details?.priceChanges || 0,
        significantChanges: response.data.details?.significantChanges || [],
      };
    } catch (error) {
      console.warn('Inventory sync API not available:', error.message);
      
      return {
        success: false,
        message: 'Inventory sync API not yet implemented',
        details: {},
        priceChanges: 0,
        significantChanges: [],
        isUsingFallback: true
      };
    }
  }

  /**
   * Format currency for display
   */
  formatCurrency(value, currency = 'BDT') {
    if (value == null || isNaN(value)) return 'N/A';
    
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 2,
    }).format(value);
  }

  /**
   * Format percentage change for display
   */
  formatPercentage(value) {
    if (value == null || isNaN(value)) return 'N/A';
    
    const sign = value > 0 ? '+' : '';
    return `${sign}${value.toFixed(1)}%`;
  }

  /**
   * Get color for price change display
   */
  getPriceChangeColor(changeAmount) {
    if (changeAmount > 0) return '#d32f2f'; // Red for increase
    if (changeAmount < 0) return '#2e7d32'; // Green for decrease
    return '#757575'; // Gray for no change
  }

  /**
   * Calculate recipe cost impact from ingredient price changes
   */
  calculateRecipeCostImpact(ingredients) {
    let totalImpact = 0;
    let affectedIngredients = 0;
    const impactsByIngredient = [];

    ingredients.forEach((ingredient) => {
      if (ingredient.price_changes && ingredient.price_changes.length > 0) {
        affectedIngredients++;
        
        const ingredientImpact = ingredient.price_changes.reduce(
          (sum, change) => sum + (change.recipe_impact || 0), 
          0
        );
        
        totalImpact += ingredientImpact;
        
        impactsByIngredient.push({
          name: ingredient.ingredient_name,
          code: ingredient.ingredient_code,
          impact: ingredientImpact,
          changes: ingredient.price_changes.length,
        });
      }
    });

    return {
      totalImpact,
      affectedIngredients,
      impactsByIngredient: impactsByIngredient.sort((a, b) => Math.abs(b.impact) - Math.abs(a.impact)),
    };
  }

  /**
   * Check if API endpoints are available
   */
  async checkApiHealth() {
    try {
      const response = await this.apiClient.get('/health/');
      return { available: true, message: 'API is available' };
    } catch (error) {
      return { 
        available: false, 
        message: 'API not available - using fallback data',
        error: error.message 
      };
    }
  }
}

export default new PriceHistoryService();