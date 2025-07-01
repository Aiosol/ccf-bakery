# backend/recipes/management/commands/diagnose_inventory.py
# Create this file: backend/recipes/management/commands/diagnose_inventory.py

import json
import requests
from django.core.management.base import BaseCommand
from django.conf import settings
from recipes.models import ManagerInventoryItem

class Command(BaseCommand):
    help = 'Diagnose inventory sync issues and fix data problems'

    def add_arguments(self, parser):
        parser.add_argument(
            '--fix',
            action='store_true',
            help='Actually fix the issues found',
        )
        parser.add_argument(
            '--test-api',
            action='store_true',
            help='Test the Manager.io API connection and response format',
        )

    def handle(self, *args, **options):
        self.stdout.write("🔍 INVENTORY DIAGNOSTIC TOOL")
        self.stdout.write("=" * 50)
        
        if options['test_api']:
            self.test_manager_api()
        
        self.diagnose_database()
        
        if options['fix']:
            self.fix_issues()
        else:
            self.stdout.write("\n💡 Run with --fix to automatically fix issues")

    def test_manager_api(self):
        """Test Manager.io API connection and response format"""
        self.stdout.write("\n📡 TESTING MANAGER.IO API")
        self.stdout.write("-" * 30)
        
        try:
            api_url = settings.MANAGER_API_URL
            api_key = settings.MANAGER_API_KEY
            
            headers = {
                'X-API-KEY': api_key,
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            }
            
            self.stdout.write(f"API URL: {api_url}")
            self.stdout.write(f"API Key: {api_key[:10]}...")
            
            # Test API connection
            response = requests.get(f"{api_url}/inventory-items", headers=headers, timeout=30)
            
            if response.status_code == 200:
                self.stdout.write(self.style.SUCCESS("✅ API connection successful"))
                
                try:
                    data = response.json()
                    
                    # Analyze response structure
                    if isinstance(data, list):
                        items = data
                        self.stdout.write(f"📋 Response format: Direct list with {len(items)} items")
                    elif isinstance(data, dict) and 'inventoryItems' in data:
                        items = data['inventoryItems']
                        self.stdout.write(f"📋 Response format: Object with inventoryItems array ({len(items)} items)")
                    else:
                        self.stdout.write(self.style.ERROR("❌ Unexpected response format"))
                        self.stdout.write(f"Response keys: {list(data.keys()) if isinstance(data, dict) else 'Not a dict'}")
                        return
                    
                    if items:
                        # Analyze first item structure
                        sample_item = items[0]
                        self.stdout.write(f"\n🔍 Sample item analysis:")
                        self.stdout.write(f"Total fields: {len(sample_item.keys())}")
                        
                        # Check for UUID field
                        uuid_fields = ['id', 'key', 'ID', 'Key']
                        found_uuid_field = None
                        for field in uuid_fields:
                            if field in sample_item:
                                found_uuid_field = field
                                break
                        
                        if found_uuid_field:
                            uuid_value = sample_item[found_uuid_field]
                            self.stdout.write(f"✅ UUID field: {found_uuid_field} = {uuid_value}")
                        else:
                            self.stdout.write(self.style.ERROR("❌ No UUID field found"))
                        
                        # Check quantity fields
                        qty_fields = ['qtyOnHand', 'qtyOwned', 'qty', 'Qty', 'quantity']
                        found_qty_field = None
                        for field in qty_fields:
                            if field in sample_item:
                                found_qty_field = field
                                break
                        
                        if found_qty_field:
                            qty_value = sample_item[found_qty_field]
                            self.stdout.write(f"✅ Quantity field: {found_qty_field} = {qty_value}")
                        else:
                            self.stdout.write(self.style.ERROR("❌ No quantity field found"))
                        
                        # Check sales price fields
                        price_fields = ['salePrice', 'DefaultSalesUnitPrice', 'salesPrice']
                        found_price_field = None
                        price_value = None
                        
                        # Check nested salePrice first
                        if 'salePrice' in sample_item and isinstance(sample_item['salePrice'], dict):
                            if 'value' in sample_item['salePrice']:
                                found_price_field = 'salePrice.value'
                                price_value = sample_item['salePrice']['value']
                        
                        # Check direct fields
                        if not found_price_field:
                            for field in price_fields:
                                if field in sample_item and sample_item[field] is not None:
                                    found_price_field = field
                                    price_value = sample_item[field]
                                    break
                        
                        if found_price_field:
                            self.stdout.write(f"✅ Sales price field: {found_price_field} = {price_value}")
                        else:
                            self.stdout.write(self.style.ERROR("❌ No sales price field found"))
                        
                        # Show full structure of first item
                        self.stdout.write(f"\n📄 Full sample item structure:")
                        self.stdout.write(json.dumps(sample_item, indent=2))
                        
                except Exception as e:
                    self.stdout.write(self.style.ERROR(f"❌ Error parsing JSON: {e}"))
                    
            else:
                self.stdout.write(self.style.ERROR(f"❌ API error: {response.status_code}"))
                self.stdout.write(f"Response: {response.text[:500]}")
                
        except Exception as e:
            self.stdout.write(self.style.ERROR(f"❌ API test failed: {e}"))

    def diagnose_database(self):
        """Diagnose database inventory issues"""
        self.stdout.write("\n💾 DIAGNOSING DATABASE")
        self.stdout.write("-" * 30)
        
        total_items = ManagerInventoryItem.objects.count()
        self.stdout.write(f"Total items in database: {total_items}")
        
        if total_items == 0:
            self.stdout.write(self.style.ERROR("❌ No items in database - run sync first"))
            return
        
        # Check for items without UUIDs
        no_uuid = ManagerInventoryItem.objects.filter(manager_item_id__isnull=True).count()
        empty_uuid = ManagerInventoryItem.objects.filter(manager_item_id='').count()
        
        self.stdout.write(f"Items without UUID: {no_uuid + empty_uuid}")
        
        # Check for items without quantities
        zero_qty = ManagerInventoryItem.objects.filter(quantity_available=0).count()
        null_qty = ManagerInventoryItem.objects.filter(quantity_available__isnull=True).count()
        
        self.stdout.write(f"Items with zero/null quantity: {zero_qty + null_qty}")
        
        # Check for items without sales prices
        zero_price = ManagerInventoryItem.objects.filter(sales_price=0).count()
        null_price = ManagerInventoryItem.objects.filter(sales_price__isnull=True).count()
        
        self.stdout.write(f"Items with zero/null sales price: {zero_price + null_price}")
        
        # Show sample items
        sample_items = ManagerInventoryItem.objects.all()[:3]
        for i, item in enumerate(sample_items, 1):
            self.stdout.write(f"\n📋 Sample item {i}:")
            self.stdout.write(f"  UUID: {item.manager_item_id}")
            self.stdout.write(f"  Code: {item.code}")
            self.stdout.write(f"  Name: {item.name}")
            self.stdout.write(f"  Quantity: {item.quantity_available}")
            self.stdout.write(f"  Sales Price: {item.sales_price}")
            self.stdout.write(f"  Unit Cost: {item.unit_cost}")

    def fix_issues(self):
        """Fix common inventory issues"""
        self.stdout.write("\n🔧 FIXING ISSUES")
        self.stdout.write("-" * 20)
        
        fixed_count = 0
        
        # Fix items with missing codes (use UUID as code)
        items_without_code = ManagerInventoryItem.objects.filter(code__isnull=True)
        for item in items_without_code:
            if item.manager_item_id:
                item.code = item.manager_item_id
                item.save()
                fixed_count += 1
        
        if items_without_code.count() > 0:
            self.stdout.write(f"✅ Fixed {items_without_code.count()} items with missing codes")
        
        # Fix decimal field issues
        from decimal import Decimal, InvalidOperation
        
        items_to_fix = ManagerInventoryItem.objects.all()
        decimal_fixes = 0
        
        for item in items_to_fix:
            updated = False
            
            # Fix quantity_available
            if item.quantity_available is None:
                item.quantity_available = Decimal('0.00')
                updated = True
            
            # Fix sales_price
            if item.sales_price is None:
                item.sales_price = Decimal('0.00')
                updated = True
            
            # Fix unit_cost
            if item.unit_cost is None:
                item.unit_cost = Decimal('0.00')
                updated = True
            
            if updated:
                item.save()
                decimal_fixes += 1
        
        if decimal_fixes > 0:
            self.stdout.write(f"✅ Fixed {decimal_fixes} items with null decimal fields")
        
        self.stdout.write(f"\n🎉 Fixed {fixed_count + decimal_fixes} total issues")


# Alternative: Quick diagnostic script you can run directly
# backend/diagnostic_script.py

"""
Quick Inventory Diagnostic Script
Run this with: python manage.py shell < diagnostic_script.py
"""

import requests
import json
from django.conf import settings
from recipes.models import ManagerInventoryItem

print("🔍 QUICK INVENTORY DIAGNOSTIC")
print("=" * 40)

# Test database
print("\n💾 DATABASE STATUS:")
total_items = ManagerInventoryItem.objects.count()
print(f"Total items: {total_items}")

if total_items > 0:
    sample = ManagerInventoryItem.objects.first()
    print(f"\nSample item:")
    print(f"  UUID: {sample.manager_item_id}")
    print(f"  Code: {sample.code}")
    print(f"  Name: {sample.name}")
    print(f"  Qty: {sample.quantity_available}")
    print(f"  Price: {sample.sales_price}")
    
    # Check for issues
    issues = []
    if not sample.manager_item_id:
        issues.append("Missing UUID")
    if sample.quantity_available == 0:
        issues.append("Zero quantity")
    if sample.sales_price == 0:
        issues.append("Zero price")
    
    if issues:
        print(f"❌ Issues found: {', '.join(issues)}")
    else:
        print("✅ Sample item looks good")

# Test API connection
print("\n📡 TESTING API:")
try:
    api_url = settings.MANAGER_API_URL
    api_key = settings.MANAGER_API_KEY
    
    headers = {
        'X-API-KEY': api_key,
        'Content-Type': 'application/json'
    }
    
    response = requests.get(f"{api_url}/inventory-items", headers=headers, timeout=10)
    
    if response.status_code == 200:
        print("✅ API connection successful")
        data = response.json()
        
        if isinstance(data, list):
            items = data
        elif isinstance(data, dict) and 'inventoryItems' in data:
            items = data['inventoryItems']
        else:
            print("❌ Unexpected response format")
            items = []
        
        if items:
            print(f"📊 Found {len(items)} items from API")
            sample_api_item = items[0]
            
            # Check for key fields
            has_uuid = any(field in sample_api_item for field in ['id', 'key', 'ID', 'Key'])
            has_qty = any(field in sample_api_item for field in ['qtyOnHand', 'qtyOwned', 'qty'])
            has_price = 'salePrice' in sample_api_item or 'DefaultSalesUnitPrice' in sample_api_item
            
            print(f"✅ API item has UUID: {has_uuid}")
            print(f"✅ API item has quantity: {has_qty}")
            print(f"✅ API item has price: {has_price}")
            
            if has_uuid and has_qty and has_price:
                print("🎉 API data looks complete!")
            else:
                print("⚠️ API data may be incomplete")
        else:
            print("❌ No items in API response")
    else:
        print(f"❌ API error: {response.status_code}")
        
except Exception as e:
    print(f"❌ API test failed: {e}")

print("\n🏁 Diagnostic complete!")
print("\nNext steps:")
print("1. If API works but DB is empty: Run inventory sync")
print("2. If API has issues: Check Manager.io credentials")
print("3. If quantities show as undefined: Check field mapping in sync process")