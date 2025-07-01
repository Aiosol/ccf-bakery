# backend/recipes/manager_api.py - RESTORED VERSION - Only missing methods added

import requests
import json
import logging
from datetime import datetime
from decimal import Decimal, InvalidOperation
from django.conf import settings
from django.utils import timezone
from .models import ManagerInventoryItem, InventoryPriceHistory

logger = logging.getLogger(__name__)

class ManagerApiService:
    """Service to interact with Manager.io API with pagination support"""
    
    def __init__(self):
        # Get API settings from Django settings
        self.api_url = getattr(settings, 'MANAGER_API_URL', 'https://esourcingbd.ap-southeast-1.manager.io/api2')
        self.api_key = getattr(settings, 'MANAGER_API_KEY', '')
        
        # Log the API configuration (without exposing the full key)
        logger.info(f"Manager.io API URL: {self.api_url}")
        logger.info(f"API Key configured: {'Yes' if self.api_key else 'No'} (length: {len(self.api_key)})")
        
        # Setup headers with proper authentication
        self.headers = {
            'X-API-KEY': self.api_key,
            'Content-Type': 'application/json',
            'Accept': 'application/json'
        }

    def _make_request(self, method, endpoint, params=None, data=None):
        """Make a request to the Manager.io API with robust error handling"""
        url = f"{self.api_url}/{endpoint}"
        
        try:
            logger.info(f"Making {method.upper()} request to: {url}")
            logger.debug(f"Headers: X-API-KEY: {self.api_key[:10]}...{self.api_key[-10:] if len(self.api_key) > 20 else ''}")
            
            # Verify we have an API key
            if not self.api_key:
                raise Exception("Manager.io API key is not configured in settings.py")
            
            if method.lower() == 'get':
                response = requests.get(url, headers=self.headers, params=params, timeout=30)
            elif method.lower() == 'post':
                response = requests.post(url, headers=self.headers, json=data, timeout=30)
            elif method.lower() == 'put':
                response = requests.put(url, headers=self.headers, json=data, timeout=30)
            elif method.lower() == 'delete':
                response = requests.delete(url, headers=self.headers, timeout=30)
            else:
                raise ValueError(f"Unsupported HTTP method: {method}")
            
            logger.info(f"Response status: {response.status_code}")
            
            # Handle 401 Unauthorized specifically
            if response.status_code == 401:
                logger.error("401 Unauthorized - Check your Manager.io API key")
                logger.error(f"Current API URL: {self.api_url}")
                logger.error(f"API Key starts with: {self.api_key[:20] if self.api_key else 'NOT SET'}")
                raise Exception("Manager.io API authentication failed. Please check your API key in settings.py")
            
            response.raise_for_status()
            
            if response.content:
                return response.json()
            return None
            
        except requests.exceptions.RequestException as e:
            logger.error(f"Manager.io API request failed: {str(e)}")
            if hasattr(e, 'response') and e.response is not None:
                logger.error(f"Response content: {e.response.text[:500]}")
                if e.response.status_code == 401:
                    raise Exception("Manager.io API authentication failed. Please check your API key in settings.py")
            raise Exception(f"Manager.io API request failed: {str(e)}")

    def test_connection(self):
        """Test the API connection and authentication"""
        try:
            logger.info("Testing Manager.io API connection...")
            
            # Try to fetch just 1 inventory item to test the connection
            response = self._make_request('GET', 'inventory-items', params={'pageSize': 1, 'skip': 0})
            
            if response:
                logger.info("✅ Manager.io API connection successful!")
                return {
                    'success': True,
                    'message': 'Connection successful',
                    'api_url': self.api_url
                }
            else:
                return {
                    'success': False,
                    'message': 'Empty response from API'
                }
                
        except Exception as e:
            logger.error(f"❌ Manager.io API connection failed: {str(e)}")
            return {
                'success': False,
                'message': str(e),
                'api_url': self.api_url
            }

    def _fetch_all_inventory_items(self):
        """Fetch ALL inventory items with proper pagination"""
        try:
            logger.info("=== FETCHING ALL INVENTORY ITEMS WITH PAGINATION ===")
            
            all_items = []
            page_size = 100  # Reasonable page size
            skip = 0
            max_iterations = 50  # Safety limit to prevent infinite loops
            iterations = 0
            
            while iterations < max_iterations:
                logger.info(f"Fetching page: skip={skip}, pageSize={page_size}")
                
                # Make API call for this page
                params = {
                    'pageSize': page_size,
                    'skip': skip
                }
                
                response = self._make_request('GET', 'inventory-items', params=params)
                
                if not response:
                    logger.warning(f"Empty response on iteration {iterations}")
                    break
                
                # Extract items from response
                page_items = []
                if isinstance(response, dict) and 'inventoryItems' in response:
                    page_items = response['inventoryItems']
                elif isinstance(response, list):
                    page_items = response
                elif isinstance(response, dict):
                    # Try to find items in any list field
                    for key, value in response.items():
                        if isinstance(value, list) and len(value) > 0:
                            page_items = value
                            break
                
                if not page_items:
                    logger.info(f"No items found on page {iterations}, stopping pagination")
                    break
                
                logger.info(f"Found {len(page_items)} items on page {iterations}")
                all_items.extend(page_items)
                
                # If we got fewer items than page_size, we've reached the end
                if len(page_items) < page_size:
                    logger.info(f"Got {len(page_items)} < {page_size}, reached end of data")
                    break
                
                # Move to next page
                skip += page_size
                iterations += 1
            
            logger.info(f"=== PAGINATION COMPLETE: Fetched {len(all_items)} total items in {iterations} pages ===")
            return all_items
            
        except Exception as e:
            logger.error(f"Error fetching all inventory items: {str(e)}")
            raise
    
    def sync_inventory_items(self):
        """Main sync method with proper pagination and database operations"""
        try:
            logger.info("=== STARTING COMPREHENSIVE INVENTORY SYNC ===")
            
            # Fetch all items with pagination
            all_items = self._fetch_all_inventory_items()
            
            if not all_items:
                return {
                    'status': 'warning',
                    'message': "No items found in Manager.io API response",
                    'details': {'total_from_manager': 0, 'processed_items': 0}
                }
            
            logger.info(f"Processing {len(all_items)} items from Manager.io...")
            
            # Track statistics
            stats = {
                'processed_count': 0,
                'price_changes_count': 0,
                'significant_changes': [],
                'new_items_count': 0,
                'updated_items_count': 0,
                'errors': [],
                'skipped_count': 0
            }
            
            # Process each item
            for index, item in enumerate(all_items):
                try:
                    if index % 10 == 0:  # Log progress every 10 items
                        logger.info(f"Processing item {index + 1}/{len(all_items)}")
                    
                    result = self._process_inventory_item_safely(item, stats, index)
                    if result:
                        stats['processed_count'] += 1
                    else:
                        stats['skipped_count'] += 1
                        
                except Exception as item_error:
                    error_msg = f"Error processing item {index}: {str(item_error)}"
                    logger.error(error_msg)
                    stats['errors'].append(error_msg)
                    continue
            
            # Final database counts
            total_in_db = ManagerInventoryItem.objects.count()
            raw_materials = ManagerInventoryItem.objects.filter(category='RAW_MATERIAL').count()
            finished_goods = ManagerInventoryItem.objects.filter(category='FINISHED_GOOD').count()
            accessories = ManagerInventoryItem.objects.filter(category='ACCESSORY').count()
            
            # Log final statistics
            logger.info(f"=== SYNC COMPLETED ===")
            logger.info(f"Items from Manager.io: {len(all_items)}")
            logger.info(f"Items processed: {stats['processed_count']}")
            logger.info(f"Items skipped: {stats['skipped_count']}")
            logger.info(f"New items created: {stats['new_items_count']}")
            logger.info(f"Items updated: {stats['updated_items_count']}")
            logger.info(f"Price changes tracked: {stats['price_changes_count']}")
            logger.info(f"Total in database: {total_in_db}")
            logger.info(f"Errors: {len(stats['errors'])}")
            
            result = {
                'status': 'success',
                'message': f"Successfully processed {stats['processed_count']} items, tracked {stats['price_changes_count']} price changes",
                'details': {
                    'total_from_manager': len(all_items),
                    'processed_items': stats['processed_count'],
                    'skipped_items': stats['skipped_count'],
                    'new_items': stats['new_items_count'],
                    'updated_items': stats['updated_items_count'],
                    'total_in_database': total_in_db,
                    'price_changes': stats['price_changes_count'],
                    'significant_changes': stats['significant_changes'],
                    'raw_materials': raw_materials,
                    'finished_goods': finished_goods,
                    'accessories': accessories,
                    'errors_count': len(stats['errors']),
                    'errors': stats['errors'][:5] if stats['errors'] else []
                }
            }
            
            return result
        
        except Exception as e:
            logger.error(f"Critical error in sync process: {str(e)}")
            logger.exception(e)
            return {
                'status': 'error',
                'message': f"Sync failed: {str(e)}",
                'details': {'error_type': type(e).__name__}
            }
    
    def _safe_decimal(self, value, default=0):
        """Safely convert value to Decimal"""
        if value is None:
            return Decimal(str(default))
        
        try:
            return Decimal(str(value))
        except (ValueError, TypeError, InvalidOperation):
            return Decimal(str(default))
    
    def _process_inventory_item_safely(self, item, stats, index):
        """Process a single inventory item with comprehensive validation"""
        
        try:
            # Extract and validate UUID
            manager_uuid = self._extract_field(item, ['id', 'ID', 'key', 'Key'])
            if not manager_uuid:
                logger.debug(f"Item {index}: Missing UUID, skipping")
                return None
            
            # Extract item details with safe defaults
            item_code = self._extract_field(item, ['ItemCode', 'itemCode', 'code', 'Code'])
            item_name = self._extract_field(item, ['ItemName', 'itemName', 'name', 'Name'])

            # FIX: Extract division name from the correct field
            division_name = self._extract_field(item, ['division', 'Division', 'divisionName', 'DivisionName'])
            
            # Skip items without essential data
            if not item_code or not item_name:
                logger.debug(f"Item {index}: Missing code ({item_code}) or name ({item_name}), skipping")
                return None
            
            unit = self._extract_field(item, ['UnitName', 'unitName', 'unit', 'Unit']) or 'piece'
            
            # Extract numeric values safely
            quantity = self._extract_numeric_field(item, ['qtyOnHand', 'qtyOwned', 'qty', 'Qty', 'quantity'])
            sales_price = self._extract_sales_price(item)
            cost = self._extract_cost(item)
            
            # Determine category
            category = self._determine_category(item_code)
            
            # Check for existing item to track price changes
            old_price = None
            item_created = False
            
            try:
                existing_item = ManagerInventoryItem.objects.get(manager_item_id=manager_uuid)
                old_price = existing_item.unit_cost
                item_created = False
                stats['updated_items_count'] += 1
            except ManagerInventoryItem.DoesNotExist:
                existing_item = None
                old_price = None
                item_created = True
                stats['new_items_count'] += 1
            
            # Create or update the item
            try:
                item_obj, created = ManagerInventoryItem.objects.update_or_create(
                    manager_item_id=manager_uuid,
                    defaults={
                        'code': item_code,
                        'name': item_name,
                        'description': '',
                        'unit': unit,
                        'unit_cost': cost,
                        'sales_price': sales_price,
                        'quantity_available': quantity,
                        'threshold_quantity': Decimal('1.0'),
                        'category': category,
                        'division_name': division_name,  # FIX: Add division_name to the update
                        'last_synced': timezone.now()
                    }
                )
                
                # Track price changes for existing items
                if not item_created and old_price is not None:
                    try:
                        price_changed = self._track_price_change(item_obj, old_price, cost, 'manager_sync')
                        if price_changed:
                            stats['price_changes_count'] += 1
                            
                            # Track significant changes (> 5%)
                            if old_price > 0:
                                change_percentage = abs((cost - old_price) / old_price) * 100
                                if change_percentage > 5:
                                    stats['significant_changes'].append({
                                        'name': item_name,
                                        'code': item_code,
                                        'old_price': float(old_price),
                                        'new_price': float(cost),
                                        'change_percentage': round(float(change_percentage), 1)
                                    })
                    except Exception as price_error:
                        logger.warning(f"Could not track price change for {item_code}: {str(price_error)}")
                
                logger.debug(f"{'Created' if created else 'Updated'} item: {item_code} - {item_name} (Division: {division_name or 'Unknown'})")
                return item_obj
                
            except Exception as db_error:
                logger.error(f"Database error for item {item_code}: {str(db_error)}")
                stats['errors'].append(f"Database error for {item_code}: {str(db_error)}")
                return None
                
        except Exception as e:
            logger.error(f"Error processing item {index}: {str(e)}")
            stats['errors'].append(f"Processing error for item {index}: {str(e)}")
            return None
    
    def _track_price_change(self, inventory_item, old_price, new_price, source='manager_sync'):
        """Safely track price changes"""
        try:
            old_price = self._safe_decimal(old_price, 0)
            new_price = self._safe_decimal(new_price, 0)
            
            # Only track if there's a meaningful change
            if abs(old_price - new_price) < Decimal('0.01'):
                return False
            
            change_amount = new_price - old_price
            
            if old_price > 0:
                change_percentage = (change_amount / old_price) * 100
            else:
                change_percentage = Decimal('100') if new_price > 0 else Decimal('0')
            
            try:
                price_history = InventoryPriceHistory.objects.create(
                    inventory_item=inventory_item,
                    old_price=old_price,
                    new_price=new_price,
                    change_amount=change_amount,
                    change_percentage=change_percentage,
                    sync_source=source
                )
                
                logger.info(f"Price change tracked for {inventory_item.name}: "
                           f"{old_price} → {new_price} ({change_percentage:+.1f}%)")
                
                return True
                
            except Exception as db_error:
                logger.error(f"Database error creating price history: {str(db_error)}")
                return False
            
        except Exception as e:
            logger.error(f"Error tracking price change: {str(e)}")
            return False
    
    def _extract_field(self, item, field_names, default=''):
        """Extract field value with multiple fallback field names"""
        for field in field_names:
            if field in item and item[field] is not None:
                value = str(item[field]).strip()
                if value and value.lower() not in ['null', 'none', '', 'undefined']:
                    return value
        return default
    
    def _extract_numeric_field(self, item, field_names, default=0):
        """Extract numeric field value with validation"""
        for field in field_names:
            if field in item and item[field] is not None:
                try:
                    value = str(item[field]).strip()
                    if value and value.lower() not in ['null', 'none', '', 'undefined']:
                        return self._safe_decimal(value, default)
                except (ValueError, TypeError):
                    continue
        return self._safe_decimal(default)
    
    def _extract_sales_price(self, item):
        """Extract sales price with multiple format support"""
        # Try nested salePrice object format
        if 'salePrice' in item and isinstance(item['salePrice'], dict):
            if 'value' in item['salePrice'] and item['salePrice']['value'] is not None:
                return self._safe_decimal(item['salePrice']['value'])
        
        # Try direct field formats
        price_fields = ['DefaultSalesUnitPrice', 'defaultSalesUnitPrice', 'salesPrice', 'SalesPrice', 'sales_price']
        return self._extract_numeric_field(item, price_fields, 0)
    
    def _extract_cost(self, item):
        """Extract cost with multiple format support"""
        # Try nested averageCost object format
        if 'averageCost' in item and isinstance(item['averageCost'], dict):
            if 'value' in item['averageCost'] and item['averageCost']['value'] is not None:
                return self._safe_decimal(item['averageCost']['value'])
        
        # Try direct field formats
        cost_fields = ['unit_cost', 'unitCost', 'cost', 'Cost', 'averageCost']
        return self._extract_numeric_field(item, cost_fields, 0)
    
    def _determine_category(self, item_code):
        """Determine item category based on code prefix"""
        if not item_code:
            return 'OTHER'
            
        code_upper = str(item_code).upper()
        if code_upper.startswith('RM'):
            return 'RAW_MATERIAL'
        elif code_upper.startswith('FG'):
            return 'FINISHED_GOOD'
        elif code_upper.startswith('ACS'):
            return 'ACCESSORY'
        else:
            return 'OTHER'
    
    # Keep your existing methods for customers, sales orders, etc.
    def get_customers(self):
        """Get all customers from Manager.io"""
        try:
            logger.info("Fetching customers from Manager.io")
            
            response = self._make_request('GET', 'customers', params={'pageSize': 100, 'skip': 0})
            
            if 'customers' in response and isinstance(response['customers'], list):
                logger.info(f"Successfully fetched {len(response['customers'])} customers")
                return {
                    'success': True,
                    'customers': response['customers'],
                    'totalCount': response.get('totalRecords', len(response['customers']))
                }
            else:
                logger.warning("Unexpected response format from Manager.io API")
                return {
                    'success': False,
                    'error': 'Unexpected response format',
                    'customers': []
                }
                
        except Exception as e:
            logger.error(f"Error fetching customers: {str(e)}")
            return {
                'success': False,
                'error': str(e),
                'customers': []
            }

    def search_customers(self, term):
        """Search for customers by name or code"""
        try:
            logger.info(f"Searching for customers with term: {term}")
            
            response = self._make_request('GET', 'customers', params={'filter': term, 'pageSize': 100})
            
            if 'customers' in response and isinstance(response['customers'], list):
                customers = response['customers']
                term_lower = term.lower()
                
                # Sort by relevance
                sorted_customers = sorted(customers, key=lambda c: (
                    0 if c.get('name', '').lower() == term_lower else
                    1 if c.get('name', '').lower().startswith(term_lower) else
                    2 if term_lower in c.get('name', '').lower() else 3
                ))
                
                logger.info(f"Found {len(sorted_customers)} customers matching '{term}'")
                
                return {
                    'success': True,
                    'customers': sorted_customers,
                    'totalCount': len(sorted_customers),
                    'searchTerm': term
                }
            else:
                return {
                    'success': True,
                    'customers': [],
                    'totalCount': 0,
                    'searchTerm': term
                }
                
        except Exception as e:
            logger.error(f"Error searching customers: {str(e)}")
            return {
                'success': False,
                'error': str(e),
                'customers': []
            }

    def create_customer(self, data):
        """Create a new customer in Manager.io"""
        try:
            logger.info(f"Creating new customer: {data.get('Name')}")
            
            customer_data = {
                'Name': data.get('Name'),
                'CustomFields2': data.get('CustomFields2', {})
            }
            
            response = self._make_request('POST', 'customer-form', data=customer_data)
            
            customer_key = None
            if isinstance(response, dict):
                customer_key = response.get('key') or (response.get('data', {}).get('key'))
            
            logger.info(f"Customer created with key: {customer_key}")
            
            return {
                'success': True,
                'key': customer_key,
                'message': 'Customer created successfully',
                'customerName': data.get('Name')
            }
            
        except Exception as e:
            logger.error(f"Error creating customer: {str(e)}")
            return {
                'success': False,
                'error': str(e)
            }

    def create_sales_order(self, order_data):
        """Create a sales order in Manager.io"""
        try:
            # Validate required fields
            if not order_data.get('Customer'):
                return {
                    'success': False,
                    'error': 'Missing required field: Customer'
                }
            
            if not order_data.get('Lines') or not isinstance(order_data.get('Lines'), list) or len(order_data.get('Lines')) == 0:
                return {
                    'success': False,
                    'error': 'Order must have at least one line item'
                }
            
            # Ensure Date is properly formatted
            if 'Date' not in order_data or not order_data['Date'] or not 'T' in order_data['Date']:
                order_data['Date'] = datetime.now().strftime('%Y-%m-%dT%H:%M:%S')
            
            # Create exact payload structure matching Manager.io requirements
            payload = {
                "Date": order_data.get('Date'),
                "Reference": order_data.get('Reference', "1"),
                "Customer": order_data.get('Customer'),
                "Description": order_data.get('Description', ''),
                "Lines": [],
                "SalesOrderFooters": [],
                "CustomFields": {},
                "CustomFields2": {
                    "Strings": {},
                    "Decimals": {},
                    "Dates": {},
                    "Booleans": {},
                    "StringArrays": {}
                }
            }
            
            # Add notes if available
            if order_data.get('notes') or order_data.get('Description'):
                payload["CustomFields2"]["Strings"]["Notes"] = order_data.get('notes') or order_data.get('Description', '')
            
            # Process line items with UUID lookup
            for line in order_data.get('Lines', []):
                item_code = line.get('Item')
                
                # Check if it's already a UUID
                if item_code and len(item_code) > 30 and '-' in item_code:
                    item_uuid = item_code
                else:
                    # Try to find the item in our database to get the proper UUID
                    try:
                        from django.db import models
                        inventory_item = ManagerInventoryItem.objects.filter(
                            models.Q(manager_item_id__iexact=item_code) |
                            models.Q(code__iexact=item_code)
                        ).first()
                        
                        if inventory_item:
                            item_uuid = inventory_item.manager_item_id
                        else:
                            logger.warning(f"Could not find Manager.io UUID for item: {item_code}")
                            continue
                            
                    except Exception as lookup_err:
                        logger.error(f"Error looking up item {item_code}: {str(lookup_err)}")
                        continue
                
                # Add line with proper UUID
                payload["Lines"].append({
                    "Item": item_uuid,
                    "LineDescription": line.get('LineDescription', f"Item (unit)"),
                    "CustomFields": {},
                    "CustomFields2": {
                        "Strings": {},
                        "Decimals": {},
                        "Dates": {},
                        "Booleans": {},
                        "StringArrays": {}
                    },
                    "Qty": float(line.get('Qty', 0)),
                    "SalesUnitPrice": float(line.get('SalesUnitPrice', 0))
                })
            
            # Check if we have any processed lines
            if not payload["Lines"]:
                return {
                    'success': False,
                    'error': 'No items with valid UUIDs could be processed'
                }
            
            # Log the final payload for debugging
            logger.info(f"Sending to Manager.io: {json.dumps(payload)}")
            
            # Make the API call
            response = self._make_request('POST', 'sales-order-form', data=payload)
            
            # Extract key from response
            order_key = None
            if isinstance(response, dict):
                order_key = response.get('key') or (response.get('data', {}).get('key'))
            
            return {
                'success': True,
                'key': order_key,
                'message': 'Sales order created successfully'
            }
                    
        except Exception as e:
            logger.error(f"Error creating sales order: {str(e)}")
            logger.exception(e)
            return {
                'success': False,
                'error': str(e)
            }