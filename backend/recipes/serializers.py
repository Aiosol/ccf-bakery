# backend/recipes/serializers.py - SIMPLIFIED: No pricing mode fields

from rest_framework import serializers
from decimal import Decimal
from .models import (
    ManagerInventoryItem, RecipeCategory, Recipe, RecipeIngredient,
    Customer, Order, OrderItem, ProductionOrder, InventoryPriceHistory
)

class ManagerInventoryItemSerializer(serializers.ModelSerializer):
    """Serializer for Manager.io inventory items"""
    is_low_stock = serializers.BooleanField(read_only=True)
    
    class Meta:
        model = ManagerInventoryItem
        fields = ['id', 'manager_item_id', 'code', 'name', 'description', 'unit', 
              'unit_cost', 'sales_price', 'quantity_available', 'threshold_quantity',
              'last_synced', 'is_low_stock', 'division_name'] 
        read_only_fields = ['is_low_stock']


# NEW: Price history serializer
class InventoryPriceHistorySerializer(serializers.ModelSerializer):
    """Serializer for price change history"""
    inventory_item_name = serializers.CharField(source='inventory_item.name', read_only=True)
    inventory_item_code = serializers.CharField(source='inventory_item.code', read_only=True)
    
    class Meta:
        model = InventoryPriceHistory
        fields = ['id', 'inventory_item_name', 'inventory_item_code', 'old_price', 
                  'new_price', 'change_amount', 'change_percentage', 'changed_at', 'sync_source']


class RecipeCategorySerializer(serializers.ModelSerializer):
    """Serializer for recipe categories"""
    class Meta:
        model = RecipeCategory
        fields = ['id', 'name', 'slug']


class RecipeIngredientSerializer(serializers.ModelSerializer):
    """SIMPLIFIED: Recipe ingredients always use current pricing"""
    inventory_item = ManagerInventoryItemSerializer(read_only=True)
    inventory_item_id = serializers.PrimaryKeyRelatedField(
        queryset=ManagerInventoryItem.objects.all(),
        source='inventory_item',
        write_only=True
    )
    item_cost = serializers.DecimalField(max_digits=10, decimal_places=2, read_only=True)
    unit_cost = serializers.DecimalField(max_digits=10, decimal_places=2, read_only=True)
    
    # REMOVED: use_live_pricing field
    # REMOVED: current_unit_cost field (replaced by unit_cost)
    
    class Meta:
        model = RecipeIngredient
        fields = ['id', 'inventory_item', 'inventory_item_id', 'quantity', 
                  'item_cost', 'unit_cost']
    
    def to_representation(self, instance):
        """SIMPLIFIED: Always show current inventory cost"""
        data = super().to_representation(instance)
        
        # Always use current inventory cost
        data['unit_cost'] = float(instance.unit_cost)
        data['item_cost'] = float(instance.item_cost)
        
        # Include inventory item details
        if instance.inventory_item:
            data['inventory_item_name'] = instance.inventory_item.name
            data['inventory_item_unit'] = instance.inventory_item.unit
            data['inventory_item_current_cost'] = float(instance.inventory_item.unit_cost)
        
        return data


class RecipeSerializer(serializers.ModelSerializer):
    """SIMPLIFIED: Recipes with division as category"""
    ingredients = RecipeIngredientSerializer(source='recipeingredient_set', many=True, required=False)
    recipeingredient_set = RecipeIngredientSerializer(many=True, required=False, write_only=True)
    category_name = serializers.SerializerMethodField()
    total_cost = serializers.DecimalField(max_digits=10, decimal_places=2, read_only=True)
    unit_cost = serializers.DecimalField(max_digits=10, decimal_places=2, read_only=True)
    
    # NEW: Cost history summary
    cost_history_summary = serializers.SerializerMethodField()
    
    class Meta:
        model = Recipe
        fields = ['id', 'name', 'description', 'category', 'category_name', 
                'instructions', 'yield_quantity', 'yield_unit', 
                'prep_time_minutes', 'cook_time_minutes', 'ingredients',
                'recipeingredient_set', 'total_cost', 'unit_cost', 
                'created_at', 'updated_at', 'manager_inventory_item_id',
                'cost_history_summary']
    
    def get_category_name(self, obj):
        """Return the division name as category"""
        return obj.category or 'Uncategorized'
    
    def get_cost_history_summary(self, obj):
        """Get cost impact summary for the last 30 days"""
        try:
            return obj.get_cost_history_summary(days=30)
        except Exception:
            return None
    
    def create(self, validated_data):
        """Create recipe with ingredients"""
        # Extract ingredients data from validated data
        ingredients_data = validated_data.pop('recipeingredient_set', [])
        
        # Create the recipe
        recipe = Recipe.objects.create(**validated_data)
        
        # Process and create each ingredient
        for ingredient_data in ingredients_data:
            inventory_item = ingredient_data.pop('inventory_item', None)
            
            if inventory_item:
                quantity = ingredient_data.pop('quantity', 0)
                
                # SIMPLIFIED: Just create with quantity, cost comes from inventory
                RecipeIngredient.objects.create(
                    recipe=recipe, 
                    inventory_item=inventory_item,
                    quantity=quantity
                )
        
        # Refresh recipe to get calculated properties
        recipe.refresh_from_db()
        return recipe
    
    def update(self, instance, validated_data):
        """SIMPLIFIED: Update recipe and ingredients"""
        # Extract ingredients data
        ingredients_data = validated_data.pop('recipeingredient_set', [])
        
        # Update recipe fields
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()
        
        # Handle ingredients update if provided
        if ingredients_data:
            # Remove existing ingredients
            instance.recipeingredient_set.all().delete()
            
            # Create new ingredients
            for ingredient_data in ingredients_data:
                inventory_item = ingredient_data.pop('inventory_item', None)
                
                if inventory_item:
                    quantity = ingredient_data.pop('quantity', 0)
                    
                    RecipeIngredient.objects.create(
                        recipe=instance, 
                        inventory_item=inventory_item,
                        quantity=quantity
                    )
        
        # Refresh recipe to get calculated properties
        instance.refresh_from_db()
        return instance


# NEW: Enhanced serializer with price history
class RecipeWithPriceHistorySerializer(RecipeSerializer):
    """ROBUST: Recipe serializer with price history and proper error handling"""
    ingredient_price_changes = serializers.SerializerMethodField()
    
    class Meta(RecipeSerializer.Meta):
        fields = RecipeSerializer.Meta.fields + ['ingredient_price_changes']
    
    def get_ingredient_price_changes(self, obj):
        """SAFE: Get recent price changes for all ingredients in this recipe"""
        changes = []
        try:
            for ingredient in obj.recipeingredient_set.all():
                try:
                    # Safe method call with fallback
                    if hasattr(ingredient, 'get_recent_price_changes'):
                        recent_changes = ingredient.get_recent_price_changes(days=30)
                    else:
                        # Manual fallback if method doesn't exist
                        from django.utils import timezone
                        from datetime import timedelta
                        
                        if not ingredient.inventory_item:
                            continue
                            
                        cutoff_date = timezone.now() - timedelta(days=30)
                        recent_changes = InventoryPriceHistory.objects.filter(
                            inventory_item=ingredient.inventory_item,
                            changed_at__gte=cutoff_date
                        ).order_by('-changed_at')
                    
                    if recent_changes.exists():
                        ingredient_changes = []
                        for change in recent_changes[:5]:  # Last 5 changes
                            try:
                                ingredient_changes.append({
                                    'old_price': float(change.old_price or 0),
                                    'new_price': float(change.new_price or 0),
                                    'change_amount': float(change.change_amount or 0),
                                    'change_percentage': float(change.change_percentage or 0),
                                    'changed_at': change.changed_at,
                                    'recipe_impact': float((change.change_amount or 0) * (ingredient.quantity or 0))
                                })
                            except Exception as change_error:
                                logger.warning(f"Error processing price change: {change_error}")
                                continue
                        
                        if ingredient_changes:  # Only add if we have valid changes
                            changes.append({
                                'ingredient_name': ingredient.inventory_item.name if ingredient.inventory_item else 'Unknown',
                                'ingredient_code': ingredient.inventory_item.code if ingredient.inventory_item else '',
                                'quantity': float(ingredient.quantity or 0),
                                'current_cost': float(ingredient.unit_cost or 0),
                                'changes': ingredient_changes
                            })
                            
                except Exception as ingredient_error:
                    logger.warning(f"Error processing ingredient price changes: {ingredient_error}")
                    continue
                    
        except Exception as e:
            logger.error(f"Error getting ingredient price changes for recipe {obj.id}: {e}")
            return []  # Return empty list on any error
        
        return changes


# Rest of serializers remain the same but simplified...
class ProductionOrderSerializer(serializers.ModelSerializer):
    """Enhanced serializer for production orders with financial data"""
    recipe_name = serializers.CharField(source='recipe.name', read_only=True)
    recipe_details = RecipeSerializer(source='recipe', read_only=True)
    shift_name = serializers.CharField(source='shift.name', read_only=True) 
    shift_time = serializers.SerializerMethodField()
    
    # Financial fields
    total_cost = serializers.DecimalField(max_digits=10, decimal_places=2, read_only=True)
    unit_sales_price = serializers.DecimalField(max_digits=10, decimal_places=2, read_only=True)
    total_sales_value = serializers.DecimalField(max_digits=10, decimal_places=2, read_only=True)
    profit_margin = serializers.DecimalField(max_digits=10, decimal_places=2, read_only=True)
    profit_percentage = serializers.DecimalField(max_digits=5, decimal_places=2, read_only=True)
    
    # Production calculations
    batch_quantity = serializers.SerializerMethodField()
    
    class Meta:
        model = ProductionOrder
        fields = [
            'id', 'recipe', 'recipe_name', 'recipe_details', 'item_name', 'item_code',
            'planned_quantity', 'actual_quantity', 'remaining_quantity',
            'batch_quantity', 'status', 'notes', 'scheduled_date', 
            'shift', 'shift_name', 'shift_time', 'production_category_code',
            'assigned_to', 'waste_quantity', 'variance_reason',
            'total_cost', 'unit_sales_price', 'total_sales_value', 
            'profit_margin', 'profit_percentage',
            'source_orders', 'created_at', 'completed_at', 'manager_order_id',
            'is_split_order', 'split_assignments'
        ]
        read_only_fields = ['id', 'created_at', 'total_cost', 'unit_sales_price', 
                           'total_sales_value', 'profit_margin', 'profit_percentage']
    
    def get_shift_time(self, obj):
        """Get formatted shift time range"""
        if obj.shift:
            return f"{obj.shift.start_time.strftime('%H:%M')} - {obj.shift.end_time.strftime('%H:%M')}"
        return None
    
    def get_batch_quantity(self, obj):
        """Calculate batch quantity from recipe"""
        try:
            return obj.calculate_batch_quantity()
        except:
            return 1
    
    def to_representation(self, instance):
        """Enhanced representation with additional computed fields"""
        data = super().to_representation(instance)
        
        # Ensure numeric fields are properly formatted
        numeric_fields = ['planned_quantity', 'actual_quantity', 'total_cost', 
                         'unit_sales_price', 'total_sales_value', 'profit_margin', 'profit_percentage']
        
        for field in numeric_fields:
            if data.get(field) is not None:
                data[field] = float(data[field])
        
        # Add variance indicators
        if instance.actual_quantity and instance.planned_quantity:
            variance = instance.actual_quantity - instance.planned_quantity
            data['has_variance'] = abs(variance) > 0.01
            data['variance_amount'] = float(variance)
            data['variance_percentage'] = float((variance / instance.planned_quantity) * 100) if instance.planned_quantity > 0 else 0
        
        return data


class ProductionPlanningSerializer(serializers.ModelSerializer):
    """Serializer for production planning"""
    recipe = RecipeSerializer(read_only=True)
    recipe_id = serializers.PrimaryKeyRelatedField(
        queryset=Recipe.objects.all(),
        source='recipe',
        write_only=True
    )
    required_ingredients = serializers.SerializerMethodField()
    insufficient_ingredients = serializers.SerializerMethodField()
    
    class Meta:
        model = ProductionOrder
        fields = ['id', 'recipe', 'recipe_id', 'batch_quantity', 'status', 
                  'notes', 'scheduled_date', 'required_ingredients', 
                  'insufficient_ingredients', 'total_yield', 'total_cost']
    
    def get_required_ingredients(self, obj):
        """Calculate required ingredients based on batch quantity"""
        required_ingredients = []
        for ingredient in obj.recipe.recipeingredient_set.all():
            required_quantity = ingredient.quantity * obj.batch_quantity
            required_ingredients.append({
                'inventory_item_id': ingredient.inventory_item.id,
                'name': ingredient.inventory_item.name,
                'required_quantity': required_quantity,
                'available_quantity': ingredient.inventory_item.quantity_available,
                'unit': ingredient.inventory_item.unit,
                'item_cost': ingredient.item_cost * obj.batch_quantity
            })
        return required_ingredients
    
    def get_insufficient_ingredients(self, obj):
        """Check if any ingredients have insufficient quantity"""
        insufficient = []
        for ingredient in obj.recipe.recipeingredient_set.all():
            required_quantity = ingredient.quantity * obj.batch_quantity
            if required_quantity > ingredient.inventory_item.quantity_available:
                insufficient.append({
                    'inventory_item_id': ingredient.inventory_item.id,
                    'name': ingredient.inventory_item.name,
                    'required_quantity': required_quantity,
                    'available_quantity': ingredient.inventory_item.quantity_available,
                    'shortage': required_quantity - ingredient.inventory_item.quantity_available,
                    'unit': ingredient.inventory_item.unit
                })
        return insufficient


class CustomerSerializer(serializers.ModelSerializer):
    """Serializer for customers"""
    class Meta:
        model = Customer
        fields = ['id', 'manager_customer_id', 'name', 'code', 'status', 'balance']


class OrderItemSerializer(serializers.ModelSerializer):
    """Serializer for order items"""
    item_cost = serializers.SerializerMethodField()
    
    class Meta:
        model = OrderItem
        fields = ['id', 'inventory_item_id', 'name', 'code', 'quantity', 
                  'unit', 'price', 'type', 'item_cost']
    
    def get_item_cost(self, obj):
        return float(obj.quantity * obj.price)


class OrderSerializer(serializers.ModelSerializer):
    """Serializer for orders"""
    items = OrderItemSerializer(many=True, read_only=True)
    
    class Meta:
        model = Order
        fields = ['id', 'customer_id', 'customer_name', 'order_date', 'notes', 
                  'status', 'payment_status', 'total_amount', 'tax_amount', 
                  'manager_order_id', 'sync_status', 'created_at', 'items']