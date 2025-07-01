// src/components/TestConnection.jsx
import React, { useState, useEffect } from 'react';
import { Box, Button, Typography, Paper, Alert } from '@mui/material';
import { getInventoryService } from '../services/serviceFactory';

const inventoryService = getInventoryService();

const TestConnection = () => {
  const [testResult, setTestResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const testConnection = async () => {
    setLoading(true);
    setError(null);
    setTestResult(null);
    
    try {
      console.log('Testing connection to backend...');
      
      // Try the basic inventory endpoint
      const items = await inventoryService.fetchInventoryItems();
      
      setTestResult({
        success: true,
        itemCount: items.length,
        firstItem: items.length > 0 ? items[0] : null
      });
      
      console.log('Connection test successful:', items);
    } catch (err) {
      console.error('Connection test failed:', err);
      setError(err.message || 'Connection test failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Paper sx={{ p: 3, mb: 3 }}>
      <Typography variant="h6" gutterBottom>
        Backend Connection Tester
      </Typography>
      
      <Box sx={{ mb: 2 }}>
        <Button 
          variant="contained" 
          onClick={testConnection}
          disabled={loading}
        >
          {loading ? 'Testing...' : 'Test Connection'}
        </Button>
      </Box>
      
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}
      
      {testResult && (
        <Box>
          <Alert severity="success" sx={{ mb: 2 }}>
            Connection successful! Found {testResult.itemCount} inventory items.
          </Alert>
          
          {testResult.firstItem && (
            <Box>
              <Typography variant="subtitle1">Sample Item:</Typography>
              <pre style={{ backgroundColor: '#f5f5f5', padding: 16, borderRadius: 4, overflow: 'auto' }}>
                {JSON.stringify(testResult.firstItem, null, 2)}
              </pre>
            </Box>
          )}
        </Box>
      )}
    </Paper>
  );
};

export default TestConnection;