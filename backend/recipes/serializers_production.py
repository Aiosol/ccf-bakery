# backend/recipes/serializers_production.py - FIXED VERSION

from rest_framework import serializers
from .models import ProductionCategory, ProductionShift, ProductionOrder


class ProductionCategorySerializer(serializers.ModelSerializer):
    """Serializer for production categories"""
    display_name = serializers.CharField(source='get_code_display', read_only=True)
    
    class Meta:
        model = ProductionCategory
        fields = ['id', 'code', 'name', 'display_name', 'description', 'is_active']


class ProductionShiftSerializer(serializers.ModelSerializer):
    """Serializer for production shifts"""
    shift_type_display = serializers.CharField(source='get_shift_type_display', read_only=True)
    is_current = serializers.BooleanField(source='is_current_shift', read_only=True)
    time_range = serializers.SerializerMethodField()
    
    class Meta:
        model = ProductionShift
        fields = ['id', 'name', 'shift_type', 'shift_type_display', 'start_time', 
                  'end_time', 'time_range', 'is_active', 'notes', 'is_current']
    
    def get_time_range(self, obj):
        return f"{obj.start_time.strftime('%H:%M')} - {obj.end_time.strftime('%H:%M')}"


class ProductionOrderEnhancedSerializer(serializers.ModelSerializer):
    """FIXED: Serializer for production orders with correct field names"""
    recipe_name = serializers.CharField(source='recipe.name', read_only=True)
    shift_name = serializers.CharField(source='shift.name', read_only=True)
    shift_time = serializers.SerializerMethodField()
    total_cost = serializers.ReadOnlyField()
    
    # FIXED: Use planned_quantity instead of production_quantity
    batch_quantity = serializers.SerializerMethodField()
    
    class Meta:
        model = ProductionOrder
        fields = [
            'id', 'recipe', 'recipe_name', 'item_name', 'item_code',
            'planned_quantity', 'actual_quantity', 'batch_quantity', 
            'status', 'notes', 'scheduled_date', 'shift', 'shift_name', 
            'shift_time', 'production_category_code', 'assigned_to',
            'waste_quantity', 'total_cost', 'source_orders', 
            'created_at', 'completed_at', 'manager_order_id',
            'is_split_order', 'split_assignments'
        ]
    
    def get_shift_time(self, obj):
        if obj.shift:
            return f"{obj.shift.start_time.strftime('%H:%M')} - {obj.shift.end_time.strftime('%H:%M')}"
        return None
    
    def get_batch_quantity(self, obj):
        """Calculate batch quantity from planned quantity and recipe yield"""
        return obj.calculate_batch_quantity()