# Using django-celery-beat for scheduled tasks

# backend/recipes/celery.py
from celery import Celery
from celery.schedules import crontab

app = Celery('recipes')

app.conf.beat_schedule = {
    'sync-inventory-every-hour': {
        'task': 'recipes.tasks.sync_inventory_task',
        'schedule': crontab(minute=0),  # Run every hour at minute 0
    },
}