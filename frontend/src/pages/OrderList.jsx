import React, { useState, useEffect } from 'react';
import { 
  Box, 
  Typography, 
  Paper, 
  Button, 
  CircularProgress,
  Alert,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  Checkbox,
  Grid,
  Card,
  CardContent,
  TextField,
  InputAdornment,
  Chip,
  Tooltip,
  Tabs,
  Tab,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Divider,
  Avatar,
  Stack
} from '@mui/material';
import { 
  Add as AddIcon,
  Search as SearchIcon,
  Refresh as RefreshIcon,
  Sync as SyncIcon,
  Delete as DeleteIcon,
  ArrowForward as ArrowForwardIcon,
  Receipt as ReceiptIcon,
  TrendingUp as TrendingUpIcon,
  ShoppingCart as ShoppingCartIcon,
  AttachMoney as AttachMoneyIcon,
  Today as TodayIcon,
  DateRange as DateRangeIcon,
  FilterList as FilterListIcon,
  Analytics as AnalyticsIcon,
  PieChart as PieChartIcon,
  Print as PrintIcon,
  KeyboardArrowDown as KeyboardArrowDownIcon,
  KeyboardArrowRight as KeyboardArrowRightIcon,
  ContentCopy as ContentCopyIcon,
  Assignment as AssignmentIcon
} from '@mui/icons-material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { useNavigate } from 'react-router-dom';
import { formatCurrency } from '../utils/formatters';
import orderService from '../services/orderService';
import djangoApiService from '../services/djangoApiService';

// TabPanel component for tabs
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
      {value === index && <Box sx={{ pt: 3 }}>{children}</Box>}
    </div>
  );
}

const OrderList = () => {
  const navigate = useNavigate();
  
  // State for orders and analytics
  const [orders, setOrders] = useState([]);
  const [filteredOrders, setFilteredOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [syncStatus, setSyncStatus] = useState(null);
  const [success, setSuccess] = useState(null);
  
  // State for tabs and date filtering
  const [activeTab, setActiveTab] = useState(0);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [dateRange, setDateRange] = useState('today');
  const [startDate, setStartDate] = useState(new Date());
  const [endDate, setEndDate] = useState(new Date());
  
  // State for analytics
  const [analytics, setAnalytics] = useState({
    todayOrders: 0,
    todayRevenue: 0,
    topFGItem: null,
    topACSItem: null,
    itemBreakdown: [],
    dailyTrends: []
  });
  
  // State for expanded rows in item matrix view
  const [expandedRows, setExpandedRows] = useState(new Set());
  
  // State for filtering
  const [itemTypeFilter, setItemTypeFilter] = useState('all');
  const [customerFilter, setCustomerFilter] = useState('all');
  const [uniqueCustomers, setUniqueCustomers] = useState([]);
  
  // State for selections
  const [selectedOrders, setSelectedOrders] = useState([]);
  const [selectedFGItems, setSelectedFGItems] = useState([]);
  
  // State for batch operations
  const [batchSyncing, setBatchSyncing] = useState(false);
  const [syncResults, setSyncResults] = useState(null);
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  
  // Pagination state
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  
  // Load orders and analytics on component mount
  useEffect(() => {
    fetchOrders();
  }, []);
  
  // Recalculate analytics when orders, date, or filters change
  useEffect(() => {
    calculateAnalytics();
    applyFilters();
  }, [orders, selectedDate, dateRange, startDate, endDate, searchTerm, itemTypeFilter, customerFilter]);
  
  // Function to fetch orders
  const fetchOrders = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const data = await djangoApiService.getOrders();
      console.log('Orders fetched:', data);
      
      // Ensure each order has an items array and proper date parsing
      const ordersWithItems = Array.isArray(data) ? data.map(order => {
        if (!order.items) {
          order.items = [];
        }
        return {
          ...order,
          order_date: new Date(order.order_date || order.created_at),
          created_at: new Date(order.created_at)
        };
      }) : [];
      
      setOrders(ordersWithItems);
      
      // Extract unique customers for filtering
      const customers = [...new Set(ordersWithItems.map(order => order.customer_name))].filter(Boolean);
      setUniqueCustomers(customers);
      
      setSelectedOrders([]); // Clear selections on refresh
    } catch (err) {
      console.error('Error fetching orders:', err);
      setError('Failed to load orders. Please try again.');
    } finally {
      setLoading(false);
    }
  };
  
  // Calculate analytics based on current filters
  const calculateAnalytics = () => {
    let filteredOrdersForAnalytics = orders;
    
    // Filter by date range - FIXED VERSION
    if (dateRange === 'today') {
      const today = new Date();
      const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
      const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59, 999);
      
      filteredOrdersForAnalytics = orders.filter(order => {
        const orderDate = new Date(order.order_date || order.created_at);
        return orderDate >= startOfDay && orderDate <= endOfDay;
      });
    } else if (dateRange === 'yesterday') {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const startOfDay = new Date(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate());
      const endOfDay = new Date(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate(), 23, 59, 59, 999);
      
      filteredOrdersForAnalytics = orders.filter(order => {
        const orderDate = new Date(order.order_date || order.created_at);
        return orderDate >= startOfDay && orderDate <= endOfDay;
      });
    } else if (dateRange === 'week') {
      const today = new Date();
      const weekStart = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 7);
      const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59, 999);
      
      filteredOrdersForAnalytics = orders.filter(order => {
        const orderDate = new Date(order.order_date || order.created_at);
        return orderDate >= weekStart && orderDate <= endOfDay;
      });
    } else if (dateRange === 'month') {
      const today = new Date();
      const monthStart = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 30);
      const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59, 999);
      
      filteredOrdersForAnalytics = orders.filter(order => {
        const orderDate = new Date(order.order_date || order.created_at);
        return orderDate >= monthStart && orderDate <= endOfDay;
      });
    } else if (dateRange === 'custom') {
      const start = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate());
      const end = new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate(), 23, 59, 59, 999);
      
      filteredOrdersForAnalytics = orders.filter(order => {
        const orderDate = new Date(order.order_date || order.created_at);
        return orderDate >= start && orderDate <= end;
      });
    }
    
    // Calculate basic metrics
    const todayOrders = filteredOrdersForAnalytics.length;
    const todayRevenue = filteredOrdersForAnalytics.reduce((total, order) => 
      total + (parseFloat(order.total_amount) || 0), 0
    );
    
    // Calculate item breakdown with customer details
    const itemBreakdownMap = new Map();
    const fgItems = new Map();
    const acsItems = new Map();
    
    filteredOrdersForAnalytics.forEach(order => {
      if (order.items && Array.isArray(order.items)) {
        order.items.forEach(item => {
          const key = `${item.code}-${item.name}`;
          const quantity = parseFloat(item.quantity) || 0;
          const revenue = quantity * (parseFloat(item.price) || 0);
          
          // Overall item breakdown with customer details
          if (itemBreakdownMap.has(key)) {
            const existing = itemBreakdownMap.get(key);
            // Add customer details to existing item
            existing.customers.push({
              customer_name: order.customer_name,
              customer_id: order.customer_id,
              order_id: order.id,
              quantity: quantity,
              order_time: order.created_at,
              sync_status: order.sync_status || 'not_synced'
            });
            itemBreakdownMap.set(key, {
              ...existing,
              quantity: existing.quantity + quantity,
              revenue: existing.revenue + revenue
            });
          } else {
            itemBreakdownMap.set(key, {
              code: item.code,
              name: item.name,
              type: item.type,
              quantity: quantity,
              revenue: revenue,
              unit_price: parseFloat(item.price) || 0,
              customers: [{
                customer_name: order.customer_name,
                customer_id: order.customer_id,
                order_id: order.id,
                quantity: quantity,
                order_time: order.created_at,
                sync_status: order.sync_status || 'not_synced'
              }]
            });
          }
          
          // Separate FG and ACS tracking
          if (item.type === 'finished_good' || (item.code && item.code.toLowerCase().startsWith('fg'))) {
            if (fgItems.has(key)) {
              fgItems.set(key, fgItems.get(key) + quantity);
            } else {
              fgItems.set(key, quantity);
            }
          } else if (item.type === 'accessory' || (item.code && item.code.toLowerCase().startsWith('acs'))) {
            if (acsItems.has(key)) {
              acsItems.set(key, acsItems.get(key) + quantity);
            } else {
              acsItems.set(key, quantity);
            }
          }
        });
      }
    });
    
    // Convert to arrays and sort
    const itemBreakdown = Array.from(itemBreakdownMap.values()).sort((a, b) => b.quantity - a.quantity);
    
    // Find top items
    const topFGEntry = Array.from(fgItems.entries()).sort((a, b) => b[1] - a[1])[0];
    const topACSEntry = Array.from(acsItems.entries()).sort((a, b) => b[1] - a[1])[0];
    
    const topFGItem = topFGEntry ? {
      name: topFGEntry[0].split('-')[1],
      quantity: topFGEntry[1]
    } : null;
    
    const topACSItem = topACSEntry ? {
      name: topACSEntry[0].split('-')[1],
      quantity: topACSEntry[1]
    } : null;
    
    setAnalytics({
      todayOrders,
      todayRevenue,
      topFGItem,
      topACSItem,
      itemBreakdown,
      dailyTrends: [] // Can be calculated later for charts
    });
  };
  
  // Apply filters to orders
  const applyFilters = () => {
    let filtered = orders;

    if (dateRange === 'today') {
      const today = new Date();
      const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
      const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59, 999);
      
      filtered = filtered.filter(order => {
        const orderDate = new Date(order.order_date || order.created_at);
        return orderDate >= startOfDay && orderDate <= endOfDay;
      });
    } else if (dateRange === 'yesterday') {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const startOfDay = new Date(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate());
      const endOfDay = new Date(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate(), 23, 59, 59, 999);
      
      filtered = filtered.filter(order => {
        const orderDate = new Date(order.order_date || order.created_at);
        return orderDate >= startOfDay && orderDate <= endOfDay;
      });
    } else if (dateRange === 'week') {
      const today = new Date();
      const weekStart = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 7);
      const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59, 999);
      
      filtered = filtered.filter(order => {
        const orderDate = new Date(order.order_date || order.created_at);
        return orderDate >= weekStart && orderDate <= endOfDay;
      });
    } else if (dateRange === 'month') {
      const today = new Date();
      const monthStart = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 30);
      const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59, 999);
      
      filtered = filtered.filter(order => {
        const orderDate = new Date(order.order_date || order.created_at);
        return orderDate >= monthStart && orderDate <= endOfDay;
      });
    } else if (dateRange === 'custom') {
      const start = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate());
      const end = new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate(), 23, 59, 59, 999);
      
      filtered = filtered.filter(order => {
        const orderDate = new Date(order.order_date || order.created_at);
        return orderDate >= start && orderDate <= end;
      });
    }
    
    // Filter by search term
    if (searchTerm) {
      const lowercaseTerm = searchTerm.toLowerCase();
      filtered = filtered.filter(order => 
        (order.customer_name && order.customer_name.toLowerCase().includes(lowercaseTerm)) ||
        (order.id && order.id.toString().includes(lowercaseTerm))
      );
    }
    
    // Filter by customer
    if (customerFilter !== 'all') {
      filtered = filtered.filter(order => order.customer_name === customerFilter);
    }
    
    // Filter by item type (for orders that contain those items)
    if (itemTypeFilter !== 'all') {
      filtered = filtered.filter(order => {
        if (!order.items || !Array.isArray(order.items)) return false;
        
        return order.items.some(item => {
          if (itemTypeFilter === 'finished_good') {
            return item.type === 'finished_good' || (item.code && item.code.toLowerCase().startsWith('fg'));
          } else if (itemTypeFilter === 'accessory') {
            return item.type === 'accessory' || (item.code && item.code.toLowerCase().startsWith('acs'));
          }
          return true;
        });
      });
    }
    
    setFilteredOrders(filtered);
  };
  
  // Handle date range change
  const handleDateRangeChange = (range) => {
    setDateRange(range);
    const today = new Date();
    
    switch (range) {
      case 'today':
        setSelectedDate(today);
        break;
      case 'yesterday':
        const yesterday = new Date();
        yesterday.setDate(today.getDate() - 1);
        setSelectedDate(yesterday);
        break;
      case 'week':
        const weekStart = new Date();
        weekStart.setDate(today.getDate() - 7);
        setStartDate(weekStart);
        setEndDate(today);
        break;
      case 'month':
        const monthStart = new Date();
        monthStart.setDate(today.getDate() - 30);
        setStartDate(monthStart);
        setEndDate(today);
        break;
      default:
        break;
    }
  };
  
  // Handle search input change
  const handleSearchChange = (event) => {
    setSearchTerm(event.target.value);
  };
  
  // Handle tab change
  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
  };
  
  // Handle checkbox selection
  const handleSelectOrder = (id) => {
    const selectedIndex = selectedOrders.indexOf(id);
    let newSelected = [];
    
    if (selectedIndex === -1) {
      newSelected = [...selectedOrders, id];
    } else {
      newSelected = selectedOrders.filter(orderId => orderId !== id);
    }
    
    setSelectedOrders(newSelected);
  };
  
  // Handle batch operations (same as before)
  const handleOpenSyncConfirm = () => {
    if (selectedOrders.length === 0) {
      setSyncStatus({
        type: 'warning',
        message: 'Please select at least one order to sync'
      });
      return;
    }
    setConfirmDialogOpen(true);
  };
  
  const handleCancelSync = () => {
    setConfirmDialogOpen(false);
  };
  
  const handleOpenDeleteConfirm = () => {
    if (selectedOrders.length === 0) {
      setSyncStatus({
        type: 'warning',
        message: 'Please select at least one order to delete'
      });
      return;
    }
    setDeleteDialogOpen(true);
  };
  
  const handleCancelDelete = () => {
    setDeleteDialogOpen(false);
  };
  
  // Handle batch delete - FIXED VERSION
  const handleBatchDelete = async () => {
    setDeleteDialogOpen(false);
    setBatchSyncing(true);
    setSyncStatus({
      type: 'info',
      message: `Deleting ${selectedOrders.length} orders...`
    });
    
    try {
      // Use the correct endpoint format for batch delete
      const response = await fetch(`${process.env.REACT_APP_DJANGO_API_URL || 'http://localhost:8000/api'}/batch-delete-orders/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          order_ids: selectedOrders
        })
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const result = await response.json();
      
      setSyncStatus({
        type: result.results?.successful > 0 ? 'success' : 'error',
        message: `Deleted ${result.results?.successful || 0} out of ${result.results?.total || selectedOrders.length} orders`
      });
      
      // Refresh orders
      fetchOrders();
    } catch (err) {
      console.error('Error performing batch delete:', err);
      setSyncStatus({
        type: 'error',
        message: `Batch delete failed: ${err.message}`
      });
    } finally {
      setBatchSyncing(false);
      setSelectedOrders([]);
    }
  };
  const handlePlanProduction = () => {
    if (selectedOrders.length === 0) {
      setSyncStatus({
        type: 'warning',
        message: 'Please select at least one order to plan production'
      });
      return;
    }
    
    // Get the actual order data for debugging/logging
    const selectedOrdersData = orders.filter(order => selectedOrders.includes(order.id));
    
    console.log('Selected orders for production:', selectedOrdersData.map(order => ({
      id: order.id,
      customer: order.customer_name,
      date: new Date(order.created_at || order.order_date).toLocaleDateString(),
      items: order.items?.length || 0
    })));
    
    // Always navigate with the selected IDs, regardless of current filters
    const orderParams = selectedOrders.join(',');
    navigate(`/production/planning?orders=${orderParams}`);
    
    setSyncStatus({
      type: 'info',
      message: `Sending ${selectedOrders.length} orders to production planning...`
    });
    };

  // Handle batch sync (same as before)
  const handleBatchSync = async () => {
    setConfirmDialogOpen(false);
    setBatchSyncing(true);
    setSyncResults(null);
    setSyncStatus({
      type: 'info',
      message: `Syncing ${selectedOrders.length} orders to Manager.io...`
    });
    
    try {
      const orderDetails = [];
      
      for (const orderId of selectedOrders) {
        try {
          const orderData = await djangoApiService.getOrderById(orderId);
          orderDetails.push({
            id: orderId,
            customer_id: orderData.customer_id,
            items: orderData.items || [],
            notes: orderData.notes || ''
          });
        } catch (err) {
          console.error(`Error fetching order ${orderId}:`, err);
        }
      }
      
      const results = {
        total: selectedOrders.length,
        successful: 0,
        failed: 0,
        results: []
      };
      
      for (const order of orderDetails) {
        try {
          const response = await fetch(`${process.env.REACT_APP_DJANGO_API_URL || 'http://localhost:8000/api'}/test-order-sync/`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              order_id: order.id,
              customer_id: order.customer_id,
              items: order.items.map(item => ({
                code: item.code,
                name: item.name,
                quantity: item.quantity,
                price: item.price,
                unit: item.unit || 'piece'
              })),
              description: order.notes || ''
            })
          }).then(res => res.json());
          
          if (response.success) {
            results.successful += 1;
            results.results.push({
              order_id: order.id,
              success: true,
              message: `Order synced successfully with ID ${response.key || response.manager_order_id}`
            });
          } else {
            results.failed += 1;
            results.results.push({
              order_id: order.id,
              success: false,
              message: response.error || 'Unknown error'
            });
          }
        } catch (err) {
          results.failed += 1;
          results.results.push({
            order_id: order.id,
            success: false,
            message: err.message || 'Unknown error'
          });
        }
      }
      
      setSyncResults(results);
      setSyncStatus({
        type: results.successful > 0 ? 'success' : 'error',
        message: `Synced ${results.successful} out of ${results.total} orders`
      });
      
      fetchOrders();
    } catch (err) {
      console.error('Error batch syncing orders:', err);
      setSyncStatus({
        type: 'error',
        message: `Batch sync failed: ${err.message}`
      });
    } finally {
      setBatchSyncing(false);
    }
  };
  
  // NEW: Handle FG item selection for analytics tab
  const handleSelectFGItem = (itemKey) => {
    const selectedIndex = selectedFGItems.indexOf(itemKey);
    let newSelected = [];
    
    if (selectedIndex === -1) {
      newSelected = [...selectedFGItems, itemKey];
    } else {
      newSelected = selectedFGItems.filter(key => key !== itemKey);
    }
    
    setSelectedFGItems(newSelected);
  };

  // NEW: Handle planning production from analytics tab
  const handlePlanProductionFromAnalytics = () => {
    if (selectedFGItems.length === 0) {
      setSyncStatus({
        type: 'warning',
        message: 'Please select at least one finished good item to plan production'
      });
      return;
    }
    
    // Navigate to production planning with selected FG items
    const itemParams = selectedFGItems.join(',');
    navigate(`/production/planning?fg_items=${itemParams}&source=analytics`);
  };
    


  // Handle page change
  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };
  
  // Handle rows per page change
  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };
  
  // Get current page orders
  const currentOrders = filteredOrders.slice(
    page * rowsPerPage,
    page * rowsPerPage + rowsPerPage
  );
  
  // Get status chip color
  const getStatusColor = (status) => {
    if (!status) return 'default';
    
    switch (status.toLowerCase()) {
      case 'completed':
        return 'success';
      case 'pending':
        return 'warning';
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
  
  // Format date
  const formatDate = (dateString) => {
    if (!dateString) return '-';
    
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  };
  
  // Toggle expanded row
  const toggleExpandedRow = (itemCode) => {
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(itemCode)) {
      newExpanded.delete(itemCode);
    } else {
      newExpanded.add(itemCode);
    }
    setExpandedRows(newExpanded);
  };
  
  // Print Production & Delivery Sheet
  const printProductionSheet = () => {
    // Create print content
    const printWindow = window.open('', '_blank');
    
    // Generate HTML for print
    const printHTML = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Production & Delivery Sheet - ${new Date().toLocaleDateString()}</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: Arial, sans-serif; padding: 20px; color: #000; }
          @media print { 
            body { padding: 0; margin: 0; }
            .page-break { page-break-after: always; }
          }
          .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #000; padding-bottom: 20px; }
          .company-name { font-size: 24px; font-weight: bold; margin-bottom: 5px; }
          .company-info { font-size: 12px; color: #333; }
          .sheet-title { font-size: 20px; font-weight: bold; margin: 20px 0; text-align: center; }
          .date-info { text-align: center; margin-bottom: 20px; font-size: 14px; }
          .summary-box { background: #f5f5f5; padding: 15px; margin-bottom: 30px; border: 1px solid #ddd; }
          .summary-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 20px; }
          .summary-item { text-align: center; }
          .summary-label { font-size: 12px; color: #666; }
          .summary-value { font-size: 24px; font-weight: bold; }
          .section { margin-bottom: 40px; }
          .section-header { background: #333; color: white; padding: 10px 15px; font-size: 16px; font-weight: bold; }
          .item-table { width: 100%; border-collapse: collapse; margin-bottom: 30px; }
          .item-header { background: #f0f0f0; border: 1px solid #ddd; }
          .item-header td { padding: 10px; font-weight: bold; }
          .item-code { display: inline-block; background: #e0e0e0; padding: 3px 8px; border-radius: 3px; font-size: 12px; margin-right: 10px; }
          .customer-row { border: 1px solid #ddd; border-top: none; }
          .customer-row td { padding: 8px 10px; font-size: 14px; }
          .customer-row:nth-child(even) { background: #fafafa; }
          .checkbox { width: 20px; height: 20px; border: 2px solid #333; display: inline-block; vertical-align: middle; margin-right: 5px; }
          .qty-cell { text-align: center; font-weight: bold; font-size: 16px; }
          .notes-section { margin-top: 40px; padding: 20px; border: 1px solid #ddd; }
          .signature-section { display: grid; grid-template-columns: repeat(3, 1fr); gap: 30px; margin-top: 50px; }
          .signature-box { text-align: center; }
          .signature-line { border-bottom: 1px solid #333; height: 40px; margin-bottom: 5px; }
          .signature-label { font-size: 12px; color: #666; }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="company-name">CLOUD CAKE & FOODS</div>
          <div class="company-info">Ramzannesa Market (Lot 03), Mirpur-12, Dhaka-1216 • Phone: +880 1711-080236</div>
        </div>
        
        <div class="sheet-title">PRODUCTION & DELIVERY SHEET</div>
        <div class="date-info">Date: ${new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })} • Generated at: ${new Date().toLocaleTimeString()}</div>
        
         
        
        ${['finished_good', 'accessory'].map(type => {
          const items = analytics.itemBreakdown.filter(item => 
            (type === 'finished_good' && (item.type === 'finished_good' || item.code?.toLowerCase().startsWith('fg'))) ||
            (type === 'accessory' && (item.type === 'accessory' || item.code?.toLowerCase().startsWith('acs')))
          );
          
          if (items.length === 0) return '';
          
          return `
            <div class="section">
              <div class="section-header">${type === 'finished_good' ? 'FINISHED GOODS' : 'ACCESSORIES'}</div>
              <table class="item-table">
                ${items.map((item, index) => `
                  <tr class="item-header">
                    <td colspan="3">
                      <span class="item-code">${item.code || ''}</span>
                      <strong>${item.name}</strong>
                    </td>
                    <td style="text-align: center; width: 100px;">
                      <strong>Total: ${item.quantity}</strong>
                    </td>
                    <td style="width: 100px; text-align: center;">
                      <span class="checkbox"></span> ${type === 'finished_good' ? 'Produced' : 'Packed'}
                    </td>
                  </tr>
                  ${item.customers?.map((customer, idx) => `
                    <tr class="customer-row">
                      <td style="width: 30px;">${idx + 1}.</td>
                      <td style="width: 200px;">
                        ${customer.customer_name}
                        <span style="background: #fffbeb; padding: 2px 8px; border-radius: 3px; font-size: 12px; margin-left: 10px;">Order #${customer.order_id}</span>
                      </td>
                      <td style="width: 120px;white-space: nowrap;">Contact: 01XXX-XXXXX</td>
                      <td class="qty-cell">${customer.quantity} ${customer.quantity > 1 ? 'pcs' : 'pc'}</td>
                      <td style="text-align: center;">
                        <span class="checkbox"></span> Delivered
                      </td>
                    </tr>
                  `).join('') || ''}
                `).join('')}
              </table>
            </div>
          `;
        }).join('')}
        
        <div class="notes-section">
          <div style="font-weight: bold; margin-bottom: 10px;">Production Notes:</div>
          <div style="border-bottom: 1px solid #ddd; height: 25px; margin-bottom: 10px;"></div>
          <div style="border-bottom: 1px solid #ddd; height: 25px; margin-bottom: 10px;"></div>
          <div style="border-bottom: 1px solid #ddd; height: 25px;"></div>
        </div>
        
        <div class="signature-section">
          <div class="signature-box">
            <div class="signature-line"></div>
            <div class="signature-label">Production Manager</div>
          </div>
          <div class="signature-box">
            <div class="signature-line"></div>
            <div class="signature-label">Quality Check</div>
          </div>
          <div class="signature-box">
            <div class="signature-line"></div>
            <div class="signature-label">Delivery In-charge</div>
          </div>
        </div>
      </body>
      </html>
    `;
    
    // Write content and print
    printWindow.document.write(printHTML);
    printWindow.document.close();
    printWindow.onload = () => {
      printWindow.print();
      printWindow.close();
    };
  };
  
  return (
    <LocalizationProvider dateAdapter={AdapterDateFns}>
      <Box sx={{ width: '100%' }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Typography variant="h4" component="h1">
            Sales Dashboard
          </Typography>
          <Box>
            <Button 
              variant="outlined" 
              startIcon={<RefreshIcon />}
              onClick={fetchOrders}
              sx={{ mr: 1 }}
              disabled={loading}
            >
              Refresh
            </Button>
            <Button 
              variant="contained" 
              startIcon={<AddIcon />}
              onClick={() => navigate('/orders/new')}
              color="primary"
            >
              New Order
            </Button>
          </Box>
        </Box>
        
        {/* Status Message */}
        {syncStatus && (
          <Alert 
            severity={syncStatus.type} 
            sx={{ mb: 3 }}
            onClose={() => setSyncStatus(null)}
          >
            {syncStatus.message}
          </Alert>
        )}
        
        {/* Success Message for Copy */}
        {success && (
          <Alert 
            severity="success" 
            sx={{ mb: 3 }}
            onClose={() => setSuccess(null)}
          >
            {success}
          </Alert>
        )}
        
        {/* Sync Results */}
        {syncResults && syncResults.results && syncResults.results.length > 0 && (
          <Paper sx={{ mb: 3, p: 2 }}>
            <Typography variant="h6" gutterBottom>
              Sync Results
            </Typography>
            <Box sx={{ maxHeight: '200px', overflow: 'auto' }}>
              {syncResults.results.map((result, index) => (
                <Alert 
                  key={index} 
                  severity={result.success ? 'success' : 'error'}
                  sx={{ mb: 1 }}
                >
                  {result.message}
                </Alert>
              ))}
            </Box>
            <Box sx={{ mt: 2 }}>
              <Button 
                variant="text" 
                onClick={() => setSyncResults(null)}
              >
                Dismiss
              </Button>
            </Box>
          </Paper>
        )}
        
        {/* Tabs */}
        <Paper sx={{ mb: 3 }}>
          <Tabs 
            value={activeTab} 
            onChange={handleTabChange}
            variant="fullWidth"
            aria-label="sales dashboard tabs"
          >
            <Tab 
              icon={<AnalyticsIcon />} 
              label="Today's Analytics" 
              id="tab-0" 
            />
            <Tab 
              icon={<ReceiptIcon />} 
              label="Orders List" 
              id="tab-1" 
            />
          </Tabs>
        </Paper>
        
        {/* Tab Panel 0: Analytics Dashboard */}
        <TabPanel value={activeTab} index={0}>
          {/* Date Range Selector */}
          <Paper sx={{ p: 2, mb: 3 }}>
            <Grid container spacing={2} alignItems="center">
              <Grid item xs={12} md={4}>
                <Typography variant="h6" gutterBottom>
                  <DateRangeIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
                  Date Range
                </Typography>
                <Stack direction="row" spacing={1} flexWrap="wrap">
                  {['today', 'yesterday', 'week', 'month', 'custom'].map((range) => (
                    <Chip
                      key={range}
                      label={range.charAt(0).toUpperCase() + range.slice(1)}
                      onClick={() => handleDateRangeChange(range)}
                      color={dateRange === range ? 'primary' : 'default'}
                      variant={dateRange === range ? 'filled' : 'outlined'}
                    />
                  ))}
                </Stack>
              </Grid>
              
              {dateRange === 'custom' && (
                <>
                  <Grid item xs={12} md={3}>
                    <DatePicker
                      label="Start Date"
                      value={startDate}
                      onChange={(newValue) => setStartDate(newValue)}
                      renderInput={(params) => <TextField {...params} />}
                    />
                  </Grid>
                  <Grid item xs={12} md={3}>
                    <DatePicker
                      label="End Date"
                      value={endDate}
                      onChange={(newValue) => setEndDate(newValue)}
                      renderInput={(params) => <TextField {...params} />}
                    />
                  </Grid>
                </>
              )}
            </Grid>
          </Paper>
          
          {/* Analytics Cards */}
          <Grid container spacing={3} sx={{ mb: 3 }}>
            <Grid item xs={12} sm={6} md={3}>
              <Card sx={{ height: '100%' }}>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                    <Avatar sx={{ bgcolor: 'primary.main', mr: 2 }}>
                      <ShoppingCartIcon />
                    </Avatar>
                    <Typography variant="h6" color="text.secondary">
                      Today's Sales Orders
                    </Typography>
                  </Box>
                  <Typography variant="h3" color="primary">
                    {analytics.todayOrders}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {dateRange === 'today' ? 'Today' : 'Selected Period'}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            
            <Grid item xs={12} sm={6} md={3}>
              <Card sx={{ height: '100%' }}>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                    <Avatar sx={{ bgcolor: 'success.main', mr: 2 }}>
                      <AttachMoneyIcon />
                    </Avatar>
                    <Typography variant="h6" color="text.secondary">
                      Total Revenue
                    </Typography>
                  </Box>
                  <Typography variant="h3" color="success.main">
                    {formatCurrency(analytics.todayRevenue, 'en-US', 'BDT')}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {dateRange === 'today' ? 'Today' : 'Selected Period'}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            
            <Grid item xs={12} sm={6} md={3}>
              <Card sx={{ height: '100%' }}>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                    <Avatar sx={{ bgcolor: 'info.main', mr: 2 }}>
                      <PieChartIcon />
                    </Avatar>
                    <Typography variant="h6" color="text.secondary">
                      Top FG Item
                    </Typography>
                  </Box>
                  {analytics.topFGItem ? (
                    <>
                      <Typography variant="h4" color="info.main">
                        {analytics.topFGItem.quantity}
                      </Typography>
                      <Typography variant="body2" color="text.secondary" noWrap>
                        {analytics.topFGItem.name}
                      </Typography>
                    </>
                  ) : (
                    <Typography variant="body1" color="text.secondary">
                      No FG items sold
                    </Typography>
                  )}
                </CardContent>
              </Card>
            </Grid>
            
            <Grid item xs={12} sm={6} md={3}>
              <Card sx={{ height: '100%' }}>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                    <Avatar sx={{ bgcolor: 'warning.main', mr: 2 }}>
                      <TrendingUpIcon />
                    </Avatar>
                    <Typography variant="h6" color="text.secondary">
                      Top ACS Item
                    </Typography>
                  </Box>
                  {analytics.topACSItem ? (
                    <>
                      <Typography variant="h4" color="warning.main">
                        {analytics.topACSItem.quantity}
                      </Typography>
                      <Typography variant="body2" color="text.secondary" noWrap>
                        {analytics.topACSItem.name}
                      </Typography>
                    </>
                  ) : (
                    <Typography variant="body1" color="text.secondary">
                      No ACS items sold
                    </Typography>
                  )}
                </CardContent>
              </Card>
            </Grid>
          </Grid>
          
          {/* Items Breakdown Table */}
          <Paper sx={{ mb: 3 }}>
            <Box sx={{ p: 3 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="h6" gutterBottom>
                <PieChartIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
                Item Performance Analysis
              </Typography>
              <Stack direction="row" spacing={2}>
                {selectedFGItems.length > 0 && (
                  <Button 
                    variant="contained" 
                    color="secondary"
                    startIcon={<AssignmentIcon />}
                    onClick={handlePlanProductionFromAnalytics}
                  >
                    Plan Production ({selectedFGItems.length})
                  </Button>
                )}
                <Button 
                  variant="contained" 
                  startIcon={<PrintIcon />}
                  onClick={printProductionSheet}
                  color="primary"
                >
                  Print Production Sheet
                </Button>
              </Stack>
            </Box>
              
              {/* Filters for Item Breakdown */}
              <Box sx={{ mb: 2, display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                <FormControl size="small" sx={{ minWidth: 120 }}>
                  <InputLabel>Item Type</InputLabel>
                  <Select
                    value={itemTypeFilter}
                    label="Item Type"
                    onChange={(e) => setItemTypeFilter(e.target.value)}
                  >
                    <MenuItem value="all">All Items</MenuItem>
                    <MenuItem value="finished_good">Finished Goods</MenuItem>
                    <MenuItem value="accessory">Accessories</MenuItem>
                  </Select>
                </FormControl>
              </Box>
              
              <TableContainer>
                <Table>
                <TableHead>
                  <TableRow>
                    <TableCell padding="checkbox">
                      <Checkbox
                        checked={selectedFGItems.length > 0 && 
                                analytics.itemBreakdown
                                  .filter(item => item.type === 'finished_good' || 
                                                (item.code && item.code.toLowerCase().startsWith('fg')))
                                  .every(item => selectedFGItems.includes(`${item.code}-${item.name}`))}
                        onChange={(e) => {
                          const fgItems = analytics.itemBreakdown.filter(item => 
                            item.type === 'finished_good' || 
                            (item.code && item.code.toLowerCase().startsWith('fg'))
                          );
                          if (e.target.checked) {
                            setSelectedFGItems(fgItems.map(item => `${item.code}-${item.name}`));
                          } else {
                            setSelectedFGItems([]);
                          }
                        }}
                      />
                    </TableCell>
                    <TableCell>Item Code</TableCell>
                    <TableCell>Item Name</TableCell>
                    <TableCell>Type</TableCell>
                    <TableCell align="right">Quantity</TableCell>
                    <TableCell align="right">Unit Price</TableCell>
                    <TableCell align="right">Total Revenue</TableCell>
                    <TableCell align="center">Production Status</TableCell>
                  </TableRow>
                </TableHead>
                  <TableBody>
                    {analytics.itemBreakdown.length > 0 ? (
                      analytics.itemBreakdown
                        .filter(item => {
                          if (itemTypeFilter === 'all') return true;
                          if (itemTypeFilter === 'finished_good') {
                            return item.type === 'finished_good' || (item.code && item.code.toLowerCase().startsWith('fg'));
                          }
                          if (itemTypeFilter === 'accessory') {
                            return item.type === 'accessory' || (item.code && item.code.toLowerCase().startsWith('acs'));
                          }
                          return true;
                        })
                        .map((item, index) => (
                          <React.Fragment key={`${item.code}-${index}`}>
                            <TableRow 
                              sx={{ 
                                cursor: 'pointer', 
                                '&:hover': { bgcolor: 'action.hover' },
                                bgcolor: expandedRows.has(item.code) ? 'action.selected' : 'inherit'
                              }}
                              onClick={() => toggleExpandedRow(item.code)}
                            >
                              {/* NEW: Checkbox Column (First) */}
                              <TableCell padding="checkbox" onClick={(e) => e.stopPropagation()}>
                                <Checkbox
                                  checked={selectedFGItems.includes(`${item.code}-${item.name}`)}
                                  onChange={() => handleSelectFGItem(`${item.code}-${item.name}`)}
                                  disabled={!(item.type === 'finished_good' || 
                                              (item.code && item.code.toLowerCase().startsWith('fg')))}
                                />
                              </TableCell>
                              
                              {/* Existing Columns */}
                              <TableCell>
                                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                  <IconButton size="small" sx={{ mr: 1 }}>
                                    {expandedRows.has(item.code) ? <KeyboardArrowDownIcon /> : <KeyboardArrowRightIcon />}
                                  </IconButton>
                                  <Chip 
                                    label={item.code} 
                                    size="small" 
                                    color="primary" 
                                    variant="outlined"
                                  />
                                </Box>
                              </TableCell>
                              <TableCell>
                                <Typography variant="body2" fontWeight="medium">
                                  {item.name}
                                </Typography>
                              </TableCell>
                              <TableCell>
                                <Chip 
                                  label={
                                    item.type === 'finished_good' || (item.code && item.code.toLowerCase().startsWith('fg'))
                                      ? 'Finished Good' 
                                      : 'Accessory'
                                  } 
                                  color={
                                    item.type === 'finished_good' || (item.code && item.code.toLowerCase().startsWith('fg'))
                                      ? 'primary' 
                                      : 'secondary'
                                  }
                                  size="small"
                                />
                              </TableCell>
                              <TableCell align="right">
                                <Typography variant="h6" color="primary">
                                  {item.quantity}
                                </Typography>
                              </TableCell>
                              <TableCell align="right">
                                {formatCurrency(item.unit_price, 'en-US', 'BDT')}
                              </TableCell>
                              <TableCell align="right">
                                <Typography variant="body1" fontWeight="medium" color="success.main">
                                  {formatCurrency(item.revenue, 'en-US', 'BDT')}
                                </Typography>
                              </TableCell>
                              
                              {/* NEW: Production Status Column (Last) */}
                              <TableCell align="center" onClick={(e) => e.stopPropagation()}>
                                <Chip
                                  label="Not Planned"
                                  color="default"
                                  size="small"
                                  variant="outlined"
                                />
                              </TableCell>
                            </TableRow>
                            
                            {/* Customer Details - Expandable Section */}
                            {expandedRows.has(item.code) && item.customers && (
                              <TableRow>
                                <TableCell colSpan={8} sx={{ py: 0 }}>
                                  <Box sx={{ p: 3, bgcolor: 'grey.50' }}>
                                    <Grid container spacing={2}>
                                      {item.customers.map((customer, idx) => (
                                        <Grid item xs={12} key={`${customer.order_id}-${idx}`}>
                                          <Card sx={{ p: 2, border: '1px solid', borderColor: 'divider' }}>
                                            <Grid container alignItems="center" spacing={2}>
                                              <Grid item>
                                                <Avatar sx={{ bgcolor: 'primary.main', width: 40, height: 40 }}>
                                                  {customer.customer_name?.charAt(0).toUpperCase()}
                                                </Avatar>
                                              </Grid>
                                              <Grid item xs>
                                                <Typography variant="body1" fontWeight="medium">
                                                  {customer.customer_name}
                                                </Typography>
                                                <Typography variant="caption" color="text.secondary">
                                                  Order #{customer.order_id} • {formatDate(customer.order_time)}
                                                </Typography>
                                              </Grid>
                                              <Grid item>
                                                <Chip 
                                                  label={customer.sync_status}
                                                  size="small"
                                                  color={customer.sync_status === 'synced' ? 'success' : 'warning'}
                                                  variant="outlined"
                                                />
                                              </Grid>
                                              <Grid item>
                                                <Box textAlign="center">
                                                  <Typography variant="h5" fontWeight="bold">
                                                    {customer.quantity}
                                                  </Typography>
                                                  <Typography variant="caption" color="text.secondary">
                                                    {customer.quantity > 1 ? 'pieces' : 'piece'}
                                                  </Typography>
                                                </Box>
                                              </Grid>
                                            </Grid>
                                          </Card>
                                        </Grid>
                                      ))}
                                    </Grid>
                                    
                                    {/* Summary Bar */}
                                    <Box sx={{ 
                                      mt: 2, 
                                      p: 2, 
                                      bgcolor: 'background.paper', 
                                      borderRadius: 1,
                                      display: 'flex',
                                      justifyContent: 'space-between',
                                      alignItems: 'center'
                                    }}>
                                      <Box sx={{ display: 'flex', gap: 3 }}>
                                        <Typography variant="body2">
                                          <strong>Total Customers:</strong> {item.customers.length}
                                        </Typography>
                                        <Typography variant="body2">
                                          <strong>Largest Order:</strong> {Math.max(...item.customers.map(c => c.quantity))} pieces
                                        </Typography>
                                        <Typography variant="body2">
                                          <strong>Orders Synced:</strong> {item.customers.filter(c => c.sync_status === 'synced').length} of {item.customers.length}
                                        </Typography>
                                      </Box>
                                      <Button
                                        size="small"
                                        variant="outlined"
                                        startIcon={<ContentCopyIcon />}
                                        onClick={() => {
                                          const customerList = item.customers.map(c => `${c.customer_name}: ${c.quantity}`).join('\n');
                                          navigator.clipboard.writeText(customerList);
                                          setSuccess('Customer list copied to clipboard!');
                                        }}
                                      >
                                        Copy List
                                      </Button>
                                    </Box>
                                  </Box>
                                </TableCell>
                              </TableRow>
                            )}
                          </React.Fragment>
                        ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={8} align="center">
                          <Typography variant="body1" color="text.secondary">
                            No items found for the selected period
                          </Typography>
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            </Box>
          </Paper>
        </TabPanel>
        
        {/* Tab Panel 1: Orders List */}
        <TabPanel value={activeTab} index={1}>
          {/* Search and Actions */}
          <Paper sx={{ p: 2, mb: 3 }}>
            <Grid container spacing={2} alignItems="center">
              <Grid item xs={12} md={4}>
                <TextField
                  fullWidth
                  placeholder="Search orders by customer name, order ID..."
                  value={searchTerm}
                  onChange={handleSearchChange}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <SearchIcon />
                      </InputAdornment>
                    ),
                  }}
                />
              </Grid>
              
              <Grid item xs={12} md={3}>
                <FormControl fullWidth>
                  <InputLabel>Customer</InputLabel>
                  <Select
                    value={customerFilter}
                    label="Customer"
                    onChange={(e) => setCustomerFilter(e.target.value)}
                  >
                    <MenuItem value="all">All Customers</MenuItem>
                    {uniqueCustomers.map(customer => (
                      <MenuItem key={customer} value={customer}>
                        {customer}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              
              <Grid item xs={12} md={5} sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1 }}>
                {selectedOrders.length > 0 && (
                  <>
                    <Typography variant="body2" sx={{ alignSelf: 'center' }}>
                      {selectedOrders.length} orders selected
                    </Typography>
                    <Button 
                      variant="outlined" 
                      color="error"
                      startIcon={<DeleteIcon />}
                      onClick={handleOpenDeleteConfirm}
                      disabled={batchSyncing}
                    >
                      Delete
                    </Button>
                    <Button 
                      variant="contained" 
                      color="secondary"
                      startIcon={<AssignmentIcon />}
                      onClick={handlePlanProduction}
                      disabled={batchSyncing}
                      sx={{ mr: 1 }}
                    >
                      Plan Production ({selectedOrders.length})
                    </Button>
                    <Button 
                      variant="contained" 
                      color="primary"
                      startIcon={<SyncIcon />}
                      onClick={handleOpenSyncConfirm}
                      disabled={batchSyncing}
                    >
                      {batchSyncing ? 'Syncing...' : 'Sync to Manager.io'}
                    </Button>
                  </>
                )}
              </Grid>
            </Grid>
          </Paper>
          
          {/* Orders Table */}
          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
              <CircularProgress />
            </Box>
          ) : (
            <Paper>
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell padding="checkbox">
                        <Checkbox
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedOrders(currentOrders.map(o => o.id));
                            } else {
                              setSelectedOrders([]);
                            }
                          }}
                          checked={currentOrders.length > 0 && selectedOrders.length === currentOrders.length}
                          indeterminate={selectedOrders.length > 0 && selectedOrders.length < currentOrders.length}
                        />
                      </TableCell>
                      <TableCell>Order ID</TableCell>
                      <TableCell>Customer</TableCell>
                      <TableCell>Date</TableCell>
                      <TableCell align="right">Items</TableCell>
                      <TableCell align="right">Total Amount</TableCell>
                      <TableCell align="center">Status</TableCell>
                      <TableCell align="center">Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {currentOrders.length > 0 ? (
                      currentOrders.map(order => (
                        <TableRow key={order.id}>
                          <TableCell padding="checkbox">
                            <Checkbox
                              checked={selectedOrders.indexOf(order.id) !== -1}
                              onChange={() => handleSelectOrder(order.id)}
                            />
                          </TableCell>
                          <TableCell>
                            <Box sx={{ display: 'flex', alignItems: 'center' }}>
                              <ReceiptIcon sx={{ mr: 1, color: 'text.secondary' }} />
                              <Box>
                                <Typography variant="body2" sx={{ fontWeight: 500 }}>
                                  {order.manager_order_id ? `Order #${order.id} (${order.manager_order_id})` : `Order #${order.id}`}
                                </Typography>
                                {order.manager_order_id && (
                                  <Typography variant="caption" color="text.secondary">
                                    Manager ID: {order.manager_order_id}
                                  </Typography>
                                )}
                              </Box>
                            </Box>
                          </TableCell>
                          <TableCell>{order.customer_name}</TableCell>
                          <TableCell>{formatDate(order.created_at || order.order_date)}</TableCell>
                          <TableCell align="right">
                            {order.items && Array.isArray(order.items) ? order.items.length : 0}
                          </TableCell>
                          <TableCell align="right">
                            {formatCurrency(order.total_amount || 0, 'en-US', 'BDT')}
                          </TableCell>
                          <TableCell align="center">
                            <Box>
                              <Chip 
                                label={order.status || 'Unknown'} 
                                color={getStatusColor(order.status || '')}
                                size="small"
                                sx={{ mb: 1 }}
                              />
                              {order.sync_status && (
                                <Chip 
                                  label={`Sync: ${order.sync_status.replace('_', ' ')}`}
                                  color={getStatusColor(order.sync_status)}
                                  size="small"
                                  variant="outlined"
                                />
                              )}
                            </Box>
                          </TableCell>
                          <TableCell align="center">
                            <IconButton
                              color="primary"
                              onClick={() => navigate(`/orders/${order.id}`)}
                              title="View order details"
                            >
                              <ArrowForwardIcon />
                            </IconButton>
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={8} align="center">
                          {orders.length === 0 ? (
                            <Box sx={{ py: 3 }}>
                              <Typography variant="body1" color="text.secondary" gutterBottom>
                                No orders found
                              </Typography>
                              <Button
                                variant="contained"
                                startIcon={<AddIcon />}
                                onClick={() => navigate('/orders/new')}
                                sx={{ mt: 2 }}
                              >
                                Create First Order
                              </Button>
                            </Box>
                          ) : (
                            <Typography variant="body1" color="text.secondary">
                              No orders match your search criteria
                            </Typography>
                          )}
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
              
              {filteredOrders.length > 0 && (
                <TablePagination
                  rowsPerPageOptions={[5, 10, 25, 50]}
                  component="div"
                  count={filteredOrders.length}
                  rowsPerPage={rowsPerPage}
                  page={page}
                  onPageChange={handleChangePage}
                  onRowsPerPageChange={handleChangeRowsPerPage}
                />
              )}
            </Paper>
          )}
        </TabPanel>
        
        {/* Sync Confirmation Dialog */}
        <Dialog
          open={confirmDialogOpen}
          onClose={handleCancelSync}
        >
          <DialogTitle>Sync Orders to Manager.io</DialogTitle>
          <DialogContent>
            <DialogContentText>
              Are you sure you want to sync {selectedOrders.length} orders to Manager.io? This action will create sales orders in Manager.io.
            </DialogContentText>
          </DialogContent>
          <DialogActions>
            <Button onClick={handleCancelSync}>Cancel</Button>
            <Button onClick={handleBatchSync} variant="contained" color="primary" autoFocus>
              Sync Orders
            </Button>
          </DialogActions>
        </Dialog>
        
        {/* Delete Confirmation Dialog */}
        <Dialog
          open={deleteDialogOpen}
          onClose={handleCancelDelete}
        >
          <DialogTitle>Delete Orders</DialogTitle>
          <DialogContent>
            <DialogContentText>
              Are you sure you want to delete {selectedOrders.length} orders? This action cannot be undone.
            </DialogContentText>
          </DialogContent>
          <DialogActions>
            <Button onClick={handleCancelDelete}>Cancel</Button>
            <Button onClick={handleBatchDelete} variant="contained" color="error" autoFocus>
              Delete Orders
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    </LocalizationProvider>
  );
};

export default OrderList;