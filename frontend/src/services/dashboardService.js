// dashboardService.js - Service for dashboard-related API calls

import apiService from './apiService';

const dashboardService = {
  // Get dashboard summary data
  fetchDashboardData: async () => {
    return apiService.get('/dashboard/');
  },

  // Get cost analysis report
  getCostAnalysisReport: async (params = {}) => {
    return apiService.get('/dashboard/cost_analysis/', params);
  },

  // Get production history report
  getProductionHistoryReport: async (params = {}) => {
    return apiService.get('/dashboard/production_history/', params);
  },

  // Get inventory usage report
  getInventoryUsageReport: async (params = {}) => {
    return apiService.get('/dashboard/inventory_usage/', params);
  },
};

export default dashboardService;