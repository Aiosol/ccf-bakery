// djangoApiService.js - Fixed version with missing delete method

const DJANGO_API_URL = process.env.REACT_APP_DJANGO_API_URL || 'https://ccf.aiosol.io/api/';

/**
 * Service for making API calls to Django backend
 */
const djangoApiService = {
  /**
   * Get authentication headers for requests
   * @returns {Object} Headers with authentication token if available
   */
  getAuthHeaders: function() {
    const token = localStorage.getItem('authToken');
    return token ? { 'Authorization': `Token ${token}` } : {};
  },

  /**
   * Handle paginated responses from Django REST Framework
   * @param {Object} data - Response data from API
   * @returns {Array|Object} - Either results array from paginated response or original data
   */
  handlePaginatedResponse: function(data) {
    // Check if response has pagination format
    if (data && typeof data === 'object' && 'results' in data && 'count' in data) {
      return data.results;
    }
    return data;
  },

  /**
   * Make a GET request to the Django API
   * @param {string} endpoint - API endpoint to call
   * @param {object} params - Query parameters to include
   * @returns {Promise<any>} - Promise with response data
   */
  get: async function(endpoint, params = {}) {
    try {
      // Build URL with query parameters
      const url = new URL(`${DJANGO_API_URL}${endpoint}`);
      
      Object.keys(params).forEach(key => {
        if (params[key] !== undefined && params[key] !== null) {
          if (Array.isArray(params[key])) {
            // Handle array parameters
            params[key].forEach(value => {
              url.searchParams.append(key, value);
            });
          } else {
            url.searchParams.append(key, params[key]);
          }
        }
      });
      
      const response = await fetch(url, {
        headers: {
          'Accept': 'application/json',
          ...this.getAuthHeaders()
        }
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || `API error: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      return this.handlePaginatedResponse(data);
    } catch (error) {
      console.error(`GET request failed for ${endpoint}:`, error);
      throw error;
    }
  },
  
  /**
   * Make a POST request to the Django API
   * @param {string} endpoint - API endpoint to call
   * @param {object} data - Data to send in request body
   * @returns {Promise<any>} - Promise with response data
   */
  post: async function(endpoint, data = {}) {
    try {
      const response = await fetch(`${DJANGO_API_URL}${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          ...this.getAuthHeaders()
        },
        body: JSON.stringify(data)
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || `API error: ${response.status} ${response.statusText}`);
      }
      
      const responseData = await response.json();
      return responseData;
    } catch (error) {
      console.error(`POST request failed for ${endpoint}:`, error);
      throw error;
    }
  },
  
  /**
   * Make a PUT request to the Django API
   * @param {string} endpoint - API endpoint to call
   * @param {object} data - Data to send in request body
   * @returns {Promise<any>} - Promise with response data
   */
  put: async function(endpoint, data = {}) {
    try {
      const response = await fetch(`${DJANGO_API_URL}${endpoint}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          ...this.getAuthHeaders()
        },
        body: JSON.stringify(data)
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || `API error: ${response.status} ${response.statusText}`);
      }
      
      const responseData = await response.json();
      return responseData;
    } catch (error) {
      console.error(`PUT request failed for ${endpoint}:`, error);
      throw error;
    }
  },
  
  /**
   * Make a PATCH request to the Django API
   * @param {string} endpoint - API endpoint to call
   * @param {object} data - Data to send in request body
   * @returns {Promise<any>} - Promise with response data
   */
  patch: async function(endpoint, data = {}) {
    try {
      const response = await fetch(`${DJANGO_API_URL}${endpoint}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          ...this.getAuthHeaders()
        },
        body: JSON.stringify(data)
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || `API error: ${response.status} ${response.statusText}`);
      }
      
      const responseData = await response.json();
      return responseData;
    } catch (error) {
      console.error(`PATCH request failed for ${endpoint}:`, error);
      throw error;
    }
  },
  
  /**
   * Make a DELETE request to the Django API
   * @param {string} endpoint - API endpoint to call
   * @returns {Promise<any>} - Promise with response data or null
   */
  delete: async function(endpoint) {
    try {
      const response = await fetch(`${DJANGO_API_URL}${endpoint}`, {
        method: 'DELETE',
        headers: this.getAuthHeaders()
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || `API error: ${response.status} ${response.statusText}`);
      }
      
      // Some DELETE endpoints may return 204 No Content
      if (response.status === 204) {
        return null;
      }
      
      // Try to parse JSON if content exists
      try {
        return await response.json();
      } catch (e) {
        return null;
      }
    } catch (error) {
      console.error(`DELETE request failed for ${endpoint}:`, error);
      throw error;
    }
  },
  
  /**
   * Upload a file to the Django API
   * @param {string} endpoint - API endpoint to call
   * @param {FormData} formData - Form data including file to upload
   * @returns {Promise<any>} - Promise with response data
   */
  uploadFile: async function(endpoint, formData) {
    try {
      const response = await fetch(`${DJANGO_API_URL}${endpoint}`, {
        method: 'POST',
        headers: this.getAuthHeaders(),
        body: formData // No Content-Type header here, browser sets it with boundary
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || `API error: ${response.status} ${response.statusText}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error(`File upload failed for ${endpoint}:`, error);
      throw error;
    }
  },
  
  /**
   * Get inventory items with proper filtering for orders page
   * @param {String} category - Optional category filter (FINISHED_GOOD, ACCESSORY, etc.)
   * @returns {Promise<Array>} Inventory items
   */
  getInventoryItems: async function(category = null) {
    try {
      const url = '/inventory/';
      const response = await this.get(url);
      
      // Transform items to include sales_price if missing
      const transformedItems = response.map(item => {
        // Convert unit_cost and sales_price to numbers
        const unitCost = parseFloat(item.unit_cost || 0);
        let salesPrice = parseFloat(item.sales_price || 0);
        
        // If sales_price is 0 or missing, use unit_cost as fallback
        if (!salesPrice) {
          salesPrice = unitCost;
        }
        
        return {
          ...item,
          unit_cost: unitCost,
          sales_price: salesPrice,
          // Add type if not present
          type: item.type || 
                (item.category === 'FINISHED_GOOD' ? 'finished_good' : 
                 item.category === 'ACCESSORY' ? 'accessory' : 
                 (item.manager_item_id || item.ItemCode || '').toLowerCase().startsWith('fg') ? 'finished_good' :
                 (item.manager_item_id || item.ItemCode || '').toLowerCase().startsWith('acs') ? 'accessory' : 'other')
        };
      });
      
      // Filter by category if provided
      if (category) {
        return transformedItems.filter(item => 
          item.category === category || 
          (category === 'FINISHED_GOOD' && item.type === 'finished_good') ||
          (category === 'ACCESSORY' && item.type === 'accessory')
        );
      }
      
      return transformedItems;
    } catch (error) {
      console.error('Error fetching inventory items:', error);
      throw error;
    }
  },
  
  /**
   * Get all orders
   * @param {Object} params - Optional query parameters
   * @returns {Promise<Array>} Orders
   */
  getOrders: async function(params = {}) {
    try {
      const orders = await this.get('/orders/', params);
      
      // Ensure each order has an items array
      return orders.map(order => {
        if (!order.items) {
          return { ...order, items: [] };
        }
        return order;
      });
    } catch (error) {
      console.error('Error fetching orders:', error);
      throw error;
    }
  },
  
  /**
   * Get order by ID
   * @param {String|Number} id - Order ID
   * @returns {Promise<Object>} Order data
   */
  getOrderById: async function(id) {
    try {
      const order = await this.get(`/orders/${id}/`);
      
      // Ensure order has items array
      if (!order.items) {
        order.items = [];
      }
      
      return order;
    } catch (error) {
      console.error(`Error fetching order ${id}:`, error);
      throw error;
    }
  },
  
  /**
   * Create an order
   * @param {Object} orderData - Order data
   * @returns {Promise<Object>} Created order
   */
  createOrder: async function(orderData) {
    return await this.post('/orders/', orderData);
  },
  
  /**
   * Update an order
   * @param {String|Number} id - Order ID
   * @param {Object} orderData - Updated order data
   * @returns {Promise<Object>} Updated order
   */
  updateOrder: async function(id, orderData) {
    return await this.put(`/orders/${id}/`, orderData);
  },
  
  /**
   * Delete an order
   * @param {String|Number} id - Order ID
   * @returns {Promise<Object>} Response data
   */
  deleteOrder: async function(id) {
    return await this.delete(`/orders/${id}/`);
  },
  
  /**
   * Get customers from Manager.io
   * @returns {Promise<Object>} Customers data
   */
  getCustomers: async function() {
    try {
      return await this.get('/customers/');
    } catch (error) {
      console.error('Error fetching customers:', error);
      throw error;
    }
  },
  
  /**
   * Search customers by name or code
   * @param {String} term - Search term
   * @returns {Promise<Object>} Search results
   */
  searchCustomers: async function(term) {
    if (!term) {
      throw new Error('Search term is required');
    }
    
    try {
      return await this.get('/customers-search/', { term });
    } catch (error) {
      console.error('Error searching customers:', error);
      throw error;
    }
  },
  
  /**
   * Create a customer in Manager.io
   * @param {Object} customerData - Customer data in the format required by Manager.io
   * @returns {Promise<Object>} Response from Manager.io
   */
  createCustomer: async function(customerData) {
    try {
      // Ensure data has the format expected by Manager.io
      const formattedData = {
        Name: customerData.Name,
        CustomFields2: customerData.CustomFields2 || {}
      };
      
      return await this.post('/customer-form/', formattedData);
    } catch (error) {
      console.error('Error creating customer:', error);
      throw error;
    }
  },
  
  /**
   * Create a sales order in Manager.io
   * @param {Object} orderData - Order data in the format required by Manager.io
   * @returns {Promise<Object>} Response from Manager.io
   */
  createSalesOrder: async function(orderData) {
    // Ensure Date is properly formatted
    if (!orderData.Date || !orderData.Date.includes('T')) {
      const dateObj = new Date(orderData.Date || new Date());
      orderData.Date = `${dateObj.toISOString().split('T')[0]}T00:00:00`;
    }
    
    // Format data exactly as required by Manager.io
    const formattedOrderData = {
      "Date": orderData.Date,
      "Reference": orderData.Reference || "1",
      "Customer": orderData.Customer,
      "Description": orderData.Description || "", // Include Description field for notes
      "Lines": orderData.Lines.map(line => ({
        "Item": line.Item,
        "LineDescription": line.LineDescription || `Item (${line.unit || 'unit'})`,
        "CustomFields": {},
        "CustomFields2": {
          "Strings": {},
          "Decimals": {},
          "Dates": {},
          "Booleans": {},
          "StringArrays": {}
        },
        "Qty": parseFloat(line.Qty),
        "SalesUnitPrice": parseFloat(line.SalesUnitPrice)
      })),
      "SalesOrderFooters": [],
      "CustomFields": {},
      "CustomFields2": {
        "Strings": {},
        "Decimals": {},
        "Dates": {},
        "Booleans": {},
        "StringArrays": {}
      }
    };
    
    // Add notes if provided
    if (orderData.notes) {
      formattedOrderData.CustomFields2.Strings.Notes = orderData.notes;
    }
    
    console.log('Sending to Manager.io:', JSON.stringify(formattedOrderData, null, 2));
    
    // Use the POST method with improved error handling
    try {
      const response = await this.post('/sales-order-form/', formattedOrderData);
      return response;
    } catch (error) {
      console.error('Error creating sales order:', error);
      throw error;
    }
  },
  
  /**
   * Batch sync orders to Manager.io
   * @param {Array<Number|String>} orderIds - Array of order IDs to sync
   * @returns {Promise<Object>} Results of the batch sync operation
   */
  batchSyncOrders: async function(orderIds) {
    if (!orderIds || !Array.isArray(orderIds) || orderIds.length === 0) {
      throw new Error('No order IDs provided for batch sync');
    }
    
    return await this.post('/orders/batch-sync/', { order_ids: orderIds });
  },
  
  /**
   * Batch delete orders
   * @param {Array<Number|String>} orderIds - Array of order IDs to delete
   * @returns {Promise<Object>} Results of the batch delete operation
   */
  batchDeleteOrders: async function(orderIds) {
    if (!orderIds || !Array.isArray(orderIds) || orderIds.length === 0) {
      throw new Error('No order IDs provided for batch delete');
    }
    
    return await this.post('/batch-delete-orders/', { order_ids: orderIds });
  },
  
  /**
   * Get recipe categories
   * @returns {Promise<Array>} Recipe categories
   */
  getRecipeCategories: async function() {
    return await this.get('/recipe-categories/');
  },
  
  /**
   * Get recipes
   * @param {Object} params - Optional query parameters
   * @returns {Promise<Array>} Recipes
   */
  getRecipes: async function(params = {}) {
    return await this.get('/recipes/', params);
  },
  
  /**
   * Get recipe by ID
   * @param {String|Number} id - Recipe ID
   * @returns {Promise<Object>} Recipe data
   */
  getRecipeById: async function(id) {
    return await this.get(`/recipes/${id}/`);
  },
  
  /**
   * Create a recipe
   * @param {Object} recipeData - Recipe data
   * @returns {Promise<Object>} Created recipe
   */
  createRecipe: async function(recipeData) {
    return await this.post('/recipes/', recipeData);
  },
  
  /**
   * Update a recipe
   * @param {String|Number} id - Recipe ID
   * @param {Object} recipeData - Updated recipe data
   * @returns {Promise<Object>} Updated recipe
   */
  updateRecipe: async function(id, recipeData) {
    return await this.put(`/recipes/${id}/`, recipeData);
  },
  
  /**
   * Delete a recipe
   * @param {String|Number} id - Recipe ID
   * @returns {Promise<Object>} Response data
   */
  deleteRecipe: async function(id) {
    return await this.delete(`/recipes/${id}/`);
  },
  
  /**
   * Get production orders
   * @param {Object} params - Optional query parameters
   * @returns {Promise<Array>} Production orders
   */
  getProductionOrders: async function(params = {}) {
    return await this.get('/production/', params);
  },
  
  /**
   * Get production order by ID
   * @param {String|Number} id - Production order ID
   * @returns {Promise<Object>} Production order data
   */
  getProductionOrderById: async function(id) {
    return await this.get(`/production/${id}/`);
  },
  
  /**
   * Create a production order
   * @param {Object} orderData - Production order data
   * @returns {Promise<Object>} Created production order
   */
  createProductionOrder: async function(orderData) {
    return await this.post('/production/', orderData);
  },
  
  /**
   * Update a production order
   * @param {String|Number} id - Production order ID
   * @param {Object} orderData - Updated production order data
   * @returns {Promise<Object>} Updated production order
   */
  updateProductionOrder: async function(id, orderData) {
    return await this.put(`/production/${id}/`, orderData);
  },
  
  /**
   * Delete a production order
   * @param {String|Number} id - Production order ID
   * @returns {Promise<Object>} Response data
   */
  deleteProductionOrder: async function(id) {
    return await this.delete(`/production/${id}/`);
  },
  
    /**
   * Submit production order to Manager.io
   * @param {String|Number} id - Production order ID
   * @returns {Promise<Object>} Response data
   */
  submitProductionOrderToManager: async function(id) {
    try {
      console.log(`Submitting production order ${id} to Manager.io`);
      
      const response = await fetch(`${DJANGO_API_URL}/production-orders/${id}/submit-to-manager/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          ...this.getAuthHeaders()
        },
        body: JSON.stringify({})
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `API error: ${response.status} ${response.statusText}`);
      }
      
      const responseData = await response.json();
      return responseData;
    } catch (error) {
      console.error(`Submit to Manager.io failed:`, error);
      throw error;
    }
  },
  
  /**
   * Get dashboard data
   * @returns {Promise<Object>} Dashboard data
   */
  getDashboardData: async function() {
    return await this.get('/dashboard/');
  },
  
  /**
   * Sync inventory with Manager.io
   * @returns {Promise<Object>} Sync results
   */
  syncInventory: async function() {
    return await this.post('/inventory/sync/', {});
  }
};

export default djangoApiService;