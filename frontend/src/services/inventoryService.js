// inventoryService.js
import axios from 'axios';

// API base URL
const API_BASE_URL = 'http://localhost:8000/api';

/**
 * Service for handling inventory-related API calls
 */
const inventoryService = {
  /**
   * Fetch all inventory items from the API
   * @returns {Promise<Array>} Promise that resolves to an array of inventory items
   */
  fetchInventoryItems: async () => {
    try {
      console.log('Fetching inventory items...');
      const response = await axios.get(`${API_BASE_URL}/inventory/`);
      
      if (!response.data || !Array.isArray(response.data)) {
        console.error('Invalid response format:', response.data);
        return [];
      }
      
      console.log(`Fetched ${response.data.length} inventory items`);
      
      // Map the items to a consistent format that the frontend expects
      return response.data.map(item => ({
        // Generate a unique key for each item
        id: item.id || item.manager_item_id,
        key: item.id || item.manager_item_id,

        sales_price: item.DefaultSalesUnitPrice || item.sales_price || 0,
        DefaultSalesUnitPrice: item.DefaultSalesUnitPrice || item.sales_price || 0,
        
        // Store Manager.io ID
        manager_item_id: item.manager_item_id,
        
        // Support multiple field name formats
        itemCode: item.ItemCode || item.itemCode || item.manager_item_id,
        ItemCode: item.ItemCode || item.itemCode || item.manager_item_id,
        
        // Item name with fallbacks
        name: item.ItemName || item.name || '',
        itemName: item.ItemName || item.name || '',
        ItemName: item.ItemName || item.name || '',
        
        // Category/division with fallbacks
        division: item.Division || item.division || item.category || 'Other',
        Division: item.Division || item.division || item.category || 'Other',
        category: item.category || 'OTHER',
        
        // Unit with fallbacks
        unit: item.UnitName || item.unit || 'unit',
        UnitName: item.UnitName || item.unit || 'unit',
        
        // Quantity with fallbacks
        qtyOwned: item.quantity_available || item.qtyOwned || 0,
        quantity_available: item.quantity_available || item.qtyOwned || 0,
        
        // Cost information with fallbacks
        unit_cost: item.unit_cost || (item.averageCost?.value) || 0,
        
        // Structured cost format for UI components
        averageCost: item.averageCost || {
          value: item.unit_cost || 0,
          currency: 'BDT'
        },
        
        // Total cost calculation
        totalCost: item.totalCost || {
          value: (item.unit_cost || (item.averageCost?.value) || 0) * 
                (item.quantity_available || item.qtyOwned || 0),
          currency: 'BDT'
        },
        
        // Include all original properties for completeness
        ...item
      }));
    } catch (error) {
      console.error('Error fetching inventory items:', error);
      throw error;
    }
  },

  /**
   * Fetch a specific inventory item by ID
   * @param {string|number} id - ID of the inventory item
   * @returns {Promise<Object>} Promise that resolves to the inventory item
   */
  getInventoryItem: async (id) => {
    try {
      const response = await axios.get(`${API_BASE_URL}/inventory/${id}/`);
      const item = response.data;
      
      // Transform to match frontend expectations
      return {
        id: item.id || item.manager_item_id,
        key: item.id || item.manager_item_id,
        itemCode: item.ItemCode || item.itemCode || item.manager_item_id,
        ItemCode: item.ItemCode || item.itemCode || item.manager_item_id,
        name: item.ItemName || item.name || '',
        itemName: item.ItemName || item.name || '',
        ItemName: item.ItemName || item.name || '',
        description: item.description || '',
        unit: item.UnitName || item.unit || 'unit',
        UnitName: item.UnitName || item.unit || 'unit',
        qtyOwned: item.quantity_available || item.qtyOwned || 0,
        quantity_available: item.quantity_available || item.qtyOwned || 0,
        category: item.category || 'OTHER',
        division: item.Division || item.division || item.category || 'Other',
        Division: item.Division || item.division || item.category || 'Other',
        averageCost: item.averageCost || {
          value: item.unit_cost || 0,
          currency: 'BDT'
        },
        totalCost: item.totalCost || {
          value: (item.unit_cost || 0) * (item.quantity_available || 0),
          currency: 'BDT'
        },
        // Add more properties for completeness
        ...item
      };
    } catch (error) {
      console.error(`Error fetching inventory item ${id}:`, error);
      throw error;
    }
  },
  
  /**
   * Fetch inventory items that are below threshold (low stock)
   * @returns {Promise<Array>} Promise that resolves to an array of low stock items
   */
  getLowStockItems: async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/inventory/low_stock/`);
      
      return response.data.map(item => ({
        id: item.id || item.manager_item_id,
        key: item.id || item.manager_item_id,
        itemCode: item.ItemCode || item.itemCode || item.manager_item_id,
        ItemCode: item.ItemCode || item.itemCode || item.manager_item_id,
        name: item.ItemName || item.name || '',
        itemName: item.ItemName || item.name || '',
        ItemName: item.ItemName || item.name || '',
        division: item.Division || item.division || item.category || 'Other',
        Division: item.Division || item.division || item.category || 'Other',
        unit: item.UnitName || item.unit || 'unit',
        UnitName: item.UnitName || item.unit || 'unit',
        qtyOwned: item.quantity_available || item.qtyOwned || 0,
        quantity_available: item.quantity_available || item.qtyOwned || 0,
        category: item.category || 'OTHER',
        averageCost: item.averageCost || {
          value: item.unit_cost || 0,
          currency: 'BDT'
        },
        totalCost: item.totalCost || {
          value: (item.unit_cost || 0) * (item.quantity_available || 0),
          currency: 'BDT'
        },
        is_low_stock: true,
        // Include all original properties
        ...item
      }));
    } catch (error) {
      console.error('Error fetching low stock items:', error);
      throw error;
    }
  },
  
  /**
   * Sync inventory with Manager.io
   * @returns {Promise<Object>} Promise that resolves to sync result
   */
  syncInventory: async () => {
    try {
      console.log('Syncing inventory with Manager.io...');
      
      const response = await axios.post(`${API_BASE_URL}/inventory/sync/`);
      
      return {
        status: 'success',
        message: response.data.message || 'Inventory synchronized successfully',
        count: response.data.count || 0
      };
    } catch (error) {
      console.error('Error syncing inventory:', error);
      return {
        status: 'error',
        message: `Failed to sync inventory: ${error.message}`
      };
    }
  }
};

export default inventoryService;