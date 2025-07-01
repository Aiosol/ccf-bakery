from django.core.management.base import BaseCommand
from django.contrib.auth.models import User
from recipes.models import UserProfile, PagePermission, ProductionCategory

class Command(BaseCommand):
    help = 'Fix user profiles and permissions'

    def handle(self, *args, **options):
        # Fix all superusers
        superusers = User.objects.filter(is_superuser=True)
        for user in superusers:
            profile, created = UserProfile.objects.get_or_create(
                user=user,
                defaults={'role': 'admin'}
            )
            if created:
                self.stdout.write(f"Created profile for superuser: {user.username}")
            else:
                # Update existing profile to admin if it's not
                if profile.role != 'admin':
                    profile.role = 'admin'
                    profile.save()
                    self.stdout.write(f"Updated profile role to admin for: {user.username}")
        
        # Create all permissions for admin role
        admin_pages = ['dashboard', 'inventory', 'recipes', 'production', 'orders', 'reports', 'settings']
        for page in admin_pages:
            perm, created = PagePermission.objects.get_or_create(
                role='admin',
                page=page,
                defaults={'can_access': True}
            )
            if created:
                self.stdout.write(f"Created admin permission for: {page}")
        
        # Create customer permissions
        PagePermission.objects.get_or_create(
            role='customer',
            page='orders',
            defaults={'can_access': True}
        )
        
        # Create manager permissions
        manager_pages = ['dashboard', 'inventory', 'recipes', 'production', 'orders', 'reports']
        for page in manager_pages:
            PagePermission.objects.get_or_create(
                role='manager',
                page=page,
                defaults={'can_access': True}
            )
        
        # Ensure production categories exist
        ProductionCategory.ensure_defaults_exist()
        
        self.stdout.write(self.style.SUCCESS('Successfully fixed all permissions!'))