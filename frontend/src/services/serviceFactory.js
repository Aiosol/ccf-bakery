// src/services/serviceFactory.js
import apiService from './apiService';
import djangoApiService from './djangoApiService';
import inventoryService from './inventoryService';
import inventoryServiceDjango from './inventoryServiceDjango';

// You can control which API to use by setting this to 'django' or 'node'
// In a real app, this would come from environment variables
const API_TYPE = 'django'; // Change to 'node' if you want to use the proxy server

export const getApiService = () => {
  return API_TYPE === 'django' ? djangoApiService : apiService;
};

export const getInventoryService = () => {
  return API_TYPE === 'django' ? inventoryServiceDjango : inventoryService;
};