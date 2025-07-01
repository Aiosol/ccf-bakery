# backend/config/urls.py - FIXED VERSION with correct production order endpoints

from django.contrib import admin
from django.urls import path, include
from django.views.generic.base import RedirectView
from rest_framework.routers import DefaultRouter
from recipes.views import (
    ManagerInventoryViewSet, RecipeCategoryViewSet, 
    RecipeViewSet, CustomerViewSet, OrderViewSet, ProductionOrderViewSet, 
    DashboardViewSet, PriceHistoryViewSet
)
from recipes import views_compat
from recipes.views_production import (
    ProductionCategoryViewSet, ProductionShiftViewSet
)
from recipes.auth_views import login_view, logout_view, user_view, user_permissions_view

# Create router FIRST
router = DefaultRouter()

# Register core viewsets
router.register(r'inventory', ManagerInventoryViewSet)
router.register(r'recipe-categories', RecipeCategoryViewSet)
router.register(r'recipes', RecipeViewSet)
router.register(r'customers', CustomerViewSet, basename='customers')
router.register(r'orders', OrderViewSet)

# FIXED: Register production orders with correct endpoint
router.register(r'production-orders', ProductionOrderViewSet)

router.register(r'dashboard', DashboardViewSet, basename='dashboard')
router.register(r'price-history', PriceHistoryViewSet)

# Register production viewsets
router.register(r'production-categories', ProductionCategoryViewSet)
router.register(r'production-shifts', ProductionShiftViewSet)

# API URLs
urlpatterns = [

    # Simple auth endpoints
    path('api/auth/login/', login_view, name='login'),
    path('api/auth/logout/', logout_view, name='logout'),
    path('api/auth/user/', user_view, name='user'),
    path('api/auth/permissions/', user_permissions_view, name='permissions'),
    
    # Redirect root URL to API root
    path('', RedirectView.as_view(url='/api/'), name='index'),
    
    path('admin/', admin.site.urls),
    path('api/', include(router.urls)),
    path('api-auth/', include('rest_framework.urls')),
    
    # Enhanced inventory endpoints with price tracking
    path('api/inventory-items/', views_compat.inventory_items, name='inventory_items_compat'),
    path('api/sync-inventory/', views_compat.sync_inventory, name='sync_inventory_compat'),
    path('api/direct-inventory-sync/', views_compat.direct_inventory_sync, name='direct_inventory_sync'),
 
    # Customer endpoints
    path('api/customers/', views_compat.customers, name='customers_compat'),
    path('api/customers-search/', views_compat.customers_search, name='customers_search_compat'),
    path('api/customer-form/', views_compat.customer_form, name='customer_form_compat'),
    
    # Order endpoints
    path('api/orders/', views_compat.orders, name='orders_compat'),
    path('api/orders/<int:id>/', views_compat.order_detail, name='order_detail_compat'),
    path('api/orders/batch-sync/', views_compat.batch_sync_orders, name='batch_sync_orders'),
    path('api/batch-delete-orders/', views_compat.batch_delete_orders, name='batch_delete_orders'),
    path('api/sales-order-form/', views_compat.sales_order_form, name='sales_order_form'),
    path('api/test-order-sync/', views_compat.test_order_sync, name='test_order_sync'),

    # FIXED: Production planning endpoints with correct paths
    path('api/production/analyze-fg-items/', views_compat.analyze_fg_items_for_production, name='analyze_fg_items'),
    path('api/production/create-direct-orders/', views_compat.create_direct_production_orders, name='create_direct_production_orders'),
    path('api/production/reports/generate/', views_compat.generate_production_report, name='generate_production_report'),
    path('api/production/assignments/', views_compat.get_production_assignments, name='get_production_assignments'),
path('api/production-orders/<int:order_id>/submit-to-manager/', views_compat.submit_production_order_to_manager, name='submit_production_order_to_manager'),

#debug
path('api/debug-production-ingredients/<int:order_id>/', views_compat.debug_production_ingredients, name='debug_production_ingredients'),

    # Utility endpoints
    path('api/manager-webhook/', views_compat.manager_webhook, name='manager_webhook'),
    path('api/check-sync-status/', views_compat.check_sync_status, name='check_sync_status'),
    path('api/test-manager-connection/', views_compat.test_manager_connection, name='test_manager_connection'),

path('api/materials/required/', views_compat.get_materials_required, name='materials_required'),
    path('api/materials/save-requisition/', views_compat.save_materials_requisition, name='save_materials_requisition'),

]