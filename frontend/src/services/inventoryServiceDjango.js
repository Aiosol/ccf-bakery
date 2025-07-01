// frontend/src/services/inventoryServiceDjango.js - FIXED VERSION

import axios from 'axios';

// API base URL
const API_BASE_URL = 'http://127.0.0.1:8000/api';

// Helper function to create auth headers
const getHeaders = () => {
  return {
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  };
};

const inventoryServiceDjango = {
  // FIXED: Enhanced fetchInventoryItems with better data handling
  fetchInventoryItems: async () => {
    try {
      console.log('📦 Fetching inventory items from Django API...');
      
      const response = await axios.get(`${API_BASE_URL}/inventory/`, {
        headers: getHeaders()
      });
      
      console.log(`✅ Received ${response.data.length} items from API`);
      
      // Log the first item for debugging
      if (response.data.length > 0) {
        console.log('🔍 SAMPLE ITEM STRUCTURE:', JSON.stringify(response.data[0], null, 2));
      }
      
      // Transform items with comprehensive field mapping
      const transformedItems = response.data.map((item, index) => {
        try {
          // Extract UUID (Manager.io unique identifier)
          const managerUuid = item.manager_item_id || item.id || item.key || '';
          
          // Extract readable code (RM001, FG001, etc.)
          const itemCode = item.ItemCode || item.itemCode || item.code || '';
          
          // Extract name with multiple fallbacks
          const itemName = item.ItemName || item.itemName || item.name || '';
          
          // Extract unit with fallback
          const unitName = item.UnitName || item.unitName || item.unit || 'piece';
          
          // CRITICAL FIX: Extract quantity with comprehensive fallbacks
          let quantity = 0;
          
          // Try different possible field names for quantity
          const quantityFields = [
            'quantity_available',  // Django model field
            'qtyOwned',           // Manager.io field
            'qtyOnHand',          // Manager.io alternative
            'qty',                // Short form
            'Qty',                // Capitalized
            'quantity',           // Full word
            'Quantity'            // Capitalized full word
          ];
          
          for (const field of quantityFields) {
            if (item[field] !== undefined && item[field] !== null && item[field] !== 'undefined') {
              const parsedQty = parseFloat(item[field]);
              if (!isNaN(parsedQty)) {
                quantity = parsedQty;
                console.log(`📊 Item ${itemCode}: Found quantity ${quantity} in field '${field}'`);
                break;
              }
            }
          }
          
          // Extract sales price with multiple fallbacks
          let salesPrice = 0;
          const salePriceFields = [
            'sales_price',
            'DefaultSalesUnitPrice',
            'defaultSalesUnitPrice',
            'salesPrice',
            'SalesPrice'
          ];
          
          for (const field of salePriceFields) {
            if (item[field] !== undefined && item[field] !== null) {
              const parsedPrice = parseFloat(item[field]);
              if (!isNaN(parsedPrice) && parsedPrice > 0) {
                salesPrice = parsedPrice;
                break;
              }
            }
          }
          
          // Extract unit cost
          let unitCost = 0;
          if (item.averageCost && typeof item.averageCost === 'object' && item.averageCost.value) {
            unitCost = parseFloat(item.averageCost.value) || 0;
          } else if (item.unit_cost !== undefined) {
            unitCost = parseFloat(item.unit_cost) || 0;
          }
          
          // Create standardized item object
          const transformedItem = {
            // Core identification
            id: item.id || managerUuid,
            manager_item_id: managerUuid,
            manager_uuid: managerUuid,  // For Manager.io API calls
            
            // Display fields
            ItemCode: itemCode,
            itemCode: itemCode,
            code: itemCode,
            
            ItemName: itemName,
            itemName: itemName,
            name: itemName,
            
            UnitName: unitName,
            unitName: unitName,
            unit: unitName,
            
            // FIXED: Quantity fields with proper mapping
            quantity_available: quantity,
            qtyOwned: quantity,
            qtyOnHand: quantity,
            qty: quantity,
            
            // Price fields
            sales_price: salesPrice,
            DefaultSalesUnitPrice: salesPrice,
            
            // Cost fields
            unit_cost: unitCost,
            averageCost: {
              value: unitCost,
              currency: 'BDT'
            },
            totalCost: {
              value: unitCost * quantity,
              currency: 'BDT'
            },
            
            // Category and metadata
            // Category and metadata
            category: item.category || 'OTHER',
            
            // ADD THIS: Division fields
            Division: item.division_name || 'Unknown',
            division_name: item.division_name || 'Unknown',
            
            last_synced: item.last_synced,
          };
          
          // Validation logging
          if (!managerUuid) {
            console.warn(`⚠️ Item ${index}: Missing UUID`);
          }
          if (!itemCode) {
            console.warn(`⚠️ Item ${index}: Missing item code`);
          }
          if (quantity === 0) {
            console.warn(`⚠️ Item ${itemCode}: Quantity is 0 or undefined`);
          }
          
          return transformedItem;
          
        } catch (itemError) {
          console.error(`❌ Error transforming item ${index}:`, itemError);
          console.error('Problematic item:', item);
          
          // Return a safe fallback
          return {
            id: item.id || `error-${index}`,
            ItemCode: item.ItemCode || `ERROR-${index}`,
            ItemName: item.ItemName || 'Error Item',
            UnitName: 'piece',
            quantity_available: 0,
            qtyOwned: 0,
            sales_price: 0,
            DefaultSalesUnitPrice: 0,
            unit_cost: 0,
            averageCost: { value: 0, currency: 'BDT' },
            totalCost: { value: 0, currency: 'BDT' },
            category: 'ERROR',
            ...item
          };
        }
      });
      
      console.log(`✅ Successfully transformed ${transformedItems.length} items`);
      
      // Log statistics
      const withQuantity = transformedItems.filter(item => item.quantity_available > 0).length;
      const withPrice = transformedItems.filter(item => item.sales_price > 0).length;
      console.log(`📈 Items with quantity > 0: ${withQuantity}`);
      console.log(`💰 Items with sales price > 0: ${withPrice}`);
      
      return transformedItems;
      
    } catch (error) {
      console.error('❌ Error in fetchInventoryItems:', error);
      
      // Provide detailed error information
      if (error.response) {
        console.error('API Response Error:', {
          status: error.response.status,
          data: error.response.data,
          headers: error.response.headers
        });
      }
      
      throw error;
    }
  },

  // FIXED: Enhanced syncInventory function
  syncInventory: async () => {
    try {
      console.log('🔄 Starting inventory sync with Manager.io...');
      
      const response = await axios.post(`${API_BASE_URL}/inventory/sync/`, {}, {
        headers: getHeaders(),
        timeout: 60000  // 60 second timeout for sync operations
      });
      
      console.log('✅ Sync response:', response.data);
      
      return {
        status: 'success',
        message: response.data.message || 'Inventory synchronized successfully',
        count: response.data.count || 0,
        details: response.data.details || {}
      };
      
    } catch (error) {
      console.error('❌ Error syncing inventory:', error);
      
      let errorMessage = 'Unknown error occurred';
      let details = {};
      
      if (error.response) {
        errorMessage = error.response.data?.message || error.response.data?.error || `API Error: ${error.response.status}`;
        details = error.response.data || {};
      } else if (error.request) {
        errorMessage = 'No response from server. Check if the backend is running.';
      } else {
        errorMessage = error.message;
      }
      
      return {
        status: 'error',
        message: `Sync failed: ${errorMessage}`,
        details: details
      };
    }
  },

  // NEW: Direct sync function using the enhanced endpoint
  directSync: async () => {
    try {
      console.log('🚀 Starting direct inventory sync...');
      
      const response = await axios.post(`${API_BASE_URL}/direct-inventory-sync/`, {}, {
        headers: getHeaders(),
        timeout: 120000  // 2 minute timeout for direct sync
      });
      
      console.log('✅ Direct sync response:', response.data);
      
      return {
        status: response.data.status || 'success',
        message: response.data.message || 'Direct sync completed',
        details: response.data.details || {}
      };
      
    } catch (error) {
      console.error('❌ Error in direct sync:', error);
      
      let errorMessage = 'Direct sync failed';
      if (error.response && error.response.data) {
        errorMessage = error.response.data.message || error.response.data.error || errorMessage;
      }
      
      return {
        status: 'error',
        message: errorMessage,
        details: error.response?.data || {}
      };
    }
  },
  
  // Enhanced getInventoryItem function
  getInventoryItem: async (itemId) => {
    try {
      const response = await axios.get(`${API_BASE_URL}/inventory/${itemId}/`, {
        headers: getHeaders()
      });
      
      const item = response.data;
      
      return {
        id: item.id || item.manager_item_id,
        key: item.manager_item_id,
        ItemCode: item.ItemCode || item.code,
        ItemName: item.ItemName || item.name,
        UnitName: item.UnitName || item.unit,
        quantity_available: parseFloat(item.quantity_available || 0),
        qtyOwned: parseFloat(item.quantity_available || 0),
        sales_price: parseFloat(item.sales_price || 0),
        DefaultSalesUnitPrice: parseFloat(item.sales_price || 0),
        unit_cost: parseFloat(item.unit_cost || 0),
        averageCost: {
          value: parseFloat(item.unit_cost || 0),
          currency: 'BDT'
        },
        totalCost: {
          value: parseFloat(item.unit_cost || 0) * parseFloat(item.quantity_available || 0),
          currency: 'BDT'
        },
        category: item.category || 'OTHER',
        last_synced: item.last_synced,
        ...item
      };
    } catch (error) {
      console.error(`Error fetching inventory item ${itemId}:`, error);
      throw error;
    }
  },
  
  // Enhanced getLowStockItems function
  getLowStockItems: async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/inventory/low_stock/`, {
        headers: getHeaders()
      });
      
      return response.data.map(item => ({
        id: item.id || item.manager_item_id,
        ItemCode: item.ItemCode || item.code,
        ItemName: item.ItemName || item.name,
        UnitName: item.UnitName || item.unit,
        quantity_available: parseFloat(item.quantity_available || 0),
        qtyOwned: parseFloat(item.quantity_available || 0),
        threshold_quantity: parseFloat(item.threshold_quantity || 0),
        sales_price: parseFloat(item.sales_price || 0),
        DefaultSalesUnitPrice: parseFloat(item.sales_price || 0),
        unit_cost: parseFloat(item.unit_cost || 0),
        averageCost: {
          value: parseFloat(item.unit_cost || 0),
          currency: 'BDT'
        },
        category: item.category || 'OTHER',
        is_low_stock: true,
        ...item
      }));
    } catch (error) {
      console.error('Error fetching low stock items:', error);
      throw error;
    }
  }
};

export default inventoryServiceDjango;