from rest_framework import permissions


class IsNewsUploaderOrReadOnly(permissions.BasePermission):
    """Allow read-only access to anyone, but POST/PUT/DELETE only for NewsUploader or superusers."""
    def has_permission(self, request, view):
        if request.method in permissions.SAFE_METHODS:
            return True
        user = request.user
        if not user or not user.is_authenticated:
            return False
        if user.is_superuser:
            return True
        return user.groups.filter(name='NewsUploader').exists()


class IsResultsEditor(permissions.BasePermission):
    """Allow only ResultsEditor group members or superusers to update match results."""
    def has_permission(self, request, view):
        user = request.user
        if not user or not user.is_authenticated:
            return False
        if user.is_superuser:
            return True
        return user.groups.filter(name='ResultsEditor').exists()
