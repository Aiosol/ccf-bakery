# backend/recipes/management/commands/create_default_categories.py
from django.core.management.base import BaseCommand
from recipes.models import RecipeCategory

class Command(BaseCommand):
    help = 'Creates default recipe categories for the bakery application'

    def handle(self, *args, **options):
        categories = [
            ('Cake & Pastry', 'cake-pastry'),
            ('Savory', 'savory'),
            ('Frozen', 'frozen'),
            ('Cookies', 'cookies'),
            ('Bread & Bun', 'bread-bun'),
            ('Restaurant Items', 'restaurant-items')
        ]
        
        created = 0
        for name, slug in categories:
            obj, created_flag = RecipeCategory.objects.get_or_create(
                name=name,
                defaults={'slug': slug}
            )
            if created_flag:
                created += 1
                self.stdout.write(f"Created category: {name}")
            else:
                self.stdout.write(f"Category already exists: {name}")
                
        self.stdout.write(self.style.SUCCESS(
            f'Successfully created {created} new categories (total: {RecipeCategory.objects.count()})'
        ))