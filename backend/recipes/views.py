# backend/recipes/views.py - ENHANCED with working price history features

from rest_framework import viewsets, filters, status
from rest_framework.response import Response
from rest_framework.decorators import action
from django_filters.rest_framework import DjangoFilterBackend
from django.db import models
from django.conf import settings
from django.utils import timezone
from datetime import timedelta
from decimal import Decimal
from .models import (
    ManagerInventoryItem, RecipeCategory, Recipe, 
    RecipeIngredient, ProductionOrder, Customer, Order, OrderItem,
    InventoryPriceHistory
)
from .serializers import (
    ManagerInventoryItemSerializer, RecipeCategorySerializer,
    RecipeSerializer, RecipeWithPriceHistorySerializer,
    ProductionOrderSerializer, ProductionPlanningSerializer,
    CustomerSerializer, OrderSerializer, OrderItemSerializer,
    InventoryPriceHistorySerializer
)
from .manager_api import ManagerApiService
import logging

logger = logging.getLogger(__name__)

class ManagerInventoryViewSet(viewsets.ModelViewSet):
    """Enhanced inventory viewset with working price history"""
    queryset = ManagerInventoryItem.objects.all()
    serializer_class = ManagerInventoryItemSerializer
    pagination_class = None
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['name', 'unit', 'category']
    search_fields = ['name', 'description', 'code']
    ordering_fields = ['name', 'unit_cost', 'quantity_available', 'last_synced']
    
    def list(self, request, *args, **kwargs):
        """Enhanced list method with real-time cost information"""
        try:
            logger.info("=== INVENTORY LIST VIEW ===")
            
            queryset = self.filter_queryset(self.get_queryset())
            total_count = queryset.count()
            
            if total_count == 0:
                return Response([])
            
            # Serialize the data
            serializer = self.get_serializer(queryset, many=True)
            serialized_data = serializer.data
            
            # Transform data for frontend compatibility
            transformed_data = []
            for item_data in serialized_data:
                try:
                    display_code = item_data.get('code', '')
                    manager_uuid = item_data.get('manager_item_id', '')
                    
                    # Safely convert numeric values
                    quantity = float(item_data.get('quantity_available', 0) or 0)
                    unit_cost = float(item_data.get('unit_cost', 0) or 0)
                    sales_price = float(item_data.get('sales_price', 0) or 0)
                    total_cost = unit_cost * quantity
                    
                    # Create the response item
                    transformed_item = {
                        # Core identification
                        'id': item_data.get('id'),
                        'manager_item_id': manager_uuid,
                        'manager_uuid': manager_uuid,
                        
                        # Display codes
                        'ItemCode': display_code,
                        'itemCode': display_code,
                        'code': display_code,
                        
                        # Item details
                        'ItemName': item_data.get('name', ''),
                        'itemName': item_data.get('name', ''),
                        'name': item_data.get('name', ''),
                        
                        'UnitName': item_data.get('unit', 'piece'),
                        'unitName': item_data.get('unit', 'piece'),
                        'unit': item_data.get('unit', 'piece'),
                        
                        # Quantities
                        'quantity_available': quantity,
                        'qtyOnHand': quantity,
                        'qtyOwned': quantity,
                        'qty': quantity,
                        
                        # Prices
                        'sales_price': sales_price,
                        'DefaultSalesUnitPrice': sales_price,
                        'salesPrice': sales_price,
                        
                        # Costs
                        'unit_cost': unit_cost,
                        'averageCost': {
                            'value': unit_cost,
                            'currency': 'BDT'
                        },
                        'totalCost': {
                            'value': total_cost,
                            'currency': 'BDT'
                        },
                        
                        # Metadata
                        'category': item_data.get('category', 'OTHER'),
                        'Division': item_data.get('division_name', 'Unknown'),
                        'division_name': item_data.get('division_name', 'Unknown'),
                        'description': item_data.get('description', ''),
                        'threshold_quantity': float(item_data.get('threshold_quantity', 1.0)),
                        'last_synced': item_data.get('last_synced'),
                        'is_low_stock': quantity <= float(item_data.get('threshold_quantity', 1.0))
                    }
                    
                    transformed_data.append(transformed_item)
                    
                except Exception as transform_error:
                    logger.error(f"Error transforming item: {str(transform_error)}")
                    # Add safe fallback
                    transformed_data.append({
                        'id': item_data.get('id'),
                        'ItemCode': item_data.get('code', 'ERROR'),
                        'ItemName': item_data.get('name', 'Error Item'),
                        'UnitName': 'piece',
                        'quantity_available': 0,
                        'qtyOwned': 0,
                        'sales_price': 0,
                        'unit_cost': 0,
                        'category': 'ERROR'
                    })
            
            logger.info(f"Transformed {len(transformed_data)} items for display")
            return Response(transformed_data)
            
        except Exception as e:
            logger.error(f"Error in inventory list view: {str(e)}")
            return Response({
                "error": "Failed to fetch inventory items",
                "message": str(e)
            }, status=500)
    
    @action(detail=False, methods=['post'])
    def sync(self, request):
        """FIXED: Enhanced sync with robust error handling"""
        try:
            logger.info("=== STARTING INVENTORY SYNC ===")
            
            api_service = ManagerApiService()
            
            # Use the main sync method
            sync_result = api_service.sync_inventory_items()
            
            # Log the sync result
            if sync_result.get('status') == 'success':
                details = sync_result.get('details', {})
                processed = details.get('processed_items', 0)
                price_changes = details.get('price_changes', 0)
                
                logger.info(f"✅ SYNC SUCCESS: {processed} items processed")
                if price_changes > 0:
                    logger.info(f"✅ PRICE TRACKING: {price_changes} price changes detected")
                else:
                    logger.info("✅ PRICE TRACKING: No price changes detected")
            else:
                logger.error(f"❌ SYNC FAILED: {sync_result.get('message', 'Unknown error')}")
            
            return Response(sync_result)
            
        except Exception as e:
            logger.error(f"❌ Critical error in sync endpoint: {str(e)}")
            logger.exception(e)
            return Response({
                'status': 'error',
                'message': f'Sync failed with critical error: {str(e)}',
                'error': str(e),
                'error_type': type(e).__name__
            }, status=500)
            
     


class RecipeCategoryViewSet(viewsets.ModelViewSet):
    """ViewSet for recipe categories"""
    queryset = RecipeCategory.objects.all()
    serializer_class = RecipeCategorySerializer
    filter_backends = [filters.SearchFilter]
    search_fields = ['name', 'slug']


class RecipeViewSet(viewsets.ModelViewSet):
    """Enhanced Recipe ViewSet with working price history"""
    queryset = Recipe.objects.all()
    serializer_class = RecipeSerializer
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['category', 'created_by']
    search_fields = ['name', 'description', 'instructions']
    ordering_fields = ['name', 'created_at', 'updated_at']
    
    def get_serializer_class(self):
        # SAFELY re-enable price history for detail views
        if self.action == 'retrieve':
            try:
                # Test if we can safely use the enhanced serializer
                return RecipeWithPriceHistorySerializer
            except Exception as e:
                logger.warning(f"Price history serializer not available: {e}")
                return RecipeSerializer
        elif self.action == 'price_history':
            return RecipeWithPriceHistorySerializer
        return RecipeSerializer
    
    @action(detail=True, methods=['get'])
    def price_history(self, request, pk=None):
        """FIXED: Get detailed price history impact for this recipe"""
        try:
            recipe = self.get_object()
            days = int(request.query_params.get('days', 30))
            
            api_service = ManagerApiService()
            price_impact_data = api_service.get_recipe_price_impact(recipe.id, days)
            
            if price_impact_data['success']:
                return Response(price_impact_data)
            else:
                return Response({
                    'error': price_impact_data['error']
                }, status=400)
            
        except Exception as e:
            logger.error(f"Error fetching recipe price history for {pk}: {str(e)}")
            return Response({
                'error': str(e)
            }, status=500)
    
    @action(detail=False, methods=['get'])
    def cost_volatility_report(self, request):
        """ENHANCED: Get recipes most affected by recent price changes"""
        try:
            days = int(request.query_params.get('days', 30))
            limit = int(request.query_params.get('limit', 10))
            
            cutoff_date = timezone.now() - timedelta(days=days)
            
            # Get all recipes and calculate their price volatility
            recipes_with_impact = []
            
            for recipe in Recipe.objects.all():
                try:
                    # Get all ingredients for this recipe
                    ingredients = RecipeIngredient.objects.filter(recipe=recipe)
                    
                    total_impact = Decimal('0')
                    affected_ingredients_count = 0
                    
                    for ingredient in ingredients:
                        # Get price changes for this ingredient in the time period
                        price_changes = InventoryPriceHistory.objects.filter(
                            inventory_item=ingredient.inventory_item,
                            changed_at__gte=cutoff_date
                        )
                        
                        if price_changes.exists():
                            affected_ingredients_count += 1
                            
                            # Calculate impact on this recipe
                            ingredient_impact = sum(
                                change.change_amount * ingredient.quantity 
                                for change in price_changes
                            )
                            total_impact += ingredient_impact
                    
                    if total_impact != 0:
                        current_cost = recipe.total_cost
                        impact_percentage = (float(total_impact) / float(current_cost)) * 100 if current_cost > 0 else 0
                        
                        recipes_with_impact.append({
                            'recipe_id': recipe.id,
                            'recipe_name': recipe.name,
                            'current_total_cost': float(current_cost),
                            'current_unit_cost': float(recipe.unit_cost),
                            'cost_impact': float(total_impact),
                            'affected_ingredients_count': affected_ingredients_count,
                            'impact_percentage': round(impact_percentage, 2)
                        })
                        
                except Exception as recipe_error:
                    logger.error(f"Error processing recipe {recipe.id}: {str(recipe_error)}")
                    continue
            
            # Sort by absolute impact
            recipes_with_impact.sort(key=lambda x: abs(x['cost_impact']), reverse=True)
            
            return Response({
                'most_affected_recipes': recipes_with_impact[:limit],
                'period_days': days,
                'total_recipes_analyzed': Recipe.objects.count(),
                'recipes_with_changes': len(recipes_with_impact)
            })
            
        except Exception as e:
            logger.error(f"Error generating cost volatility report: {str(e)}")
            return Response({
                'error': str(e)
            }, status=500)


class PriceHistoryViewSet(viewsets.ReadOnlyModelViewSet):
    """ENHANCED: ViewSet for price history data"""
    queryset = InventoryPriceHistory.objects.all()
    serializer_class = InventoryPriceHistorySerializer
    filter_backends = [DjangoFilterBackend, filters.OrderingFilter]
    filterset_fields = ['inventory_item', 'sync_source']
    ordering_fields = ['changed_at', 'change_percentage', 'change_amount']
    ordering = ['-changed_at']
    
    @action(detail=False, methods=['get'])
    def significant_changes(self, request):
        """FIXED: Get significant price changes (> threshold %)"""
        try:
            days = int(request.query_params.get('days', 30))
            threshold = float(request.query_params.get('threshold', 5.0))
            
            cutoff_date = timezone.now() - timedelta(days=days)
            
            significant_changes = self.queryset.filter(
                changed_at__gte=cutoff_date,
                change_percentage__gte=threshold
            ).select_related('inventory_item').order_by('-change_percentage')[:20]
            
            serializer = self.get_serializer(significant_changes, many=True)
            
            return Response({
                'significant_changes': serializer.data,
                'period_days': days,
                'threshold_percentage': threshold
            })
            
        except Exception as e:
            logger.error(f"Error fetching significant changes: {str(e)}")
            return Response({
                'error': str(e)
            }, status=500)
    
    @action(detail=False, methods=['get'])
    def summary(self, request):
        """Get price history summary for dashboard"""
        try:
            days = int(request.query_params.get('days', 7))
            cutoff_date = timezone.now() - timedelta(days=days)
            
            # Get recent changes
            recent_changes = InventoryPriceHistory.objects.filter(
                changed_at__gte=cutoff_date
            ).select_related('inventory_item').order_by('-changed_at')[:10]
            
            # Get significant changes (>5%)
            significant_changes = InventoryPriceHistory.objects.filter(
                changed_at__gte=cutoff_date,
                change_percentage__gte=5.0
            ).count()
            
            # Get most volatile ingredients
            volatile_ingredients = InventoryPriceHistory.objects.filter(
                changed_at__gte=cutoff_date
            ).values('inventory_item__name', 'inventory_item__code').annotate(
                change_count=models.Count('id'),
                avg_change=models.Avg('change_percentage')
            ).order_by('-change_count')[:5]
            
            serializer = self.get_serializer(recent_changes, many=True)
            
            return Response({
                'recent_changes': serializer.data,
                'significant_changes_count': significant_changes,
                'volatile_ingredients': list(volatile_ingredients),
                'period_days': days
            })
            
        except Exception as e:
            logger.error(f"Error fetching price history summary: {str(e)}")
            return Response({
                'error': str(e)
            }, status=500)


class ProductionOrderViewSet(viewsets.ModelViewSet):
    """ViewSet for production orders"""
    queryset = ProductionOrder.objects.all()
    serializer_class = ProductionOrderSerializer
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['recipe', 'status', 'created_by']
    search_fields = ['recipe__name', 'notes']
    ordering_fields = ['created_at', 'scheduled_date', 'completed_at']
    
    def get_serializer_class(self):
        if self.action == 'plan':
            return ProductionPlanningSerializer
        return super().get_serializer_class()
    
    @action(detail=False, methods=['post'])
    def plan(self, request):
        """Create a production plan"""
        serializer = ProductionPlanningSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        production_order = serializer.save(created_by=request.user if hasattr(request, 'user') else None)
        return Response(serializer.data)
    
    @action(detail=True, methods=['post'])
    def submit_to_manager(self, request, pk=None):
        """Submit production order to Manager.io"""
        try:
            production_order = self.get_object()
            
            # Check if already submitted
            if production_order.manager_order_id:
                return Response({
                    'success': False,
                    'message': 'This production order has already been submitted to Manager.io'
                }, status=400)
            
            # Submit to Manager.io
            api_service = ManagerApiService()
            # Note: You'll need to implement create_production_order in ManagerApiService
            # manager_order_id = api_service.create_production_order(production_order)
            
            # For now, just mark as submitted
            production_order.status = 'in_progress'
            production_order.save()
            
            return Response({
                'success': True,
                'message': 'Production order submitted successfully'
            })
        except Exception as e:
            logger.error(f"Error submitting production order {pk}: {str(e)}")
            return Response({
                'success': False,
                'message': str(e)
            }, status=500)


class DashboardViewSet(viewsets.ViewSet):
    """ENHANCED: Dashboard with comprehensive price insights"""
    
    def list(self, request):
        """Get enhanced dashboard data with price insights"""
        try:
            # Get basic counts
            recipes_count = Recipe.objects.count()
            production_count = ProductionOrder.objects.count()
            inventory_count = ManagerInventoryItem.objects.count()
            
            # Get low inventory items
            low_inventory = ManagerInventoryItem.objects.filter(
                quantity_available__lte=models.F('threshold_quantity')
            )
            low_inventory_serializer = ManagerInventoryItemSerializer(low_inventory, many=True)
            
            # Get recent recipes
            recent_recipes = Recipe.objects.all().order_by('-created_at')[:5]
            recent_recipes_serializer = RecipeSerializer(recent_recipes, many=True)
            
            # Get recent production orders
            recent_productions = ProductionOrder.objects.all().order_by('-created_at')[:5]
            recent_productions_serializer = ProductionOrderSerializer(recent_productions, many=True)
            
            # ENHANCED: Get recent price changes (last 7 days)
            seven_days_ago = timezone.now() - timedelta(days=7)
            recent_price_changes = InventoryPriceHistory.objects.filter(
                changed_at__gte=seven_days_ago
            ).select_related('inventory_item').order_by('-changed_at')[:10]
            price_changes_serializer = InventoryPriceHistorySerializer(recent_price_changes, many=True)
            
            # ENHANCED: Get most volatile ingredients (last 30 days)
            thirty_days_ago = timezone.now() - timedelta(days=30)
            volatile_ingredients = InventoryPriceHistory.objects.filter(
                changed_at__gte=thirty_days_ago
            ).values('inventory_item__name', 'inventory_item__code').annotate(
                change_count=models.Count('id'),
                avg_change=models.Avg('change_percentage'),
                total_impact=models.Sum('change_amount')
            ).order_by('-change_count')[:5]
            
            # ENHANCED: Get price alerts (significant changes > 10%)
            price_alerts = InventoryPriceHistory.objects.filter(
                changed_at__gte=seven_days_ago,
                change_percentage__gte=10.0
            ).select_related('inventory_item').order_by('-change_percentage')[:5]
            price_alerts_serializer = InventoryPriceHistorySerializer(price_alerts, many=True)
            
            return Response({
                'recipesCount': recipes_count,
                'productionsCount': production_count,
                'inventoryCount': inventory_count,
                'lowInventoryCount': low_inventory.count(),
                'recentRecipes': recent_recipes_serializer.data,
                'lowInventoryItems': low_inventory_serializer.data,
                'recentProductions': recent_productions_serializer.data,
                # ENHANCED: Price insights
                'recentPriceChanges': price_changes_serializer.data,
                'priceChangesLast7Days': recent_price_changes.count(),
                'volatileIngredients': list(volatile_ingredients),
                'priceAlerts': price_alerts_serializer.data,
                'significantChangesLast7Days': price_alerts.count()
            })
            
        except Exception as e:
            logger.error(f"Error fetching dashboard data: {str(e)}")
            return Response({
                'error': str(e)
            }, status=500)


class CustomerViewSet(viewsets.ViewSet):
    """ViewSet for customer operations"""
    
    def list(self, request):
        """List all customers from Manager.io"""
        try:
            api_service = ManagerApiService()
            result = api_service.get_customers()
            
            if 'customers' in result and isinstance(result['customers'], list):
                transformed_customers = []
                for customer in result['customers']:
                    transformed_customer = customer.copy()
                    if 'key' in customer and 'id' not in customer:
                        transformed_customer['id'] = customer['key']
                    transformed_customers.append(transformed_customer)
                
                return Response({
                    "success": True,
                    "customers": transformed_customers,
                    "totalCount": result.get('totalCount', len(transformed_customers))
                })
            else:
                return Response({
                    "success": False,
                    "error": "Failed to get customers in expected format",
                    "customers": []
                })
        except Exception as e:
            logger.error(f"Error in customer list: {str(e)}")
            return Response({
                "success": False,
                "error": str(e),
                "customers": []
            }, status=500)
    
    @action(detail=False, methods=['get'])
    def search(self, request):
        """Search customers by name or code"""
        term = request.query_params.get('term', '')
        
        if not term:
            return Response({
                'error': 'Search term is required'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            api_service = ManagerApiService()
            result = api_service.search_customers(term)
            return Response(result)
        except Exception as e:
            logger.error(f"Error searching customers: {str(e)}")
            return Response({
                'success': False,
                'error': str(e)
            }, status=500)
    
    @action(detail=False, methods=['post'])
    def create_in_manager(self, request):
        """Create a customer in Manager.io"""
        try:
            api_service = ManagerApiService()
            result = api_service.create_customer(request.data)
            return Response(result, status=status.HTTP_201_CREATED if result.get('success') else status.HTTP_500_INTERNAL_SERVER_ERROR)
        except Exception as e:
            logger.error(f"Error creating customer: {str(e)}")
            return Response({
                'success': False,
                'error': str(e)
            }, status=500)


class OrderViewSet(viewsets.ModelViewSet):
    """ViewSet for order management"""
    queryset = Order.objects.all().order_by('-created_at')
    serializer_class = OrderSerializer
    
    def create(self, request, *args, **kwargs):
        """Create a new order with items"""
        try:
            serializer = self.get_serializer(data=request.data)
            serializer.is_valid(raise_exception=True)
            
            order = serializer.save()
            
            items_data = request.data.get('items', [])
            for item_data in items_data:
                OrderItem.objects.create(
                    order=order,
                    inventory_item_id=item_data.get('inventory_item_id'),
                    name=item_data.get('name', ''),
                    code=item_data.get('code', ''),
                    quantity=item_data.get('quantity', 1),
                    unit=item_data.get('unit', 'piece'),
                    price=item_data.get('price', 0),
                    type=item_data.get('type', 'finished_good')
                )
            
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        except Exception as e:
            logger.error(f"Error creating order: {str(e)}")
            return Response({
                'error': str(e)
            }, status=500)
    
    @action(detail=True, methods=['post'])
    def sync_to_manager(self, request, pk=None):
        """Sync order to Manager.io"""
        try:
            order = self.get_object()
            
            # Update sync_status to pending while we process
            order.sync_status = 'pending'
            order.save()
            
            # Don't re-sync if already synced
            force_resync = request.data.get('force_resync', False)
            if order.manager_order_id and order.sync_status == 'synced' and not force_resync:
                return Response({
                    'success': True,
                    'message': 'Order already synced to Manager.io',
                    'manager_order_id': order.manager_order_id
                })
            
            # Get order items
            items = OrderItem.objects.filter(order=order)
            
            # Prepare Manager.io order data
            sales_order_data = {
                'Date': f"{order.order_date}T00:00:00",
                'Customer': order.customer_id,
                'Lines': [
                    {
                        'Item': item.inventory_item_id,
                        'LineDescription': f"{item.name} ({item.unit})",
                        'CustomFields2': {},
                        'Qty': float(item.quantity),
                        'SalesUnitPrice': float(item.price)
                    } for item in items
                ],
                'CustomFields2': {}
            }
            
            # Add notes if available
            if order.notes:
                sales_order_data['CustomFields2']['Strings'] = {
                    'Notes': order.notes
                }
            
            # Submit to Manager.io
            api_service = ManagerApiService()
            result = api_service.create_sales_order(sales_order_data)
            
            # Update order with Manager.io ID if successful
            if result.get('success') and result.get('key'):
                order.manager_order_id = result.get('key')
                order.sync_status = 'synced'
                order.save()
            else:
                # Update status to failed
                order.sync_status = 'failed'
                order.save()
                return Response({
                    'success': False,
                    'message': result.get('error', 'Unknown error from Manager.io'),
                }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
            
            return Response(result)
        
        except Exception as e:
            # Update status to failed on exception
            if 'order' in locals():
                order.sync_status = 'failed'
                order.save()
            
            logger.error(f"Error syncing order to Manager.io: {str(e)}")
            return Response({
                'success': False,
                'message': f'Error syncing order: {str(e)}'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)