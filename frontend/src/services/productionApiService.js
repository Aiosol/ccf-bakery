// frontend/src/services/productionApiService.js - FIXED with better error handling and data refresh

const API_BASE_URL = process.env.REACT_APP_DJANGO_API_URL || 'http://localhost:8000/api';

const productionApiService = {
  /**
   * FIXED: Create production orders with improved validation and response handling
   */
  createDirectProductionOrders: async (productionItems, date, shiftId = null) => {
    try {
      // Validate input data
      if (!productionItems || !Array.isArray(productionItems) || productionItems.length === 0) {
        throw new Error('No production items provided');
      }
      
      if (!date) {
        throw new Error('Production date is required');
      }
      
      // Transform and validate production items
      const validatedItems = productionItems.map((item, index) => {
        // Ensure required fields
        if (!item.item_name) {
          throw new Error(`Item ${index + 1}: item_name is required`);
        }
        
        if (!item.production_quantity || item.production_quantity <= 0) {
          throw new Error(`Item ${index + 1}: production_quantity must be greater than 0`);
        }
        
        return {
          item_name: item.item_name,
          item_code: item.item_code || '',
          inventory_item_id: item.inventory_item_id || null,
          production_quantity: parseFloat(item.production_quantity),
          production_category_code: item.production_category_code || 'A',
          assigned_to: item.assigned_to || 'Unassigned',
          shift_id: item.shift_id || shiftId,
          orders: Array.isArray(item.orders) ? item.orders : [],
          recipe_id: item.recipe_id || null,
          
          // FIXED: Don't send is_split or split_assignments for split parts
          is_split: false,  // Always false for items being sent to production
          split_assignments: [],  // Always empty for items being sent to production
          
          // Mark split orders using the existing field
          is_split_order: item.is_split_order || false,
          
          // Include notes if present
          notes: item.notes || ''
        };
      });
      
      const payload = {
        date: date,
        shift_id: shiftId,
        production_items: validatedItems
      };
      
      console.log('Creating production orders with payload:', payload);
      
      const response = await fetch(`${API_BASE_URL}/production/create-direct-orders/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload)
      });
      
      const result = await response.json();
      
      console.log('Production creation response:', result);
      
      if (!response.ok) {
        throw new Error(result.error || `HTTP ${response.status}: ${result.message || 'Unknown error'}`);
      }
      
      // Validate the response
      if (!result.success) {
        throw new Error(result.error || 'Production order creation failed');
      }
      
      // Additional validation: check if orders were actually created
      if (!result.created_orders || result.created_orders.length === 0) {
        console.warn('No orders in response, but success was true:', result);
      }
      
      return {
        ...result,
        // Ensure we have the required response structure
        success: true,
        created_orders: result.created_orders || [],
        errors: result.errors || [],
        message: result.message || `Created ${result.created_orders?.length || 0} production orders`
      };
      
    } catch (error) {
      console.error('Error creating production orders:', error);
      throw new Error(`Failed to create production orders: ${error.message}`);
    }
  },

  /**
   * FIXED: Get production orders with proper error handling
   */
  getProductionOrders: async (params = {}) => {
    try {
      const queryParams = new URLSearchParams();
      
      // Add query parameters
      Object.keys(params).forEach(key => {
        if (params[key] !== undefined && params[key] !== null) {
          queryParams.append(key, params[key]);
        }
      });
      
      const url = `${API_BASE_URL}/production-orders/${queryParams.toString() ? '?' + queryParams.toString() : ''}`;
      
      console.log('Fetching production orders from:', url);
      
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      
      // Handle both array and paginated response
      if (Array.isArray(data)) {
        return data;
      } else if (data.results && Array.isArray(data.results)) {
        return data.results;
      }
      
      console.warn('Unexpected response format for production orders:', data);
      return [];
      
    } catch (error) {
      console.error('Error fetching production orders:', error);
      throw error;
    }
  },

  /**
   * FIXED: Update production order status with validation
   */
  updateProductionOrderStatus: async (orderId, status) => {
    try {
      if (!orderId) {
        throw new Error('Order ID is required');
      }
      
      if (!status) {
        throw new Error('Status is required');
      }
      
      const validStatuses = ['planned', 'in_progress', 'completed'];
      if (!validStatuses.includes(status)) {
        throw new Error(`Invalid status: ${status}. Must be one of: ${validStatuses.join(', ')}`);
      }
      
      console.log(`Updating production order ${orderId} status to ${status}`);
      
      // TRY DIFFERENT ENDPOINT FORMATS - one of these should work
      const possibleEndpoints = [
        `${API_BASE_URL}/production-orders/${orderId}/update_status/`,
        `${API_BASE_URL}/production-orders/${orderId}/status/`,
        `${API_BASE_URL}/production-orders/${orderId}/`,
        `${API_BASE_URL}/production/${orderId}/status/`,
        `${API_BASE_URL}/production/${orderId}/update-status/`
      ];
      
      let lastError;
      
      // Try each endpoint until one works
      for (const endpoint of possibleEndpoints) {
        try {
          console.log(`Trying endpoint: ${endpoint}`);
          
          const response = await fetch(endpoint, {
            method: endpoint.includes('/update_status/') || endpoint.includes('/status/') ? 'POST' : 'PATCH',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ status })
          });
          
          if (response.ok) {
            const result = await response.json();
            console.log(`Success with endpoint: ${endpoint}`);
            return result;
          } else {
            console.log(`Failed with endpoint: ${endpoint} - ${response.status}`);
            lastError = `HTTP ${response.status}: ${response.statusText}`;
          }
          
        } catch (endpointError) {
          console.log(`Error with endpoint: ${endpoint}`, endpointError);
          lastError = endpointError.message;
        }
      }
      
      // If all endpoints failed, throw the last error
      throw new Error(lastError || 'All status update endpoints failed');
      
    } catch (error) {
      console.error('Error updating production order status:', error);
      throw error;
    }
  },

  /**
   * Get production order by ID
   */
  getProductionOrderById: async (orderId) => {
    try {
      if (!orderId) {
        throw new Error('Order ID is required');
      }
      
      const response = await fetch(`${API_BASE_URL}/production-orders/${orderId}/`);
      
      if (!response.ok) {
        if (response.status === 404) {
          throw new Error('Production order not found');
        }
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      return await response.json();
      
    } catch (error) {
      console.error(`Error fetching production order ${orderId}:`, error);
      throw error;
    }
  },

  // ... other existing methods remain the same ...
  
  getProductionShifts: async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/production-shifts/`);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();
      
      if (Array.isArray(data)) {
        return data;
      } else if (data.results && Array.isArray(data.results)) {
        return data.results;
      }
      
      return [];
    } catch (error) {
      console.error('Error fetching production shifts:', error);
      return [];
    }
  },

  getCurrentShift: async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/production-shifts/current_shift/`);
      if (!response.ok) {
        if (response.status === 404) {
          return { success: false, message: 'No active shift found' };
        }
        throw new Error(`HTTP ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.error('Error fetching current shift:', error);
      return { success: false, message: error.message };
    }
  },

  getProductionCategories: async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/production-categories/`);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();
      
      if (Array.isArray(data)) {
        return data;
      } else if (data.results && Array.isArray(data.results)) {
        return data.results;
      }
      
      return [];
    } catch (error) {
      console.error('Error fetching production categories:', error);
      return [];
    }
  },
   
  updateProductionOrder: async (orderId, data) => {
    try {
      const response = await fetch(`${API_BASE_URL}/production-orders/${orderId}/`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data)
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('Error updating production order:', error);
      throw error;
    }
  },

  analyzeFGItemsForProduction: async (fgItemKeys, date) => {
    try {
      console.log('Analyzing FG items for production:', fgItemKeys);
      
      const payload = {
        fg_item_keys: fgItemKeys,
        date: date
      };
      
      const response = await fetch(`${API_BASE_URL}/production/analyze-fg-items/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload)
      });
      
      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.error || `HTTP ${response.status}`);
      }
      
      return result;
    } catch (error) {
      console.error('Error analyzing FG items:', error);
      throw error;
    }
  },

  /**
   * Delete production order by ID
   */
  deleteProductionOrder: async (orderId) => {
    try {
      if (!orderId) {
        throw new Error('Order ID is required');
      }
      
      console.log(`Deleting production order ${orderId}`);
      
      const response = await fetch(`${API_BASE_URL}/production-orders/${orderId}/`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        }
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
      }
      
      // DELETE requests typically return empty response or status
      return { success: true, message: 'Production order deleted successfully' };
      
    } catch (error) {
      console.error(`Error deleting production order ${orderId}:`, error);
      throw error;
    }
  },

  /**
   * Bulk update production order statuses
   */
  bulkUpdateProductionOrderStatus: async (orderIds, status) => {
    try {
      if (!orderIds || !Array.isArray(orderIds) || orderIds.length === 0) {
        throw new Error('Order IDs array is required');
      }
      
      if (!status) {
        throw new Error('Status is required');
      }
      
      const validStatuses = ['planned', 'in_progress', 'completed'];
      if (!validStatuses.includes(status)) {
        throw new Error(`Invalid status: ${status}. Must be one of: ${validStatuses.join(', ')}`);
      }
      
      console.log(`Bulk updating ${orderIds.length} production orders to status: ${status}`);
      
      const response = await fetch(`${API_BASE_URL}/production-orders/bulk_update_status/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          order_ids: orderIds,
          status: status
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
      }
      
      const result = await response.json();
      return result;
      
    } catch (error) {
      console.error('Error bulk updating production order statuses:', error);
      throw error;
    }
  }
};





export default productionApiService;