# backend/recipes/management/commands/cleanup_inventory.py
# Create directory structure: backend/recipes/management/commands/
# Then create this file

from django.core.management.base import BaseCommand
from recipes.models import ManagerInventoryItem
from decimal import Decimal
import logging

logger = logging.getLogger(__name__)

class Command(BaseCommand):
    help = 'Clean up inventory database - remove duplicates and fix data issues'

    def add_arguments(self, parser):
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Show what would be done without making changes',
        )

    def handle(self, *args, **options):
        dry_run = options['dry_run']
        
        self.stdout.write("🧹 INVENTORY CLEANUP TOOL")
        self.stdout.write("=" * 40)
        
        if dry_run:
            self.stdout.write(self.style.WARNING("DRY RUN MODE - No changes will be made"))
        
        # Get initial counts
        total_before = ManagerInventoryItem.objects.count()
        self.stdout.write(f"📊 Initial inventory count: {total_before}")
        
        if total_before == 0:
            self.stdout.write(self.style.ERROR("❌ No inventory items found"))
            return
        
        # Find and handle duplicates
        self.stdout.write("\n🔍 CHECKING FOR DUPLICATES")
        self.stdout.write("-" * 30)
        
        # Group by manager_item_id to find duplicates
        from django.db.models import Count
        
        duplicates = (ManagerInventoryItem.objects
                     .values('manager_item_id')
                     .annotate(count=Count('id'))
                     .filter(count__gt=1))
        
        duplicate_count = duplicates.count()
        
        if duplicate_count > 0:
            self.stdout.write(f"⚠️ Found {duplicate_count} UUID groups with duplicates")
            
            removed_duplicates = 0
            for duplicate_group in duplicates:
                uuid = duplicate_group['manager_item_id']
                count = duplicate_group['count']
                
                # Get all items with this UUID
                items_with_uuid = ManagerInventoryItem.objects.filter(
                    manager_item_id=uuid
                ).order_by('id')
                
                self.stdout.write(f"  UUID {uuid}: {count} duplicates")
                
                if not dry_run:
                    # Keep the first one, delete the rest
                    items_to_delete = items_with_uuid[1:]  # All except first
                    for item in items_to_delete:
                        self.stdout.write(f"    Deleting duplicate: {item.code} - {item.name}")
                        item.delete()
                        removed_duplicates += 1
                else:
                    removed_duplicates += count - 1  # Would remove all but first
            
            if not dry_run:
                self.stdout.write(f"✅ Removed {removed_duplicates} duplicate items")
            else:
                self.stdout.write(f"🔍 Would remove {removed_duplicates} duplicate items")
        else:
            self.stdout.write("✅ No duplicates found")
        
        # Fix data quality issues
        self.stdout.write("\n🔧 FIXING DATA QUALITY ISSUES")
        self.stdout.write("-" * 35)
        
        fixed_count = 0
        all_items = ManagerInventoryItem.objects.all()
        
        for item in all_items:
            updated = False
            issues = []
            
            # Fix manager_item_id
            if not item.manager_item_id or item.manager_item_id.strip() == '':
                if not dry_run:
                    item.manager_item_id = item.code or f"TEMP-{item.id}"
                issues.append("Missing UUID")
                updated = True
            
            # Fix code field
            if not item.code or item.code.strip() == '':
                if not dry_run:
                    item.code = item.manager_item_id or f"CODE-{item.id}"
                issues.append("Missing code")
                updated = True
            
            # Fix name field
            if not item.name or item.name.strip() == '':
                if not dry_run:
                    item.name = f"Item {item.code}"
                issues.append("Missing name")
                updated = True
            
            # Fix quantity_available
            if item.quantity_available is None:
                if not dry_run:
                    item.quantity_available = Decimal('0.00')
                issues.append("Null quantity")
                updated = True
            
            # Fix sales_price
            if item.sales_price is None:
                if not dry_run:
                    item.sales_price = Decimal('0.00')
                issues.append("Null sales price")
                updated = True
            
            # Fix unit_cost
            if item.unit_cost is None:
                if not dry_run:
                    item.unit_cost = Decimal('0.00')
                issues.append("Null unit cost")
                updated = True
            
            # Fix unit field
            if not item.unit or item.unit.strip() == '':
                if not dry_run:
                    item.unit = 'piece'
                issues.append("Missing unit")
                updated = True
            
            # Fix category
            if not item.category or item.category.strip() == '':
                if not dry_run:
                    if item.code and item.code.startswith('RM'):
                        item.category = 'RAW_MATERIAL'
                    elif item.code and item.code.startswith('FG'):
                        item.category = 'FINISHED_GOOD'
                    elif item.code and item.code.startswith('ACS'):
                        item.category = 'ACCESSORY'
                    else:
                        item.category = 'OTHER'
                issues.append("Missing category")
                updated = True
            
            if updated:
                if issues:
                    self.stdout.write(f"🔧 Fixing {item.code}: {', '.join(issues)}")
                
                if not dry_run:
                    item.save()
                
                fixed_count += 1
        
        if fixed_count > 0:
            if not dry_run:
                self.stdout.write(f"✅ Fixed {fixed_count} items with data issues")
            else:
                self.stdout.write(f"🔍 Would fix {fixed_count} items with data issues")
        else:
            self.stdout.write("✅ No data quality issues found")
        
        # Final summary
        total_after = ManagerInventoryItem.objects.count() if not dry_run else (total_before - removed_duplicates)
        
        self.stdout.write(f"\n📊 SUMMARY")
        self.stdout.write("-" * 15)
        self.stdout.write(f"Items before: {total_before}")
        self.stdout.write(f"Items after: {total_after}")
        self.stdout.write(f"Duplicates removed: {removed_duplicates}")
        self.stdout.write(f"Items fixed: {fixed_count}")
        
        # Show category breakdown
        if not dry_run:
            raw_materials = ManagerInventoryItem.objects.filter(category='RAW_MATERIAL').count()
            finished_goods = ManagerInventoryItem.objects.filter(category='FINISHED_GOOD').count()
            accessories = ManagerInventoryItem.objects.filter(category='ACCESSORY').count()
            other = ManagerInventoryItem.objects.filter(category='OTHER').count()
            
            self.stdout.write(f"\n📂 CATEGORY BREAKDOWN:")
            self.stdout.write(f"Raw Materials: {raw_materials}")
            self.stdout.write(f"Finished Goods: {finished_goods}")
            self.stdout.write(f"Accessories: {accessories}")
            self.stdout.write(f"Other: {other}")
        
        self.stdout.write(f"\n🎉 Cleanup complete!")
        
        if dry_run:
            self.stdout.write(self.style.SUCCESS("Run without --dry-run to apply changes"))

# Usage:
# python manage.py cleanup_inventory --dry-run  (to see what would change)
# python manage.py cleanup_inventory             (to actually make changes)