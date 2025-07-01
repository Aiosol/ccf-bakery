from django.contrib.auth import authenticate, login, logout
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods
import json
# Add these imports
from .models import UserProfile, PagePermission

@csrf_exempt
@require_http_methods(["POST"])
def login_view(request):
    try:
        data = json.loads(request.body)
        username = data.get('username')
        password = data.get('password')
        
        user = authenticate(username=username, password=password)
        
        if user and user.is_active:
            login(request, user)
            
            # Ensure user has a profile
            profile, created = UserProfile.objects.get_or_create(
                user=user,
                defaults={'role': 'admin' if user.is_superuser else 'customer'}
            )
            
            return JsonResponse({
                'success': True,
                'user': {
                    'id': user.id,
                    'username': user.username,
                    'email': user.email,
                    'role': profile.role,
                    'is_admin': profile.is_admin,
                    'is_customer': profile.is_customer,
                    'is_manager': profile.is_manager,
                }
            })
        else:
            return JsonResponse({
                'success': False,
                'error': 'Invalid credentials'
            }, status=401)
            
    except Exception as e:
        return JsonResponse({
            'success': False,
            'error': str(e)
        }, status=500)

 

@require_http_methods(["POST"])
def logout_view(request):
    logout(request)
    return JsonResponse({'success': True})

@require_http_methods(["GET"])
def user_view(request):
    if request.user.is_authenticated:
        return JsonResponse({
            'success': True,
            'user': {
                'id': request.user.id,
                'username': request.user.username,
                'email': request.user.email,
                'role': request.user.profile.role,
                'is_admin': request.user.profile.is_admin,
                'is_customer': request.user.profile.is_customer,
                'is_manager': request.user.profile.is_manager,
            }
        })
    else:
        return JsonResponse({
            'success': False,
            'error': 'Not authenticated'
        }, status=401)
    
# Add this new function to auth_views.py
@require_http_methods(["GET"])
def user_permissions_view(request):
    if request.user.is_authenticated:
        # Get user's permissions
        permissions = PagePermission.objects.filter(
            role=request.user.profile.role,
            can_access=True
        ).values_list('page', flat=True)
        
        return JsonResponse({
            'success': True,
            'permissions': list(permissions)
        })
    else:
        return JsonResponse({
            'success': False,
            'error': 'Not authenticated'
        }, status=401)