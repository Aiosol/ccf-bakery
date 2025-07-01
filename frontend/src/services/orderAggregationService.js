// src/services/orderAggregationService.js
import apiService from './apiService';
import productionService from './productionApiService';
import recipeService from './recipeService';

/**
 * Service to handle order aggregation and production planning
 */
const orderAggregationService = {
  /**
   * Get production requirements based on pending orders
   * @returns {Promise<Array>} Array of production requirements
   */
  getProductionRequirements: async () => {
    try {
      // Get all pending orders
      const orders = await apiService.getOrders({ status: 'pending' });
      
      // Get all recipes
      const recipes = await recipeService.getRecipes();
      
      // Create a map to aggregate quantities by product
      const productionMap = new Map();
      
      // Process all orders
      orders.forEach(order => {
        if (!order.items || !Array.isArray(order.items)) return;
        
        // Only process finished goods (not accessories)
        order.items.forEach(item => {
          if (item.type === 'finished_good') {
            const key = item.id || item.code;
            
            // Find recipe for this item
            const recipe = recipes.find(r => 
              r.id.toString() === key.toString() || 
              r.name === item.name
            );
            
            // Skip if no recipe found
            if (!recipe) return;
            
            // Get or create entry
            const currentData = productionMap.get(key) || {
              id: recipe.id,
              name: item.name,
              code: item.code,
              quantity: 0,
              unit: item.unit || recipe.yield_unit || 'piece',
              orders: [],
              alreadyScheduled: 0,
              yieldPerBatch: recipe.yield_quantity || 1,
              recipeDetails: recipe
            };
            
            // Update entry
            productionMap.set(key, {
              ...currentData,
              quantity: currentData.quantity + item.quantity,
              orders: [...currentData.orders, order.id]
            });
          }
        });
      });
      
      // Get active production orders
      const activeProductions = await productionService.getProductionOrders({
        status: ['planned', 'in_progress']
      });
      
      // Update already scheduled quantities
      activeProductions.forEach(prod => {
        const recipeId = prod.recipe_id.toString();
        if (productionMap.has(recipeId)) {
          const current = productionMap.get(recipeId);
          productionMap.set(recipeId, {
            ...current,
            alreadyScheduled: current.alreadyScheduled + prod.total_yield
          });
        }
      });
      
      // Convert map to array and calculate remaining quantities
      const requirements = Array.from(productionMap.values()).map(req => ({
        ...req,
        remainingToProduce: Math.max(0, req.quantity - req.alreadyScheduled),
        batchesRequired: Math.ceil((req.quantity - req.alreadyScheduled) / req.yieldPerBatch)
      }));
      
      return requirements;
    } catch (error) {
      console.error('Error getting production requirements:', error);
      throw error;
    }
  },
  
  /**
   * Create production orders based on requirements
   * @param {Object} requirement - The production requirement
   * @param {number} batchQuantity - Number of batches to produce
   * @returns {Promise<Object>} Created production order
   */
  createProductionOrder: async (requirement, batchQuantity) => {
    try {
      if (!requirement || !requirement.id) {
        throw new Error('Invalid requirement data');
      }
      
      // Create production order data
      const orderData = {
        recipe_id: requirement.id,
        batch_quantity: batchQuantity,
        notes: `Production order for ${requirement.name} to fulfill orders: ${requirement.orders.join(', ')}`,
        expected_completion: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0]
      };
      
      // Create production order
      const result = await productionService.createProductionOrder(orderData);
      return result;
    } catch (error) {
      console.error('Error creating production order:', error);
      throw error;
    }
  },
  
  /**
   * Auto-create production orders for all unfulfilled requirements
   * @returns {Promise<Array>} Array of created production orders
   */
  autoCreateProductionOrders: async () => {
    try {
      // Get production requirements
      const requirements = await orderAggregationService.getProductionRequirements();
      
      // Filter to only unfulfilled requirements
      const unfulfilled = requirements.filter(req => req.remainingToProduce > 0);
      
      // Create production orders for each requirement
      const results = [];
      for (const req of unfulfilled) {
        try {
          const result = await orderAggregationService.createProductionOrder(
            req, 
            req.batchesRequired
          );
          results.push(result);
        } catch (err) {
          console.error(`Failed to create production order for ${req.name}:`, err);
        }
      }
      
      return results;
    } catch (error) {
      console.error('Error auto-creating production orders:', error);
      throw error;
    }
  },
  
  /**
   * Submit production order to Manager.io
   * @param {number|string} productionOrderId - ID of the production order
   * @returns {Promise<Object>} Result of the submission
   */
  submitProductionOrderToManager: async (productionOrderId) => {
    try {
      // Get production order details
      const order = await productionService.getProductionOrderById(productionOrderId);
      
      if (!order) {
        throw new Error('Production order not found');
      }
      
      // Get recipe details
      const recipe = await recipeService.getRecipeById(order.recipe_id);
      
      if (!recipe || !recipe.ingredients) {
        throw new Error('Recipe not found or missing ingredients');
      }
      
      // Format data for Manager.io
      const managerData = {
        Date: new Date().toISOString().split('T')[0] + 'T00:00:00',
        FinishedInventoryItem: recipe.manager_inventory_item_id,
        Qty: order.total_yield,
        BillOfMaterials: recipe.ingredients.map(ingredient => ({
          BillOfMaterials: ingredient.inventory_item_id,
          Qty: ingredient.quantity * order.batch_quantity
        })),
        ExpenseItems: [{}],
        CustomFields: {},
        CustomFields2: {
          Strings: {},
          Decimals: {},
          Dates: {},
          Booleans: {},
          StringArrays: {}
        }
      };
      
      // Submit to Manager.io
      const response = await apiService.post('/production-order-form', managerData);
      
      // Update local production order with Manager ID
      if (response && (response.key || (response.data && response.data.key))) {
        const managerId = response.key || response.data.key;
        
        // Update production order status
        await productionService.submitOrderToManager(productionOrderId, managerId);
      }
      
      return response;
    } catch (error) {
      console.error('Error submitting production order to Manager.io:', error);
      throw error;
    }
  }
};

export default orderAggregationService;