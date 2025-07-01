# backend/recipes/models.py - FIXED VERSION with correct model ordering

from django.db import models
from django.contrib.auth.models import User
from django.core.validators import MinValueValidator
from django.utils import timezone
from datetime import datetime, time

from django.contrib.auth.models import User
 
 
from django.db.models.signals import post_save, post_migrate
from django.dispatch import receiver

class UserProfile(models.Model):
    ROLE_CHOICES = (
        ('admin', 'Administrator'),
        ('customer', 'Customer'),
        ('manager', 'Manager'),
    )
    
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='profile')
    role = models.CharField(max_length=20, choices=ROLE_CHOICES, default='customer')
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    
    def __str__(self):
        return f"{self.user.username} ({self.get_role_display()})"
    
    @property
    def is_admin(self):
        return self.role == 'admin'
    
    @property
    def is_customer(self):
        return self.role == 'customer'
    
    @property
    def is_manager(self):
        return self.role == 'manager'

# Simple signal to create profile when user is created
@receiver(post_save, sender=User)
def create_user_profile(sender, instance, created, **kwargs):
    if created:
        role = 'admin' if instance.is_superuser else 'customer'
        UserProfile.objects.create(user=instance, role=role)

class PagePermission(models.Model):
    """Define which pages each role can access"""
    PAGE_CHOICES = (
        ('dashboard', 'Dashboard'),
        ('inventory', 'Inventory'),
        ('recipes', 'Recipes'),
        ('production', 'Production'),
        ('orders', 'Orders'),
        ('reports', 'Reports'),
        ('settings', 'Settings'),
    )
    
    role = models.CharField(max_length=20, choices=UserProfile.ROLE_CHOICES)
    page = models.CharField(max_length=20, choices=PAGE_CHOICES)
    can_access = models.BooleanField(default=False)
    
    class Meta:
        unique_together = ['role', 'page']
        verbose_name = "Page Permission"
        verbose_name_plural = "Page Permissions"
    
    def __str__(self):
        access = "✓" if self.can_access else "✗"
        return f"{self.get_role_display()} - {self.get_page_display()} ({access})"

# Signal to create default permissions
@receiver(post_migrate)
def create_default_permissions(sender, **kwargs):
    if sender.name == 'recipes':
        # Default admin permissions (all pages)
        admin_pages = ['dashboard', 'inventory', 'recipes', 'production', 'orders', 'reports', 'settings']
        for page in admin_pages:
            PagePermission.objects.get_or_create(
                role='admin',
                page=page,
                defaults={'can_access': True}
            )
        
        # Default customer permissions (only orders)
        PagePermission.objects.get_or_create(
            role='customer',
            page='orders',
            defaults={'can_access': True}
        )
        
        # Default manager permissions (dashboard, inventory, recipes, production, orders, reports)
        manager_pages = ['dashboard', 'inventory', 'recipes', 'production', 'orders', 'reports']
        for page in manager_pages:
            PagePermission.objects.get_or_create(
                role='manager',
                page=page,
                defaults={'can_access': True}
            )


class ManagerDivision(models.Model):
    """Model to store divisions from Manager.io"""
    manager_division_id = models.CharField(max_length=255, unique=True)
    code = models.CharField(max_length=50, blank=True, null=True)
    name = models.CharField(max_length=255)
    timestamp = models.DateTimeField(blank=True, null=True)
    last_synced = models.DateTimeField(auto_now=True)
    
    def __str__(self):
        return f"{self.code} - {self.name}" if self.code else self.name


class ManagerInventoryItem(models.Model):
    """Model to store inventory items fetched from Manager.io"""
    CATEGORY_CHOICES = (
        ('RAW_MATERIAL', 'Raw Material'),
        ('FINISHED_GOOD', 'Finished Good'),
        ('ACCESSORY', 'Accessory'),
        ('OTHER', 'Other'),
    )
    
    manager_item_id = models.CharField(max_length=255, unique=True)
    code = models.CharField(max_length=50, blank=True, null=True)
    name = models.CharField(max_length=255)
    description = models.TextField(blank=True, null=True)
    unit = models.CharField(max_length=50)
    unit_cost = models.DecimalField(max_digits=10, decimal_places=2)
    sales_price = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    quantity_available = models.DecimalField(max_digits=10, decimal_places=2)
    threshold_quantity = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    category = models.CharField(max_length=20, choices=CATEGORY_CHOICES, default='OTHER')
    division_name = models.CharField(max_length=255, blank=True, null=True, help_text="Division name from Manager.io")
    last_synced = models.DateTimeField(auto_now=True)
    
    def __str__(self):
        return f"{self.name} ({self.quantity_available} {self.unit})"
    
    @property
    def is_low_stock(self):
        return self.quantity_available <= self.threshold_quantity


class InventoryPriceHistory(models.Model):
    """Track price changes for inventory items"""
    inventory_item = models.ForeignKey(ManagerInventoryItem, on_delete=models.CASCADE, related_name='price_history')
    old_price = models.DecimalField(max_digits=10, decimal_places=2)
    new_price = models.DecimalField(max_digits=10, decimal_places=2)
    change_amount = models.DecimalField(max_digits=10, decimal_places=2)
    change_percentage = models.DecimalField(max_digits=5, decimal_places=2)
    changed_at = models.DateTimeField(auto_now_add=True)
    sync_source = models.CharField(max_length=50, default='manager_sync')
    
    class Meta:
        ordering = ['-changed_at']
        indexes = [
            models.Index(fields=['inventory_item', '-changed_at']),
        ]
    
    def __str__(self):
        direction = "↑" if self.change_amount > 0 else "↓"
        return f"{self.inventory_item.name}: {direction} {self.change_percentage}% ({self.old_price} → {self.new_price})"


class ProductionCategory(models.Model):
    """Production categories - updated to 3-category system"""
    CATEGORY_CODES = (
        ('Production-001', 'Bakery, Frozen & Savory - Mr. Sabuz'),
        ('Production-002', 'Cake & Pastry - Mr. Rakib'),
        ('Production-003', 'Resultant Items - Mr. Justin'),
    )
    
    code = models.CharField(max_length=20, choices=CATEGORY_CODES, unique=True)  # Changed max_length from 1 to 20
    name = models.CharField(max_length=100)
    description = models.TextField(blank=True)
    is_active = models.BooleanField(default=True)
    
    class Meta:
        verbose_name_plural = "Production Categories"
        ordering = ['code']
    
    def __str__(self):
        return f"{self.get_code_display()}"
    
    @classmethod
    def ensure_defaults_exist(cls):
        """Create default categories if they don't exist"""
        defaults = [
            ('Production-001', 'Bakery, Frozen & Savory - Mr. Sabuz'),
            ('Production-002', 'Cake & Pastry - Mr. Rakib'),
            ('Production-003', 'Resultant Items - Mr. Justin'),
        ]
        
        for code, name in defaults:
            cls.objects.get_or_create(
                code=code,
                defaults={
                    'name': name,
                    'description': f'Production category for {name}',
                    'is_active': True
                }
            )


class ProductionShift(models.Model):
    """Define production shifts"""
    SHIFT_TYPES = (
        ('morning', 'Morning Shift'),
        ('afternoon', 'Afternoon Shift'),
        ('evening', 'Evening Shift'),
        ('night', 'Night Shift'),
        ('custom', 'Custom Shift'),
    )
    
    name = models.CharField(max_length=100)
    shift_type = models.CharField(max_length=20, choices=SHIFT_TYPES)
    start_time = models.TimeField()
    end_time = models.TimeField()
    is_active = models.BooleanField(default=True)
    notes = models.TextField(blank=True)
    
    class Meta:
        ordering = ['start_time']
    
    def __str__(self):
        return f"{self.name} ({self.start_time.strftime('%H:%M')} - {self.end_time.strftime('%H:%M')})"
    
    @property
    def is_current_shift(self):
        """Check if this is the current active shift"""
        now = timezone.now().time()
        if self.start_time <= self.end_time:
            return self.start_time <= now <= self.end_time
        else:  # Overnight shift
            return now >= self.start_time or now <= self.end_time


class RecipeCategory(models.Model):
    """Model for recipe categories with production category mapping"""
    name = models.CharField(max_length=100)
    slug = models.SlugField(unique=True)
    production_category = models.ForeignKey(
        ProductionCategory, 
        on_delete=models.SET_NULL, 
        null=True, 
        blank=True,
        help_text="Map to production category for direct assignment"
    )
    
    def __str__(self):
        return self.name
    
    class Meta:
        verbose_name_plural = "Recipe Categories"


class Recipe(models.Model):
    """Recipe model with division as category"""
    name = models.CharField(max_length=255)
    category = models.CharField(max_length=100, blank=True, null=True, help_text="Division from Manager.io")
    description = models.TextField(blank=True, null=True)
    instructions = models.TextField(blank=True, null=True)
    yield_quantity = models.PositiveIntegerField(default=1)
    yield_unit = models.CharField(max_length=50, default="item")
    prep_time_minutes = models.PositiveIntegerField(default=0)
    cook_time_minutes = models.PositiveIntegerField(default=0)
    created_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    manager_inventory_item_id = models.CharField(max_length=255, blank=True, null=True)
    production_category = models.ForeignKey(
        ProductionCategory,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        help_text="Direct assignment to production category"
    )
    
    def __str__(self):
        return self.name
    
    @property
    def category_name(self):
        """Return the division name as category"""
        return self.category or 'Uncategorized'
    
    @property
    def total_cost(self):
        """Calculate total cost using current inventory prices"""
        return sum(ingredient.item_cost for ingredient in self.recipeingredient_set.all())
    
    @property
    def unit_cost(self):
        """Calculate cost per unit of the recipe"""
        if self.yield_quantity <= 0:
            return 0
        return self.total_cost / self.yield_quantity
    
    @property
    def assigned_production_category(self):
        """Get the production category (direct or through recipe category)"""
        if self.production_category:
            return self.production_category
        elif self.category and self.category.production_category:
            return self.category.production_category
        return None

    def get_cost_history_summary(self, days=30):
        """Get cost impact summary for this recipe over the specified time period"""
        try:
            from django.utils import timezone
            from datetime import timedelta
            from decimal import Decimal
            
            cutoff_date = timezone.now() - timedelta(days=days)
            ingredients = self.recipeingredient_set.all()
            total_cost_impact = Decimal('0')
            affected_ingredients = []
            
            for ingredient in ingredients:
                if ingredient.inventory_item:
                    price_changes = InventoryPriceHistory.objects.filter(
                        inventory_item=ingredient.inventory_item,
                        changed_at__gte=cutoff_date
                    )
                    
                    if price_changes.exists():
                        ingredient_impact = sum(
                            change.change_amount * ingredient.quantity 
                            for change in price_changes
                        )
                        total_cost_impact += ingredient_impact
                        affected_ingredients.append({
                            'name': ingredient.inventory_item.name,
                            'code': ingredient.inventory_item.code,
                            'recipe_impact': float(ingredient_impact),
                            'changes_count': price_changes.count()
                        })
            
            return {
                'total_cost_impact': float(total_cost_impact),
                'affected_ingredients': affected_ingredients,
                'period_days': days,
                'has_changes': len(affected_ingredients) > 0
            }
            
        except Exception as e:
            print(f"Error calculating cost history summary: {e}")
            return {
                'total_cost_impact': 0.0,
                'affected_ingredients': [],
                'period_days': days,
                'has_changes': False
            }


class RecipeIngredient(models.Model):
    """Recipe ingredients using current inventory pricing"""
    recipe = models.ForeignKey(Recipe, on_delete=models.CASCADE)
    inventory_item = models.ForeignKey(ManagerInventoryItem, on_delete=models.PROTECT)
    quantity = models.DecimalField(max_digits=10, decimal_places=2, validators=[MinValueValidator(0.01)])
    
    def __str__(self):
        return f"{self.quantity} {self.inventory_item.unit} of {self.inventory_item.name}"
    
    @property
    def item_cost(self):
        """Always use current inventory cost"""
        return self.quantity * self.inventory_item.unit_cost
    
    @property
    def unit_cost(self):
        """Current unit cost from inventory"""
        return self.inventory_item.unit_cost
    
    class Meta:
        unique_together = ('recipe', 'inventory_item')

    def get_recent_price_changes(self, days=30):
        """Get recent price changes for this ingredient's inventory item"""
        try:
            from django.utils import timezone
            from datetime import timedelta
            
            if not self.inventory_item:
                return InventoryPriceHistory.objects.none()
            
            cutoff_date = timezone.now() - timedelta(days=days)
            
            return InventoryPriceHistory.objects.filter(
                inventory_item=self.inventory_item,
                changed_at__gte=cutoff_date
            ).order_by('-changed_at')
            
        except Exception as e:
            print(f"Error getting price changes for ingredient: {e}")
            return InventoryPriceHistory.objects.none()


class Customer(models.Model):
    """Model to store customers from Manager.io"""
    manager_customer_id = models.CharField(max_length=255, unique=True)
    name = models.CharField(max_length=255)
    code = models.CharField(max_length=50, blank=True, null=True)
    status = models.CharField(max_length=20, default='active')
    balance = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    last_synced = models.DateTimeField(auto_now=True)
    
    def __str__(self):
        return self.name


class Order(models.Model):
    """Model for customer orders"""
    STATUS_CHOICES = (
        ('pending', 'Pending'),
        ('completed', 'Completed'),
        ('cancelled', 'Cancelled'),
    )
    
    PAYMENT_STATUS_CHOICES = (
        ('pending', 'Pending'),
        ('paid', 'Paid'),
        ('partial', 'Partial'),
    )
    
    SYNC_STATUS_CHOICES = (
        ('not_synced', 'Not Synced'),
        ('pending', 'Pending'),
        ('synced', 'Synced'),
        ('failed', 'Failed'),
    )
    
    customer_id = models.CharField(max_length=255)
    customer_name = models.CharField(max_length=255)
    customer_code = models.CharField(max_length=100, blank=True, null=True)
    order_date = models.DateField()
    notes = models.TextField(blank=True, null=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    payment_status = models.CharField(max_length=20, choices=PAYMENT_STATUS_CHOICES, default='pending')
    total_amount = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    tax_amount = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    manager_order_id = models.CharField(max_length=255, blank=True, null=True)
    sync_status = models.CharField(max_length=20, choices=SYNC_STATUS_CHOICES, default='not_synced')
    production_status = models.CharField(
        max_length=20,
        choices=(
            ('not_started', 'Not Started'),
            ('planned', 'Production Planned'),
            ('in_progress', 'In Progress'),
            ('completed', 'Completed'),
        ),
        default='not_started'
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    def __str__(self):
        return f"Order #{self.id} - {self.customer_name}"


class OrderItem(models.Model):
    """Model for order line items"""
    order = models.ForeignKey(Order, on_delete=models.CASCADE, related_name='items')
    inventory_item_id = models.CharField(max_length=255)
    name = models.CharField(max_length=255)
    code = models.CharField(max_length=50, blank=True, null=True)
    quantity = models.DecimalField(max_digits=10, decimal_places=2, default=1)
    unit = models.CharField(max_length=50, default='piece')
    price = models.DecimalField(max_digits=10, decimal_places=2)
    type = models.CharField(max_length=20, default='finished_good')
    
    def __str__(self):
        return f"{self.quantity} x {self.name}"
    
    @property
    def is_finished_good(self):
        return self.type == 'finished_good' or (self.code and self.code.upper().startswith('FG'))


class ProductionOrder(models.Model):
    """Enhanced production order with manual assignment and variance tracking"""
    STATUS_CHOICES = (
        ('planned', 'Planned'),
        ('in_progress', 'In Progress'),
        ('completed', 'Completed'),
        ('cancelled', 'Cancelled'),
        ('partial', 'Partially Completed')
    )
    
    # Core fields
    recipe = models.ForeignKey(Recipe, on_delete=models.PROTECT, null=True, blank=True)
    item_name = models.CharField(max_length=255)
    item_code = models.CharField(max_length=50, blank=True)
    
    # FIXED: Use consistent field naming
    planned_quantity = models.DecimalField(max_digits=10, decimal_places=2)
    actual_quantity = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    remaining_quantity = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    
    # Production category and assignment
    production_category_code = models.CharField(max_length=20, default='Production-001')
    assigned_to = models.CharField(max_length=100)
    
    # Scheduling - FIXED: Make shift nullable
    scheduled_date = models.DateField()
    shift = models.ForeignKey(ProductionShift, on_delete=models.SET_NULL, null=True, blank=True)
    
    # Status & Progress
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='planned')
    
    # Split order support
    is_split_order = models.BooleanField(default=False)
    split_assignments = models.JSONField(default=list, blank=True)
    parent_order = models.ForeignKey('self', on_delete=models.CASCADE, null=True, blank=True)
    
    # Variance tracking
    variance_reason = models.TextField(blank=True)
    waste_quantity = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    
    # Metadata
    notes = models.TextField(blank=True, null=True)
    source_orders = models.JSONField(default=list)
    created_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    completed_at = models.DateTimeField(null=True, blank=True)
    
    # Manager.io integration
    manager_order_id = models.CharField(max_length=255, null=True, blank=True)
    
    class Meta:
        ordering = ['-scheduled_date', 'production_category_code', 'item_name']
    
    def __str__(self):
        return f"{self.item_name} - {self.planned_quantity} units ({self.scheduled_date}) - {self.assigned_to}"
    
    @property
    def total_cost(self):
        """Calculate total production cost using ingredient costs"""
        if self.recipe:
            batch_quantity = self.calculate_batch_quantity()
            return batch_quantity * self.recipe.total_cost
        return 0

    @property 
    def unit_sales_price(self):
        """Get unit sales price from Manager.io inventory"""
        # Try to find inventory item by manager_inventory_item_id or item_code
        inventory_item = None
        
        if hasattr(self.recipe, 'manager_inventory_item_id') and self.recipe.manager_inventory_item_id:
            try:
                inventory_item = ManagerInventoryItem.objects.get(
                    manager_item_id=self.recipe.manager_inventory_item_id
                )
            except ManagerInventoryItem.DoesNotExist:
                pass
        
        # Try to find by item_code if no direct match
        if not inventory_item and self.item_code:
            try:
                inventory_item = ManagerInventoryItem.objects.get(code=self.item_code)
            except ManagerInventoryItem.DoesNotExist:
                pass
        
        # Try to find by item_name as last resort
        if not inventory_item and self.item_name:
            inventory_item = ManagerInventoryItem.objects.filter(
                name__icontains=self.item_name
            ).first()
        
        return inventory_item.sales_price if inventory_item else 0
    
    @property
    def total_sales_value(self):
        """Calculate total sales value using inventory sales prices"""
        return self.planned_quantity * self.unit_sales_price

    @property
    def profit_margin(self):
        """Calculate profit margin"""
        return self.total_sales_value - self.total_cost

    @property
    def profit_percentage(self):
        """Calculate profit percentage"""
        if self.total_sales_value > 0:
            return (self.profit_margin / self.total_sales_value) * 100
        return 0

    # Add this method to Recipe model around line 200
    @property
    def total_sales_value(self):
        """Calculate total sales value using inventory sales prices"""
        if hasattr(self, 'manager_inventory_item_id') and self.manager_inventory_item_id:
            try:
                inventory_item = ManagerInventoryItem.objects.get(
                    manager_item_id=self.manager_inventory_item_id
                )
                return inventory_item.sales_price * self.yield_quantity
            except ManagerInventoryItem.DoesNotExist:
                pass
        return 0
    
    def calculate_batch_quantity(self):
        """Calculate how many recipe batches needed"""
        if not self.recipe or self.recipe.yield_quantity <= 0:
            return 1
        return max(1, int(self.planned_quantity / self.recipe.yield_quantity))
    
    @property
    def has_variance(self):
        """Check if there's a variance between planned and actual"""
        if self.actual_quantity is None:
            return False
        return abs(self.planned_quantity - self.actual_quantity) > 0.01
    
    @property
    def variance_percentage(self):
        """Calculate variance percentage"""
        if self.actual_quantity is None or self.planned_quantity == 0:
            return 0
        return ((self.actual_quantity - self.planned_quantity) / self.planned_quantity) * 100


# FIXED: Now Order is defined, so we can reference it
class ProductionRequirement(models.Model):
    """Production requirement model for planning"""
    STATUS_CHOICES = (
        ('pending', 'Pending'),
        ('approved', 'Approved'),
        ('cancelled', 'Cancelled'),
    )
    
    # Core fields
    date = models.DateField()
    shift = models.ForeignKey(ProductionShift, on_delete=models.SET_NULL, null=True, blank=True)
    finished_good = models.ForeignKey(ManagerInventoryItem, on_delete=models.PROTECT)
    recipe = models.ForeignKey(Recipe, on_delete=models.PROTECT, null=True, blank=True)
    
    # Quantities
    total_ordered = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    current_stock = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    net_required = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    recommended_production = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    manual_override = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    
    # Assignment
    production_category = models.ForeignKey(ProductionCategory, on_delete=models.SET_NULL, null=True, blank=True)
    assigned_to = models.CharField(max_length=100, blank=True)
    
    # Status
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    is_approved = models.BooleanField(default=False)
    
    # Metadata
    orders = models.ManyToManyField(Order, blank=True)  # NOW Order is defined above
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['-date', 'production_category__code']
        unique_together = ['date', 'shift', 'finished_good']
    
    def __str__(self):
        return f"{self.finished_good.name} - {self.final_production_quantity} units ({self.date})"
    
    @property
    def final_production_quantity(self):
        """Get the final production quantity (manual override or recommended)"""
        return self.manual_override if self.manual_override is not None else self.recommended_production


# Signal to create default production categories
from django.db.models.signals import post_migrate
from django.dispatch import receiver

@receiver(post_migrate)
def create_default_production_categories(sender, **kwargs):
    """Create default production categories after migrations"""
    if sender.name == 'recipes':  # Only run for recipes app
        ProductionCategory.ensure_defaults_exist()