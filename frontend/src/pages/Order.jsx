import OrderItemCard from '../components/OrderItemCard';
import React, { useState, useEffect } from 'react';
import { 
  Box, 
  Typography, 
  Paper, 
  Button, 
  Grid, 
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  CircularProgress,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Tabs,
  Tab,
  InputAdornment,
  Divider,
  Chip,
  Card,
  CardContent, Autocomplete
} from '@mui/material';
 
import { 
  Add as AddIcon, 
  Remove as RemoveIcon,
  Delete as DeleteIcon,
  Receipt as ReceiptIcon,
  Search as SearchIcon,
  ClearAll as ClearAllIcon
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { formatCurrency } from '../utils/formatters';
import inventoryService from '../services/inventoryService';
import orderService from '../services/orderService';
import djangoApiService from '../services/djangoApiService';

// TabPanel component
function TabPanel(props) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`order-tabpanel-${index}`}
      aria-labelledby={`order-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ p: 2 }}>{children}</Box>}
    </div>
  );
}

const Order = () => {
  const navigate = useNavigate();
  
  // State for order data
  const [orderItems, setOrderItems] = useState([]);
  const [customer, setCustomer] = useState(null);
  const [newCustomerName, setNewCustomerName] = useState('');
  const [orderDate, setOrderDate] = useState(new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState('');
  
  // State for available items
  const [finishedGoods, setFinishedGoods] = useState([]);
  const [accessories, setAccessories] = useState([]);
  const [filteredItems, setFilteredItems] = useState([]);
  const [displayedItems, setDisplayedItems] = useState([]); // New state for 6 random items
  const [searchTerm, setSearchTerm] = useState('');
  
  // State for customers
  const [customers, setCustomers] = useState([]);
  const [loadingCustomers, setLoadingCustomers] = useState(false);
  
  // State for UI
  const [activeTab, setActiveTab] = useState(0);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [openDialog, setOpenDialog] = useState(false);
  
  // Calculate order total
  const orderTotal = orderItems.reduce((total, item) => {
    const itemPrice = parseFloat(item.sales_price || item.price || 0);
    return total + (itemPrice * item.quantity);
  }, 0);

  // Function to get 6 random items
  const getRandomItems = (items, count = 6) => {
    if (items.length <= count) return items;
    const shuffled = [...items].sort(() => 0.5 - Math.random());
    return shuffled.slice(0, count);
  };

  // Load initial data
  useEffect(() => {
    fetchInventoryItems();

    const fetchInitialData = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Fetch inventory items
        const inventoryItems = await inventoryService.fetchInventoryItems();
        
        // Filter finished goods (FG items)
        const fgItems = inventoryItems.filter(item => 
          (item.code && item.code.toLowerCase().startsWith('fg')) || 
          (item.type && item.type.toLowerCase() === 'finished_good')
        );
        
        // Filter accessories (ACS items)
        const acsItems = inventoryItems.filter(item => 
          (item.code && item.code.toLowerCase().startsWith('acs')) || 
          (item.type && item.type.toLowerCase() === 'accessory')
        );
        
        setFinishedGoods(fgItems);
        setAccessories(acsItems);
        setFilteredItems(activeTab === 0 ? fgItems : acsItems);
        
        // Set random 6 items for display
        setDisplayedItems(getRandomItems(activeTab === 0 ? fgItems : acsItems));
        
        // Fetch customers from Manager.io
        await fetchCustomers();
      } catch (err) {
        console.error('Error fetching initial data:', err);
        setError('Failed to load data. Please try again.');
      } finally {
        setLoading(false);
      }
    };
    
    fetchInitialData();
  }, []);
  
  // Update displayed items when tab changes
  useEffect(() => {
    const currentItems = activeTab === 0 ? finishedGoods : accessories;
    setFilteredItems(currentItems);
    
    if (searchTerm === '') {
      setDisplayedItems(getRandomItems(currentItems));
    } else {
      // Show search results
      const searchLower = searchTerm.toLowerCase();
      const filtered = currentItems.filter(item => 
        item.name.toLowerCase().includes(searchLower) || 
        (item.code && item.code.toLowerCase().includes(searchLower))
      );
      setDisplayedItems(filtered);
    }
  }, [activeTab, finishedGoods, accessories, searchTerm]);
  
  // Fetch customers from Manager.io
  const fetchCustomers = async () => {
    try {
      setLoadingCustomers(true);
      setError(null);
      
      console.log('Fetching customers from Manager.io...');
      const response = await djangoApiService.getCustomers();
      
      if (response && response.customers && Array.isArray(response.customers)) {
        const customerData = response.customers.map(customer => ({
          id: customer.key || customer.id,
          name: customer.name,
          code: customer.code || '',
          balance: customer.accountsReceivable?.value || 0,
          status: customer.status || 'active'
        }));
        
        // Sort customers alphabetically by name
        customerData.sort((a, b) => a.name.localeCompare(b.name));
        setCustomers(customerData);
        
        // If we just created a customer, try to select it automatically
        if (newCustomerName && customerData.length > 0) {
          const newlyCreated = customerData.find(c => 
            c.name.toLowerCase() === newCustomerName.toLowerCase()
          );
          
          if (newlyCreated) {
            setCustomer(newlyCreated);
            setNewCustomerName(''); // Reset after selection
          }
        }
      } else {
        console.error('Unexpected customer data format:', response);
        setError('Failed to load customers: Unexpected data format');
      }
    } catch (err) {
      console.error('Error fetching customers:', err);
      setError('Failed to load customers. Please try again.');
    } finally {
      setLoadingCustomers(false);
    }
  };
  
  // Handle tab change
  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
    setSearchTerm(''); // Clear search when switching tabs
  };
  
  // Handle search
  const handleSearch = (event) => {
    const value = event.target.value;
    setSearchTerm(value);
    
    const currentItems = activeTab === 0 ? finishedGoods : accessories;
    
    if (value === '') {
      // Show random 6 items when search is cleared
      setDisplayedItems(getRandomItems(currentItems));
    } else {
      // Show all search results
      const searchLower = value.toLowerCase();
      const filtered = currentItems.filter(item => 
        item.name.toLowerCase().includes(searchLower) || 
        (item.code && item.code.toLowerCase().includes(searchLower))
      );
      setDisplayedItems(filtered);
    }
  };
  
  // Handle add item to order
  const handleAddItem = (item) => {
    // Check if item already exists in order
    const existingItemIndex = orderItems.findIndex(i => i.id === item.id);
    
    if (existingItemIndex !== -1) {
      // If item exists, increment quantity
      const updatedItems = [...orderItems];
      updatedItems[existingItemIndex].quantity += 1;
      setOrderItems(updatedItems);
    } else {
      // Add new item with quantity 1
      // If no price is available, default to 0 (for accessories)
      const itemPrice = parseFloat(item.sales_price || item.price || 0);
      
      setOrderItems([...orderItems, {
        ...item,
        quantity: 1,
        sales_price: itemPrice,
        price: itemPrice,
        manager_uuid: item.manager_uuid || item.manager_item_id
      }]);
    }
  };
  
  // Handle remove item from order
  const handleRemoveItem = (id) => {
    setOrderItems(orderItems.filter(item => item.id !== id));
  };
  
  // Handle quantity change
  const handleQuantityChange = (id, operation) => {
    const updatedItems = orderItems.map(item => {
      if (item.id === id) {
        if (operation === 'add') {
          return { ...item, quantity: item.quantity + 1 };
        } else if (operation === 'subtract' && item.quantity > 1) {
          return { ...item, quantity: item.quantity - 1 };
        }
      }
      return item;
    });
    
    setOrderItems(updatedItems);
  };
  
  // Handle direct quantity input
  const handleQuantityInput = (id, value) => {
    const quantity = parseInt(value) || 1;
    
    if (quantity < 1) return;
    
    const updatedItems = orderItems.map(item => {
      if (item.id === id) {
        return { ...item, quantity };
      }
      return item;
    });
    
    setOrderItems(updatedItems);
  };
  
  // Handle customer selection
  const handleCustomerChange = (event) => {
    const selectedCustomer = customers.find(c => c.id === event.target.value);
    setCustomer(selectedCustomer);
  };
  
  // Open new customer dialog
  const handleOpenNewCustomerDialog = () => {
    setOpenDialog(true);
  };
  
  // Close new customer dialog
  const handleCloseDialog = () => {
    setOpenDialog(false);
  };
  
  // Create new customer
  const handleCreateNewCustomer = async () => {
    if (!newCustomerName.trim()) {
      setError('Customer name is required.');
      return;
    }
    
    try {
      setSubmitting(true);
      setError(null);
      
      // Format data for Manager.io API
      const customerData = {
        Name: newCustomerName,
        CustomFields2: {}
      };
      
      console.log('Creating new customer in Manager.io:', customerData);
      
      // Call the API to create customer
      const response = await djangoApiService.createCustomer(customerData);
      console.log('Customer creation response:', response);
      
      // Show success message
      setSuccess(`Customer "${newCustomerName}" created in Manager.io`);
      
      // Close dialog
      setOpenDialog(false);
      
      // Wait a moment for Manager.io to process then refresh customers
      setTimeout(async () => {
        await fetchCustomers();
      }, 2000);
      
    } catch (err) {
      console.error('Error creating customer:', err);
      setError(`Failed to create customer: ${err.message || 'Unknown error'}`);
    } finally {
      setSubmitting(false);
    }
  };
  
  // Clear order
  const handleClearOrder = () => {
    setOrderItems([]);
    setCustomer(null);
    setNotes('');
  };
  

  // Function to fetch inventory items
  const fetchInventoryItems = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Make direct API call to inventory endpoint to see what's being returned
      const response = await fetch(`${process.env.REACT_APP_DJANGO_API_URL || 'http://localhost:8000/api'}/inventory/`);
      const data = await response.json();
      
      console.log('Raw inventory data:', data);
      
      // Transform the inventory items with better error handling
      const processedItems = Array.isArray(data) ? data.map(item => {
        // Extract item ID
        const id = item.manager_item_id || item.id || '';
        
        // Extract item code
        const code = item.ItemCode || item.manager_item_id || '';
        
        // Extract item name
        const name = item.ItemName || item.name || '';
        
        // Extract item price - prioritize sales_price
        const price = parseFloat(item.sales_price || item.DefaultSalesUnitPrice || item.unit_cost || 0);
        const sales_price = parseFloat(item.sales_price || item.DefaultSalesUnitPrice || item.unit_cost || 0);
        
        // Extract item unit
        const unit = item.UnitName || item.unit || 'piece';
        
        // Extract available quantity
        const availableQty = parseFloat(item.quantity_available || item.qtyOwned || 0);
        
        // Determine item type
        let type = 'other';
        if (item.category === 'FINISHED_GOOD' || (item.code && item.code.toLowerCase().startsWith('fg'))) {
          type = 'finished_good';
        } else if (item.category === 'ACCESSORY' || (item.code && item.code.toLowerCase().startsWith('acs'))) {
          type = 'accessory';
        }
        
        return {
          id,
          code,
          name,
          price,
          sales_price: sales_price, // Don't force accessories to 0 here, handle in UI
          unit,
          availableQty,
          type
        };
      }) : [];
      
      console.log('Processed inventory items:', processedItems);
      
      // Filter finished goods
      const fgItems = processedItems.filter(item => 
        item.type === 'finished_good' || 
        (item.code && item.code.toLowerCase().startsWith('fg'))
      );
      
      // Filter accessories
      const acsItems = processedItems.filter(item => 
        item.type === 'accessory' || 
        (item.code && item.code.toLowerCase().startsWith('acs'))
      );
      
      console.log('Finished goods:', fgItems.length);
      console.log('Accessories:', acsItems.length);
      
      setFinishedGoods(fgItems);
      setAccessories(acsItems);
      setFilteredItems(activeTab === 0 ? fgItems : acsItems);
      
      // Set random items for display
      setDisplayedItems(getRandomItems(activeTab === 0 ? fgItems : acsItems));
      
      // Fetch customers
      await fetchCustomers();
    } catch (err) {
      console.error('Error fetching inventory items:', err);
      setError(`Failed to load inventory items: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Submit order 
  const handleSubmitOrder = async () => {
    if (!customer) {
      setError('Please select or create a customer.');
      return;
    }
    
    if (orderItems.length === 0) {
      setError('Please add at least one item to the order.');
      return;
    }
    
    try {
      setSubmitting(true);
      setError(null);
      
      // Prepare the order data
      const orderData = {
        customer_id: customer.id,
        customer_name: customer.name,
        customer_code: customer.code || '',
        order_date: orderDate,
        notes: notes,
        items: orderItems
      };
      
      // Log the data to verify items are included
      console.log('Creating order with data:', orderData);
      
      // Create the order using our service
      const response = await orderService.createOrder(orderData);
      console.log('Order created:', response);
      
      // Show success message
      setSuccess('Order created successfully! You can sync it from the Orders page.');
      
      // Clear order form
      handleClearOrder();
      
      // Navigate to orders list after success
      setTimeout(() => {
        navigate('/orders');
      }, 1500);
      
    } catch (err) {
      console.error('Error submitting order:', err);
      setError(`Failed to create order: ${err.message || 'Unknown error'}`);
    } finally {
      setSubmitting(false);
    }
  };

  // Get item count text
  const getItemCountText = () => {
    const currentItems = activeTab === 0 ? finishedGoods : accessories;
    const itemType = activeTab === 0 ? 'finished goods' : 'accessories';
    
    if (searchTerm === '') {
      return `(showing 6 of ${currentItems.length} ${itemType})`;
    } else {
      return `(showing ${displayedItems.length} of ${currentItems.length} ${itemType})`;
    }
  };
  
  return (
    <Box sx={{ width: '100%' }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" component="h1">
          Create Order
        </Typography>
        <Box>
          <Button 
            variant="outlined" 
            startIcon={<ClearAllIcon />}
            onClick={handleClearOrder}
            sx={{ mr: 1 }}
            disabled={orderItems.length === 0}
          >
            Clear
          </Button>
        </Box>
      </Box>

      {/* Error & Success Messages */}
      {error && (
        <Alert 
          severity="error" 
          sx={{ mb: 3 }}
          onClose={() => setError(null)}
        >
          {error}
        </Alert>
      )}
      
      {success && (
        <Alert 
          severity="success" 
          sx={{ mb: 3 }}
          onClose={() => setSuccess(null)}
        >
          {success}
        </Alert>
      )}

      <Grid container spacing={3}>
        {/* Left panel - Customer Details & Order Summary */}
        <Grid item xs={12} md={4}>
          {/* Customer Details */}
          <Paper sx={{ p: 2, mb: 3 }}>
            <Typography variant="h6" gutterBottom>
              Customer Details
            </Typography>
            
            {/* Customer Selection */}
            <Box sx={{ mb: 2 }}>
            <Autocomplete
              options={customers}
              getOptionLabel={(option) => option.name || ''}
              value={customer}
              onChange={(event, newValue) => {
                handleCustomerChange({ target: { value: newValue?.id || '' } });
              }}
              loading={loadingCustomers}
              onOpen={() => {
                if (!loadingCustomers) {
                  fetchCustomers();
                }
              }}
              filterOptions={(options, { inputValue }) => {
                const searchTerm = inputValue.toLowerCase().trim();
                if (!searchTerm) return options;
                
                return options.filter(option => {
                  const name = (option.name || '').toLowerCase();
                  // Only match if the name starts with the search term (first word)
                  return name.startsWith(searchTerm);
                });
              }}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="Select Customer"
                  placeholder="Search and select customer..."
                  helperText="Type to search for customers"
                  InputProps={{
                    ...params.InputProps,
                    endAdornment: (
                      <>
                        {loadingCustomers ? <CircularProgress color="inherit" size={20} /> : null}
                        {params.InputProps.endAdornment}
                      </>
                    ),
                  }}
                />
              )}
              renderOption={(props, option) => (
                <Box component="li" {...props}>
                  <Typography variant="body1">
                    {option.name}
                  </Typography>
                </Box>
              )}
              isOptionEqualToValue={(option, value) => option.id === value?.id}
              noOptionsText={loadingCustomers ? "Loading customers..." : "No customers found"}
              sx={{ mb: 2 }}
            />
              
              <Button
                variant="outlined"
                fullWidth
                onClick={handleOpenNewCustomerDialog}
                startIcon={<AddIcon />}
              >
                Create New Customer
              </Button>
            </Box>
            
            {/* Order Date */}
            <TextField
              label="Order Date"
              type="date"
              fullWidth
              value={orderDate}
              onChange={(e) => setOrderDate(e.target.value)}
              sx={{ mb: 2 }}
              InputLabelProps={{
                shrink: true,
              }}
            />
            
            {/* Order Notes */}
            <TextField
              label="Order Notes"
              multiline
              rows={3}
              fullWidth
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add any special instructions or notes here..."
            />
          </Paper>
          
          {/* Order Summary */}
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>
              Order Summary
            </Typography>
            
            {orderItems.length === 0 ? (
              <Typography color="text.secondary" sx={{ my: 3, textAlign: 'center' }}>
                No items added yet
              </Typography>
            ) : (
              <>
                <Box sx={{ maxHeight: '350px', overflow: 'auto', mb: 2 }}>
                  {orderItems.map(item => (
                    <Box key={item.id} sx={{ 
                      display: 'flex', 
                      justifyContent: 'space-between', 
                      alignItems: 'center',
                      py: 1,
                      borderBottom: '1px solid #eee'
                    }}>
                      <Box>
                        <Typography variant="body1">{item.name}</Typography>
                        <Typography variant="body2" color="text.secondary">
                          {item.quantity} x {formatCurrency(item.sales_price || item.price || 0, 'en-US', 'BDT')}
                        </Typography>
                      </Box>
                      <Typography>
                        {formatCurrency((item.sales_price || item.price || 0) * item.quantity, 'en-US', 'BDT')}
                      </Typography>
                    </Box>
                  ))}
                </Box>
                
                <Divider sx={{ my: 2 }} />
                
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                  <Typography variant="body1">Subtotal</Typography>
                  <Typography variant="body1">
                    {formatCurrency(orderTotal, 'en-US', 'BDT')}
                  </Typography>
                </Box>
                
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                  <Typography variant="body2">Tax (0%)</Typography>
                  <Typography variant="body2">
                    {formatCurrency(0, 'en-US', 'BDT')}
                  </Typography>
                </Box>
                
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant="h6">Total</Typography>
                  <Typography variant="h6">
                    {formatCurrency(orderTotal, 'en-US', 'BDT')}
                  </Typography>
                </Box>

                <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 3 }}>
                  <Button 
                    variant="contained" 
                    color="primary"
                    size="large"
                    startIcon={<ReceiptIcon />}
                    onClick={handleSubmitOrder}
                    disabled={orderItems.length === 0 || !customer || submitting}
                  >
                    {submitting ? 'Submitting...' : 'Place Order'}
                  </Button>
                </Box>
              </>
            )}
          </Paper>
        </Grid>
        
        {/* Right panel - Items to order */}
        <Grid item xs={12} md={8}>
          <Paper sx={{ mb: 3 }}>
            {/* Random Items Display */}
            <Box sx={{ p: 2, mb: 2 }}>
              <Typography variant="h6" gutterBottom>
                Browse Items {getItemCountText()}
              </Typography>
              
              <TextField
                label="Search Items"
                fullWidth
                value={searchTerm}
                onChange={handleSearch}
                variant="outlined"
                placeholder={`Search ${activeTab === 0 ? 'finished goods' : 'accessories'}...`}
                InputProps={{
                  startAdornment: <SearchIcon color="action" sx={{ mr: 1 }} />,
                }}
                sx={{ mb: 2 }}
              />
              
              {loading ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
                  <CircularProgress />
                </Box>
              ) : (
                <Grid container spacing={2}>
                  {displayedItems.length > 0 ? displayedItems.map(item => (
                    <Grid item xs={12} sm={6} md={4} key={item.id}>
                      <Card 
                        sx={{ 
                          cursor: 'pointer',
                          transition: 'all 0.2s',
                          '&:hover': {
                            transform: 'translateY(-4px)',
                            boxShadow: 3
                          },
                          height: '100%'
                        }}
                        onClick={() => handleAddItem(item)}
                      >
                        <CardContent>
                          <Typography variant="h6" noWrap title={item.name}>
                            {item.name}
                          </Typography>
                          <Typography variant="body2" color="text.secondary" gutterBottom>
                            {item.code}
                          </Typography>
                          <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 1 }}>
                            <Typography variant="h6" color="primary">
                              BDT {(item.sales_price || item.price || 0).toFixed(2)}
                            </Typography>
                          </Box>
                        </CardContent>
                      </Card>
                    </Grid>
                  )) : (
                    <Grid item xs={12}>
                      <Typography align="center" color="text.secondary">
                        No {activeTab === 0 ? 'finished goods' : 'accessories'} found
                      </Typography>
                    </Grid>
                  )}
                </Grid>
              )}
            </Box>
            
            {/* Tabs */}
            <Box sx={{ borderTop: 1, borderColor: 'divider' }}>
              <Tabs 
                value={activeTab} 
                onChange={handleTabChange} 
                variant="fullWidth"
                aria-label="order items tabs"
              >
                <Tab label="Finished Goods" id="order-tab-0" />
                <Tab label="Accessories" id="order-tab-1" />
              </Tabs>
            </Box>
          </Paper>
        </Grid>
      </Grid>
      
      {/* Order Items Table - Full Width at Bottom */}
      <Paper sx={{ mt: 3 }}>
        <Box sx={{ p: 2 }}>
          <Typography variant="h6" gutterBottom>
            Order Items
          </Typography>
          <TableContainer sx={{ maxHeight: 400 }}>
            <Table stickyHeader>
              <TableHead>
                <TableRow>
                  <TableCell>Item</TableCell>
                  <TableCell align="right">Price</TableCell>
                  <TableCell align="center">Quantity</TableCell>
                  <TableCell align="right">Total</TableCell>
                  <TableCell align="center">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {orderItems.length > 0 ? (
                  orderItems.map(item => (
                    <TableRow key={item.id}>
                      <TableCell>
                        <Typography variant="body1">{item.name}</Typography>
                        <Typography variant="body2" color="text.secondary">
                          {item.code}
                        </Typography>
                      </TableCell>
                      <TableCell align="right">
                        {formatCurrency(item.sales_price || item.price || 0, 'en-US', 'BDT')}
                      </TableCell>
                      <TableCell align="center">
                        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <IconButton 
                            size="small" 
                            onClick={() => handleQuantityChange(item.id, 'subtract')}
                            disabled={item.quantity <= 1}
                          >
                            <RemoveIcon fontSize="small" />
                          </IconButton>
                          <TextField
                            value={item.quantity}
                            onChange={(e) => handleQuantityInput(item.id, e.target.value)}
                            inputProps={{ min: 1, style: { textAlign: 'center' } }}
                            variant="outlined"
                            size="small"
                            sx={{ width: '60px', mx: 1 }}
                          />
                          <IconButton 
                            size="small" 
                            onClick={() => handleQuantityChange(item.id, 'add')}
                          >
                            <AddIcon fontSize="small" />
                          </IconButton>
                        </Box>
                      </TableCell>
                      <TableCell align="right">
                        {formatCurrency((item.sales_price || item.price || 0) * item.quantity, 'en-US', 'BDT')}
                      </TableCell>
                      <TableCell align="center">
                        <IconButton
                          color="error"
                          onClick={() => handleRemoveItem(item.id)}
                        >
                          <DeleteIcon />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={5} align="center">
                      No items added to order yet. Click on an item to add it.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </Box>
      </Paper>
      
      {/* Create New Customer Dialog */}
      <Dialog open={openDialog} onClose={handleCloseDialog}>
        <DialogTitle>Create New Customer</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Customer Name"
            type="text"
            fullWidth
            variant="outlined"
            value={newCustomerName}
            onChange={(e) => setNewCustomerName(e.target.value)}
            sx={{ mt: 1 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancel</Button>
          <Button 
            onClick={handleCreateNewCustomer} 
            variant="contained"
            disabled={!newCustomerName.trim() || submitting}
          >
            {submitting ? 'Creating...' : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Order;