# backend/recipes/tasks.py
import logging
from .manager_api import ManagerApiService
from .models import ManagerInventoryItem

logger = logging.getLogger(__name__)

def sync_inventory_task():
    """
    Synchronize inventory with Manager.io
    This can be scheduled to run periodically
    """
    try:
        api_service = ManagerApiService()
        inventory_data = api_service.sync_inventory_items()
        return inventory_data
    except Exception as e:
        logger.error(f"Error syncing inventory: {str(e)}")
        raise