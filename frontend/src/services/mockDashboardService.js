// mockDashboardService.js - Mock service for dashboard data during development

// Mock inventory items with low stock
const lowInventoryItems = [
    {
      id: 1,
      manager_item_id: 'INV-001',
      name: 'All-Purpose Flour',
      unit: 'kg',
      quantity_available: 2.3,
      threshold_quantity: 5,
      unit_cost: 1.25,
      is_low_stock: true
    },
    {
      id: 2,
      manager_item_id: 'INV-002',
      name: 'Granulated Sugar',
      unit: 'kg',
      quantity_available: 1.8,
      threshold_quantity: 3,
      unit_cost: 1.50,
      is_low_stock: true
    },
    {
      id: 3,
      manager_item_id: 'INV-003',
      name: 'Butter',
      unit: 'kg',
      quantity_available: 0.5,
      threshold_quantity: 2,
      unit_cost: 4.75,
      is_low_stock: true
    }
  ];
  
  // Mock recent recipes
  const recentRecipes = [
    {
      id: 1,
      name: 'Sourdough Bread',
      description: 'Classic sourdough bread with a crispy crust and chewy interior.',
      category: 'bread',
      yield_quantity: 2,
      yield_unit: 'loaves',
      unit_cost: 3.25
    },
    {
      id: 2,
      name: 'Chocolate Chip Cookies',
      description: 'Soft and chewy chocolate chip cookies with a hint of sea salt.',
      category: 'cookie',
      yield_quantity: 24,
      yield_unit: 'cookies',
      unit_cost: 0.35
    },
    {
      id: 3,
      name: 'Croissants',
      description: 'Buttery, flaky croissants made with a laminated dough.',
      category: 'pastry',
      yield_quantity: 12,
      yield_unit: 'croissants',
      unit_cost: 1.20
    },
    {
      id: 4,
      name: 'Carrot Cake',
      description: 'Moist carrot cake with cream cheese frosting and walnuts.',
      category: 'cake',
      yield_quantity: 1,
      yield_unit: 'cake',
      unit_cost: 18.50
    }
  ];
  
  // Mock recent production orders
  const recentProductions = [
    {
      id: 1,
      recipe_id: 1,
      recipe_name: 'Sourdough Bread',
      batch_quantity: 5,
      status: 'completed',
      created_at: '2025-05-02T14:30:00Z'
    },
    {
      id: 2,
      recipe_id: 2,
      recipe_name: 'Chocolate Chip Cookies',
      batch_quantity: 3,
      status: 'completed',
      created_at: '2025-05-03T09:15:00Z'
    },
    {
      id: 3,
      recipe_id: 3,
      recipe_name: 'Croissants',
      batch_quantity: 2,
      status: 'in_progress',
      created_at: '2025-05-04T07:45:00Z'
    }
  ];
  
  const mockDashboardService = {
    // Get dashboard summary data
    fetchDashboardData: async () => {
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 500));
      
      return {
        recipesCount: 12,
        productionsCount: 24,
        inventoryCount: 45,
        lowInventoryCount: 3,
        recentRecipes: recentRecipes,
        lowInventoryItems: lowInventoryItems,
        recentProductions: recentProductions
      };
    },
    
    // Mock sync inventory
    syncInventory: async () => {
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      return {
        status: 'success',
        count: 45,
        message: 'Successfully synced 45 inventory items'
      };
    }
  };
  
  export default mockDashboardService;