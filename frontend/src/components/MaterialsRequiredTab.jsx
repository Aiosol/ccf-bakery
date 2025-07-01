// frontend/src/components/MaterialsRequiredTab.jsx - ENHANCED VERSION

import React, { useState, useEffect, useMemo } from 'react';
import {
  Box,
  Typography,
  Paper,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Checkbox,
  Chip,
  IconButton,
  Collapse,
  FormControlLabel,
  Switch,
  Grid,
  Alert,
  Card,
  CardContent,
  Stack,
  Tooltip,
  CircularProgress
} from '@mui/material';
import {
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  Print as PrintIcon,
  Save as SaveIcon,
  Warning as WarningIcon,
  CheckCircle as CheckCircleIcon,
  Inventory as InventoryIcon,
  Assessment as AssessmentIcon
} from '@mui/icons-material';

const MaterialsRequiredTab = ({ 
  productionItems, 
  selectedItems, 
  onSelectionChange,
  selectedDate,
  selectedShift,
  shifts 
}) => {
  // State for view options
  const [groupBy, setGroupBy] = useState('category'); // 'category' or 'person'
  const [shiftView, setShiftView] = useState('combined'); // 'combined' or 'separate'
  const [selectedMaterialItems, setSelectedMaterialItems] = useState({});
  const [expandedIngredients, setExpandedIngredients] = useState(new Set());
  const [savedRequisitions, setSavedRequisitions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Category configuration matching your existing code
  const PRODUCTION_CATEGORIES = {
    'Production-001': { name: 'Bakery, Frozen & Savory - Mr. Sabuz', icon: '🥖' },
    'Production-002': { name: 'Cake & Pastry - Mr. Rakib', icon: '🍰' },
    'Production-003': { name: 'Resultant Items - Mr. Justin', icon: '🍽️' }
  };

  // ENHANCED: Calculate consolidated ingredient requirements with better error handling
  const materialRequirements = useMemo(() => {
    const requirements = new Map();
    
    try {
      // Filter selected production items
      const selectedProductionItems = productionItems.filter(item => 
        selectedItems.includes(item.id)
      );

      selectedProductionItems.forEach(item => {
        if (item.recipe && item.recipe.ingredients) {
          item.recipe.ingredients.forEach(ingredient => {
            try {
              const key = ingredient.inventory_item?.id || ingredient.inventory_item_id || ingredient.id;
              if (!key) {
                console.warn('Ingredient missing ID:', ingredient);
                return;
              }
              
              const requiredQty = (parseFloat(ingredient.quantity) || 0) * (parseFloat(item.production_quantity) || 0);
              
              if (requirements.has(key)) {
                const existing = requirements.get(key);
                existing.totalRequired += requiredQty;
                existing.usedInRecipes.push({
                  recipeName: item.recipe.name || 'Unknown Recipe',
                  itemName: item.item_name || 'Unknown Item',
                  quantity: requiredQty,
                  productionQty: item.production_quantity || 0,
                  category: item.production_category_code || 'A',
                  assignedTo: item.assigned_to || 'Unassigned'
                });
              } else {
                const inventoryItem = ingredient.inventory_item || ingredient;
                
                requirements.set(key, {
                  id: key,
                  name: inventoryItem?.name || ingredient.name || 'Unknown Material',
                  code: inventoryItem?.code || ingredient.code || '',
                  unit: inventoryItem?.unit || ingredient.unit || 'unit',
                  unitCost: parseFloat(inventoryItem?.unit_cost || ingredient.unit_cost || 0),
                  availableStock: parseFloat(inventoryItem?.quantity_available || ingredient.quantity_available || 0),
                  totalRequired: requiredQty,
                  usedInRecipes: [{
                    recipeName: item.recipe.name || 'Unknown Recipe',
                    itemName: item.item_name || 'Unknown Item',
                    quantity: requiredQty,
                    productionQty: item.production_quantity || 0,
                    category: item.production_category_code || 'A',
                    assignedTo: item.assigned_to || 'Unassigned'
                  }]
                });
              }
            } catch (ingredientError) {
              console.error('Error processing ingredient:', ingredient, ingredientError);
            }
          });
        } else if (item.recipe) {
          console.warn('Recipe missing ingredients:', item.recipe);
        }
      });

      return Array.from(requirements.values()).sort((a, b) => a.name.localeCompare(b.name));
    } catch (error) {
      console.error('Error calculating material requirements:', error);
      setError('Failed to calculate material requirements');
      return [];
    }
  }, [productionItems, selectedItems]);

  // ENHANCED: Group materials by category or person with better error handling
  const groupedMaterials = useMemo(() => {
    const groups = {};

    try {
      materialRequirements.forEach(material => {
        material.usedInRecipes.forEach(usage => {
          const groupKey = groupBy === 'category' 
            ? usage.category || 'A'
            : usage.assignedTo || 'Unassigned';
          
          if (!groups[groupKey]) {
            groups[groupKey] = {
              items: new Map(),
              totalItems: 0,
              categories: new Set(),
              people: new Set()
            };
          }

          const materialKey = material.id;
          if (groups[groupKey].items.has(materialKey)) {
            const existing = groups[groupKey].items.get(materialKey);
            existing.totalRequired += usage.quantity;
            existing.usages.push(usage);
          } else {
            groups[groupKey].items.set(materialKey, {
              ...material,
              totalRequired: usage.quantity,
              usages: [usage]
            });
          }

          groups[groupKey].categories.add(usage.category);
          groups[groupKey].people.add(usage.assignedTo);
          groups[groupKey].totalItems = groups[groupKey].items.size;
        });
      });

      return groups;
    } catch (error) {
      console.error('Error grouping materials:', error);
      return {};
    }
  }, [materialRequirements, groupBy]);

  // Handle item selection per category/person
  const handleItemSelection = (groupKey, materialId, checked) => {
    setSelectedMaterialItems(prev => ({
      ...prev,
      [groupKey]: {
        ...prev[groupKey],
        [materialId]: checked
      }
    }));
  };

  // Handle group selection
  const handleGroupSelection = (groupKey, checked) => {
    const groupItems = groupedMaterials[groupKey]?.items || new Map();
    const newSelections = {};
    
    Array.from(groupItems.keys()).forEach(materialId => {
      newSelections[materialId] = checked;
    });

    setSelectedMaterialItems(prev => ({
      ...prev,
      [groupKey]: newSelections
    }));
  };

  // Toggle ingredient breakdown
  const toggleIngredientBreakdown = (materialId) => {
    setExpandedIngredients(prev => {
      const newSet = new Set(prev);
      if (newSet.has(materialId)) {
        newSet.delete(materialId);
      } else {
        newSet.add(materialId);
      }
      return newSet;
    });
  };

  // Check if material has insufficient stock
  const isInsufficientStock = (material) => {
    return material.availableStock < material.totalRequired;
  };

  // ENHANCED: Generate print-friendly requisition with better formatting
  const printRequisition = () => {
    const printWindow = window.open('', '_blank');
    
    const printContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Materials Requisition - ${selectedDate}</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: Arial, sans-serif; margin: 20px; color: #000; }
          @media print { 
            body { margin: 0; }
            .page-break { page-break-after: always; }
          }
          .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #000; padding-bottom: 20px; }
          .company-name { font-size: 24px; font-weight: bold; margin-bottom: 5px; }
          .sheet-title { font-size: 18px; font-weight: bold; margin: 15px 0; }
          .date-info { margin-bottom: 20px; }
          .section { margin-bottom: 25px; }
          .section-header { background: #f5f5f5; padding: 10px; font-weight: bold; border: 1px solid #ddd; }
          .material-table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
          .material-table th, .material-table td { border: 1px solid #ddd; padding: 8px; text-align: left; }
          .material-table th { background: #f9f9f9; font-weight: bold; }
          .checkbox { width: 15px; height: 15px; border: 2px solid #333; display: inline-block; margin-right: 10px; }
          .insufficient { color: #d32f2f; font-weight: bold; }
          .signature-section { margin-top: 40px; display: flex; justify-content: space-between; }
          .signature-box { text-align: center; width: 200px; }
          .signature-line { border-bottom: 1px solid #000; height: 40px; margin-bottom: 5px; }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="company-name">CLOUD CAKE & FOODS</div>
          <div class="sheet-title">Materials Requisition Form</div>
          <div class="date-info">
            <strong>Date:</strong> ${selectedDate} | 
            <strong>View:</strong> ${shiftView === 'combined' ? 'All Shifts' : 'Separate Shifts'} |
            <strong>Generated:</strong> ${new Date().toLocaleString()}
          </div>
        </div>
        
        ${Object.entries(groupedMaterials).map(([groupKey, group]) => {
          const groupName = groupBy === 'category' 
            ? PRODUCTION_CATEGORIES[groupKey]?.name || groupKey
            : groupKey;
          
          const insufficientCount = Array.from(group.items.values()).filter(isInsufficientStock).length;
          
          return `
            <div class="section">
              <div class="section-header">
                ${groupName} (${group.totalItems} materials)
                ${insufficientCount > 0 ? `<span class="insufficient"> - ${insufficientCount} INSUFFICIENT STOCK</span>` : ''}
              </div>
              <table class="material-table">
                <thead>
                  <tr>
                    <th width="30">✓</th>
                    <th width="80">Code</th>
                    <th>Material Name</th>
                    <th width="80">Required</th>
                    <th width="50">Unit</th>
                    <th width="80">Available</th>
                    <th width="100">Status</th>
                  </tr>
                </thead>
                <tbody>
                  ${Array.from(group.items.values()).map(material => `
                    <tr>
                      <td><span class="checkbox"></span></td>
                      <td>${material.code || 'N/A'}</td>
                      <td>${material.name}</td>
                      <td><strong>${material.totalRequired.toFixed(2)}</strong></td>
                      <td>${material.unit}</td>
                      <td>${material.availableStock.toFixed(2)}</td>
                      <td class="${isInsufficientStock(material) ? 'insufficient' : ''}">
                        ${isInsufficientStock(material) ? 
                          `⚠️ SHORT BY ${(material.totalRequired - material.availableStock).toFixed(2)}` : 
                          '✅ AVAILABLE'
                        }
                      </td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            </div>
          `;
        }).join('')}
        
        <div class="signature-section">
          <div class="signature-box">
            <div class="signature-line"></div>
            <p><strong>Requested By</strong></p>
          </div>
          <div class="signature-box">
            <div class="signature-line"></div>
            <p><strong>Approved By</strong></p>
          </div>
          <div class="signature-box">
            <div class="signature-line"></div>
            <p><strong>Issued By</strong></p>
          </div>
        </div>
      </body>
      </html>
    `;
    
    printWindow.document.write(printContent);
    printWindow.document.close();
    printWindow.print();
  };

  // ENHANCED: Save requisition to backend
  const saveRequisition = async () => {
    try {
      setLoading(true);
      
      const requisitionData = {
        date: selectedDate,
        shift_id: selectedShift,
        group_by: groupBy,
        shift_view: shiftView,
        materials: materialRequirements,
        selected_items: selectedMaterialItems,
        total_items: materialRequirements.length,
        insufficient_count: materialRequirements.filter(isInsufficientStock).length
      };
      
      // For now, save to localStorage (you can implement backend API later)
      const requisition = {
        id: Date.now(),
        ...requisitionData,
        created_at: new Date().toISOString()
      };
      
      const existingRequisitions = JSON.parse(localStorage.getItem('materialRequisitions') || '[]');
      const updatedRequisitions = [requisition, ...existingRequisitions.slice(0, 9)]; // Keep last 10
      
      localStorage.setItem('materialRequisitions', JSON.stringify(updatedRequisitions));
      setSavedRequisitions(updatedRequisitions);
      
      console.log('Saving requisition:', requisition);
      
      // Show success message
      setTimeout(() => {
        alert('Requisition saved successfully!');
      }, 100);
      
    } catch (error) {
      console.error('Error saving requisition:', error);
      alert('Failed to save requisition: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  // Load saved requisitions on component mount
  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem('materialRequisitions') || '[]');
      setSavedRequisitions(saved);
    } catch (error) {
      console.error('Error loading saved requisitions:', error);
    }
  }, []);

  if (materialRequirements.length === 0) {
    return (
      <Paper sx={{ p: 4, textAlign: 'center' }}>
        <InventoryIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
        <Typography variant="h6" color="text.secondary" gutterBottom>
          No Materials Required
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Select production items with recipes to see material requirements
        </Typography>
      </Paper>
    );
  }

  // Calculate summary statistics
  const totalCost = materialRequirements.reduce((total, material) => 
    total + (material.totalRequired * material.unitCost), 0
  );
  const insufficientItems = materialRequirements.filter(isInsufficientStock);

  return (
    <Box>
      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* Controls */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} md={3}>
            <Typography variant="h6" gutterBottom>
              <AssessmentIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
              Materials Required
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {materialRequirements.length} unique materials
            </Typography>
          </Grid>
          
          <Grid item xs={12} md={6}>
            <Stack direction="row" spacing={2} alignItems="center" flexWrap="wrap">
              <FormControlLabel
                control={
                  <Switch
                    checked={groupBy === 'person'}
                    onChange={(e) => setGroupBy(e.target.checked ? 'person' : 'category')}
                  />
                }
                label={`Group by ${groupBy === 'category' ? 'Category' : 'Person'}`}
              />
              
              <FormControlLabel
                control={
                  <Switch
                    checked={shiftView === 'separate'}
                    onChange={(e) => setShiftView(e.target.checked ? 'separate' : 'combined')}
                  />
                }
                label={`${shiftView === 'combined' ? 'Combined' : 'Separate'} Shifts`}
              />
            </Stack>
          </Grid>
          
          <Grid item xs={12} md={3}>
            <Stack direction="row" spacing={1}>
              <Button
                variant="outlined"
                startIcon={loading ? <CircularProgress size={16} /> : <SaveIcon />}
                onClick={saveRequisition}
                disabled={loading}
                size="small"
              >
                Save
              </Button>
              <Button
                variant="contained"
                startIcon={<PrintIcon />}
                onClick={printRequisition}
                size="small"
              >
                Print
              </Button>
            </Stack>
          </Grid>
        </Grid>
      </Paper>

      {/* Summary Cards */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} md={3}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <Typography variant="h4" color="primary">
                {materialRequirements.length}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Total Materials
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={3}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <Typography variant="h4" color="error">
                {insufficientItems.length}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Insufficient Stock
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={3}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <Typography variant="h4" color="success.main">
                {materialRequirements.length - insufficientItems.length}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Available
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={3}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <Typography variant="h4" color="primary">
                ৳{totalCost.toFixed(2)}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Total Cost
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Materials by Group */}
      {Object.entries(groupedMaterials).map(([groupKey, group]) => {
        const groupName = groupBy === 'category' 
          ? PRODUCTION_CATEGORIES[groupKey]?.name || groupKey
          : groupKey;

        const selectedCount = Object.values(selectedMaterialItems[groupKey] || {}).filter(Boolean).length;
        const totalCount = group.totalItems;
        const groupInsufficientCount = Array.from(group.items.values()).filter(isInsufficientStock).length;

        return (
          <Card key={groupKey} sx={{ mb: 2 }}>
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <Checkbox
                    checked={selectedCount === totalCount && totalCount > 0}
                    indeterminate={selectedCount > 0 && selectedCount < totalCount}
                    onChange={(e) => handleGroupSelection(groupKey, e.target.checked)}
                  />
                  <Typography variant="h6">
                    {PRODUCTION_CATEGORIES[groupKey]?.icon} {groupName}
                  </Typography>
                  <Chip 
                    label={`${totalCount} materials`}
                    size="small"
                    color="primary"
                  />
                  {selectedCount > 0 && (
                    <Chip 
                      label={`${selectedCount} selected`}
                      size="small"
                      color="success"
                    />
                  )}
                  {groupInsufficientCount > 0 && (
                    <Chip 
                      label={`${groupInsufficientCount} insufficient`}
                      size="small"
                      color="error"
                      icon={<WarningIcon />}
                    />
                  )}
                </Box>
              </Box>

              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell padding="checkbox"></TableCell>
                      <TableCell>Material</TableCell>
                      <TableCell align="right">Required</TableCell>
                      <TableCell align="right">Available</TableCell>
                      <TableCell align="center">Status</TableCell>
                      <TableCell align="center">Details</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {Array.from(group.items.values()).map((material) => {
                      const isSelected = selectedMaterialItems[groupKey]?.[material.id] || false;
                      const isExpanded = expandedIngredients.has(material.id);
                      const insufficient = isInsufficientStock(material);

                      return (
                        <React.Fragment key={material.id}>
                          <TableRow 
                            sx={{ 
                              bgcolor: isSelected ? 'action.selected' : 'inherit',
                              '&:hover': { bgcolor: 'action.hover' }
                            }}
                          >
                            <TableCell padding="checkbox">
                              <Checkbox
                                checked={isSelected}
                                onChange={(e) => handleItemSelection(groupKey, material.id, e.target.checked)}
                              />
                            </TableCell>
                            <TableCell>
                              <Box>
                                <Typography variant="body2" fontWeight="medium">
                                  {material.name}
                                </Typography>
                                <Typography variant="caption" color="text.secondary">
                                  {material.code && `${material.code} • `}Cost: ৳{material.unitCost.toFixed(2)}/{material.unit}
                                </Typography>
                              </Box>
                            </TableCell>
                            <TableCell align="right">
                              <Typography variant="body2" fontWeight="bold">
                                {material.totalRequired.toFixed(2)} {material.unit}
                              </Typography>
                              <Typography variant="caption" color="text.secondary">
                                ৳{(material.totalRequired * material.unitCost).toFixed(2)}
                              </Typography>
                            </TableCell>
                            <TableCell align="right">
                              <Typography 
                                variant="body2" 
                                color={insufficient ? 'error' : 'success.main'}
                              >
                                {material.availableStock.toFixed(2)} {material.unit}
                              </Typography>
                            </TableCell>
                            <TableCell align="center">
                              {insufficient ? (
                                <Tooltip title={`Short by ${(material.totalRequired - material.availableStock).toFixed(2)} ${material.unit}`}>
                                  <Chip 
                                    icon={<WarningIcon />}
                                    label="Insufficient" 
                                    color="error" 
                                    size="small"
                                  />
                                </Tooltip>
                              ) : (
                                <Chip 
                                  icon={<CheckCircleIcon />}
                                  label="Available" 
                                  color="success" 
                                  size="small"
                                />
                              )}
                            </TableCell>
                            <TableCell align="center">
                              <IconButton
                                size="small"
                                onClick={() => toggleIngredientBreakdown(material.id)}
                              >
                                {isExpanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                              </IconButton>
                            </TableCell>
                          </TableRow>
                          
                          {/* Expandable breakdown */}
                          <TableRow>
                            <TableCell colSpan={6} sx={{ py: 0 }}>
                              <Collapse in={isExpanded}>
                                <Box sx={{ p: 2, bgcolor: 'grey.50' }}>
                                  <Typography variant="subtitle2" gutterBottom>
                                    Used in recipes:
                                  </Typography>
                                  {material.usages?.map((usage, index) => (
                                    <Box key={index} sx={{ 
                                      display: 'flex', 
                                      justifyContent: 'space-between', 
                                      py: 0.5,
                                      borderBottom: index < material.usages.length - 1 ? '1px solid #eee' : 'none'
                                    }}>
                                      <Box>
                                        <Typography variant="body2">
                                          <strong>{usage.itemName}</strong> ({usage.recipeName})
                                        </Typography>
                                        <Typography variant="caption" color="text.secondary">
                                          {PRODUCTION_CATEGORIES[usage.category]?.name} • {usage.assignedTo} • {usage.productionQty} units
                                        </Typography>
                                      </Box>
                                      <Typography variant="body2" fontWeight="medium">
                                        {usage.quantity.toFixed(2)} {material.unit}
                                      </Typography>
                                    </Box>
                                  )) || (
                                    <Typography variant="body2" color="text.secondary">
                                      No usage details available
                                    </Typography>
                                  )}
                                </Box>
                              </Collapse>
                            </TableCell>
                          </TableRow>
                        </React.Fragment>
                      );
                    })}
                  </TableBody>
                </Table>
              </TableContainer>
            </CardContent>
          </Card>
        );
      })}

      {/* Enhanced Summary */}
      <Paper sx={{ p: 2, mt: 3 }}>
        <Typography variant="h6" gutterBottom>
          Requisition Summary
        </Typography>
        <Grid container spacing={2}>
          <Grid item xs={12} md={3}>
            <Typography variant="subtitle2" color="text.secondary">
              Total Materials
            </Typography>
            <Typography variant="h6">
              {materialRequirements.length}
            </Typography>
          </Grid>
          <Grid item xs={12} md={3}>
            <Typography variant="subtitle2" color="text.secondary">
              Insufficient Stock
            </Typography>
            <Typography variant="h6" color="error">
              {insufficientItems.length}
            </Typography>
          </Grid>
          <Grid item xs={12} md={3}>
            <Typography variant="subtitle2" color="text.secondary">
              Total Cost
            </Typography>
            <Typography variant="h6" color="primary">
              ৳{totalCost.toFixed(2)}
            </Typography>
          </Grid>
          <Grid item xs={12} md={3}>
            <Typography variant="subtitle2" color="text.secondary">
              Readiness Status
            </Typography>
            <Typography 
              variant="h6" 
              color={insufficientItems.length === 0 ? 'success.main' : 'warning.main'}
            >
              {insufficientItems.length === 0 ? '✅ Ready' : '⚠️ Missing Items'}
            </Typography>
          </Grid>
        </Grid>
        
        {insufficientItems.length > 0 && (
          <Alert severity="warning" sx={{ mt: 2 }}>
            <Typography variant="body2">
              <strong>{insufficientItems.length} materials</strong> have insufficient stock. 
              Production may be delayed until these items are restocked.
            </Typography>
          </Alert>
        )}
      </Paper>
    </Box>
  );
};

export default MaterialsRequiredTab;