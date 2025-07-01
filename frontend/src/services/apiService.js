// src/services/apiService.js
/**
 * Base API service with common methods for interacting with REST APIs
 */

const API_BASE_URL = 'https://ccf.aiosol.io/api/';

const apiService = {
  /**
   * Make a GET request to the API
   * @param {string} endpoint - API endpoint to call
   * @param {object} params - Query parameters to include
   * @returns {Promise<any>} - Promise with response data
   */
  get: async (endpoint, params = {}) => {
    try {
      // Build URL with query parameters
      const url = new URL(`${API_BASE_URL}${endpoint}`);
      
      Object.keys(params).forEach(key => {
        if (params[key] !== undefined && params[key] !== null) {
          url.searchParams.append(key, params[key]);
        }
      });
      
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`API error: ${response.status} ${response.statusText}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error(`GET request failed for ${endpoint}:`, error);
      throw error;
    }
  },
  
  /**
   * Make a POST request to the API
   * @param {string} endpoint - API endpoint to call
   * @param {object} data - Data to send in request body
   * @returns {Promise<any>} - Promise with response data
   */
  post: async (endpoint, data = {}) => {
    try {
      const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
      });
      
      if (!response.ok) {
        throw new Error(`API error: ${response.status} ${response.statusText}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error(`POST request failed for ${endpoint}:`, error);
      throw error;
    }
  },
  
  /**
   * Make a PUT request to the API
   * @param {string} endpoint - API endpoint to call
   * @param {object} data - Data to send in request body
   * @returns {Promise<any>} - Promise with response data
   */
  put: async (endpoint, data = {}) => {
    try {
      const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
      });
      
      if (!response.ok) {
        throw new Error(`API error: ${response.status} ${response.statusText}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error(`PUT request failed for ${endpoint}:`, error);
      throw error;
    }
  },
  
  /**
   * Make a DELETE request to the API
   * @param {string} endpoint - API endpoint to call
   * @returns {Promise<any>} - Promise with response data or null
   */
  delete: async (endpoint) => {
    try {
      const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        method: 'DELETE'
      });
      
      if (!response.ok) {
        throw new Error(`API error: ${response.status} ${response.statusText}`);
      }
      
      // Some DELETE endpoints may not return content
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
   * Upload a file to the API
   * @param {string} endpoint - API endpoint to call
   * @param {FormData} formData - Form data including file to upload
   * @returns {Promise<any>} - Promise with response data
   */
  uploadFile: async (endpoint, formData) => {
    try {
      const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        method: 'POST',
        body: formData // No Content-Type header here, browser sets it with boundary
      });
      
      if (!response.ok) {
        throw new Error(`API error: ${response.status} ${response.statusText}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error(`File upload failed for ${endpoint}:`, error);
      throw error;
    }
  },

  /**
   * Customer-specific endpoints
   */
  
  // Get all customers from Manager.io
  // In apiService.js - Improve the error handling for the customers endpoint
  getCustomers: async () => {
    try {
      const response = await apiService.get('/customers');
      
      // Ensure the response has the expected structure
      if (!response || !response.customers) {
        console.error('Invalid customer data format received:', response);
        throw new Error('Invalid customer data format received from Manager.io');
      }
      
      return response;
    } catch (error) {
      console.error('Error fetching customers:', error);
      throw error;
    }
  },
  
  // Get a customer by ID from Manager.io
  getCustomerById: async (id) => {
    return await apiService.get(`/customers/${id}`);
  },
  
  
  
  
  /**
   * Order-specific endpoints
   */
  
  // Get all orders
  getOrders: async (params = {}) => {
    return await apiService.get('/orders', params);
  },
  
  // Get an order by ID
  getOrderById: async (id) => {
    return await apiService.get(`/orders/${id}`);
  },
  
  // Create a new order
  createOrder: async (orderData) => {
    return await apiService.post('/orders', orderData);
  },
  
  // Update an order
  updateOrder: async (id, orderData) => {
    return await apiService.put(`/orders/${id}`, orderData);
  },
  
  // Delete an order
  deleteOrder: async (id) => {
    return await apiService.delete(`/orders/${id}`);
  },
  
   
  

  // Create a sales order in Manager.io
  createSalesOrder: async (orderData) => {
    try {
      // Validate order data
      if (!orderData.Customer) {
        throw new Error('Customer ID is required');
      }
      if (!orderData.Lines || !Array.isArray(orderData.Lines) || orderData.Lines.length === 0) {
        throw new Error('Order must contain at least one line item');
      }
      
      console.log('Sending order data to Manager.io:', orderData);
      
      // Make API call
      const response = await apiService.post('/sales-order-form', orderData);
      
      // Log full response for debugging
      console.log('Raw order creation response:', response);
      
      // We simply return the response as-is, and let the component handle different formats
      return response;
    } catch (error) {
      console.error('Error creating sales order:', error);
      
      // Pass through any error information
      if (error.response) {
        console.error('Response status:', error.response.status);
        console.error('Response data:', error.response.data);
      }
      
      throw error;
    }
  },

  // Create a new customer in Manager.io
  createCustomer: async (customerData) => {
    try {
      console.log('Creating customer with data:', customerData);
      
      // Make sure Content-Type header matches exactly what worked in Postman
      const response = await fetch(`${API_BASE_URL}/customer-form`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          // The API key should be set on the server side
        },
        body: JSON.stringify(customerData)
      });
      
      if (!response.ok) {
        const errorData = await response.text();
        console.error('Error response:', response.status, errorData);
        throw new Error(`API error: ${response.status} ${response.statusText}`);
      }
      
      // Try to parse response as JSON
      try {
        const jsonResponse = await response.json();
        console.log('Customer creation response:', jsonResponse);
        return jsonResponse;
      } catch (parseError) {
        // If response is not JSON, return raw text
        const textResponse = await response.text();
        console.log('Customer creation raw response:', textResponse);
        return textResponse;
      }
    } catch (error) {
      console.error('Error creating customer:', error);
      throw error;
    }
  },
  
  // Sync an existing order with Manager.io
  syncOrderWithManager: async (id) => {
    return await apiService.post(`/orders/${id}/sync`);
  },
  
  // Get order status from Manager.io
  getOrderStatusFromManager: async (managerOrderId) => {
    return await apiService.get(`/manager/orders/${managerOrderId}/status`);
  }
};



export default apiService;