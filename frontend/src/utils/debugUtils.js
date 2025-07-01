// src/utils/debugUtils.js
/**
 * Debug utilities for troubleshooting API connections
 */

/**
 * Test multiple possible API endpoints and log the results
 * @param {string} baseUrl - Base URL of the API
 * @param {Array<string>} endpoints - Array of endpoints to test
 * @returns {Promise<Object>} - Results of tests
 */
export const testApiEndpoints = async (baseUrl, endpoints) => {
    const results = {};
    
    console.log(`Testing ${endpoints.length} endpoints at ${baseUrl}...`);
    
    for (const endpoint of endpoints) {
      const url = `${baseUrl}${endpoint}`;
      console.log(`Testing endpoint: ${url}`);
      
      try {
        const response = await fetch(url);
        const status = response.status;
        console.log(`${endpoint}: Status ${status}`);
        
        let data = null;
        try {
          const text = await response.text();
          try {
            data = JSON.parse(text);
            console.log(`${endpoint}: Successfully parsed JSON response`);
          } catch (jsonError) {
            console.log(`${endpoint}: Not a valid JSON response`);
            data = { text: text.substring(0, 100) + '...' };
          }
        } catch (textError) {
          console.log(`${endpoint}: Could not get response text`);
        }
        
        results[endpoint] = {
          success: response.ok,
          status,
          data: data ? (Array.isArray(data) ? `Array with ${data.length} items` : data) : null
        };
      } catch (error) {
        console.error(`${endpoint}: Request failed - ${error.message}`);
        results[endpoint] = {
          success: false,
          error: error.message
        };
      }
    }
    
    console.log('Endpoint test results:', results);
    return results;
  };
  
  /**
   * Test CORS configuration
   * @param {string} url - URL to test CORS with
   * @returns {Promise<Object>} - CORS test result
   */
  export const testCors = async (url) => {
    try {
      console.log(`Testing CORS at ${url}...`);
      
      const response = await fetch(url, {
        method: 'OPTIONS',
        headers: {
          'Access-Control-Request-Method': 'GET',
          'Origin': window.location.origin
        }
      });
      
      const corsHeaders = {
        'access-control-allow-origin': response.headers.get('access-control-allow-origin'),
        'access-control-allow-methods': response.headers.get('access-control-allow-methods'),
        'access-control-allow-headers': response.headers.get('access-control-allow-headers'),
        'access-control-allow-credentials': response.headers.get('access-control-allow-credentials')
      };
      
      console.log('CORS headers:', corsHeaders);
      
      return {
        success: response.ok,
        status: response.status,
        headers: corsHeaders
      };
    } catch (error) {
      console.error(`CORS test failed: ${error.message}`);
      return {
        success: false,
        error: error.message
      };
    }
  };