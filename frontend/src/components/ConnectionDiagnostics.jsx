// src/components/ConnectionDiagnostics.jsx
import React, { useState } from 'react';
import { 
  Box, Button, Typography, Paper, Alert, CircularProgress,
  Accordion, AccordionSummary, AccordionDetails, Divider
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { testApiEndpoints, testCors } from '../utils/debugUtils';

const ConnectionDiagnostics = () => {
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState(null);
  
  const runDiagnostics = async () => {
    setLoading(true);
    setResults(null);
    
    try {
      // Test Django API endpoints
      const djangoBaseUrl = 'http://127.0.0.1:8000/api';
      const djangoEndpoints = [
        '/inventory/',
        '/inventory-items/',
        '/sync-inventory/',
        '/diagnostics/',
        '/dashboard/'
      ];
      
      const djangoTests = await testApiEndpoints(djangoBaseUrl, djangoEndpoints);
      
      // Test CORS
      const corsTest = await testCors(`${djangoBaseUrl}/inventory/`);
      
      // Try a direct test to Django API backend diagnostics endpoint if it exists
      let diagnostics = null;
      try {
        const diagnosticsResponse = await fetch(`${djangoBaseUrl}/diagnostics/`);
        if (diagnosticsResponse.ok) {
          diagnostics = await diagnosticsResponse.json();
        }
      } catch (e) {
        console.error('Error fetching diagnostics:', e);
      }
      
      setResults({
        djangoTests,
        corsTest,
        diagnostics,
        timestamp: new Date().toLocaleString()
      });
    } catch (error) {
      console.error('Error running diagnostics:', error);
      setResults({
        error: error.message,
        timestamp: new Date().toLocaleString()
      });
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <Paper sx={{ p: 3, mb: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h6">Connection Diagnostics</Typography>
        <Button
          variant="contained"
          color="primary"
          onClick={runDiagnostics}
          disabled={loading}
        >
          {loading ? <CircularProgress size={24} /> : 'Run Diagnostics'}
        </Button>
      </Box>
      
      <Divider sx={{ mb: 2 }} />
      
      {results && (
        <>
          <Alert 
            severity={results.error ? 'error' : 'info'} 
            sx={{ mb: 2 }}
          >
            {results.error 
              ? `Diagnostics encountered an error: ${results.error}` 
              : `Diagnostics completed at ${results.timestamp}`}
          </Alert>
          
          {!results.error && (
            <>
              <Accordion defaultExpanded>
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                  <Typography>Django API Endpoints</Typography>
                </AccordionSummary>
                <AccordionDetails>
                  <Box sx={{ maxHeight: 300, overflow: 'auto' }}>
                    <pre style={{ whiteSpace: 'pre-wrap' }}>
                      {JSON.stringify(results.djangoTests, null, 2)}
                    </pre>
                  </Box>
                </AccordionDetails>
              </Accordion>
              
              <Accordion>
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                  <Typography>CORS Test Results</Typography>
                </AccordionSummary>
                <AccordionDetails>
                  <Box>
                    <pre style={{ whiteSpace: 'pre-wrap' }}>
                      {JSON.stringify(results.corsTest, null, 2)}
                    </pre>
                  </Box>
                </AccordionDetails>
              </Accordion>
              
              {results.diagnostics && (
                <Accordion>
                  <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                    <Typography>Backend Diagnostics</Typography>
                  </AccordionSummary>
                  <AccordionDetails>
                    <Box sx={{ maxHeight: 300, overflow: 'auto' }}>
                      <pre style={{ whiteSpace: 'pre-wrap' }}>
                        {JSON.stringify(results.diagnostics, null, 2)}
                      </pre>
                    </Box>
                  </AccordionDetails>
                </Accordion>
              )}
            </>
          )}
        </>
      )}
    </Paper>
  );
};

export default ConnectionDiagnostics;