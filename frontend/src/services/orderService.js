/**
 * orderService.js - Service for handling orders and Manager.io integration
 */

import djangoApiService from './djangoApiService';

const orderService = {
  /**
   * Create an order in the local database
   */
  createOrder: async (orderData) => {
    try {
      // Calculate total amount from items
      const totalAmount = orderData.items.reduce((total, item) => 
        total + ((item.sales_price || item.price) * item.quantity), 0
      );
      
      // Prepare order data for API
      const preparedOrder = {
        customer_id: orderData.customer_id,
        customer_name: orderData.customer_name,
        customer_code: orderData.customer_code || '',
        order_date: orderData.order_date,
        notes: orderData.notes || '',
        status: 'pending',
        payment_status: 'pending',
        total_amount: totalAmount,
        tax_amount: 0,
        sync_status: 'not_synced',
        items: orderData.items.map(item => ({
          inventory_item_id: item.id,
          name: item.name,
          code: item.code || '',
          quantity: parseFloat(item.quantity),
          unit: item.unit || 'piece',
          price: parseFloat(item.sales_price || item.price), // Use sales_price as primary
          type: item.type || (item.code?.toLowerCase().startsWith('fg') ? 'finished_good' : 'accessory')
        }))
      };
      
      console.log('Creating order with data:', preparedOrder);
      
      // Create order in Django backend
      const response = await djangoApiService.post('/orders/', preparedOrder);
      return response;
    } catch (error) {
      console.error('Error creating order:', error);
      throw error;
    }
  },
  
  /**
   * Get all orders
   */
  getOrders: async () => {
    try {
      return await djangoApiService.get('/orders/');
    } catch (error) {
      console.error('Error fetching orders:', error);
      throw error;
    }
  },
  
  /**
   * Get order by ID
   */
  getOrderById: async (id) => {
    try {
      return await djangoApiService.get(`/orders/${id}/`);
    } catch (error) {
      console.error(`Error fetching order ${id}:`, error);
      throw error;
    }
  },
  
  /**
   * Update an order
   */
  updateOrder: async (id, orderData) => {
    try {
      return await djangoApiService.put(`/orders/${id}/`, orderData);
    } catch (error) {
      console.error(`Error updating order ${id}:`, error);
      throw error;
    }
  },
  
  /**
   * Delete an order
   */
  deleteOrder: async (id) => {
    try {
      return await djangoApiService.delete(`/orders/${id}/`);
    } catch (error) {
      console.error(`Error deleting order ${id}:`, error);
      throw error;
    }
  },
  
  /**
   * Sync an order to Manager.io
   */
   
  // Path: frontend/src/services/orderService.js

  syncOrderToManager: async (orderId) => {
    try {
      console.log(`Syncing order #${orderId} to Manager.io`);
      
      // Get order details first
      const order = await orderService.getOrderById(orderId);
      
      if (!order) {
        throw new Error('Order not found');
      }
      
      // Check if order has items
      if (!order.items || !Array.isArray(order.items) || order.items.length === 0) {
        throw new Error('Order has no items');
      }
      
      // Format data for Manager.io API - EXACT format that works
      const salesOrderData = {
        Date: `${order.order_date || new Date().toISOString().split('T')[0]}T00:00:00`,
        Reference: "1",
        Customer: order.customer_id,
        Description: order.notes || '',  // Use Description for notes instead of CustomFields
        Lines: order.items.map(item => ({
          Item: item.inventory_item_id,  // This should be a UUID from your database
          LineDescription: `${item.name} (${item.unit || 'piece'})`,
          CustomFields: {},
          CustomFields2: {
            "Strings": {},
            "Decimals": {},
            "Dates": {},
            "Booleans": {},
            "StringArrays": {}
          },
          Qty: parseFloat(item.quantity),
          SalesUnitPrice: parseFloat(item.price)
        })),
        SalesOrderFooters: [],
        CustomFields: {},  // Using CustomFields, not CustomFiles
        CustomFields2: {
          "Strings": {},  // No custom string fields - they require UUIDs as keys
          "Decimals": {},
          "Dates": {},
          "Booleans": {},
          "StringArrays": {}
        }
      };
      
      console.log('Sending to Manager.io:', salesOrderData);
      
      // Call the sales-order-form endpoint
      const response = await djangoApiService.post('/sales-order-form/', salesOrderData);
      
      if (response.success || response.key || response.manager_order_id) {
        return {
          success: true,
          message: 'Order synced successfully to Manager.io',
          key: response.key || response.manager_order_id
        };
      } else {
        throw new Error(response.error || 'Failed to sync order');
      }
    } catch (error) {
      console.error(`Error syncing order ${orderId}:`, error);
      throw error;
    }
  },
  
  /**
   * Batch sync orders to Manager.io
   */
  batchSyncOrdersToManager: async (orderIds) => {
    if (!orderIds || !Array.isArray(orderIds) || orderIds.length === 0) {
      throw new Error('No order IDs provided for batch sync');
    }
    
    try {
      console.log(`Syncing ${orderIds.length} orders to Manager.io`);
      
      // Call the batch-sync endpoint with the right format
      const response = await djangoApiService.post('/orders/batch-sync/', {
        order_ids: orderIds
      });
      
      return response;
    } catch (error) {
      console.error('Error batch syncing orders:', error);
      throw error;
    }
  },
  
  /**
   * Add item to an existing order
   */
  addItemToOrder: async (orderId, item) => {
    try {
      // Get current order
      const order = await orderService.getOrderById(orderId);
      
      if (!order) {
        throw new Error('Order not found');
      }
      
      // Ensure order has items array
      if (!order.items) {
        order.items = [];
      }
      
      // Prepare new item data
      const newItem = {
        inventory_item_id: item.id || item.inventory_item_id,
        name: item.name,
        code: item.code || '',
        quantity: parseFloat(item.quantity),
        unit: item.unit || 'piece',
        price: parseFloat(item.sales_price || item.price), // Use sales_price as primary
        type: item.type || (item.code?.toLowerCase().startsWith('fg') ? 'finished_good' : 'accessory')
      };
      
      // Add item to order
      order.items.push(newItem);
      
      // Update order total
      order.total_amount = order.items.reduce((total, item) => 
        total + (parseFloat(item.price) * parseFloat(item.quantity)), 0
      );
      
      // Update sync status if previously synced
      if (order.sync_status === 'synced') {
        order.sync_status = 'not_synced';
      }
      
      // Update order in database
      return await orderService.updateOrder(orderId, order);
    } catch (error) {
      console.error('Error adding item to order:', error);
      throw error;
    }
  },
  
  /**
   * Update item quantity in an order
   */
  updateItemQuantity: async (orderId, itemId, quantity) => {
    try {
      // Get current order
      const order = await orderService.getOrderById(orderId);
      
      if (!order || !order.items) {
        throw new Error('Order or order items not found');
      }
      
      // Find and update the item
      const updatedItems = order.items.map(item => {
        if (item.id === itemId) {
          return { ...item, quantity: parseFloat(quantity) };
        }
        return item;
      });
      
      // Update order with new items
      order.items = updatedItems;
      
      // Update order total
      order.total_amount = updatedItems.reduce((total, item) => 
        total + (parseFloat(item.price) * parseFloat(item.quantity)), 0
      );
      
      // Update sync status if previously synced
      if (order.sync_status === 'synced') {
        order.sync_status = 'not_synced';
      }
      
      // Update order in database
      return await orderService.updateOrder(orderId, order);
    } catch (error) {
      console.error('Error updating item quantity:', error);
      throw error;
    }
  },
  
  /**
   * Delete item from an order
   */
  deleteItemFromOrder: async (orderId, itemId) => {
    try {
      // Get current order
      const order = await orderService.getOrderById(orderId);
      
      if (!order || !order.items) {
        throw new Error('Order or order items not found');
      }
      
      // Filter out the item to delete
      const updatedItems = order.items.filter(item => item.id !== itemId);
      
      // Update order with filtered items
      order.items = updatedItems;
      
      // Update order total
      order.total_amount = updatedItems.reduce((total, item) => 
        total + (parseFloat(item.price) * parseFloat(item.quantity)), 0
      );
      
      // Update sync status if previously synced
      if (order.sync_status === 'synced') {
        order.sync_status = 'not_synced';
      }
      
      // Update order in database
      return await orderService.updateOrder(orderId, order);
    } catch (error) {
      console.error('Error deleting item from order:', error);
      throw error;
    }
  }
};

export default orderService;