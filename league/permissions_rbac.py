from rest_framework import permissions
from league.models_rbac import UserRole


class IsAdmin(permissions.BasePermission):
    """Only admins can access"""
    def has_permission(self, request, view):
        try:
            role_profile = request.user.role_profile
            return role_profile.role == 'admin'
        except:
            return False


class IsAdminOrModerator(permissions.BasePermission):
    """Only admins and moderators can access"""
    def has_permission(self, request, view):
        try:
            role_profile = request.user.role_profile
            return role_profile.role in ['admin', 'moderator']
        except:
            return False


class CanEditMatches(permissions.BasePermission):
    """Check if user has edit_matches permission"""
    def has_permission(self, request, view):
        if request.method in permissions.SAFE_METHODS:
            return True
        try:
            role_profile = request.user.role_profile
            if role_profile.role == 'admin':
                return True
            return role_profile.permissions.filter(name='edit_matches').exists()
        except:
            return False


class CanManageTeams(permissions.BasePermission):
    """Check if user has manage_teams permission"""
    def has_permission(self, request, view):
        if request.method in permissions.SAFE_METHODS:
            return True
        try:
            role_profile = request.user.role_profile
            if role_profile.role == 'admin':
                return True
            return role_profile.permissions.filter(name='manage_teams').exists()
        except:
            return False


class CanManageUsers(permissions.BasePermission):
    """Check if user has manage_users permission"""
    def has_permission(self, request, view):
        try:
            role_profile = request.user.role_profile
            if role_profile.role == 'admin':
                return True
            return role_profile.permissions.filter(name='manage_users').exists()
        except:
            return False
