import React, { useState, useEffect } from 'react';
import { 
  Box, 
  Typography, 
  Paper, 
  Button, 
  Grid, 
  Divider,
  CircularProgress,
  Alert,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem
} from '@mui/material';
import { 
  ArrowBack as ArrowBackIcon,
  Print as PrintIcon,
  Sync as SyncIcon,
  Add as AddIcon,
  Delete as DeleteIcon,
  Edit as EditIcon
} from '@mui/icons-material';
import { useParams, useNavigate } from 'react-router-dom';
import { formatCurrency } from '../utils/formatters';
import inventoryService from '../services/inventoryService';
import orderService from '../services/orderService';
import djangoApiService from '../services/djangoApiService';

const OrderDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  
  // State for order data
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [syncStatus, setSyncStatus] = useState(null);
  const [syncing, setSyncing] = useState(false);
  
  // State for add item dialog
  const [addItemDialogOpen, setAddItemDialogOpen] = useState(false);
  const [availableItems, setAvailableItems] = useState([]);
  const [loadingItems, setLoadingItems] = useState(false);
  const [newItem, setNewItem] = useState({
    inventory_item_id: '',
    name: '',
    quantity: 1,
    price: 0,
    sales_price: 0,
    unit: 'piece',
    type: 'finished_good'
  });
  
  // State for edit quantity dialog
  const [editQuantityDialogOpen, setEditQuantityDialogOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [newQuantity, setNewQuantity] = useState(1);
  
  // State for re-sync confirmation dialog
  const [resyncConfirmOpen, setResyncConfirmOpen] = useState(false);
  
  // Fetch order data
  useEffect(() => {
    fetchOrder();
  }, [id]);
  
  // Function to fetch order data
  const fetchOrder = async () => {
    try {
      setLoading(true);
      setError(null);
      
      console.log('Fetching order details for order ID:', id);
      const data = await djangoApiService.getOrderById(id);
      console.log('Order data received:', data);
      
      // Check if order has items array
      if (!data.items) {
        data.items = [];
        console.warn('Order has no items array, creating empty array');
      }
      
      setOrder(data);
    } catch (err) {
      console.error('Error loading order:', err);
      setError(`Failed to load order details: ${err.message || 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };
  
  // Fetch inventory items for add item dialog
  const fetchInventoryItems = async () => {
    try {
      setLoadingItems(true);
      
      // Make direct API call to inventory endpoint
      const response = await fetch(`${process.env.REACT_APP_DJANGO_API_URL || 'http://localhost:8000/api'}/inventory/`);
      const data = await response.json();
      
      console.log('Raw inventory items for add dialog:', data);
      
      // Transform items for the dropdown with better error handling
      const formattedItems = Array.isArray(data) ? data.map(item => {
        return {
          inventory_item_id: item.manager_item_id || item.id || '',
          name: item.name || item.ItemName || '',
          code: item.ItemCode || item.manager_item_id || '',
          price: parseFloat(item.sales_price || item.DefaultSalesUnitPrice || item.unit_cost || 0),
          sales_price: parseFloat(item.sales_price || item.DefaultSalesUnitPrice || item.unit_cost || 0),
          unit: item.unit || item.UnitName || 'piece',
          type: item.category === 'FINISHED_GOOD' || (item.code && item.code.toLowerCase().startsWith('fg')) 
                ? 'finished_good' 
                : item.category === 'ACCESSORY' || (item.code && item.code.toLowerCase().startsWith('acs'))
                ? 'accessory' 
                : 'other'
        };
      }) : [];
      
      console.log('Formatted items for dropdown:', formattedItems);
      setAvailableItems(formattedItems);
    } catch (err) {
      console.error('Error fetching inventory items for add dialog:', err);
      setError('Failed to load inventory items');
    } finally {
      setLoadingItems(false);
    }
  };
  
  // Handle add item
  const handleAddItem = async () => {
    try {
      if (!newItem.inventory_item_id || !newItem.name) {
        setError('Please select an item');
        return;
      }
      
      console.log('Adding item to order:', newItem);
      
      // Use the direct API approach for more control
      const url = `${process.env.REACT_APP_DJANGO_API_URL || 'http://localhost:8000/api'}/orders/${id}/`;
      
      // First, get the current order
      const orderResponse = await fetch(url);
      if (!orderResponse.ok) {
        throw new Error(`Failed to fetch order: ${orderResponse.status}`);
      }
      
      const currentOrder = await orderResponse.json();
      console.log('Current order:', currentOrder);
      
      // Ensure order has items array
      if (!currentOrder.items) {
        currentOrder.items = [];
      }
      
      // Add the new item
      const updatedItems = [...currentOrder.items, {
        inventory_item_id: newItem.inventory_item_id,
        name: newItem.name,
        code: newItem.code || '',
        quantity: parseFloat(newItem.quantity) || 1,
        unit: newItem.unit || 'piece',
        price: parseFloat(newItem.price) || 0,
        type: newItem.type || 'finished_good'
      }];
      
      // Update order with new items
      const updatedOrder = {
        ...currentOrder,
        items: updatedItems,
        // If order was previously synced, mark as not synced
        sync_status: currentOrder.sync_status === 'synced' ? 'not_synced' : currentOrder.sync_status
      };
      
      console.log('Updating order with new item:', updatedOrder);
      
      // Save updated order
      const updateResponse = await fetch(url, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updatedOrder)
      });
      
      if (!updateResponse.ok) {
        throw new Error(`Failed to update order: ${updateResponse.status}`);
      }
      
      // Refresh the order data
      fetchOrder();
      
      // Show success message
      setSuccess('Item added successfully');
      
      // Close dialog
      setAddItemDialogOpen(false);
      
      // Reset new item
      setNewItem({
        inventory_item_id: '',
        name: '',
        quantity: 1,
        price: 0,
        unit: 'piece',
        type: 'finished_good'
      });
      
    } catch (err) {
      console.error('Error adding item:', err);
      setError(`Failed to add item: ${err.message}`);
    }
  };
  
  // Handle sync to Manager.io - WITH RE-SYNC CONFIRMATION
  const handleSyncClick = () => {
    // If order is already synced, show confirmation dialog
    if (order.sync_status === 'synced' && order.manager_order_id) {
      setResyncConfirmOpen(true);
      return;
    }
    
    // For new orders, sync directly
    handleSync();
  };
  
  const handleSync = async (forceSync = false) => {
    try {
      setSyncing(true);
      setSyncStatus({ loading: true, message: 'Syncing order to Manager.io...' });
      
      // Check if order has items
      if (!order.items || !Array.isArray(order.items) || order.items.length === 0) {
        setSyncStatus({
          loading: false,
          success: false,
          message: 'Cannot sync order without any items. Please add at least one item.'
        });
        setSyncing(false);
        return;
      }
      
      // Create the data to send
      const syncData = {
        order_id: id,
        customer_id: order.customer_id,
        items: order.items.map(item => ({
          code: item.code || item.inventory_item_id,
          name: item.name,
          quantity: parseFloat(item.quantity) || 1,
          price: parseFloat(item.price) || 0,
          unit: item.unit || 'piece'
        })),
        description: order.notes || '',
        force_sync: forceSync  // NEW: Send force_sync parameter
      };
      
      console.log('Sending sync data:', syncData);
      
      // Use a more robust fetch with better error handling
      const apiUrl = `${process.env.REACT_APP_DJANGO_API_URL || 'http://localhost:8000/api'}/test-order-sync/`;
      console.log('Using API URL:', apiUrl);
      
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          // Add these headers if needed for your Django setup
          'X-Requested-With': 'XMLHttpRequest'
        },
        body: JSON.stringify(syncData)
      });
      
      // First check if response is ok
      if (!response.ok) {
        // Try to get error details from response
        let errorDetails = '';
        try {
          const errorText = await response.text();
          errorDetails = errorText.substring(0, 100); // First 100 chars
          console.error('Error response:', errorText);
        } catch (e) {
          errorDetails = `HTTP error ${response.status}`;
        }
        
        throw new Error(`Server error: ${errorDetails}`);
      }
      
      // Now try to parse the JSON
      const result = await response.json();
      
      // Update UI based on result - handle both new sync and already-synced cases
      if (result.success) {
        if (result.already_synced) {
          setSyncStatus({
            loading: false,
            success: true,
            message: `Order was already synced with Manager.io ID: ${result.manager_order_id}`
          });
        } else {
          const message = result.force_sync 
            ? `Order re-synced successfully to Manager.io with ID: ${result.key || result.manager_order_id}`
            : `Order successfully synced to Manager.io with ID: ${result.key || result.manager_order_id}`;
          
          setSyncStatus({
            loading: false,
            success: true,
            message: message
          });
        }
        
        // Refresh order data to show updated sync status
        fetchOrder();
      } else {
        setSyncStatus({
          loading: false,
          success: false,
          message: `Failed to sync order: ${result.error || 'Unknown error'}`
        });
      }
    } catch (err) {
      console.error('Error syncing order:', err);
      setSyncStatus({
        loading: false,
        success: false,
        message: `Failed to sync order: ${err.message || 'Unknown error'}`
      });
    } finally {
      setSyncing(false);
    }
  };
  
  // Handle re-sync confirmation
  const handleConfirmResync = () => {
    setResyncConfirmOpen(false);
    handleSync(true);  // Pass forceSync = true
  };
  
  const handleCancelResync = () => {
    setResyncConfirmOpen(false);
  };
  
  // Handle item deletion
  const handleDeleteItem = async (itemId) => {
    if (!window.confirm('Are you sure you want to delete this item?')) {
      return;
    }
    
    try {
      // Make sure order and items exist
      if (!order || !order.items || !Array.isArray(order.items)) {
        setError('Cannot delete item: order has no items');
        return;
      }
      
      // Filter out the item to delete
      const updatedItems = order.items.filter(item => item.id !== itemId);
      
      // Update the order with the filtered items
      const updatedOrder = {
        ...order,
        items: updatedItems,
        // If order was previously synced, mark as not synced
        sync_status: order.manager_order_id ? 'not_synced' : order.sync_status
      };
      
      // Update order in database
      await djangoApiService.updateOrder(order.id, updatedOrder);
      
      // Update local state
      setOrder(updatedOrder);
      
      // Show success message
      setSuccess('Item deleted successfully');
    } catch (err) {
      console.error('Error deleting item:', err);
      setError(`Failed to delete item: ${err.message || 'Unknown error'}`);
    }
  };
  
  // Open edit quantity dialog
  const handleOpenEditQuantityDialog = (item) => {
    setSelectedItem(item);
    setNewQuantity(item.quantity);
    setEditQuantityDialogOpen(true);
  };
  
  // Close edit quantity dialog
  const handleCloseEditQuantityDialog = () => {
    setEditQuantityDialogOpen(false);
    setSelectedItem(null);
  };
  
  // Update item quantity
  const handleUpdateQuantity = async () => {
    try {
      if (!selectedItem) {
        return;
      }
      
      // Validate quantity
      if (newQuantity < 1) {
        setError('Quantity must be at least 1');
        return;
      }
      
      // Make a copy of the current order
      const updatedOrder = { ...order };
      
      // Find and update the item in the order
      updatedOrder.items = updatedOrder.items.map(item => {
        if (item.id === selectedItem.id) {
          return { ...item, quantity: parseFloat(newQuantity) };
        }
        return item;
      });
      
      // Update order total
      updatedOrder.total_amount = updatedOrder.items.reduce((total, item) => 
        total + (parseFloat(item.price || 0) * parseFloat(item.quantity || 0)), 0);
      
      // If order was previously synced, mark as not synced
      if (updatedOrder.sync_status === 'synced') {
        updatedOrder.sync_status = 'not_synced';
      }
      
      // Update order in database
      await djangoApiService.updateOrder(updatedOrder.id, updatedOrder);
      
      // Update local state
      setOrder(updatedOrder);
      
      // Close dialog
      handleCloseEditQuantityDialog();
      
      // Show success message
      setSuccess('Quantity updated successfully');
    } catch (err) {
      console.error('Error updating quantity:', err);
      setError(`Failed to update quantity: ${err.message || 'Unknown error'}`);
    }
  };

  // Handle print with custom print view
  const handlePrint = () => {
    // Create a new window for printing
    const printWindow = window.open('', '_blank');
    
    // Generate the print HTML
    const printContent = generatePrintHTML();
    
    // Write content to new window
    printWindow.document.write(printContent);
    printWindow.document.close();
    
    // Print after content loads
    printWindow.onload = () => {
      printWindow.print();
      printWindow.close();
    };
  };

  // Generate print HTML with sales order format
  const generatePrintHTML = () => {
    const orderTotal = order.items?.reduce((total, item) => 
      total + (parseFloat(item.price) * parseFloat(item.quantity)), 0) || 0;
    
    const formatDateForPrint = (dateString) => {
      if (!dateString) return new Date().toLocaleDateString('en-GB');
      const date = new Date(dateString);
      return date.toLocaleDateString('en-GB', {
        day: '2-digit',
        month: '2-digit', 
        year: 'numeric'
      });
    };
    
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Sales Order - ${order.id}</title>
        <style>
          body {
            font-family: Arial, sans-serif;
            margin: 0;
            padding: 20px;
            font-size: 11px;
            line-height: 1.4;
            color: #000;
          }
          
          .header {
            text-align: center;
            margin-bottom: 30px;
            border-bottom: 2px solid #000;
            padding-bottom: 10px;
          }
          
          .header h1 {
            font-size: 24px;
            font-weight: bold;
            margin: 0 0 5px 0;
            text-transform: uppercase;
          }
          
          .order-info {
            display: flex;
            justify-content: space-between;
            margin-bottom: 20px;
            gap: 20px;
          }
          
          .customer-section {
            flex: 1;
          }
          
          .company-section {
            flex: 1;
            text-align: right;
          }
          
          .section-title {
            font-weight: bold;
            margin-bottom: 8px;
            font-size: 12px;
          }
          
          .customer-info p, .company-info p {
            margin: 3px 0;
            font-size: 11px;
          }
          
          .customer-info p:first-child {
            font-weight: bold;
            font-size: 12px;
          }
          
          .order-details {
            margin: 15px 0;
          }
          
          .order-details table {
            width: 100%;
            margin-bottom: 10px;
          }
          
          .order-details td {
            padding: 2px 0;
            font-size: 11px;
          }
          
          .order-details td:first-child {
            font-weight: normal;
            width: auto;
            padding-right: 8px;
          }
          
          .items-table {
            width: 100%;
            border-collapse: collapse;
            margin: 20px 0;
          }
          
          .items-table th,
          .items-table td {
            border: 1px solid #000;
            padding: 8px;
            text-align: left;
            font-size: 11px;
          }
          
          .items-table th {
            background-color: #f5f5f5;
            font-weight: bold;
            text-align: center;
          }
          
          .items-table .text-right {
            text-align: right;
          }
          
          .items-table .text-center {
            text-align: center;
          }
          
          .total-section {
            margin-top: 20px;
            text-align: right;
          }
          
          .total-row {
            margin: 5px 0;
            font-size: 12px;
            font-weight: bold;
          }
          
          .footer {
            margin-top: 40px;
            text-align: center;
            font-size: 10px;
            color: #666;
          }
          
          @media print {
            * {
              -webkit-print-color-adjust: exact;
              color-adjust: exact;
            }
            
            body {
              margin: 0;
              padding: 15px;
            }
            
            .header {
              page-break-after: avoid;
            }
            
            .items-table {
              page-break-inside: avoid;
            }
          }
          
          @page {
            margin: 0.5in;
            size: A4;
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>Sales Order</h1>
        </div>
        
        <div class="order-info">
          <div class="customer-section">
            <div class="section-title">Customer:</div>
            <div class="customer-info">
              <p>${order.customer_name || 'N/A'}</p>
              ${order.customer_code ? `<p>Code: ${order.customer_code}</p>` : ''}
            </div>
            
            <div style="margin-top: 15px;">
              <table class="order-details">
                <tr>
                  <td>Issue date:</td>
                  <td>${formatDateForPrint(order.order_date || order.created_at)}</td>
                </tr>
                <tr>
                  <td>Order Id:</td>
                  <td>${order.id}</td>
                </tr>
              </table>
            </div>
            
            ${order.notes ? `
            <div style="margin-top: 15px;">
              <div class="section-title">Order Note:</div>
              <p>${order.notes}</p>
            </div>` : ''}
          </div>
          
          <div class="company-section">
            <div class="section-title">CLOUD CAKE & FOODS</div>
            <div class="company-info">
              <p>Ramzannesa Market (Lot 03), Mirpur-12,</p>
              <p>Dhaka-1216, Bangladesh.</p>
              <p></p>
              <p>WhatsApp / Phone: +880 1711-080236</p>
            </div>
            
            
            
${order.notes ? `
            <div style="margin-top: 15px;">
              <div class="section-title">Order Note:</div>
              <p>${order.notes}</p>
            </div>` : ''}
          </div>
        </div>
        
        <table class="items-table">
          <thead>
            <tr>
              <th>Item</th>
              <th>Description</th>
              <th>PCs</th>
              <th>Unit price</th>
              <th>Total</th>
            </tr>
          </thead>
          <tbody>
            ${order.items?.map(item => `
              <tr>
                <td class="text-center">${item.code || item.inventory_item_id}</td>
                <td>${item.name} (${item.unit || 'PCs'})</td>
                <td class="text-center">${parseFloat(item.quantity).toFixed(1)}</td>
                <td class="text-right">${parseFloat(item.price).toFixed(2)}</td>
                <td class="text-right">${(parseFloat(item.price) * parseFloat(item.quantity)).toFixed(2)}</td>
              </tr>
            `).join('') || '<tr><td colspan="5" class="text-center">No items</td></tr>'}
          </tbody>
        </table>
        
        <div class="total-section">
          <div class="total-row">
            <strong>Total: ${orderTotal.toFixed(2)}</strong>
          </div>
        </div>
        
        <div class="footer">
          <p>Thank you for your business!</p>
          <p>Generated on ${new Date().toLocaleDateString('en-GB')} at ${new Date().toLocaleTimeString('en-GB')}</p>
        </div>
      </body>
      </html>
    `;
  };
  
  // Get formatted date
  const formatDate = (dateString) => {
    if (!dateString) return '-';
    
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  };
  
  // Format date for print (simple format)
  const formatDateForPrint = (dateString) => {
    if (!dateString) return new Date().toLocaleDateString('en-GB');
    
    const date = new Date(dateString);
    return date.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: '2-digit', 
      year: 'numeric'
    });
  };
  
  // Get status chip color
  const getStatusColor = (status) => {
    if (!status) return 'default';
    
    switch (status.toLowerCase()) {
      case 'completed':
        return 'success';
       
      case 'cancelled':
        return 'error';
      case 'synced':
        return 'info';
      case 'failed':
        return 'error';
      case 'not_synced':
        return 'default';
      default:
        return 'default';
    }
  };
  
  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh' }}>
        <CircularProgress />
      </Box>
    );
  }
  
  if (error && !order) {
    return (
      <Box sx={{ mt: 3 }}>
        <Alert 
          severity="error" 
          action={
            <Button color="inherit" onClick={() => navigate('/orders')}>
              Back to Orders
            </Button>
          }
        >
          {error}
        </Alert>
      </Box>
    );
  }
  
  if (!order) {
    return (
      <Box sx={{ mt: 3 }}>
        <Alert 
          severity="warning" 
          action={
            <Button color="inherit" onClick={() => navigate('/orders')}>
              Back to Orders
            </Button>
          }
        >
          Order not found
        </Alert>
      </Box>
    );
  }
  
  // Calculate order total from items
  const calculateOrderTotal = () => {
    if (!order.items || !Array.isArray(order.items)) {
      return parseFloat(order.total_amount) || 0;
    }
    
    return order.items.reduce((total, item) => 
      total + (parseFloat(item.price) * parseFloat(item.quantity)), 0);
  };
  
  const orderTotal = calculateOrderTotal();
  
  return (
    <Box sx={{ width: '100%' }}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <IconButton 
            color="inherit" 
            sx={{ mr: 1 }} 
            onClick={() => navigate('/orders')}
          >
            <ArrowBackIcon />
          </IconButton>
          <Typography variant="h4" component="h1">
            {order.manager_order_id ? `Order #${order.id} (${order.manager_order_id})` : `Order #${order.id}`}
          </Typography>
           
        </Box>
        
        <Box>
          <Button 
            variant="outlined" 
            startIcon={<PrintIcon />}
            sx={{ mr: 1 }}
            onClick={handlePrint}
          >
            Print
          </Button>
          {/* SYNC BUTTON WITH RE-SYNC CONFIRMATION */}
          <Button 
            variant="contained" 
            startIcon={<SyncIcon />}
            onClick={handleSyncClick}
            disabled={syncing || (!order.items || order.items.length === 0)}
            color={order.sync_status === 'failed' ? 'error' : 'primary'}
          >
            {syncing ? 'Syncing...' : 
             order.sync_status === 'synced' ? 'Re-sync' : 
             order.sync_status === 'failed' ? 'Retry Sync' : 
             'Sync to Manager.io'}
          </Button>
        </Box>
      </Box>
      
      {/* Sync Status Message */}
      {syncStatus && (
        <Alert 
          severity={syncStatus.success ? 'success' : syncStatus.loading ? 'info' : 'error'} 
          sx={{ mb: 3 }}
          onClose={() => setSyncStatus(null)}
        >
          {syncStatus.message}
        </Alert>
      )}
      
      {/* Success Message */}
      {success && (
        <Alert 
          severity="success" 
          sx={{ mb: 3 }}
          onClose={() => setSuccess(null)}
        >
          {success}
        </Alert>
      )}
      
      {/* Error Message */}
      {error && order && (
        <Alert 
          severity="error" 
          sx={{ mb: 3 }}
          onClose={() => setError(null)}
        >
          {error}
        </Alert>
      )}
      
      {/* Warning for no items */}
      {(!order.items || order.items.length === 0) && (
        <Alert 
          severity="warning" 
          sx={{ mb: 3 }}
          action={
            <Button 
              color="inherit" 
              onClick={() => {
                fetchInventoryItems();
                setAddItemDialogOpen(true);
              }}
            >
              Add Items
            </Button>
          }
        >
          This order has no items. You need to add at least one item before syncing to Manager.io.
        </Alert>
      )}
      
      <Grid container spacing={3}>
        {/* Order Information */}
        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 3, mb: 3 }}>
            <Typography variant="h6" gutterBottom>
              Order Information
            </Typography>
            <Divider sx={{ mb: 2 }} />
            
            <Box sx={{ mb: 2 }}>
              <Typography variant="body2" color="text.secondary">
                Order ID
              </Typography>
              <Typography variant="body1">
                {order.id}
              </Typography>
            </Box>
            
            {order.manager_order_id && (
              <Box sx={{ mb: 2 }}>
                <Typography variant="body2" color="text.secondary">
                  Manager Order ID
                </Typography>
                <Typography variant="body1">
                  {order.manager_order_id}
                </Typography>
              </Box>
            )}
            
            <Box sx={{ mb: 2 }}>
              <Typography variant="body2" color="text.secondary">
                Order Date
              </Typography>
              <Typography variant="body1">
                {formatDate(order.order_date || order.created_at)}
              </Typography>
            </Box>
            
            
            
            <Box sx={{ mb: 2 }}>
              <Typography variant="body2" color="text.secondary">
                Sync Status
              </Typography>
              <Chip 
                label={order.sync_status || 'Not Synced'}
                color={getStatusColor(order.sync_status)}
                size="small"
              />
            </Box>
            
            {order.notes && (
              <Box sx={{ mb: 2 }}>
                <Typography variant="body2" color="text.secondary">
                  Notes
                </Typography>
                <Typography variant="body1">
                  {order.notes}
                </Typography>
              </Box>
            )}
          </Paper>
          
          {/* Customer Information */}
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Customer Information
            </Typography>
            <Divider sx={{ mb: 2 }} />
            
            <Box sx={{ mb: 2 }}>
              <Typography variant="body2" color="text.secondary">
                Customer Name
              </Typography>
              <Typography variant="body1">
                {order.customer_name}
              </Typography>
            </Box>
            
            {order.customer_code && (
              <Box sx={{ mb: 2 }}>
                <Typography variant="body2" color="text.secondary">
                  Customer Code
                </Typography>
                <Typography variant="body1">
                  {order.customer_code}
                </Typography>
              </Box>
            )}
            
            {order.customer_id && (
              <Box sx={{ mb: 2 }}>
                <Typography variant="body2" color="text.secondary">
                  Customer ID
                </Typography>
                <Typography variant="body1">
                  {order.customer_id}
                </Typography>
              </Box>
            )}
          </Paper>
        </Grid>
        
        {/* Order Items */}
        <Grid item xs={12} md={8}>
          <Paper sx={{ p: 3, mb: 3 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="h6">
                Order Items
              </Typography>
              
              <Button 
                variant="outlined"
                startIcon={<AddIcon />}
                onClick={() => {
                  fetchInventoryItems();
                  setAddItemDialogOpen(true);
                }}
                disabled={order.sync_status === 'synced'}
              >
                Add Item
              </Button>
            </Box>
            
            <Divider sx={{ mb: 2 }} />
            
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Item</TableCell>
                    <TableCell>Type</TableCell>
                    <TableCell align="right">Price</TableCell>
                    <TableCell align="center">Quantity</TableCell>
                    <TableCell align="right">Total</TableCell>
                    <TableCell align="center">Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {order.items && order.items.length > 0 ? (
                    order.items.map((item, index) => (
                      <TableRow key={item.id || index}>
                        <TableCell>
                          <Typography variant="body1">{item.name}</Typography>
                          <Typography variant="body2" color="text.secondary">
                            {item.code || item.inventory_item_id}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Chip 
                            label={item.type === 'finished_good' ? 'Finished Good' : 'Accessory'} 
                            color={item.type === 'finished_good' ? 'primary' : 'secondary'}
                            size="small"
                          />
                        </TableCell>
                        <TableCell align="right">
                          {formatCurrency(item.price, 'en-US', 'BDT')}
                        </TableCell>
                        <TableCell align="center">
                          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            {item.quantity} {item.unit}
                            {order.sync_status !== 'synced' && (
                              <IconButton 
                                size="small" 
                                color="primary"
                                sx={{ ml: 1 }}
                                onClick={() => handleOpenEditQuantityDialog(item)}
                              >
                                <EditIcon fontSize="small" />
                              </IconButton>
                            )}
                          </Box>
                        </TableCell>
                        <TableCell align="right">
                          {formatCurrency(item.price * item.quantity, 'en-US', 'BDT')}
                        </TableCell>
                        <TableCell align="center">
                          <IconButton
                            color="error"
                            onClick={() => handleDeleteItem(item.id)}
                            disabled={order.sync_status === 'synced'}
                            size="small"
                          >
                            <DeleteIcon />
                          </IconButton>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={6} align="center">
                        No items in this order
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>
          
          {/* Order Summary - PAYMENT STATUS REMOVED */}
          <Paper sx={{ p: 3 }}>
            <Grid container spacing={2}>
              <Grid item xs={12}>
                <Box sx={{ 
                  display: 'flex', 
                  flexDirection: 'column', 
                  alignItems: 'flex-end',
                  mb: 2
                }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', width: '100%', maxWidth: 300, mb: 1 }}>
                    <Typography variant="body1">Subtotal:</Typography>
                    <Typography variant="body1">
                      {formatCurrency(orderTotal, 'en-US', 'BDT')}
                    </Typography>
                  </Box>
                  
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', width: '100%', maxWidth: 300, mb: 1 }}>
                    <Typography variant="body1">Tax:</Typography>
                    <Typography variant="body1">
                      {formatCurrency(order.tax_amount || 0, 'en-US', 'BDT')}
                    </Typography>
                  </Box>
                  
                  <Divider sx={{ width: '100%', maxWidth: 300, my: 1 }} />
                  
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', width: '100%', maxWidth: 300 }}>
                    <Typography variant="h6">Total:</Typography>
                    <Typography variant="h6">
                      {formatCurrency(orderTotal + (parseFloat(order.tax_amount) || 0), 'en-US', 'BDT')}
                    </Typography>
                  </Box>
                </Box>
              </Grid>
            </Grid>
          </Paper>
        </Grid>
      </Grid>
      
      {/* Add Item Dialog */}
      <Dialog open={addItemDialogOpen} onClose={() => setAddItemDialogOpen(false)}>
          <DialogTitle>Add Item to Order</DialogTitle>
          <DialogContent sx={{ minWidth: 400 }}>
            <DialogContentText>
              Add an item to this order so it can be synced to Manager.io.
            </DialogContentText>
            
            <FormControl fullWidth sx={{ mt: 2 }}>
              <InputLabel>Select Item</InputLabel>
              <Select
                value={newItem.inventory_item_id || ''}
                onChange={(e) => {
                  // Find the selected item
                  const selectedItem = availableItems.find(item => item.inventory_item_id === e.target.value);
                  
                  if (selectedItem) {
                    console.log('Selected item:', selectedItem);
                    // Set all properties from the selected item
                    setNewItem({
                      inventory_item_id: selectedItem.inventory_item_id,
                      name: selectedItem.name,
                      code: selectedItem.code || '',
                      quantity: 1,
                      price: selectedItem.price || selectedItem.sales_price || 0,
                      unit: selectedItem.unit || 'piece',
                      type: selectedItem.type || 'finished_good'
                    });
                  }
                }}
                disabled={loadingItems}
              >
                {loadingItems ? (
                  <MenuItem disabled>Loading...</MenuItem>
                ) : availableItems.length > 0 ? (
                  availableItems.map(item => (
                    <MenuItem key={item.inventory_item_id} value={item.inventory_item_id}>
                      {item.name} ({formatCurrency(item.price || item.sales_price || 0, 'en-US', 'BDT')})
                    </MenuItem>
                  ))
                ) : (
                  <MenuItem disabled>No items available</MenuItem>
                )}
              </Select>
            </FormControl>
            
            <TextField
              fullWidth
              label="Quantity"
              type="number"
              value={newItem.quantity}
              onChange={(e) => setNewItem({...newItem, quantity: Math.max(1, parseInt(e.target.value) || 1)})}
              InputProps={{ inputProps: { min: 1 } }}
              sx={{ mt: 2 }}
            />
            
            <TextField
              fullWidth
              label="Price"
              type="number"
              value={newItem.price}
              onChange={(e) => setNewItem({...newItem, price: parseFloat(e.target.value) || 0})}
              InputProps={{ inputProps: { min: 0, step: 0.01 } }}
              sx={{ mt: 2 }}
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setAddItemDialogOpen(false)}>Cancel</Button>
            <Button 
              onClick={handleAddItem} 
              variant="contained" 
              color="primary"
              disabled={!newItem.inventory_item_id || !newItem.name}
            >
              Add Item
            </Button>
          </DialogActions>
      </Dialog>
      
      {/* Re-sync Confirmation Dialog */}
      <Dialog open={resyncConfirmOpen} onClose={handleCancelResync}>
        <DialogTitle>Re-sync Order</DialogTitle>
        <DialogContent>
          <DialogContentText>
            This order is already synced to Manager.io with ID: {order.manager_order_id}. 
            Are you sure you want to sync it again? This will create a new sales order in Manager.io.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCancelResync}>Cancel</Button>
          <Button 
            onClick={handleConfirmResync} 
            variant="contained" 
            color="primary"
            autoFocus
          >
            Re-sync Order
          </Button>
        </DialogActions>
      </Dialog>
      
      {/* Edit Quantity Dialog */}
      <Dialog open={editQuantityDialogOpen} onClose={handleCloseEditQuantityDialog}>
        <DialogTitle>Edit Quantity</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Update the quantity for {selectedItem?.name}.
          </DialogContentText>
          
          <TextField
            fullWidth
            label="Quantity"
            type="number"
            value={newQuantity}
            onChange={(e) => setNewQuantity(Math.max(1, parseInt(e.target.value) || 1))}
            InputProps={{ inputProps: { min: 1 } }}
            sx={{ mt: 2 }}
            autoFocus
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseEditQuantityDialog}>Cancel</Button>
          <Button 
            onClick={handleUpdateQuantity} 
            variant="contained" 
            color="primary"
          >
            Update
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default OrderDetail;