# backend/recipes/views_production.py - FIXED VERSION with timezone import

from rest_framework import viewsets, filters
from rest_framework.response import Response
from rest_framework.decorators import action
from django_filters.rest_framework import DjangoFilterBackend
from django.utils import timezone  # ADDED: Missing import

from .models import ProductionCategory, ProductionShift, ProductionOrder
from .serializers_production import (
    ProductionCategorySerializer, ProductionShiftSerializer,
    ProductionOrderEnhancedSerializer
)

import logging
logger = logging.getLogger(__name__)


class ProductionCategoryViewSet(viewsets.ModelViewSet):
    """SIMPLIFIED: ViewSet for production categories"""
    queryset = ProductionCategory.objects.all()
    serializer_class = ProductionCategorySerializer
    filter_backends = [DjangoFilterBackend, filters.OrderingFilter]
    ordering_fields = ['code', 'name']
    ordering = ['code']


class ProductionShiftViewSet(viewsets.ModelViewSet):
    """SIMPLIFIED: ViewSet for production shifts"""
    queryset = ProductionShift.objects.all()
    serializer_class = ProductionShiftSerializer
    filter_backends = [DjangoFilterBackend, filters.OrderingFilter]
    filterset_fields = ['shift_type', 'is_active']
    ordering_fields = ['start_time', 'name']
    ordering = ['start_time']
    
    @action(detail=False, methods=['get'])
    def current_shift(self, request):
        """Get the current active shift"""
        current_shifts = [shift for shift in self.queryset if shift.is_current_shift]
        
        if current_shifts:
            serializer = self.get_serializer(current_shifts[0])
            return Response({
                'success': True,
                'shift': serializer.data,
                'current_time': timezone.now().strftime('%H:%M')
            })
        
        return Response({
            'success': False,
            'message': 'No active shift at this time',
            'current_time': timezone.now().strftime('%H:%M')
        })


class ProductionOrderViewSet(viewsets.ModelViewSet):
    """SIMPLIFIED: ViewSet for production orders"""
    queryset = ProductionOrder.objects.all()
    serializer_class = ProductionOrderEnhancedSerializer
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['status', 'scheduled_date', 'production_category', 'assigned_to']
    search_fields = ['item_name', 'item_code', 'notes']
    ordering_fields = ['scheduled_date', 'created_at', 'item_name']
    ordering = ['-scheduled_date', 'production_category__code']