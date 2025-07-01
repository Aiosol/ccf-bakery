// frontend/src/pages/Inventory.jsx - FINAL FIXES for undefined and count issues

import { getInventoryService } from '../services/serviceFactory';

import React, { useState, useEffect } from 'react';
import { 
  Box, 
  Typography, 
  Paper, 
  Table, 
  TableBody, 
  TableCell, 
  TableContainer, 
  TableHead, 
  TableRow,
  Button,
  CircularProgress,
  Alert,
  TextField,
  InputAdornment,
  Chip,
  IconButton,
  Tabs,
  Tab,
  TablePagination
} from '@mui/material';
import { 
  Refresh as RefreshIcon,
  Search as SearchIcon,
  FilterList as FilterIcon,
  Warning as WarningIcon,
  CheckCircle as CheckCircleIcon,
  BugReport as BugReportIcon,
  Sync as SyncIcon
} from '@mui/icons-material';
import { formatCurrency, formatQuantity } from '../utils/formatters';

const inventoryService = getInventoryService();

// Tab panel component
function TabPanel(props) {
  const { children, value, index, ...other } = props;
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`inventory-tabpanel-${index}`}
      aria-labelledby={`inventory-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ pt: 3 }}>{children}</Box>}
    </div>
  );
}

const Inventory = () => {
  const [inventoryItems, setInventoryItems] = useState([]);
  const [filteredItems, setFilteredItems] = useState([]);
  const [rawMaterials, setRawMaterials] = useState([]);
  const [finishedGoods, setFinishedGoods] = useState([]);
  const [accessories, setAccessories] = useState([]);
  const [filteredRawMaterials, setFilteredRawMaterials] = useState([]);
  const [filteredFinishedGoods, setFilteredFinishedGoods] = useState([]);
  const [filteredAccessories, setFilteredAccessories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState(null);
  const [tabValue, setTabValue] = useState(0);
  const [debugInfo, setDebugInfo] = useState(null);
  
  // Pagination states
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  // FIXED: Enhanced direct sync with cleanup
  const directSync = async () => {
    try {
      setSyncing(true);
      setSyncResult({
        status: 'info',
        message: '🔄 Running enhanced inventory sync...'
      });
      
      const response = await fetch('http://127.0.0.1:8000/api/direct-inventory-sync/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      
      const data = await response.json();
      console.log('🔄 Direct sync result:', data);
      
      setSyncResult({
        status: data.status || 'info',
        message: data.message || 'Direct sync completed.',
        details: data.details
      });
      
      // Small delay to let the sync complete
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Refresh the UI to show new items
      await fetchInventoryItems();
      
    } catch (err) {
      console.error('❌ Error during direct sync:', err);
      setSyncResult({
        status: 'error',
        message: `Direct sync failed: ${err.message}`
      });
    } finally {
      setSyncing(false);
    }
  };

  // FIXED: Enhanced fetchInventoryItems with data cleaning
  const fetchInventoryItems = async () => {
    setLoading(true);
    setError(null);
    
    try {
      console.log("📦 Starting inventory fetch...");
      
      // Fetch items using the service
      const data = await inventoryService.fetchInventoryItems();
      
      console.log(`✅ Received ${data.length} inventory items`);
      
      // FIXED: Clean and validate data to remove duplicates and fix undefined values
      const cleanedData = data
        .filter((item, index, self) => {
          // Remove duplicates based on manager_item_id or code
          const uniqueField = item.manager_item_id || item.ItemCode || item.code;
          if (!uniqueField) return false;
          
          const firstIndex = self.findIndex(i => 
            (i.manager_item_id || i.ItemCode || i.code) === uniqueField
          );
          return index === firstIndex;
        })
        .map(item => {
          // FIXED: Clean up undefined values and ensure proper data types
          const cleanedItem = {
            ...item,
            // Fix quantity field - remove "undefined" text
            quantity_available: getValidNumber(item.quantity_available || item.qtyOwned || item.qtyOnHand),
            qtyOwned: getValidNumber(item.quantity_available || item.qtyOwned || item.qtyOnHand),
            qtyOnHand: getValidNumber(item.quantity_available || item.qtyOwned || item.qtyOnHand),
            
            // Fix price fields
            sales_price: getValidNumber(item.sales_price || item.DefaultSalesUnitPrice),
            DefaultSalesUnitPrice: getValidNumber(item.sales_price || item.DefaultSalesUnitPrice),
            
            // Fix cost fields
            unit_cost: getValidNumber(item.unit_cost || (item.averageCost?.value)),
            
            // Ensure string fields don't have undefined
            ItemCode: cleanString(item.ItemCode || item.itemCode || item.code || item.manager_item_id),
            ItemName: cleanString(item.ItemName || item.itemName || item.name),
            UnitName: cleanString(item.UnitName || item.unitName || item.unit || 'piece'),
            
            // Fix average cost object
            averageCost: {
              value: getValidNumber(item.unit_cost || (item.averageCost?.value)),
              currency: 'BDT'
            },
            
            // Calculate total cost properly
            totalCost: {
              value: getValidNumber(item.unit_cost || (item.averageCost?.value)) * 
                     getValidNumber(item.quantity_available || item.qtyOwned || item.qtyOnHand),
              currency: 'BDT'
            }
          };
          
          return cleanedItem;
        });

      console.log(`🧹 Cleaned data: ${cleanedData.length} items (removed ${data.length - cleanedData.length} duplicates)`);
      
      // Enhanced data validation and logging
      let validItems = 0;
      let itemsWithQuantity = 0;
      let itemsWithPrice = 0;
      
      cleanedData.forEach((item, index) => {
        const hasCode = item.ItemCode && item.ItemCode !== 'undefined';
        const hasName = item.ItemName && item.ItemName !== 'undefined';
        const hasQuantity = !isNaN(item.quantity_available) && item.quantity_available >= 0;
        const hasPrice = !isNaN(item.sales_price) && item.sales_price >= 0;
        
        if (hasCode && hasName) validItems++;
        if (hasQuantity && item.quantity_available > 0) itemsWithQuantity++;
        if (hasPrice && item.sales_price > 0) itemsWithPrice++;
        
        // Log first few items for debugging
        if (index < 3) {
          console.log(`🔍 Item ${index + 1}:`, {
            code: item.ItemCode,
            name: item.ItemName,
            quantity: item.quantity_available,
            price: item.sales_price,
            uuid: item.manager_item_id
          });
        }
      });
      
      console.log(`📊 Data quality: ${validItems}/${cleanedData.length} valid, ${itemsWithQuantity} with quantity, ${itemsWithPrice} with price`);
      
      // Set debug info
      setDebugInfo({
        total: cleanedData.length,
        valid: validItems,
        withQuantity: itemsWithQuantity,
        withPrice: itemsWithPrice,
        rawReceived: data.length,
        duplicatesRemoved: data.length - cleanedData.length
      });
      
      // Set all items
      setInventoryItems(cleanedData);
      setFilteredItems(cleanedData);
      
      // FIXED: Enhanced categorization with better filtering
      const categorizeItems = (items, prefix) => {
        return items.filter(item => {
          const itemCode = item.ItemCode || item.itemCode || item.code || '';
          return itemCode.toLowerCase().startsWith(prefix.toLowerCase());
        });
      };
      
      const rawMats = categorizeItems(cleanedData, 'RM');
      const finishedGds = categorizeItems(cleanedData, 'FG');
      const accessoriesItems = categorizeItems(cleanedData, 'ACS');
      
      // Set categorized items
      setRawMaterials(rawMats);
      setFilteredRawMaterials(rawMats);
      
      setFinishedGoods(finishedGds);
      setFilteredFinishedGoods(finishedGds);
      
      setAccessories(accessoriesItems);
      setFilteredAccessories(accessoriesItems);
      
      console.log(`📂 Categorized: ${rawMats.length} raw materials, ${finishedGds.length} finished goods, ${accessoriesItems.length} accessories`);
      
      // Clear any previous errors
      setError(null);
      
    } catch (err) {
      console.error('❌ Error fetching inventory items:', err);
      const errorMessage = `Failed to fetch inventory: ${err.message || 'Unknown error'}`;
      setError(errorMessage);
      setSyncResult({
        status: 'error',
        message: errorMessage
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Helper function to get valid numbers (no undefined, no NaN)
  const getValidNumber = (value) => {
    if (value === null || value === undefined || value === 'undefined') {
      return 0;
    }
    const num = parseFloat(value);
    return isNaN(num) ? 0 : num;
  };

  // Helper function to clean string values
  const cleanString = (value) => {
    if (value === null || value === undefined || value === 'undefined') {
      return '';
    }
    return String(value).trim();
  };

  // FIXED: Enhanced refresh function
  const handleRefresh = async () => {
    setRefreshing(true);
    setSyncResult(null);
    setPage(0);
    
    try {
      console.log('🔄 Starting inventory refresh...');
      
      const syncResult = await inventoryService.syncInventory();
      console.log('📤 Sync result:', syncResult);
      
      // Small delay to let sync complete
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Then fetch the updated inventory
      await fetchInventoryItems();
      
      if (syncResult.status === 'success') {
        setSyncResult({
          status: 'success',
          message: `✅ ${syncResult.message}`,
          details: syncResult.details
        });
      } else {
        setSyncResult({
          status: 'warning',
          message: `⚠️ ${syncResult.message}`,
          details: syncResult.details
        });
      }
      
    } catch (err) {
      console.error('❌ Error during refresh:', err);
      setError('Failed to refresh inventory. Please check the server logs.');
      setSyncResult({
        status: 'error',
        message: `❌ Failed to refresh inventory: ${err.message || 'Unknown error'}`
      });
    } finally {
      setRefreshing(false);
    }
  };

  const handleSearch = (event) => {
    const value = event.target.value;
    setSearchTerm(value);
    setPage(0);
    
    if (value.trim() === '') {
      setFilteredItems(inventoryItems);
      setFilteredRawMaterials(rawMaterials);
      setFilteredFinishedGoods(finishedGoods);
      setFilteredAccessories(accessories);
    } else {
      const searchLower = value.toLowerCase();
      
      const searchInItem = (item) => {
        const searchFields = [
          item.ItemName, item.itemName, item.name,
          item.ItemCode, item.itemCode, item.code,
          item.description, item.manager_item_id
        ];
        
        return searchFields.some(field => 
          field && field.toString().toLowerCase().includes(searchLower)
        );
      };
      
      setFilteredItems(inventoryItems.filter(searchInItem));
      setFilteredRawMaterials(rawMaterials.filter(searchInItem));
      setFilteredFinishedGoods(finishedGoods.filter(searchInItem));
      setFilteredAccessories(accessories.filter(searchInItem));
    }
  };
  
  const handleChangeTab = (event, newValue) => {
    setTabValue(newValue);
    setPage(0);
  };
  
  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const isLowStock = (item) => {
    if (item.is_low_stock !== undefined) {
      return item.is_low_stock;
    }
    
    const quantity = getValidNumber(item.quantity_available || item.qtyOwned || item.qtyOnHand);
    const threshold = getValidNumber(item.threshold_quantity || 5);
    
    return quantity <= threshold;
  };

  const showDebugInfo = () => {
    if (inventoryItems.length > 0) {
      const firstItem = inventoryItems[0];
      const debugData = {
        'Total Items': inventoryItems.length,
        'Debug Info': debugInfo,
        'Sample Item': {
          ItemCode: firstItem.ItemCode,
          ItemName: firstItem.ItemName,
          quantity_available: firstItem.quantity_available,
          sales_price: firstItem.sales_price
        }
      };
      
      console.log('🐛 DEBUG INFO:', debugData);
      alert(`Debug Info (check console for full details):
        Total Items: ${debugData['Total Items']}
        Raw Received: ${debugInfo?.rawReceived || 'unknown'}
        Duplicates Removed: ${debugInfo?.duplicatesRemoved || 0}
        Valid Items: ${debugInfo?.valid || 'unknown'}
        Sample Quantity: ${debugData['Sample Item'].quantity_available}
        Sample Price: ${debugData['Sample Item'].sales_price}`);
    } else {
      alert('No items loaded yet');
    }
  };
  
  const getCurrentItems = () => {
    switch (tabValue) {
      case 0: return filteredItems;
      case 1: return filteredRawMaterials;
      case 2: return filteredFinishedGoods;
      case 3: return filteredAccessories;
      default: return filteredItems;
    }
  };
  
  const currentItems = getCurrentItems();
  const paginatedItems = currentItems.slice(
    page * rowsPerPage,
    page * rowsPerPage + rowsPerPage
  );

  useEffect(() => {
    fetchInventoryItems();
  }, []);

  return (
    <Box sx={{ width: '100%' }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" component="h1">
          Inventory Items
        </Typography>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button 
            variant="contained" 
            startIcon={<RefreshIcon />}
            onClick={handleRefresh} 
            disabled={loading || refreshing || syncing}
          >
            {refreshing ? 'Refreshing...' : 'Refresh Inventory'}
          </Button>
          <Button
            variant="contained"
            color="success"
            startIcon={<SyncIcon />}
            onClick={directSync}
            disabled={loading || refreshing || syncing}
          >
            {syncing ? 'Syncing...' : 'Direct Sync'}
          </Button>
          <Button
            variant="outlined"
            color="info"
            startIcon={<BugReportIcon />}
            onClick={showDebugInfo}
          >
            Debug Info
          </Button>
        </Box>
      </Box>

      {/* Debug Info Display */}
      {debugInfo && (
        <Alert severity="info" sx={{ mb: 2 }}>
          <Typography variant="body2">
            📊 Data Status: {debugInfo.total} total items 
            {debugInfo.duplicatesRemoved > 0 && ` (removed ${debugInfo.duplicatesRemoved} duplicates)`}, 
            {debugInfo.withQuantity} with stock, {debugInfo.withPrice} with prices
          </Typography>
        </Alert>
      )}

      {/* Sync Result Alert */}
      {syncResult && (
        <Alert 
          severity={syncResult.status === 'success' ? 'success' : syncResult.status === 'error' ? 'error' : 'info'} 
          sx={{ mb: 3 }}
          onClose={() => setSyncResult(null)}
        >
          <Typography variant="body2">{syncResult.message}</Typography>
        </Alert>
      )}

      {/* Search Bar */}
      <Box sx={{ mb: 3, display: 'flex', alignItems: 'center' }}>
        <TextField
          label="Search Inventory"
          variant="outlined"
          value={searchTerm}
          onChange={handleSearch}
          fullWidth
          sx={{ mr: 2 }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon />
              </InputAdornment>
            ),
          }}
        />
        <IconButton color="primary" aria-label="filter inventory">
          <FilterIcon />
        </IconButton>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}
      
      {/* Tabs */}
      <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
        <Tabs value={tabValue} onChange={handleChangeTab} aria-label="inventory tabs">
          <Tab label={`ALL (${filteredItems.length})`} />
          <Tab label={`RAW MATERIALS (${filteredRawMaterials.length})`} />
          <Tab label={`FINISHED GOODS (${filteredFinishedGoods.length})`} />
          <Tab label={`ACCESSORIES (${filteredAccessories.length})`} />
        </Tabs>
      </Box>

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
          <CircularProgress />
        </Box>
      ) : (
        <>
          <TabPanel value={tabValue} index={0}>
            <InventoryTable 
              items={paginatedItems} 
              isEmpty={filteredItems.length === 0}
              searchTerm={searchTerm}
              isLowStock={isLowStock}
              getValidNumber={getValidNumber}
            />
            <TablePagination
              rowsPerPageOptions={[5, 10, 25, 50, 100]}
              component="div"
              count={filteredItems.length}
              rowsPerPage={rowsPerPage}
              page={page}
              onPageChange={handleChangePage}
              onRowsPerPageChange={handleChangeRowsPerPage}
            />
          </TabPanel>
          
          <TabPanel value={tabValue} index={1}>
            <InventoryTable 
              items={paginatedItems} 
              isEmpty={filteredRawMaterials.length === 0}
              searchTerm={searchTerm}
              isLowStock={isLowStock}
              getValidNumber={getValidNumber}
            />
            <TablePagination
              rowsPerPageOptions={[5, 10, 25, 50, 100]}
              component="div"
              count={filteredRawMaterials.length}
              rowsPerPage={rowsPerPage}
              page={page}
              onPageChange={handleChangePage}
              onRowsPerPageChange={handleChangeRowsPerPage}
            />
          </TabPanel>
          
          <TabPanel value={tabValue} index={2}>
            <InventoryTable 
              items={paginatedItems} 
              isEmpty={filteredFinishedGoods.length === 0}
              searchTerm={searchTerm}
              isLowStock={isLowStock}
              getValidNumber={getValidNumber}
            />
            <TablePagination
              rowsPerPageOptions={[5, 10, 25, 50, 100]}
              component="div"
              count={filteredFinishedGoods.length}
              rowsPerPage={rowsPerPage}
              page={page}
              onPageChange={handleChangePage}
              onRowsPerPageChange={handleChangeRowsPerPage}
            />
          </TabPanel>

          <TabPanel value={tabValue} index={3}>
            <InventoryTable 
              items={paginatedItems} 
              isEmpty={filteredAccessories.length === 0}
              searchTerm={searchTerm}
              isLowStock={isLowStock}
              getValidNumber={getValidNumber}
            />
            <TablePagination
              rowsPerPageOptions={[5, 10, 25, 50, 100]}
              component="div"
              count={filteredAccessories.length}
              rowsPerPage={rowsPerPage}
              page={page}
              onPageChange={handleChangePage}
              onRowsPerPageChange={handleChangeRowsPerPage}
            />
          </TabPanel>
        </>
      )}
    </Box>
  );
};

// FIXED: Enhanced Inventory Table component with proper number display
const InventoryTable = ({ items, isEmpty, searchTerm, isLowStock, getValidNumber }) => {
  return (
    <TableContainer component={Paper}>
      <Table>
        <TableHead>
          <TableRow>
            <TableCell>Item Code</TableCell>
            <TableCell>Item Name</TableCell>
            <TableCell>Unit Name</TableCell>
            <TableCell>Division</TableCell>
            <TableCell align="right">Qty on hand</TableCell>
            <TableCell align="right">Sales price</TableCell> 
            <TableCell align="right">Average cost</TableCell>
            <TableCell align="right">Total cost</TableCell>
            <TableCell align="center">Status</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {items && items.length > 0 ? (
            items.map((item, index) => {
              // FIXED: Use helper function to ensure clean number display
              const quantity = getValidNumber(item.quantity_available || item.qtyOwned || item.qtyOnHand);
              const salesPrice = getValidNumber(item.sales_price || item.DefaultSalesUnitPrice);
              const unitCost = getValidNumber(item.unit_cost || (item.averageCost?.value));
              const totalCost = unitCost * quantity;
              
              return (
                <TableRow key={item.id || item.manager_item_id || index}>
                  <TableCell>
                    {item.ItemCode || item.itemCode || item.code || 'N/A'}
                  </TableCell>
                  <TableCell>
                    {item.ItemName || item.itemName || item.name || 'N/A'}
                  </TableCell>
                  <TableCell>
                    {item.UnitName || item.unitName || item.unit || 'piece'}
                  </TableCell>
                  <TableCell>
                    {item.division_name || item.Division || 'Unknown'}
                  </TableCell>
                  <TableCell align="right">
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end' }}>
                      {/* FIXED: Display clean number without "undefined" text */}
                      {quantity.toLocaleString('en-US', { 
                        minimumFractionDigits: 0, 
                        maximumFractionDigits: 2 
                      })}
                      {quantity === 0 && (
                        <WarningIcon color="warning" sx={{ ml: 1, fontSize: 16 }} />
                      )}
                    </Box>
                  </TableCell>
                  <TableCell align="right">
                    {formatCurrency(salesPrice, 'en-US', 'BDT')}
                  </TableCell>
                  <TableCell align="right">
                    {formatCurrency(unitCost, 'en-US', 'BDT')}
                  </TableCell>
                  <TableCell align="right">
                    {formatCurrency(totalCost, 'en-US', 'BDT')}
                  </TableCell>
                  <TableCell align="center">
                    {isLowStock(item) ? (
                      <Chip 
                        icon={<WarningIcon />} 
                        label="Low Stock" 
                        color="warning" 
                        size="small" 
                      />
                    ) : quantity > 0 ? (
                      <Chip 
                        icon={<CheckCircleIcon />}
                        label="In Stock" 
                        color="success" 
                        size="small" 
                      />
                    ) : (
                      <Chip 
                        label="No Stock" 
                        color="error" 
                        size="small" 
                      />
                    )}
                  </TableCell>
                </TableRow>
              );
            })
          ) : (
            <TableRow>
              <TableCell colSpan={9} align="center">
                {isEmpty ? 
                  (searchTerm ? 
                    `No items found matching "${searchTerm}". Try a different search term.` : 
                    'No inventory items found. Try syncing with Manager.io.'
                  ) : 
                  'No items on this page'
                }
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </TableContainer>
  );
};

export default Inventory;