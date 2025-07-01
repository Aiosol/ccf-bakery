from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from django.contrib.auth.models import User
from .models import UserProfile, PagePermission

# Page Permissions Admin - Super admin can configure access
@admin.register(PagePermission)
class PagePermissionAdmin(admin.ModelAdmin):
    list_display = ['role', 'page', 'can_access']
    list_editable = ['can_access']
    list_filter = ['role', 'page', 'can_access']
    ordering = ['role', 'page']
    
    def has_add_permission(self, request):
        return request.user.is_superuser
    
    def has_change_permission(self, request, obj=None):
        return request.user.is_superuser
    
    def has_delete_permission(self, request, obj=None):
        return request.user.is_superuser

# Simple UserProfile admin
@admin.register(UserProfile)
class UserProfileAdmin(admin.ModelAdmin):
    list_display = ['user', 'role', 'is_active', 'created_at']
    list_editable = ['role', 'is_active']
    list_filter = ['role', 'is_active']
    search_fields = ['user__username', 'user__email']

# Add profile to User admin
class UserProfileInline(admin.StackedInline):
    model = UserProfile
    can_delete = False

class CustomUserAdmin(BaseUserAdmin):
    inlines = (UserProfileInline,)

# Re-register User admin
admin.site.unregister(User)
admin.site.register(User, CustomUserAdmin)