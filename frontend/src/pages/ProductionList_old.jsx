// frontend/src/pages/ProductionList_old.jsx - CORRECTED with both individual and bulk updates working

import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Box, Container, Typography, Button, Paper, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, Chip, IconButton, CircularProgress,
  Alert, TextField, InputAdornment, MenuItem, FormControl, InputLabel, Select,
  Snackbar, Checkbox, TablePagination, Dialog, DialogActions, DialogContent, DialogTitle
} from '@mui/material';
import {
  Add as AddIcon, Visibility as ViewIcon, PlayArrow as StartIcon,
  Check as CheckIcon, Search as SearchIcon, Clear as ClearIcon,
  Refresh as RefreshIcon, Delete as DeleteIcon
} from '@mui/icons-material';

import productionApiService from '../services/productionApiService';
import djangoApiService from '../services/djangoApiService';

const STATUS_OPTIONS = [
  { value: '', label: 'All Statuses' },
  { value: 'planned', label: 'Planned' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'completed', label: 'Completed' }
];

const getStatusColor = (status) => {
  switch (status) {
    case 'planned': return 'primary';
    case 'in_progress': return 'warning';
    case 'completed': return 'success';
    default: return 'default';
  }
};

const ProductionList = () => {
  const navigate = useNavigate();
  const location = useLocation();
  
  const [productionOrders, setProductionOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [notification, setNotification] = useState(null);
  
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [dateFilter, setDateFilter] = useState('');
  const [filteredOrders, setFilteredOrders] = useState([]);
  
  // Pagination state
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  
  // Bulk operations state
  const [selectedOrders, setSelectedOrders] = useState([]);
  const [bulkDialogOpen, setBulkDialogOpen] = useState(false);
  const [bulkAction, setBulkAction] = useState('');
  const [bulkStatus, setBulkStatus] = useState('');
  
  // Auto-refresh interval
  const [lastRefresh, setLastRefresh] = useState(Date.now());
  
  useEffect(() => {
    // Check if we should show a message from navigation state
    if (location.state?.message) {
      setNotification({ type: 'success', message: location.state.message });
      
      // Clear the state to prevent showing the message on subsequent visits
      window.history.replaceState({}, document.title);
    }
    
    loadProductionOrders();
    
    // Set up auto-refresh every 30 seconds if there are active orders
    const refreshInterval = setInterval(() => {
      if (productionOrders.some(order => order.status === 'in_progress' || order.status === 'planned')) {
        loadProductionOrders(true); // Silent refresh
      }
    }, 30000);
    
    return () => clearInterval(refreshInterval);
  }, [location.state]);
  
  useEffect(() => {
    filterOrders();
  }, [searchQuery, statusFilter, dateFilter, productionOrders]);
  
  const loadProductionOrders = async (silent = false) => {
    if (!silent) {
      setLoading(true);
      setError(null);
    }
    
    try {
      console.log('Loading Production List...');
      
      // Use the fixed API service
      const data = await productionApiService.getProductionOrders();
      
      console.log('Loaded Production List:', data);
      console.log('Checking split order data:', data.map(order => ({
        id: order.id,
        item_name: order.item_name,
        is_split_order: order.is_split_order,
        notes: order.notes
      })));
      
      if (Array.isArray(data)) {
        setProductionOrders(data);
        setLastRefresh(Date.now());
        
        if (!silent && data.length === 0) {
          setNotification({ 
            type: 'info', 
            message: 'No Production List found. Create your first production plan to get started.' 
          });
        }
      } else {
        console.warn('Unexpected data format:', data);
        setProductionOrders([]);
      }
      
    } catch (err) {
      console.error('Error loading Production List:', err);
      setError(`Failed to load Production List: ${err.message}`);
      
      if (!silent) {
        setNotification({ 
          type: 'error', 
          message: `Failed to load Production List: ${err.message}` 
        });
      }
    } finally {
      if (!silent) {
        setLoading(false);
      }
    }
  };
  
  const filterOrders = () => {
    let filtered = [...productionOrders];
    
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(order => 
        (order.item_name || '').toLowerCase().includes(query) ||
        (order.recipe_name || '').toLowerCase().includes(query) ||
        (order.assigned_to || '').toLowerCase().includes(query)
      );
    }
    
    if (statusFilter) {
      filtered = filtered.filter(order => order.status === statusFilter);
    }
    
    if (dateFilter) {
      filtered = filtered.filter(order => {
        const orderDate = new Date(order.scheduled_date).toISOString().split('T')[0];
        return orderDate === dateFilter;
      });
    }
    
    // Sort by creation date (newest first) and then by status priority
    filtered.sort((a, b) => {
      // First sort by status priority (planned > in_progress > completed)
      const statusPriority = {
        'planned': 4,
        'in_progress': 3,
        'completed': 2
         
      };
      
      const aPriority = statusPriority[a.status] || 0;
      const bPriority = statusPriority[b.status] || 0;
      
      if (aPriority !== bPriority) {
        return bPriority - aPriority;
      }
      
      // Then sort by creation date (newest first)
      return new Date(b.created_at || b.scheduled_date) - new Date(a.created_at || a.scheduled_date);
    });
    
    setFilteredOrders(filtered);
  };
  
  const handleQuantityChange = async (orderId, field, value) => {
    try {
      // Update locally first for immediate feedback
      setProductionOrders(prev => prev.map(order => 
        order.id === orderId ? { ...order, [field]: parseFloat(value) || 0 } : order
      ));
      
      // Then update on server
      await productionApiService.updateProductionOrder(orderId, { [field]: parseFloat(value) || 0 });
      
      setNotification({ 
        type: 'success', 
        message: 'Quantity updated successfully' 
      });
    } catch (err) {
      // Revert on error
      loadProductionOrders();
      setNotification({ 
        type: 'error', 
        message: `Failed to update quantity: ${err.message}` 
      });
    }
  };

  // FIXED: Keep the original working individual status update function
  const handleStatusChange = async (order, newStatus) => {
    try {
      console.log(`Updating order ${order.id} status to ${newStatus}`);
      
      // First update the status
      await productionApiService.updateProductionOrderStatus(order.id, newStatus);
      
      // If status is completed, submit to Manager.io
      if (newStatus === 'completed') {
        try {
          setNotification({ 
            type: 'info', 
            message: 'Submitting to Manager.io...' 
          });
          
          // Submit to Manager.io
          const managerResult = await djangoApiService.submitProductionOrderToManager(order.id);
          
          if (managerResult.success) {
            setNotification({ 
              type: 'success', 
              message: `Production order completed and submitted to Manager.io successfully!` 
            });
          } else {
            setNotification({ 
              type: 'warning', 
              message: `Production order completed but Manager.io submission failed: ${managerResult.error}` 
            });
          }
        } catch (managerError) {
          console.error('Manager.io submission error:', managerError);
          setNotification({ 
            type: 'warning', 
            message: `Production order completed but Manager.io submission failed: ${managerError.message}` 
          });
        }
      } else {
        setNotification({ 
          type: 'success', 
          message: `Production order ${newStatus === 'in_progress' ? 'started' : 'updated'} successfully` 
        });
      }
      
      // Refresh the list to show updated status
      loadProductionOrders();
      
    } catch (err) {
      console.error(`Error updating order status:`, err);
      setNotification({ 
        type: 'error', 
        message: `Failed to update production order status: ${err.message}` 
      });
    }
  };
  
  // Bulk operations handlers
  const handleSelectAll = (checked) => {
    if (checked) {
      const visibleOrders = filteredOrders.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);
      setSelectedOrders(visibleOrders.map(order => order.id));
    } else {
      setSelectedOrders([]);
    }
  };

  const handleSelectOrder = (orderId, checked) => {
    if (checked) {
      setSelectedOrders(prev => [...prev, orderId]);
    } else {
      setSelectedOrders(prev => prev.filter(id => id !== orderId));
    }
  };

  // FIXED: Corrected bulk action function
  const handleBulkAction = async () => {
    if (selectedOrders.length === 0) return;
    
    try {
      setLoading(true);
      
      if (bulkAction === 'delete') {
        // Use Promise.allSettled for better error handling
        const results = await Promise.allSettled(
          selectedOrders.map(id => productionApiService.deleteProductionOrder(id))
        );
        
        const successful = results.filter(r => r.status === 'fulfilled').length;
        const failed = results.filter(r => r.status === 'rejected').length;
        
        if (failed === 0) {
          showNotification('success', `Successfully deleted ${successful} orders`);
        } else {
          showNotification('warning', `Deleted ${successful} orders, ${failed} failed`);
        }
        
      } else if (bulkAction === 'status' && bulkStatus) {
        // FIXED: Use individual updates but process them properly
        let successful = 0;
        let failed = 0;
        
        // Process each order individually to ensure proper error handling
        for (const orderId of selectedOrders) {
          try {
            console.log(`Bulk updating order ${orderId} to ${bulkStatus}`);
            await productionApiService.updateProductionOrderStatus(orderId, bulkStatus);
            successful++;
          } catch (error) {
            console.error(`Failed to update order ${orderId}:`, error);
            failed++;
          }
        }
        
        if (failed === 0) {
          showNotification('success', `Successfully updated ${successful} orders to ${bulkStatus.replace('_', ' ')}`);
        } else {
          showNotification('warning', `Updated ${successful} orders, ${failed} failed`);
        }
      }
      
      // Refresh the list to show updated status
      loadProductionOrders();
      setSelectedOrders([]);
      setBulkDialogOpen(false);
      setBulkAction('');
      setBulkStatus('');
      
    } catch (error) {
      console.error('Bulk operation error:', error);
      showNotification('error', `Bulk operation failed: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };
  
  const handleClearFilters = () => {
    setSearchQuery('');
    setStatusFilter('');
    setDateFilter('');
  };
  
  const handleRefresh = () => {
    loadProductionOrders();
  };
  
  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    } catch (e) {
      return 'Invalid Date';
    }
  };
  
  const formatDateTime = (dateString) => {
    if (!dateString) return 'N/A';
    
    try {
      const date = new Date(dateString);
      return date.toLocaleString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (e) {
      return 'Invalid Date';
    }
  };
  
  const showNotification = (type, message) => {
    setNotification({ type, message });
  };
  
  const closeNotification = () => {
    setNotification(null);
  };
  
  if (loading && productionOrders.length === 0) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '70vh' }}>
        <CircularProgress />
        <Typography sx={{ ml: 2 }}>Loading Production List...</Typography>
      </Box>
    );
  }
  
  // Get visible orders for current page
  const visibleOrders = filteredOrders.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);
  const isAllSelected = selectedOrders.length === visibleOrders.length && visibleOrders.length > 0;
  const isIndeterminate = selectedOrders.length > 0 && selectedOrders.length < visibleOrders.length;
  
  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 8 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h4" component="h1">
            Production List
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Last updated: {formatDateTime(lastRefresh)}
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <Button 
            variant="outlined" 
            startIcon={<RefreshIcon />}
            onClick={handleRefresh}
            disabled={loading}
          >
            Refresh
          </Button>
          <Button 
            variant="contained" 
            startIcon={<AddIcon />}
            onClick={() => navigate('/production/planning')}
          >
            New Production Plan
          </Button>
        </Box>
      </Box>
      
      {/* Error Display */}
      {error && (
        <Alert 
          severity="error" 
          sx={{ mb: 3 }}
          action={
            <Button color="inherit" size="small" onClick={handleRefresh}>
              Retry
            </Button>
          }
        >
          {error}
        </Alert>
      )}
      
      {/* Filter Bar */}
      <Paper sx={{ p: 2, mb: 4 }}>
        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
          <TextField
            placeholder="Search by item, recipe, or assignee..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            sx={{ flexGrow: 1, minWidth: '200px' }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon />
                </InputAdornment>
              ),
              endAdornment: searchQuery && (
                <InputAdornment position="end">
                  <IconButton size="small" onClick={() => setSearchQuery('')}>
                    <ClearIcon fontSize="small" />
                  </IconButton>
                </InputAdornment>
              )
            }}
          />
          
          <FormControl sx={{ minWidth: '180px' }}>
            <InputLabel>Status</InputLabel>
            <Select
              value={statusFilter}
              label="Status"
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              {STATUS_OPTIONS.map(option => (
                <MenuItem key={option.value} value={option.value}>
                  {option.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          
          <TextField
            type="date"
            label="Scheduled Date"
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
            sx={{ minWidth: '160px' }}
            InputLabelProps={{ shrink: true }}
          />
          
          <Button 
            variant="outlined" 
            startIcon={<ClearIcon />}
            onClick={handleClearFilters}
            disabled={!searchQuery && !statusFilter && !dateFilter}
          >
            Clear Filters
          </Button>
        </Box>
        
        {/* Summary */}
        <Box sx={{ mt: 2, display: 'flex', gap: 2, flexWrap: 'wrap' }}>
          <Chip 
            label={`Total: ${productionOrders.length}`} 
            color="default" 
            size="small" 
          />
          <Chip 
            label={`Planned: ${productionOrders.filter(o => o.status === 'planned').length}`} 
            color="primary" 
            size="small" 
          />
          <Chip 
            label={`In Progress: ${productionOrders.filter(o => o.status === 'in_progress').length}`} 
            color="warning" 
            size="small" 
          />
          <Chip 
            label={`Completed: ${productionOrders.filter(o => o.status === 'completed').length}`} 
            color="success" 
            size="small" 
          />
        </Box>
      </Paper>
      
      {/* Bulk Actions Bar */}
      {selectedOrders.length > 0 && (
        <Paper sx={{ p: 2, mb: 2, bgcolor: 'primary.50' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Typography variant="body1" fontWeight="medium">
              {selectedOrders.length} orders selected
            </Typography>
            <Button
              variant="outlined"
              size="small"
              onClick={() => {
                setBulkAction('status');
                setBulkDialogOpen(true);
              }}
            >
              Bulk Status Update
            </Button>
            <Button
              variant="outlined"
              color="error"
              size="small"
              startIcon={<DeleteIcon />}
              onClick={() => {
                setBulkAction('delete');
                setBulkDialogOpen(true);
              }}
            >
              Delete Selected
            </Button>
            <Button
              variant="text"
              size="small"
              onClick={() => setSelectedOrders([])}
            >
              Clear Selection
            </Button>
          </Box>
        </Paper>
      )}
      
      {/* Production List Table */}
      <Paper sx={{ width: '100%', overflow: 'hidden' }}>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell padding="checkbox">
                  <Checkbox
                    checked={isAllSelected}
                    indeterminate={isIndeterminate}
                    onChange={(e) => handleSelectAll(e.target.checked)}
                  />
                </TableCell>
                <TableCell>Item</TableCell>
                <TableCell align="right">Planned Quantity</TableCell>
                <TableCell align="right">Actual Quantity</TableCell>
                <TableCell>Assigned To</TableCell>
                <TableCell align="center">Status</TableCell>
                <TableCell align="center">Scheduled Date</TableCell>
                <TableCell align="center">Created</TableCell>
                <TableCell align="center">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {visibleOrders.length > 0 ? (
                visibleOrders.map((order) => (
                  <TableRow key={order.id} hover selected={selectedOrders.includes(order.id)}>
                    <TableCell padding="checkbox">
                      <Checkbox
                        checked={selectedOrders.includes(order.id)}
                        onChange={(e) => handleSelectOrder(order.id, e.target.checked)}
                      />
                    </TableCell>
                    <TableCell>
                      <Box>
                        <Typography variant="body1" fontWeight="bold">
                          {order.item_name}
                        </Typography>
                        {order.recipe_name && (
                          <Typography variant="body2" color="text.secondary">
                            Recipe: {order.recipe_name}
                          </Typography>
                        )}
                        {order.item_code && (
                          <Typography variant="caption" color="text.secondary">
                            Code: {order.item_code}
                          </Typography>
                        )}
                        {/* ENHANCED: Better split order identification */}
                        {(() => {
                          const sameItemOrders = filteredOrders.filter(o => 
                            o.item_name === order.item_name && 
                            o.item_code === order.item_code &&
                            o.scheduled_date === order.scheduled_date
                          );
                          
                          const isSplitOrder = sameItemOrders.length > 1;
                          const splitIndex = sameItemOrders.findIndex(o => o.id === order.id) + 1;
                          
                          return (isSplitOrder || order.is_split_order) && (
                            <Box sx={{ mt: 0.5, display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                              <Chip 
                                label="Split Order" 
                                size="small" 
                                color="info" 
                              />
                              {isSplitOrder && (
                                <Chip 
                                  label={`Part ${splitIndex} of ${sameItemOrders.length}`} 
                                  size="small" 
                                  color="secondary" 
                                  variant="outlined"
                                />
                              )}
                            </Box>
                          );
                        })()}
                      </Box>
                    </TableCell>
                    <TableCell align="right">
                      <TextField
                        size="small"
                        type="number"
                        value={order.planned_quantity}
                        onChange={(e) => handleQuantityChange(order.id, 'planned_quantity', e.target.value)}
                        sx={{ width: 80 }}
                      />
                    </TableCell>
                    <TableCell align="right">
                      <TextField
                        size="small"
                        type="number"
                        value={order.actual_quantity || ''}
                        placeholder="Enter actual"
                        onChange={(e) => handleQuantityChange(order.id, 'actual_quantity', e.target.value)}
                        sx={{ width: 80 }}
                        disabled={order.status === 'in_progress'} // Only disable for in_progress status
                      />
                    </TableCell>
                     
                    <TableCell>
                      <Typography variant="body2">
                        {order.assigned_to || 'Unassigned'}
                      </Typography>
                      {order.shift_name && (
                        <Typography variant="caption" color="text.secondary" display="block">
                          {order.shift_name}
                        </Typography>
                      )}
                    </TableCell>
                    <TableCell align="center">
                      <Chip 
                        label={order.status ? order.status.charAt(0).toUpperCase() + order.status.slice(1).replace('_', ' ') : 'Unknown'} 
                        color={getStatusColor(order.status)}
                        size="small"
                      />
                    </TableCell>
                    <TableCell align="center">
                      <Typography variant="body2">
                        {formatDate(order.scheduled_date)}
                      </Typography>
                    </TableCell>
                    <TableCell align="center">
                      <Typography variant="body2">
                        {formatDate(order.created_at)}
                      </Typography>
                    </TableCell>
                    <TableCell align="center">
                      <Box sx={{ display: 'flex', justifyContent: 'center', gap: 1, alignItems: 'center' }}>
                        <IconButton 
                          size="small" 
                          onClick={() => navigate(`/production/${order.id}`)}
                          title="View details"
                        >
                          <ViewIcon fontSize="small" />
                        </IconButton>
                        
                        {/* FIXED: Keep the original working status dropdown */}
                        <Select
                          size="small"
                          value={order.status}
                          onChange={(e) => handleStatusChange(order, e.target.value)}
                          sx={{ minWidth: 120 }}
                        >
                          <MenuItem value="planned">Planned</MenuItem>
                          <MenuItem value="in_progress">In Progress</MenuItem>
                          <MenuItem value="completed">Completed</MenuItem>
                        </Select>
                      </Box>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={9} align="center" sx={{ py: 4 }}>
                    {productionOrders.length > 0 ? (
                      <Typography variant="body1" color="text.secondary">
                        No Production List found matching your filters.
                      </Typography>
                    ) : (
                      <Box>
                        <Typography variant="body1" color="text.secondary" gutterBottom>
                          No Production List found. Create your first production plan to get started.
                        </Typography>
                        <Button 
                          variant="contained" 
                          startIcon={<AddIcon />}
                          onClick={() => navigate('/production/planning')}
                          sx={{ mt: 1 }}
                        >
                          Create Production Plan
                        </Button>
                      </Box>
                    )}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
        
        {/* Pagination */}
        <TablePagination
          rowsPerPageOptions={[5, 10, 25, 50]}
          component="div"
          count={filteredOrders.length}
          rowsPerPage={rowsPerPage}
          page={page}
          onPageChange={(event, newPage) => setPage(newPage)}
          onRowsPerPageChange={(event) => {
            setRowsPerPage(parseInt(event.target.value, 10));
            setPage(0);
          }}
        />
      </Paper>
      
      {/* Bulk Action Dialog */}
      <Dialog open={bulkDialogOpen} onClose={() => setBulkDialogOpen(false)}>
        <DialogTitle>
          {bulkAction === 'delete' ? 'Delete Orders' : 'Bulk Status Update'}
        </DialogTitle>
        <DialogContent>
          {bulkAction === 'delete' ? (
            <Typography>
              Are you sure you want to delete {selectedOrders.length} selected orders? This action cannot be undone.
            </Typography>
          ) : (
            <FormControl fullWidth sx={{ mt: 2 }}>
              <InputLabel>New Status</InputLabel>
              <Select
                value={bulkStatus}
                onChange={(e) => setBulkStatus(e.target.value)}
                label="New Status"
              >
                <MenuItem value="planned">Planned</MenuItem>
                <MenuItem value="in_progress">In Progress</MenuItem>
                <MenuItem value="completed">Completed</MenuItem>
                
              </Select>
            </FormControl>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setBulkDialogOpen(false)}>Cancel</Button>
          <Button 
            onClick={handleBulkAction}
            variant="contained"
            color={bulkAction === 'delete' ? 'error' : 'primary'}
            disabled={bulkAction === 'status' && !bulkStatus}
          >
            {bulkAction === 'delete' ? 'Delete' : 'Update'}
          </Button>
        </DialogActions>
      </Dialog>
      
      {/* Loading overlay for refresh */}
      {loading && productionOrders.length > 0 && (
        <Box 
          sx={{ 
            position: 'fixed', 
            top: 0, 
            left: 0, 
            right: 0, 
            bottom: 0, 
            backgroundColor: 'rgba(255, 255, 255, 0.7)', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center',
            zIndex: 1000
          }}
        >
          <CircularProgress />
        </Box>
      )}
      
      {/* Notification Snackbar */}
      <Snackbar
        open={!!notification}
        autoHideDuration={6000}
        onClose={closeNotification}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert 
          onClose={closeNotification} 
          severity={notification?.type || 'info'}
          sx={{ width: '100%' }}
        >
          {notification?.message}
        </Alert>
      </Snackbar>
    </Container>
  );
};

export default ProductionList;