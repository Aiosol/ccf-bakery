// Complete Fixed RecipePriceHistoryAnalysis.jsx
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip as RechartsTooltip, 
  Legend, 
  ResponsiveContainer, 
  BarChart, 
  Bar 
} from 'recharts';

// Fixed Price History Service that works with your actual API
const priceHistoryService = {
  async getRecipePriceHistory(recipeId, days = 30) {
    try {
      console.log(`Fetching price history for recipe ${recipeId}, days: ${days}`);
      
      const response = await fetch(`/api/recipes/${recipeId}/price_history/?days=${days}`);
      
      console.log('Response status:', response.status);
      console.log('Response headers:', response.headers.get('content-type'));
      
      if (!response.ok) {
        throw new Error(`API error: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      console.log('API Response data:', data);
      
      // Your API returns this structure, so let's use it directly
      return {
        success: data.success !== false,
        recipe: data.recipe || {
          id: recipeId,
          name: 'Unknown Recipe',
          total_cost: 0,
          ingredient_price_changes: []
        },
        cost_impact_summary: data.cost_impact_summary || {
          total_cost_impact: 0,
          affected_ingredients: [],
          period_days: days
        },
        // Use the actual field name from your API
        ingredientPriceChanges: data.recipe?.ingredient_price_changes || [],
        period_days: data.period_days || days,
        message: data.message || null
      };
    } catch (error) {
      console.error('Error fetching price history:', error);
      
      // Return a safe fallback
      return {
        success: false,
        recipe: {
          id: recipeId,
          name: 'Unknown Recipe',
          total_cost: 0,
          ingredient_price_changes: []
        },
        cost_impact_summary: {
          total_cost_impact: 0,
          affected_ingredients: [],
          period_days: days
        },
        ingredientPriceChanges: [],
        period_days: days,
        error: error.message,
        isUsingFallback: true
      };
    }
  },
  
  async triggerInventorySync() {
    try {
      const response = await fetch('/api/inventory/sync/', { method: 'POST' });
      
      if (!response.ok) {
        console.warn('Inventory sync endpoint returned error:', response.status);
        return { message: 'Sync functionality returned an error' };
      }
      
      return await response.json();
    } catch (error) {
      console.warn('Inventory sync failed:', error.message);
      return { message: 'Sync functionality not available' };
    }
  },
  
  formatCurrency(value, currency = 'BDT') {
    if (value == null || isNaN(value)) return 'N/A';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 2,
    }).format(value);
  },
  
  formatPercentage(value) {
    if (value == null || isNaN(value)) return 'N/A';
    const sign = value > 0 ? '+' : '';
    return `${sign}${value.toFixed(1)}%`;
  }
};

const RecipePriceHistoryAnalysis = ({ recipeId, recipeName, isOpen, onClose }) => {
  // State management
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [priceHistoryData, setPriceHistoryData] = useState(null);
  const [selectedTab, setSelectedTab] = useState(0);
  const [timeRange, setTimeRange] = useState(30);
  const [refreshing, setRefreshing] = useState(false);
  const [isUsingFallback, setIsUsingFallback] = useState(false);

  // Fetch price history data
  const fetchPriceHistory = useCallback(async (days = timeRange) => {
    if (!recipeId) return;
    
    try {
      setLoading(true);
      setError(null);
      setIsUsingFallback(false);
      
      console.log('Fetching price history for recipe:', recipeId);
      const response = await priceHistoryService.getRecipePriceHistory(recipeId, days);
      
      console.log('Price history response:', response);
      
      if (response.isUsingFallback) {
        setIsUsingFallback(true);
      }
      
      setPriceHistoryData(response);
    } catch (err) {
      console.error('Error in fetchPriceHistory:', err);
      setError(err.message || 'Failed to load price history');
      setIsUsingFallback(true);
    } finally {
      setLoading(false);
    }
  }, [recipeId, timeRange]);

  // Load data when component opens
  useEffect(() => {
    if (isOpen && recipeId) {
      console.log('Component opened, fetching data for recipe:', recipeId);
      fetchPriceHistory();
    }
  }, [isOpen, recipeId, fetchPriceHistory]);

  // Handle time range change
  const handleTimeRangeChange = (event) => {
    const newRange = parseInt(event.target.value);
    setTimeRange(newRange);
    fetchPriceHistory(newRange);
  };

  // Handle refresh
  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await priceHistoryService.triggerInventorySync();
      await fetchPriceHistory();
    } catch (err) {
      console.warn('Refresh failed:', err.message);
    } finally {
      setRefreshing(false);
    }
  };

  // Calculate summary statistics
  const summaryStats = useMemo(() => {
    if (!priceHistoryData?.ingredientPriceChanges) {
      return {
        totalChanges: 0,
        totalImpact: 0,
        volatileIngredients: 0,
        significantChanges: 0
      };
    }

    const ingredientChanges = priceHistoryData.ingredientPriceChanges;
    
    const totalChanges = ingredientChanges.reduce(
      (sum, ing) => sum + (ing.changes?.length || 0), 0
    );
    
    const totalImpact = priceHistoryData.cost_impact_summary?.total_cost_impact || 0;
    
    const volatileIngredients = ingredientChanges.filter(
      ing => ing.changes && ing.changes.length > 0
    ).length;
    
    const significantChanges = ingredientChanges.reduce(
      (sum, ing) => sum + (ing.changes?.filter(change => Math.abs(change.change_percentage || 0) > 5).length || 0), 0
    );

    return {
      totalChanges,
      totalImpact,
      volatileIngredients,
      significantChanges
    };
  }, [priceHistoryData]);

  // Prepare chart data
  const chartData = useMemo(() => {
    if (!priceHistoryData?.ingredientPriceChanges || priceHistoryData.ingredientPriceChanges.length === 0) {
      return [];
    }

    const allChanges = [];
    let runningCost = priceHistoryData.recipe?.total_cost || 0;

    // Get all changes and sort by date
    priceHistoryData.ingredientPriceChanges.forEach(ingredient => {
      if (ingredient.changes && ingredient.changes.length > 0) {
        ingredient.changes.forEach(change => {
          allChanges.push({
            ...change,
            ingredient_name: ingredient.ingredient_name,
            date: new Date(change.changed_at)
          });
        });
      }
    });

    if (allChanges.length === 0) {
      return [{
        date: 'Current',
        cost: runningCost,
        displayDate: 'Now'
      }];
    }

    allChanges.sort((a, b) => b.date - a.date);

    const chartPoints = [{
      date: 'Current',
      cost: runningCost,
      displayDate: 'Now'
    }];

    // Build timeline working backwards
    allChanges.forEach(change => {
      runningCost -= (change.recipe_impact || 0);
      chartPoints.unshift({
        date: change.date.toISOString().split('T')[0],
        cost: runningCost,
        displayDate: change.date.toLocaleDateString(),
        ingredient: change.ingredient_name,
        impact: change.recipe_impact,
        percentage: change.change_percentage
      });
    });

    return chartPoints;
  }, [priceHistoryData]);

  const styles = {
    dialog: {
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      display: isOpen ? 'flex' : 'none',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
    },
    dialogContent: {
      backgroundColor: 'white',
      borderRadius: '8px',
      width: '90vw',
      maxWidth: '1200px',
      maxHeight: '90vh',
      overflow: 'auto',
      boxShadow: '0 10px 25px rgba(0, 0, 0, 0.2)',
    },
    header: {
      padding: '20px',
      borderBottom: '1px solid #e0e0e0',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    summaryGrid: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
      gap: '16px',
      padding: '20px',
    },
    summaryCard: {
      border: '1px solid #e0e0e0',
      borderRadius: '8px',
      padding: '16px',
      textAlign: 'center',
      backgroundColor: '#f9f9f9',
    },
    tabs: {
      display: 'flex',
      borderBottom: '1px solid #e0e0e0',
      backgroundColor: '#f5f5f5',
    },
    tab: {
      padding: '12px 24px',
      border: 'none',
      backgroundColor: 'transparent',
      cursor: 'pointer',
      borderBottom: '2px solid transparent',
    },
    activeTab: {
      borderBottomColor: '#1976d2',
      backgroundColor: 'white',
    },
    tabContent: {
      padding: '20px',
    },
    info: {
      backgroundColor: '#e3f2fd',
      color: '#1976d2',
      padding: '12px',
      borderRadius: '4px',
      margin: '16px',
      border: '1px solid #bbdefb',
    },
    button: {
      padding: '8px 16px',
      border: '1px solid #1976d2',
      backgroundColor: '#1976d2',
      color: 'white',
      borderRadius: '4px',
      cursor: 'pointer',
      margin: '0 4px',
    },
    error: {
      backgroundColor: '#ffebee',
      color: '#c62828',
      padding: '12px',
      borderRadius: '4px',
      margin: '16px',
    },
  };

  if (loading && !priceHistoryData) {
    return (
      <div style={styles.dialog}>
        <div style={styles.dialogContent}>
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '40px' }}>
            <div>Loading price history...</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.dialog}>
      <div style={styles.dialogContent}>
        {/* Header */}
        <div style={styles.header}>
          <div>
            <h2>Price History Analysis</h2>
            <p style={{ margin: 0, color: '#666' }}>{recipeName}</p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <select value={timeRange} onChange={handleTimeRangeChange} style={{ padding: '4px 8px' }}>
              <option value={7}>Last 7 days</option>
              <option value={30}>Last 30 days</option>
              <option value={90}>Last 90 days</option>
              <option value={180}>Last 6 months</option>
            </select>
            <button 
              style={styles.button} 
              onClick={handleRefresh} 
              disabled={refreshing}
            >
              {refreshing ? '↻' : '🔄'} Refresh
            </button>
            <button style={styles.button} onClick={onClose}>×</button>
          </div>
        </div>

        {/* Show info if using real API data */}
        {priceHistoryData && !isUsingFallback && (
          <div style={styles.info}>
            <strong>✅ Connected to API:</strong> Showing real price history data from your backend.
            {priceHistoryData.message && <span> - {priceHistoryData.message}</span>}
          </div>
        )}

        {error && (
          <div style={styles.error}>
            <strong>Error:</strong> {error}
          </div>
        )}

        {/* Summary Cards */}
        <div style={styles.summaryGrid}>
          <div style={styles.summaryCard}>
            <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#1976d2' }}>
              {summaryStats.totalChanges}
            </div>
            <div style={{ fontSize: '12px', color: '#666' }}>Total Price Changes</div>
          </div>
          <div style={styles.summaryCard}>
            <div style={{ fontSize: '24px', fontWeight: 'bold', color: summaryStats.totalImpact > 0 ? '#d32f2f' : '#2e7d32' }}>
              {priceHistoryService.formatCurrency(Math.abs(summaryStats.totalImpact))}
            </div>
            <div style={{ fontSize: '12px', color: '#666' }}>Cost Impact</div>
          </div>
          <div style={styles.summaryCard}>
            <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#f57c00' }}>
              {summaryStats.volatileIngredients}
            </div>
            <div style={{ fontSize: '12px', color: '#666' }}>Affected Ingredients</div>
          </div>
          <div style={styles.summaryCard}>
            <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#1976d2' }}>
              {summaryStats.significantChanges}
            </div>
            <div style={{ fontSize: '12px', color: '#666' }}>Significant Changes (&gt;5%)</div>
          </div>
        </div>


        {/* Tabs */}
        <div style={styles.tabs}>
          <button
            style={{
              ...styles.tab,
              ...(selectedTab === 0 ? styles.activeTab : {})
            }}
            onClick={() => setSelectedTab(0)}
          >
            Cost Trend
          </button>
          <button
            style={{
              ...styles.tab,
              ...(selectedTab === 1 ? styles.activeTab : {})
            }}
            onClick={() => setSelectedTab(1)}
          >
            Ingredient Changes
          </button>
          <button
            style={{
              ...styles.tab,
              ...(selectedTab === 2 ? styles.activeTab : {})
            }}
            onClick={() => setSelectedTab(2)}
          >
            Raw Data
          </button>
        </div>

        {/* Tab Content */}
        <div style={styles.tabContent}>
          {selectedTab === 0 && (
            <div>
              <h3>Recipe Cost Trend (Last {timeRange} Days)</h3>
              {chartData.length > 1 ? (
                <div style={{ height: '400px', width: '100%' }}>
                  <ResponsiveContainer>
                    <LineChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis 
                        dataKey="displayDate" 
                        angle={-45}
                        textAnchor="end"
                        height={80}
                      />
                      <YAxis 
                        tickFormatter={(value) => `৳${value.toFixed(0)}`}
                      />
                      <RechartsTooltip 
                        formatter={(value) => [priceHistoryService.formatCurrency(value), 'Recipe Cost']}
                        labelFormatter={(label) => `Date: ${label}`}
                      />
                      <Legend />
                      <Line 
                        type="monotone" 
                        dataKey="cost" 
                        stroke="#1976d2"
                        strokeWidth={3}
                        dot={{ fill: '#1976d2', strokeWidth: 2, r: 6 }}
                        name="Recipe Cost"
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div style={styles.info}>
                  No price changes recorded in the last {timeRange} days. The recipe cost has remained stable.
                </div>
              )}
            </div>
          )}

          {selectedTab === 1 && (
            <div>
              <h3>Ingredient Price Changes ({timeRange} days)</h3>
              {priceHistoryData?.ingredientPriceChanges?.length > 0 ? (
                <div>
                  {priceHistoryData.ingredientPriceChanges.map((ingredient, index) => (
                    <div key={index} style={{ marginBottom: '16px', padding: '12px', border: '1px solid #e0e0e0', borderRadius: '4px' }}>
                      <h4>{ingredient.ingredient_name} ({ingredient.ingredient_code})</h4>
                      <p>Current Cost: {priceHistoryService.formatCurrency(ingredient.current_cost)}</p>
                      <p>Quantity in Recipe: {ingredient.quantity} {ingredient.unit || 'units'}</p>
                      
                      {ingredient.changes && ingredient.changes.length > 0 ? (
                        <div>
                          <strong>Recent Changes:</strong>
                          <ul>
                            {ingredient.changes.slice(0, 3).map((change, changeIndex) => (
                              <li key={changeIndex}>
                                {new Date(change.changed_at).toLocaleDateString()}: 
                                {priceHistoryService.formatCurrency(change.old_price)} → {priceHistoryService.formatCurrency(change.new_price)} 
                                ({priceHistoryService.formatPercentage(change.change_percentage)})
                                {change.recipe_impact && (
                                  <span> - Recipe Impact: {priceHistoryService.formatCurrency(change.recipe_impact)}</span>
                                )}
                              </li>
                            ))}
                          </ul>
                        </div>
                      ) : (
                        <p><em>No price changes in this period</em></p>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div style={styles.info}>
                  No ingredient price changes found for the selected time period.
                </div>
              )}
            </div>
          )}

          {selectedTab === 2 && (
            <div>
              <h3>Raw API Data</h3>
              <div style={{ backgroundColor: '#f5f5f5', padding: '16px', borderRadius: '4px', overflow: 'auto' }}>
                <pre style={{ fontSize: '12px', margin: 0 }}>
                  {JSON.stringify(priceHistoryData, null, 2)}
                </pre>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{ padding: '16px', borderTop: '1px solid #e0e0e0', textAlign: 'right' }}>
          <button style={styles.button} onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default RecipePriceHistoryAnalysis;