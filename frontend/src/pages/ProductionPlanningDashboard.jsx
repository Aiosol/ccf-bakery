// COMPLETE FIXED ProductionPlanningDashboard.jsx - NO AUTO-SELECTION, CORRECT SPLIT HANDLING

import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Box, Card, CardContent, Typography, Grid, Button, Chip, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, Paper, TextField, IconButton, Dialog, DialogTitle,
  DialogContent, DialogActions, Alert, Checkbox, FormControl, InputLabel, Select, MenuItem,
  Stack, Snackbar, CircularProgress, Accordion, AccordionSummary, AccordionDetails,
  Tabs, Tab, Collapse, Switch, FormControlLabel, Tooltip
} from '@mui/material';
import {
  ExpandMore as ExpandMoreIcon, Edit as EditIcon, Assignment as AssignmentIcon,
  Refresh as RefreshIcon, Print as PrintIcon, CallSplit as SplitIcon,
  Add as AddIcon, Remove as RemoveIcon, Save as SaveIcon, Warning as WarningIcon,
  CheckCircle as CheckCircleIcon, Inventory as InventoryIcon, ExpandLess as ExpandLessIcon
} from '@mui/icons-material';
import { format } from 'date-fns';

// Import services
import productionApiService from '../services/productionApiService';
import djangoApiService from '../services/djangoApiService';

// Import the Materials Required Tab component
import MaterialsRequiredTab from '../components/MaterialsRequiredTab';

// Configuration - NEW 3-Category System
const PRODUCTION_CATEGORIES = {
  'Production-001': { name: 'Bakery, Frozen & Savory - Mr. Sabuz', icon: '🥖', color: '#4caf50' },
  'Production-002': { name: 'Cake & Pastry - Mr. Rakib', icon: '🍰', color: '#e91e63' },
  'Production-003': { name: 'Resultant Items - Mr. Justin', icon: '🍽️', color: '#2196f3' }
};

const PRODUCTION_PEOPLE = ['Mr. Sabuz', 'Mr. Rakib', 'Mr. Justin'];

// TabPanel component for tabs
function TabPanel(props) {
  const { children, value, index, ...other } = props;
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`production-tabpanel-${index}`}
      aria-labelledby={`production-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ pt: 3 }}>{children}</Box>}
    </div>
  );
}

export default function ProductionPlanningDashboard() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  
  // Core state
  const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [selectedShift, setSelectedShift] = useState('');
  const [shifts, setShifts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [notification, setNotification] = useState(null);

  const [printDialogOpen, setPrintDialogOpen] = useState(false);
  const [printData, setPrintData] = useState(null);
  
  // Tab state
  const [activeTab, setActiveTab] = useState(0);
  
  // Production planning state
  const [productionItems, setProductionItems] = useState([]);
  const [selectedItems, setSelectedItems] = useState([]);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [splitDialogOpen, setSplitDialogOpen] = useState(false);
  const [splittingItem, setSplittingItem] = useState(null);
  const [splitAssignments, setSplitAssignments] = useState([]);
  
  // Bulk operations state
  const [bulkDialogOpen, setBulkDialogOpen] = useState(false);
  const [bulkCategory, setBulkCategory] = useState('');
  const [bulkPerson, setBulkPerson] = useState('');
  const [bulkShift, setBulkShift] = useState('');
  
  // Source analysis state
  const [sourceMode, setSourceMode] = useState('analytics');
  const [selectedOrderIds, setSelectedOrderIds] = useState([]);
  const [selectedFGItems, setSelectedFGItems] = useState([]);

  // FIXED: Add state persistence using sessionStorage
  const [isDataLoaded, setIsDataLoaded] = useState(false);

  useEffect(() => {
    loadShifts();
    
    // FIXED: Load persisted data first, then analyze URL params
    loadPersistedData();
    
    if (!isDataLoaded) {
      analyzeURLParams();
    }
  }, []);

  // Add print function
  const handlePrintSelected = () => {
    if (selectedItems.length === 0) {
      showNotification('warning', 'Please select items to print');
      return;
    }
    
    // Get all production items that can be printed
    const printItems = [];
    
    // Handle regular items and split items differently
    productionItems.forEach(item => {
      if (item.is_split && item.split_assignments) {
        // For split items, check if any split parts are selected
        item.split_assignments.forEach((split, index) => {
          if (selectedItems.some(sel => 
            sel.id === item.id && sel.type === 'split' && sel.splitIndex === index
          )) {
            printItems.push({
              ...item,
              id: `${item.id}-split-${index}`,
              item_name: `${item.item_name} (Split ${index + 1}/${item.split_assignments.length})`,
              production_quantity: split.quantity,
              assigned_to: split.assigned_to,
              shift_id: split.shift_id,
              production_category_code: split.category_code
            });
          }
        });
      } else {
        // For regular items
        if (selectedItems.some(sel => sel.id === item.id && sel.type === 'regular')) {
          printItems.push(item);
        }
      }
    });
    
    if (printItems.length === 0) {
      showNotification('warning', 'No valid items found for printing');
      return;
    }
    
    setPrintData(printItems);
    setPrintDialogOpen(true);
  };

  // FIXED: Add functions to save/load persistent data
  const saveDataToSession = useCallback(() => {
    if (productionItems.length > 0) {
      const dataToSave = {
        productionItems,
        selectedItems,
        selectedDate,
        selectedShift,
        sourceMode,
        selectedOrderIds,
        selectedFGItems,
        activeTab,
        timestamp: Date.now()
      };
      
      sessionStorage.setItem('productionPlanningData', JSON.stringify(dataToSave));
      console.log('Saved production planning data to session storage');
    }
  }, [productionItems, selectedItems, selectedDate, selectedShift, sourceMode, selectedOrderIds, selectedFGItems, activeTab]);

  const loadPersistedData = useCallback(() => {
    try {
      const savedData = sessionStorage.getItem('productionPlanningData');
      if (savedData) {
        const parsedData = JSON.parse(savedData);
        
        // Check if data is not too old (e.g., within last 24 hours)
        const dataAge = Date.now() - parsedData.timestamp;
        const maxAge = 24 * 60 * 60 * 1000; // 24 hours
        
        if (dataAge < maxAge && parsedData.productionItems.length > 0) {
          setProductionItems(parsedData.productionItems);
          setSelectedItems(parsedData.selectedItems || []);
          setSelectedDate(parsedData.selectedDate || format(new Date(), 'yyyy-MM-dd'));
          setSelectedShift(parsedData.selectedShift || '');
          setSourceMode(parsedData.sourceMode || 'analytics');
          setSelectedOrderIds(parsedData.selectedOrderIds || []);
          setSelectedFGItems(parsedData.selectedFGItems || []);
          setActiveTab(parsedData.activeTab || 0);
          setIsDataLoaded(true);
          
          console.log('Loaded persisted production planning data');
          showNotification('info', 'Restored previous planning session');
          return true;
        }
      }
    } catch (error) {
      console.error('Error loading persisted data:', error);
    }
    return false;
  }, []);

  // FIXED: Save data whenever important state changes
  useEffect(() => {
    if (isDataLoaded) {
      saveDataToSession();
    }
  }, [productionItems, selectedItems, selectedDate, selectedShift, saveDataToSession, isDataLoaded]);

  const analyzeURLParams = useCallback(() => {
    const orderParam = searchParams.get('orders');
    const fgItemsParam = searchParams.get('fg_items');
    const source = searchParams.get('source');

    if (fgItemsParam && source === 'analytics') {
      const fgItems = fgItemsParam.split(',');
      setSelectedFGItems(fgItems);
      setSourceMode('analytics');
      loadFGItemsForProduction(fgItems);
      showNotification('info', `Planning production for ${fgItems.length} selected items from analytics`);
    } else if (orderParam) {
      const orderIds = orderParam.split(',').map(id => parseInt(id.trim()));
      setSelectedOrderIds(orderIds);
      setSourceMode('orders');
      loadOrdersForProduction(orderIds);
      showNotification('info', `Planning production for ${orderIds.length} selected orders`);
    }
  }, [searchParams]);

  const loadShifts = async () => {
    try {
      console.log('Loading shifts...');
      let shiftsData = await productionApiService.getProductionShifts();
      
      if (!shiftsData || shiftsData.length === 0) {
        const defaultShifts = [
          { id: 1, name: 'Morning Shift', start_time: '06:00', end_time: '14:00', shift_type: 'morning' },
          { id: 2, name: 'Afternoon Shift', start_time: '14:00', end_time: '22:00', shift_type: 'afternoon' },
          { id: 3, name: 'Night Shift', start_time: '22:00', end_time: '06:00', shift_type: 'night' }
        ];
        setShifts(defaultShifts);
       } else {
        setShifts(shiftsData);
      }
    } catch (error) {
      console.error('Error loading shifts:', error);
      showNotification('error', 'Failed to load shifts: ' + error.message);
    }
  };

  // FIXED: Smart category determination with proper inventory integration
  const determineCategory = (item, recipe, inventoryItem) => {
    console.log('🔍 Determining category for:', {
      itemName: item.name,
      itemCode: item.code,
      inventoryDivision: inventoryItem?.division_name || inventoryItem?.Division,
      recipeCategory: recipe?.category
    });

    // Priority 1: Check inventory Division field (most reliable)
    if (inventoryItem && (inventoryItem.division_name || inventoryItem.Division)) {
      const division = (inventoryItem.division_name || inventoryItem.Division).toLowerCase();
      
      console.log('📂 Found inventory division:', division);
      
      if (division.includes('cake') || division.includes('pastry')) {
        console.log('✅ Assigned to Production-002 (Cake & Pastry) via inventory division');
        return 'Production-002';
      } else if (division.includes('bakery') || division.includes('frozen') || division.includes('savory')) {
        console.log('✅ Assigned to Production-001 (Bakery, Frozen & Savory) via inventory division');
        return 'Production-001';
      } else if (division.includes('resultant')) {
        console.log('✅ Assigned to Production-003 (Resultant Items) via inventory division');
        return 'Production-003';
      }
    }
    
    // Priority 2: Check recipe category
    if (recipe && recipe.category) {
      const categoryName = recipe.category.toLowerCase();
      
      console.log('📝 Checking recipe category:', categoryName);
      
      if (categoryName.includes('cake') || categoryName.includes('pastry')) {
        console.log('✅ Assigned to Production-002 (Cake & Pastry) via recipe category');
        return 'Production-002';
      } else if (categoryName.includes('bakery') || categoryName.includes('frozen') || categoryName.includes('savory')) {
        console.log('✅ Assigned to Production-001 (Bakery, Frozen & Savory) via recipe category');
        return 'Production-001';
      } else if (categoryName.includes('resultant')) {
        console.log('✅ Assigned to Production-003 (Resultant Items) via recipe category');
        return 'Production-003';
      }
    }
    
    // Priority 3: Fallback to item name analysis
    if (item.name) {
      const itemName = item.name.toLowerCase();
      
      console.log('🔤 Analyzing item name:', itemName);
      
      if (itemName.includes('cake') || itemName.includes('pastry') || itemName.includes('tart') || 
          itemName.includes('donut') || itemName.includes('muffin')) {
        console.log('✅ Assigned to Production-002 (Cake & Pastry) via item name');
        return 'Production-002';
      } else if (itemName.includes('bread') || itemName.includes('bun') || itemName.includes('cookie') || 
                 itemName.includes('puri') || itemName.includes('samosa') || itemName.includes('roll') ||
                 itemName.includes('frozen') || itemName.includes('pizza') || itemName.includes('sandwich')) {
        console.log('✅ Assigned to Production-001 (Bakery, Frozen & Savory) via item name');
        return 'Production-001';
      } else if (itemName.includes('resultant') || itemName.includes('final') || itemName.includes('mixed')) {
        console.log('✅ Assigned to Production-003 (Resultant Items) via item name');
        return 'Production-003';
      }
    }
    
    // Default fallback with logging
    console.log('⚠️ No specific category found, defaulting to Production-001 (Bakery, Frozen & Savory)');
    return 'Production-001';
  };
  
  const determineAssignedPerson = (categoryCode) => {
    const category = PRODUCTION_CATEGORIES[categoryCode];
    if (category) {
      if (categoryCode === 'Production-001') return 'Mr. Sabuz';
      if (categoryCode === 'Production-002') return 'Mr. Rakib';
      if (categoryCode === 'Production-003') return 'Mr. Justin';
    }
    return 'Mr. Sabuz'; // Default fallback
  };

  const loadFGItemsForProduction = async (fgItemKeys) => {
    try {
      setLoading(true);
      console.log('Loading FG items for production:', fgItemKeys);
      
      const orders = await djangoApiService.getOrders();
      const inventory = await djangoApiService.getInventoryItems();
      const recipes = await djangoApiService.getRecipes();
      
      // REMOVE ALL DATE FILTERING - just declare itemsMap
      const itemsMap = new Map();
  
      // PROCESS ALL ORDERS (not just today's orders)
      orders.forEach(order => {
        if (order.items && Array.isArray(order.items)) {
          order.items.forEach(item => {
            const itemKey = `${item.code}-${item.name}`;
            
            if (fgItemKeys.includes(itemKey) && 
                (item.type === 'finished_good' || (item.code && item.code.toLowerCase().startsWith('fg')))) {
              
              if (itemsMap.has(itemKey)) {
                const existing = itemsMap.get(itemKey);
                existing.total_ordered += parseFloat(item.quantity) || 0;
                existing.orders.push(order.id);
              } else {
                const inventoryItem = inventory.find(inv => 
                  inv.code === item.code || inv.manager_item_id === item.inventory_item_id
                );
                
                const recipe = recipes.find(r => 
                  r.name.toLowerCase().includes(item.name.toLowerCase()) ||
                  r.manager_inventory_item_id === item.inventory_item_id
                );
                
                const totalOrdered = parseFloat(item.quantity) || 0;
                const currentStock = inventoryItem?.quantity_available || 0;
                
                // FIXED: Smart category assignment with proper inventory integration
                const determinedCategory = determineCategory(item, recipe, inventoryItem);
                const assignedPerson = determineAssignedPerson(determinedCategory);
                
                itemsMap.set(itemKey, {
                  id: `${item.code}-${Date.now()}`,
                  item_name: item.name,
                  item_code: item.code,
                  inventory_item_id: item.inventory_item_id,
                  total_ordered: totalOrdered,
                  current_stock: currentStock,
                  net_required: Math.max(0, totalOrdered - currentStock),
                  production_quantity: Math.max(0, totalOrdered - currentStock),
                  recipe: recipe,
                  recipe_name: recipe?.name || null,
                  recipe_id: recipe?.id || null,
                  production_category_code: determinedCategory,
                  assigned_to: assignedPerson,
                  shift_id: selectedShift,
                  orders: [order.id],
                  // FIXED: Remove auto-selection
                  is_split: false,
                  split_assignments: []
                });
              }
            }
          });
        }
      });

      const productionItemsArray = Array.from(itemsMap.values());
      setProductionItems(productionItemsArray);
      // FIXED: Don't auto-select items
      setSelectedItems([]);
      setIsDataLoaded(true);
      
      showNotification('success', `Loaded ${productionItemsArray.length} items for production planning`);
    } catch (error) {
      console.error('Error loading FG items:', error);
      showNotification('error', 'Failed to load items for production');
    } finally {
      setLoading(false);
    }
  };

  const loadOrdersForProduction = async (orderIds) => {
    try {
      setLoading(true);
      console.log('Loading orders for production:', orderIds);
      
      const orders = await djangoApiService.getOrders();
      const inventory = await djangoApiService.getInventoryItems();
      const recipes = await djangoApiService.getRecipes();
      
      // Filter to only the selected orders (regardless of date)
      const selectedOrders = orders.filter(order => orderIds.includes(order.id));
      
      console.log('Found selected orders:', selectedOrders.length);
      
      if (selectedOrders.length === 0) {
        showNotification('warning', 'No matching orders found');
        return;
      }
      
      const itemsMap = new Map();
      
      selectedOrders.forEach(order => {
        if (order.items && Array.isArray(order.items)) {
          order.items.forEach(item => {
            // Only process finished goods
            if (item.type === 'finished_good' || (item.code && item.code.toLowerCase().startsWith('fg'))) {
              const itemKey = `${item.code}-${item.name}`;
              
              if (itemsMap.has(itemKey)) {
                const existing = itemsMap.get(itemKey);
                existing.total_ordered += parseFloat(item.quantity) || 0;
                existing.orders.push(order.id);
              } else {
                const inventoryItem = inventory.find(inv => 
                  inv.code === item.code || inv.manager_item_id === item.inventory_item_id
                );
                
                const recipe = recipes.find(r => 
                  r.name.toLowerCase().includes(item.name.toLowerCase()) ||
                  r.manager_inventory_item_id === item.inventory_item_id
                );
                
                const totalOrdered = parseFloat(item.quantity) || 0;
                const currentStock = inventoryItem?.quantity_available || 0;
                
                // Smart category assignment
                const determinedCategory = determineCategory(item, recipe, inventoryItem);
                const assignedPerson = determineAssignedPerson(determinedCategory);
                
                itemsMap.set(itemKey, {
                  id: `${item.code}-${Date.now()}-${Math.random()}`,
                  item_name: item.name,
                  item_code: item.code,
                  inventory_item_id: item.inventory_item_id,
                  total_ordered: totalOrdered,
                  current_stock: currentStock,
                  net_required: Math.max(0, totalOrdered - currentStock),
                  production_quantity: Math.max(0, totalOrdered - currentStock),
                  recipe: recipe,
                  recipe_name: recipe?.name || null,
                  recipe_id: recipe?.id || null,
                  production_category_code: determinedCategory,
                  assigned_to: assignedPerson,
                  shift_id: selectedShift,
                  orders: [order.id],
                  is_split: false,
                  split_assignments: []
                });
              }
            }
          });
        }
      });
  
      const productionItemsArray = Array.from(itemsMap.values());
      setProductionItems(productionItemsArray);
      setSelectedItems([]);
      setIsDataLoaded(true);
      
      showNotification('success', `Loaded ${productionItemsArray.length} items from ${selectedOrders.length} orders for production planning`);
    } catch (error) {
      console.error('Error loading orders:', error);
      showNotification('error', 'Failed to load orders for production');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateProduction = async () => {
    console.log('=== PRODUCTION CREATION DEBUG ===');
    console.log('All selected items:', selectedItems);
    
    selectedItems.forEach((sel, index) => {
      console.log(`Selection ${index + 1}:`, {
        type: sel.type,
        id: sel.id,
        splitIndex: sel.splitIndex || 'N/A'
      });
    });

    if (selectedItems.length === 0) {
      showNotification('warning', 'Please select items to create production orders');
      return;
    }

    try {
      setLoading(true);
      
      const selectedProductionItems = [];
      
      selectedItems.forEach(selection => {
        console.log('Processing selection:', selection);
        
        if (selection.type === 'split') {
          const originalItem = productionItems.find(item => item.id === selection.id);
          const splitPart = originalItem?.split_assignments?.[selection.splitIndex];
          
          if (originalItem && splitPart) {
            selectedProductionItems.push({
              // Only include necessary fields - NOT spreading originalItem
              item_name: `${originalItem.item_name} (Split ${selection.splitIndex + 1})`,
              item_code: originalItem.item_code,
              inventory_item_id: originalItem.inventory_item_id,
              recipe_id: originalItem.recipe_id,
              recipe_name: originalItem.recipe_name,
              orders: originalItem.orders || [],
              
              // Use split-specific values
              id: `${selection.id}-split-${selection.splitIndex}`,
              production_quantity: splitPart.quantity,
              assigned_to: splitPart.assigned_to,
              shift_id: splitPart.shift_id,
              production_category_code: splitPart.category_code,
              
              // Mark as regular item (NOT split) - this is the key!
              is_split: false,
              split_assignments: [],
              
              // Mark this as a split order for backend tracking
              is_split_order: true,
              
              // Add notes about the split
              notes: `Split part ${selection.splitIndex + 1} of ${originalItem.split_assignments.length} from ${originalItem.item_name}`
            });
          }
        }
        else if (selection.type === 'regular') {
          const item = productionItems.find(item => item.id === selection.id);
          console.log('Regular item found:', {
            itemName: item?.item_name,
            is_split: item?.is_split
          });
          
          // ONLY add if item exists AND is NOT split
          if (item && !item.is_split) {
            selectedProductionItems.push(item);
          } else {
            console.warn('Skipping item:', item?.item_name, 'is_split:', item?.is_split);
          }
        }
      });
      
      console.log('Final items to create:', selectedProductionItems.map(item => ({
        id: item.id,
        name: item.item_name,
        quantity: item.production_quantity
      })));

      // Validation
      const validationErrors = [];
      selectedProductionItems.forEach((item, index) => {
        if (!item.item_name) {
          validationErrors.push(`Item ${index + 1}: Missing item name`);
        }
        if (!item.production_quantity || item.production_quantity <= 0) {
          validationErrors.push(`Item ${index + 1}: Production quantity must be greater than 0`);
        }
      });

      if (validationErrors.length > 0) {
        showNotification('error', `Validation errors: ${validationErrors.join(', ')}`);
        return;
      }

      console.log('Creating production orders with items:', selectedProductionItems);

      const result = await productionApiService.createDirectProductionOrders(
        selectedProductionItems,
        selectedDate,
        selectedShift
      );

      // Handle result
      if (result && result.success) {
        const createdCount = result.created_orders?.length || 0;
        showNotification('success', `Successfully created ${createdCount} production orders!`);
        
        // FIXED: Track which specific split parts were sent
        const processedSelections = [...selectedItems]; // Store the selections that were processed
        
        setProductionItems(prev => prev.map(item => {
          // Check if this item had any parts sent to production
          const sentSelections = processedSelections.filter(sel => sel.id === item.id);
          
          if (sentSelections.length === 0) {
            return item; // No changes if nothing was sent
          }
          
          // For split items, track which parts were sent
          if (item.is_split && item.split_assignments) {
            const sentSplitIndices = sentSelections
              .filter(sel => sel.type === 'split')
              .map(sel => sel.splitIndex);
            
            // Update split assignments with status
            const updatedSplitAssignments = item.split_assignments.map((split, index) => {
              if (sentSplitIndices.includes(index)) {
                return {
                  ...split,
                  status: 'created',
                  created_at: new Date().toISOString()
                };
              }
              return split;
            });
            
            // Check if all parts are created
            const allPartsCreated = updatedSplitAssignments.every(split => split.status === 'created');
            
            return {
              ...item,
              split_assignments: updatedSplitAssignments,
              // Only mark the whole item as created if all parts are sent
              status: allPartsCreated ? 'created' : item.status
            };
          }
          
          // For non-split items (regular selection)
          if (sentSelections.some(sel => sel.type === 'regular')) {
            return {
              ...item,
              status: 'created',
              created_at: new Date().toISOString()
            };
          }
          
          return item;
        }));
        
        setSelectedItems([]);
        
        // Navigate after a delay
        showNotification('info', 'Redirecting to production list...');
        setTimeout(() => {
          navigate('/production/list', { 
            state: { 
              message: `Created ${createdCount} production orders successfully`,
              refresh: true,
              fromPlanning: true
            }
          });
        }, 2000);
      }
      
    } catch (error) {
      console.error('Error creating production:', error);
      showNotification('error', `Failed to create production: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleFieldChange = (itemId, field, value) => {
    setProductionItems(prev => prev.map(item => 
      item.id === itemId ? { ...item, [field]: value } : item
    ));
  };

  const handleEditItem = (item) => {
    setEditingItem({ ...item });
    setEditDialogOpen(true);
  };

  const handleSaveEdit = () => {
    if (!editingItem) return;
    
    setProductionItems(prev => prev.map(item => 
      item.id === editingItem.id ? { ...editingItem } : item
    ));
    
    setEditDialogOpen(false);
    setEditingItem(null);
    showNotification('success', 'Item updated successfully');
  };

  const handleSplitItem = (item) => {
    setSplittingItem(item);
    
    // Create initial split with 2 parts
    const halfQty = Math.floor(item.production_quantity / 2);
    const remainingQty = item.production_quantity - halfQty;
    
    setSplitAssignments([
      {
        id: 1,
        assigned_to: item.assigned_to,
        quantity: halfQty,
        shift_id: item.shift_id,
        category_code: item.production_category_code,
        status: null,
        created_at: null
      },
      {
        id: 2,
        assigned_to: item.assigned_to,
        quantity: remainingQty,
        shift_id: item.shift_id,
        category_code: item.production_category_code,
        status: null,
        created_at: null
      }
    ]);
    setSplitDialogOpen(true);
  };

  const handleSaveSplit = () => {
    if (!splittingItem) return;
    
    // Validation
    const totalAssigned = splitAssignments.reduce((sum, s) => sum + s.quantity, 0);
    if (totalAssigned !== splittingItem.production_quantity) {
      showNotification('error', 'Total split quantities must equal original quantity');
      return;
    }
    
    // ENHANCED: Clear ALL selections for this item (both regular and any existing split selections)
    setSelectedItems(prev => prev.filter(sel => sel.id !== splittingItem.id));
    
    setProductionItems(prev => prev.map(item => 
      item.id === splittingItem.id 
        ? { 
            ...item, 
            is_split: true, 
            split_assignments: [...splitAssignments]
          }
        : item
    ));
    
    setSplitDialogOpen(false);
    setSplittingItem(null);
    setSplitAssignments([]);
    showNotification('success', `Split ${splittingItem.item_name} into ${splitAssignments.length} parts`);
  };

  const handleBulkApply = () => {
    setProductionItems(prev => prev.map(item => {
      if (selectedItems.some(sel => sel.id === item.id)) {
        const updates = {};
        if (bulkCategory) updates.production_category_code = bulkCategory;
        if (bulkPerson) updates.assigned_to = bulkPerson;
        if (bulkShift) updates.shift_id = bulkShift;
        return { ...item, ...updates };
      }
      return item;
    }));
    
    setBulkDialogOpen(false);
    setBulkCategory('');
    setBulkPerson('');
    setBulkShift('');
    showNotification('success', `Applied changes to ${selectedItems.length} items`);
  };

  // FIXED: Proper selection toggle logic
  const toggleItemSelection = (item, splitIndex = null) => {
    setSelectedItems(prev => {
      if (splitIndex !== null) {
        // This is a split part selection
        const selectionItem = { type: 'split', id: item.id, splitIndex };
        
        // Check if this exact split selection exists
        const existingIndex = prev.findIndex(sel => 
          sel.id === selectionItem.id && 
          sel.type === 'split' && 
          sel.splitIndex === splitIndex
        );
        
        if (existingIndex >= 0) {
          // Remove this specific split selection
          return prev.filter((_, index) => index !== existingIndex);
        } else {
          // Add this specific split selection
          return [...prev, selectionItem];
        }
      } else {
        // This is a regular item selection
        const selectionItem = { type: 'regular', id: item.id };
        
        // Check if this regular selection exists
        const existingIndex = prev.findIndex(sel => 
          sel.id === selectionItem.id && sel.type === 'regular'
        );
        
        if (existingIndex >= 0) {
          // Remove regular selection
          return prev.filter((_, index) => index !== existingIndex);
        } else {
          // Add regular selection ONLY if item is not split
          if (!item.is_split) {
            return [...prev, selectionItem];
          }
          return prev;
        }
      }
    });
  };

  const showNotification = (type, message) => {
    setNotification({ type, message });
  };

  const closeNotification = () => {
    setNotification(null);
  };

  const handleClearSelection = () => {
    setSelectedOrderIds([]);
    setSelectedFGItems([]);
    setProductionItems([]);
    setSelectedItems([]);
    setIsDataLoaded(false);
    
    // FIXED: Clear session storage too
    sessionStorage.removeItem('productionPlanningData');
    navigate('/production/planning', { replace: true });
  };

  // Handle tab change
  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
  };

  // FIXED: Group items by category with proper fallback
  const groupedItems = productionItems.reduce((acc, item) => {
    const categoryCode = item.production_category_code || 'Production-001';
    if (!acc[categoryCode]) {
      acc[categoryCode] = [];
    }
    acc[categoryCode].push(item);
    return acc;
  }, {});

  if (loading && productionItems.length === 0) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <CircularProgress />
        <Typography sx={{ ml: 2 }}>Loading production planning data...</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h4" component="h1" sx={{ fontWeight: 'bold' }}>
          Production Planning Dashboard
        </Typography>
        <Stack direction="row" spacing={2}>
          <Button
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={() => window.location.reload()}
          >
            Refresh
          </Button>
          <Button
            variant="outlined"
            startIcon={<PrintIcon />}
            onClick={handlePrintSelected}
            disabled={selectedItems.length === 0}
          >
            Print Selected ({selectedItems.length})
          </Button>
        </Stack>
      </Box>

      {/* Tabs */}
      <Paper sx={{ mb: 3 }}>
        <Tabs 
          value={activeTab} 
          onChange={handleTabChange}
          variant="fullWidth"
          aria-label="production planning tabs"
        >
          <Tab label="Production Planning" id="tab-0" />
          <Tab label="Materials Required" id="tab-1" />
        </Tabs>
      </Paper>

      {/* Tab Panel 0: Production Planning */}
      <TabPanel value={activeTab} index={0}>
        {/* Control Panel */}
        <Paper sx={{ p: 2, mb: 3 }}>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} md={2}>
              <TextField
                fullWidth
                type="date"
                label="Production Date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid item xs={12} md={2}>
              <FormControl fullWidth>
                <InputLabel>Default Shift</InputLabel>
                <Select
                  value={selectedShift}
                  onChange={(e) => setSelectedShift(e.target.value)}
                  label="Default Shift"
                >
                  <MenuItem value="">All Shifts</MenuItem>
                  {shifts.map((shift) => (
                    <MenuItem key={shift.id} value={shift.id}>
                      {shift.name} ({shift.time_range || `${shift.start_time} - ${shift.end_time}`})
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={2}>
              <Button
                variant="outlined"
                startIcon={<SplitIcon/>}
                onClick={() => setBulkDialogOpen(true)}
                disabled={selectedItems.length === 0}
                fullWidth
              >
                Bulk Edit ({selectedItems.length})
              </Button>
            </Grid>
            <Grid item xs={12} md={4}>
              <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
                <Button
                  variant="contained"
                  color="primary"
                  onClick={handleCreateProduction}
                  startIcon={<AssignmentIcon />}
                  disabled={selectedItems.length === 0 || loading}
                  size="large"
                >
                  {loading ? (
                    <>
                      <CircularProgress size={20} sx={{ mr: 1 }} />
                      Creating...
                    </>
                  ) : (
                    `Create Production Orders (${selectedItems.length})`
                  )}
                </Button>
              </Box>
            </Grid>
          </Grid>
          
          {/* Source info */}
          {(selectedOrderIds.length > 0 || selectedFGItems.length > 0) && (
            <Alert severity="info" sx={{ mt: 2 }}>
              <strong>Planning Mode:</strong> 
              {sourceMode === 'analytics' 
                ? ` Selected ${selectedFGItems.length} finished goods from analytics`
                : ` Selected ${selectedOrderIds.length} orders for production planning`
              }
              <Button 
                size="small" 
                onClick={handleClearSelection}
                sx={{ ml: 2 }}
              >
                Clear & Start Fresh
              </Button>
            </Alert>
          )}
        </Paper>

        {/* FIXED: Production Items with proper error handling */}
        {Object.keys(groupedItems).length > 0 ? (
          Object.keys(groupedItems).sort().map(categoryCode => {
            const categoryItems = groupedItems[categoryCode];
            const category = PRODUCTION_CATEGORIES[categoryCode];
            
            // FIXED: Add safety check to prevent undefined errors
            if (!category) {
              console.warn(`Unknown category code: ${categoryCode}`);
              return null;
            }
            
            return (
              <Accordion key={categoryCode} defaultExpanded sx={{ mb: 2 }}>
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                  <Box sx={{ display: 'flex', alignItems: 'center', width: '100%' }}>
                    <Typography variant="h6" sx={{ mr: 2 }}>
                      {category?.icon || '📦'} {category?.name || 'Unknown Category'}
                    </Typography>
                    <Chip
                      label={`${categoryItems.length} items`}
                      color="secondary"
                    />
                  </Box>
                </AccordionSummary>
                <AccordionDetails>
                  <TableContainer component={Paper} variant="outlined">
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell padding="checkbox">
                          <Checkbox
                            checked={categoryItems.filter(item => !item.is_split).every(item => 
                              selectedItems.some(sel => sel.id === item.id && sel.type === 'regular')
                            )}
                            onChange={(e) => {
                              if (e.target.checked) {
                                // Add all NON-SPLIT category items as regular selections
                                const newSelections = categoryItems
                                  .filter(item => !item.is_split && !selectedItems.some(sel => sel.id === item.id && sel.type === 'regular'))
                                  .map(item => ({ type: 'regular', id: item.id }));
                                setSelectedItems(prev => [...prev, ...newSelections]);
                              } else {
                                // Remove all regular selections for this category
                                setSelectedItems(prev => 
                                  prev.filter(sel => 
                                    !(sel.type === 'regular' && categoryItems.some(item => item.id === sel.id))
                                  )
                                );
                              }
                            }}
                          />
                          </TableCell>
                          <TableCell>Item</TableCell>
                          <TableCell align="right">Ordered</TableCell>
                          <TableCell align="right">Stock</TableCell>
                          <TableCell align="right">Required</TableCell>
                          <TableCell align="right">Production Qty</TableCell>
                          <TableCell>Category</TableCell>
                          <TableCell>Assigned To</TableCell>
                          <TableCell>Shift</TableCell>
                          <TableCell align="center">Actions</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {categoryItems.map((item) => {
                          if (item.is_split && item.split_assignments && item.split_assignments.length > 0) {
                            return item.split_assignments.map((split, splitIndex) => (
                              <TableRow 
                                key={`${item.id}-split-${split.id}`}
                                selected={selectedItems.some(sel => 
                                  sel.id === item.id && sel.type === 'split' && sel.splitIndex === splitIndex
                                )}
                                sx={{
                                  ...(split.status === 'created' ? { bgcolor: 'success.50' } : {}),
                                  ...(split.status === 'created' ? { opacity: 0.7 } : {})
                                }}
                              >
                                <TableCell padding="checkbox">
                                  <Checkbox
                                    checked={selectedItems.some(sel => 
                                      sel.id === item.id && 
                                      sel.type === 'split' && 
                                      sel.splitIndex === splitIndex
                                    )}
                                    onChange={() => toggleItemSelection(item, splitIndex)}
                                    disabled={split.status === 'created'} // Disable only if this split part is created
                                  />
                                </TableCell>
                                <TableCell>
                                  <Typography variant="body2" fontWeight="medium">
                                    {item.item_name} (Split {splitIndex + 1}/{item.split_assignments.length})
                                  </Typography>
                                  <Typography variant="caption" color="text.secondary">
                                    {item.item_code} {item.recipe_name && `• ${item.recipe_name}`}
                                  </Typography>
                                  {split.status === 'created' && (
                                    <Chip 
                                      label="Production Created" 
                                      size="small" 
                                      color="success" 
                                      sx={{ ml: 1 }}
                                    />
                                  )}
                                </TableCell>
                                <TableCell align="right">
                                  <Typography variant="body2">
                                    {splitIndex === 0 ? (item.total_ordered || 0) : ''}
                                  </Typography>
                                </TableCell>
                                <TableCell align="right">
                                  <Typography 
                                    variant="body2" 
                                    color={(item.current_stock || 0) > 0 ? 'success.main' : 'error.main'}
                                  >
                                    {splitIndex === 0 ? (item.current_stock || 0) : ''}
                                  </Typography>
                                </TableCell>
                                <TableCell align="right">
                                  <Typography variant="body2" fontWeight="medium">
                                    {splitIndex === 0 ? (item.net_required || 0) : ''}
                                  </Typography>
                                </TableCell>
                                <TableCell align="right">
                                  <Typography variant="body2" fontWeight="bold" color="primary.main">
                                    {split.quantity}
                                  </Typography>
                                </TableCell>
                                <TableCell>
                                  <Typography variant="body2">
                                    {PRODUCTION_CATEGORIES[split.category_code]?.name || 'Unknown'}
                                  </Typography>
                                </TableCell>
                                <TableCell>
                                  <Typography variant="body2" fontWeight="medium">
                                    {split.assigned_to}
                                  </Typography>
                                </TableCell>
                                <TableCell>
                                  <Typography variant="body2">
                                    {shifts.find(s => s.id === split.shift_id)?.name || 'All Day'}
                                  </Typography>
                                </TableCell>
                                <TableCell align="center">
                                  {splitIndex === 0 && (
                                    <>
                                      <IconButton
                                        size="small"
                                        onClick={() => handleEditItem(item)}
                                        color="primary"
                                        disabled={item.status === 'created'}
                                      >
                                        <EditIcon />
                                      </IconButton>
                                      <IconButton
                                        size="small"
                                        onClick={() => handleSplitItem(item)}
                                        color="secondary"
                                        disabled={item.status === 'created'}
                                      >
                                         <SplitIcon />
                                      </IconButton>
                                    </>
                                  )}
                                </TableCell>
                              </TableRow>
                            ));
                          }
                          
                          // Original single row for non-split items
                          return (
                            <TableRow 
                              key={item.id} 
                              selected={selectedItems.some(sel => sel.id === item.id && sel.type === 'regular')}
                              sx={item.status === 'created' ? { bgcolor: 'success.50' } : {}}
                            >
                              <TableCell padding="checkbox">
                              <Checkbox
                                checked={selectedItems.some(sel => 
                                  sel.id === item.id && 
                                  sel.type === 'regular'
                                )}
                                onChange={() => toggleItemSelection(item, null)}
                                disabled={item.status === 'created' || item.is_split}
                              />
                              </TableCell>
                              <TableCell>
                                <Typography variant="body2" fontWeight="medium">
                                  {item.item_name}
                                </Typography>
                                <Typography variant="caption" color="text.secondary">
                                  {item.item_code} {item.recipe_name && `• ${item.recipe_name}`}
                                </Typography>
                                {item.status === 'created' && (
                                  <Chip 
                                    label="Production Created" 
                                    size="small" 
                                    color="success" 
                                    sx={{ ml: 1 }}
                                  />
                                )}
                                {item.is_split && (
                                  <Chip 
                                    label={`Split (${item.split_assignments.length} parts)`} 
                                    size="small" 
                                    color="info" 
                                    sx={{ ml: 1 }}
                                  />
                                )}
                              </TableCell>
                              <TableCell align="right">
                                <Typography variant="body2">{item.total_ordered || 0}</Typography>
                              </TableCell>
                              <TableCell align="right">
                                <Typography 
                                  variant="body2" 
                                  color={(item.current_stock || 0) > 0 ? 'success.main' : 'error.main'}
                                >
                                  {item.current_stock || 0}
                                </Typography>
                              </TableCell>
                              <TableCell align="right">
                                <Typography variant="body2" fontWeight="medium">
                                  {item.net_required || 0}
                                </Typography>
                              </TableCell>
                              <TableCell align="right">
                                <TextField
                                  size="small"
                                  type="number"
                                  value={item.production_quantity || 0}
                                  onChange={(e) => handleFieldChange(item.id, 'production_quantity', parseFloat(e.target.value) || 0)}
                                  inputProps={{ min: 0, style: { textAlign: 'right' } }}
                                  sx={{ width: 80 }}
                                  disabled={item.status === 'created'}
                                />
                              </TableCell>
                              <TableCell>
                                <FormControl size="small" sx={{ minWidth: 120 }}>
                                  <Select
                                    value={item.production_category_code || 'Production-001'}
                                    onChange={(e) => handleFieldChange(item.id, 'production_category_code', e.target.value)}
                                    disabled={item.status === 'created'}
                                  >
                                    {Object.keys(PRODUCTION_CATEGORIES).map(code => (
                                      <MenuItem key={code} value={code}>
                                        {PRODUCTION_CATEGORIES[code].name}
                                      </MenuItem>
                                    ))}
                                  </Select>
                                </FormControl>
                              </TableCell>
                              <TableCell>
                                <FormControl size="small" sx={{ minWidth: 100 }}>
                                  <Select
                                    value={item.assigned_to || 'Mr. Sabuz'}
                                    onChange={(e) => handleFieldChange(item.id, 'assigned_to', e.target.value)}
                                    disabled={item.status === 'created'}
                                  >
                                    {PRODUCTION_PEOPLE.map(person => (
                                      <MenuItem key={person} value={person}>
                                        {person}
                                      </MenuItem>
                                    ))}
                                  </Select>
                                </FormControl>
                              </TableCell>
                              <TableCell>
                                <FormControl size="small" sx={{ minWidth: 120 }}>
                                  <Select
                                    value={item.shift_id || ''}
                                    onChange={(e) => handleFieldChange(item.id, 'shift_id', e.target.value)}
                                    disabled={item.status === 'created'}
                                  >
                                    <MenuItem value="">All Day</MenuItem>
                                    {shifts.map(shift => (
                                      <MenuItem key={shift.id} value={shift.id}>
                                        {shift.name}
                                      </MenuItem>
                                    ))}
                                  </Select>
                                </FormControl>
                              </TableCell>
                              <TableCell align="center">
                                <IconButton
                                  size="small"
                                  onClick={() => handleEditItem(item)}
                                  color="primary"
                                  disabled={item.status === 'created'}
                                >
                                  <EditIcon />
                                </IconButton>
                                <IconButton
                                  size="small"
                                  onClick={() => handleSplitItem(item)}
                                  color="secondary"
                                  disabled={item.status === 'created'}
                                >
                                   <SplitIcon />
                                </IconButton>
                              </TableCell>
                            </TableRow>
                          );
                        }).flat()}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </AccordionDetails>
              </Accordion>
            );
          }).filter(Boolean) // FIXED: Remove null values
        ) : (
          <Paper sx={{ p: 4, textAlign: 'center' }}>
            <Typography variant="h6" color="text.secondary" gutterBottom>
              No items selected for production planning
            </Typography>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              Go back to Orders → Today's Analytics to select finished goods, or use the order selection method.
            </Typography>
            <Button
              variant="contained"
              onClick={() => navigate('/orders')}
              sx={{ mt: 2 }}
            >
              Go to Orders
            </Button>
          </Paper>
        )}
      </TabPanel>

      {/* Tab Panel 1: Materials Required */}
      <TabPanel value={activeTab} index={1}>
      <MaterialsRequiredTab
        productionItems={productionItems}
        selectedItems={selectedItems
          .map(item => {
            // Handle both string IDs and objects
            if (typeof item === 'string') {
              return item.includes('-split-') ? item.split('-')[0] : item;
            } else if (item && item.id) {
              return item.id.includes('-split-') ? item.id.split('-')[0] : item.id;
            }
            return null;
          })
          .filter(Boolean) // Remove null values
          .filter((id, index, arr) => arr.indexOf(id) === index) // Remove duplicates
        }
        onSelectionChange={setSelectedItems}
        selectedDate={selectedDate}
        selectedShift={selectedShift}
        shifts={shifts}
      />
      </TabPanel>

      {/* Edit Item Dialog */}
      <Dialog open={editDialogOpen} onClose={() => setEditDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>Edit Production Item</DialogTitle>
        <DialogContent>
          {editingItem && (
            <Grid container spacing={2} sx={{ mt: 1 }}>
              <Grid item xs={12}>
                <Typography variant="h6">{editingItem.item_name}</Typography>
                <Typography variant="body2" color="text.secondary">
                  {editingItem.item_code} • Required: {editingItem.net_required || 0}
                </Typography>
              </Grid>
              <Grid item xs={6}>
                <TextField
                  fullWidth
                  label="Production Quantity"
                  type="number"
                  value={editingItem.production_quantity || 0}
                  onChange={(e) => setEditingItem(prev => ({ 
                    ...prev, 
                    production_quantity: parseFloat(e.target.value) || 0 
                  }))}
                  inputProps={{ min: 0 }}
                />
              </Grid>
              <Grid item xs={6}>
                <FormControl fullWidth>
                  <InputLabel>Category</InputLabel>
                  <Select
                    value={editingItem.production_category_code || 'Production-001'}
                    onChange={(e) => setEditingItem(prev => ({ 
                      ...prev, 
                      production_category_code: e.target.value 
                    }))}
                    label="Category"
                  >
                    {Object.keys(PRODUCTION_CATEGORIES).map(code => (
                      <MenuItem key={code} value={code}>
                        {PRODUCTION_CATEGORIES[code].name}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={6}>
                <FormControl fullWidth>
                  <InputLabel>Assigned To</InputLabel>
                  <Select
                    value={editingItem.assigned_to || 'Mr. Sabuz'}
                    onChange={(e) => setEditingItem(prev => ({ 
                      ...prev, 
                      assigned_to: e.target.value 
                    }))}
                    label="Assigned To"
                  >
                    {PRODUCTION_PEOPLE.map(person => (
                      <MenuItem key={person} value={person}>
                        {person}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={6}>
                <FormControl fullWidth>
                  <InputLabel>Shift</InputLabel>
                  <Select
                    value={editingItem.shift_id || ''}
                    onChange={(e) => setEditingItem(prev => ({ 
                      ...prev, 
                      shift_id: e.target.value 
                    }))}
                    label="Shift"
                  >
                    <MenuItem value="">All Day</MenuItem>
                    {shifts.map(shift => (
                      <MenuItem key={shift.id} value={shift.id}>
                        {shift.name}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
            </Grid>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleSaveEdit} variant="contained">Save Changes</Button>
        </DialogActions>
      </Dialog>

      {/* Bulk Edit Dialog */}
      <Dialog open={bulkDialogOpen} onClose={() => setBulkDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Bulk Edit ({selectedItems.length} items)</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <FormControl fullWidth>
                <InputLabel>Set Category</InputLabel>
                <Select
                  value={bulkCategory}
                  onChange={(e) => setBulkCategory(e.target.value)}
                  label="Set Category"
                >
                  <MenuItem value="">- No Change -</MenuItem>
                  {Object.keys(PRODUCTION_CATEGORIES).map(code => (
                    <MenuItem key={code} value={code}>
                      {PRODUCTION_CATEGORIES[code].name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12}>
              <FormControl fullWidth>
                <InputLabel>Set Assigned Person</InputLabel>
                <Select
                  value={bulkPerson}
                  onChange={(e) => setBulkPerson(e.target.value)}
                  label="Set Assigned Person"
                >
                  <MenuItem value="">- No Change -</MenuItem>
                  {PRODUCTION_PEOPLE.map(person => (
                    <MenuItem key={person} value={person}>
                      {person}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12}>
              <FormControl fullWidth>
                <InputLabel>Set Shift</InputLabel>
                <Select
                  value={bulkShift}
                  onChange={(e) => setBulkShift(e.target.value)}
                  label="Set Shift"
                >
                  <MenuItem value="">- No Change -</MenuItem>
                  <MenuItem value="">All Day</MenuItem>
                  {shifts.map(shift => (
                    <MenuItem key={shift.id} value={shift.id}>
                      {shift.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setBulkDialogOpen(false)}>Cancel</Button>
          <Button 
            onClick={handleBulkApply} 
            variant="contained"
            disabled={!bulkCategory && !bulkPerson && !bulkShift}
          >
            Apply Changes
          </Button>
        </DialogActions>
      </Dialog>

      {/* Enhanced Split Dialog */}
      <Dialog open={splitDialogOpen} onClose={() => setSplitDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          Split Production Order - {splittingItem?.item_name}
          <Typography variant="body2" color="text.secondary">
            Total Quantity: {splittingItem?.production_quantity} | 
            Split into {splitAssignments.length} parts
          </Typography>
        </DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 2 }}>
            {/* Add Split Button */}
            <Button
              variant="outlined"
              startIcon={<AddIcon />}
              onClick={() => setSplitAssignments(prev => [
                ...prev,
                {
                  id: prev.length + 1,
                  assigned_to: splittingItem?.assigned_to || 'Mr. Sabuz',
                  quantity: 0,
                  shift_id: splittingItem?.shift_id || '',
                  category_code: splittingItem?.production_category_code || 'Production-001'
                }
              ])}
              sx={{ mb: 2 }}
            >
              Add Another Split
            </Button>

            {/* Split Assignments */}
            {splitAssignments.map((split, index) => (
              <Card key={split.id} sx={{ mb: 2, p: 2 }}>
                <Grid container spacing={2} alignItems="center">
                  <Grid item xs={12} sm={2}>
                    <Typography variant="subtitle2">Split {index + 1}</Typography>
                  </Grid>
                  
                  <Grid item xs={12} sm={2}>
                    <TextField
                      fullWidth
                      label="Quantity"
                      type="number"
                      value={split.quantity}
                      onChange={(e) => {
                        const newQty = parseInt(e.target.value) || 0;
                        setSplitAssignments(prev => prev.map(s => 
                          s.id === split.id ? { ...s, quantity: newQty } : s
                        ));
                      }}
                      inputProps={{ min: 0 }}
                      size="small"
                    />
                  </Grid>

                  <Grid item xs={12} sm={3}>
                    <FormControl fullWidth size="small">
                      <InputLabel>Assigned To</InputLabel>
                      <Select
                        value={split.assigned_to}
                        onChange={(e) => setSplitAssignments(prev => prev.map(s => 
                          s.id === split.id ? { ...s, assigned_to: e.target.value } : s
                        ))}
                        label="Assigned To"
                      >
                        {PRODUCTION_PEOPLE.map(person => (
                          <MenuItem key={person} value={person}>{person}</MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Grid>

                  <Grid item xs={12} sm={3}>
                    <FormControl fullWidth size="small">
                      <InputLabel>Shift</InputLabel>
                      <Select
                        value={split.shift_id}
                        onChange={(e) => setSplitAssignments(prev => prev.map(s => 
                          s.id === split.id ? { ...s, shift_id: e.target.value } : s
                        ))}
                        label="Shift"
                      >
                        <MenuItem value="">All Day</MenuItem>
                        {shifts.map(shift => (
                          <MenuItem key={shift.id} value={shift.id}>
                            {shift.name}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Grid>

                  <Grid item xs={12} sm={2}>
                    {splitAssignments.length > 1 && (
                      <IconButton
                        color="error"
                        onClick={() => setSplitAssignments(prev => 
                          prev.filter(s => s.id !== split.id)
                        )}
                      >
                        <RemoveIcon />
                      </IconButton>
                    )}
                  </Grid>
                </Grid>
              </Card>
            ))}

            {/* Summary */}
            <Alert 
              severity={
                splitAssignments.reduce((sum, s) => sum + s.quantity, 0) === splittingItem?.production_quantity 
                  ? "success" : "warning"
              }
              sx={{ mt: 2 }}
            >
              <strong>Total Assigned: {splitAssignments.reduce((sum, s) => sum + s.quantity, 0)}</strong>
              {" | "}
              Required: {splittingItem?.production_quantity}
              {" | "}
              Remaining: {(splittingItem?.production_quantity || 0) - splitAssignments.reduce((sum, s) => sum + s.quantity, 0)}
            </Alert>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSplitDialogOpen(false)}>Cancel</Button>
          <Button 
            onClick={handleSaveSplit} 
            variant="contained"
            disabled={splitAssignments.reduce((sum, s) => sum + s.quantity, 0) !== splittingItem?.production_quantity}
          >
            Save Split Assignment
          </Button>
        </DialogActions>
      </Dialog>

      {/* Print Dialog */}
      <Dialog 
        open={printDialogOpen} 
        onClose={() => setPrintDialogOpen(false)} 
        maxWidth="lg" 
        fullWidth
      >
        <DialogTitle>
          Production Order Print - {format(new Date(selectedDate), 'MMMM dd, yyyy')}
        </DialogTitle>
        <DialogContent>
          <Box id="print-content" sx={{ p: 2 }}>
            {/* Group by assigned person */}
            {printData && Object.entries(
              printData.reduce((acc, item) => {
                const person = item.assigned_to || 'Unassigned';
                if (!acc[person]) acc[person] = [];
                acc[person].push(item);
                return acc;
              }, {})
            ).map(([person, items]) => (
              <Box key={person} sx={{ mb: 4, pageBreakAfter: 'always' }}>
                <Typography variant="h5" gutterBottom>
                  Production Assignment: {person}
                </Typography>
                <Typography variant="subtitle1" gutterBottom>
                  Date: {format(new Date(selectedDate), 'MMMM dd, yyyy')} | 
                  Total Items: {items.length}
                </Typography>
                
                <TableContainer component={Paper} sx={{ mt: 2 }}>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell><strong>Item Name</strong></TableCell>
                        <TableCell><strong>Code</strong></TableCell>
                        <TableCell align="center"><strong>Production Qty</strong></TableCell>
                        <TableCell><strong>Category</strong></TableCell>
                        <TableCell><strong>Shift</strong></TableCell>
                        <TableCell><strong>Notes</strong></TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {items.map((item) => (
                        <TableRow key={item.id}>
                          <TableCell>{item.item_name}</TableCell>
                          <TableCell>{item.item_code}</TableCell>
                          <TableCell align="center">
                            <strong>{item.production_quantity}</strong>
                          </TableCell>
                          <TableCell>
                            {PRODUCTION_CATEGORIES[item.production_category_code]?.name}
                          </TableCell>
                          <TableCell>
                            {shifts.find(s => s.id === item.shift_id)?.name || 'All Day'}
                          </TableCell>
                          <TableCell>
                           
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
                
                <Box sx={{ mt: 3, display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant="body2">
                    Prepared by: ________________
                  </Typography>
                  <Typography variant="body2">
                    Signature: ________________
                  </Typography>
                </Box>
              </Box>
            ))}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPrintDialogOpen(false)}>Close</Button>
          <Button 
            variant="contained" 
            onClick={() => {
              window.print();
              setPrintDialogOpen(false);
            }}
            startIcon={<PrintIcon />}
          >
            Print
          </Button>
        </DialogActions>
      </Dialog>

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
    </Box>
  );
}