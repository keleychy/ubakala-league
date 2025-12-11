from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.contrib.auth.models import User
from league.models_rbac import UserRole
from league.serializers_rbac import UserWithRoleSerializer
from league.permissions_rbac import IsAdmin


class UserRoleViewSet(viewsets.ViewSet):
    """API endpoints for user roles and permissions"""
    permission_classes = [IsAuthenticated]

    @action(detail=False, methods=['get'])
    def current_user(self, request):
        """Get current user's role and permissions"""
        try:
            role_profile = request.user.role_profile
            serializer = UserWithRoleSerializer(request.user)
            return Response(serializer.data)
        except UserRole.DoesNotExist:
            return Response({
                'error': 'User role not configured'
            }, status=status.HTTP_404_NOT_FOUND)

    @action(detail=False, methods=['get'], permission_classes=[IsAdmin])
    def all_users(self, request):
        """Get all users with their roles (admin only)"""
        users = User.objects.all()
        serializer = UserWithRoleSerializer(users, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['post'], permission_classes=[IsAdmin])
    def assign_role(self, request):
        """Assign role to a user (admin only)"""
        username = request.data.get('username')
        role = request.data.get('role')

        if not username or not role:
            return Response({
                'error': 'username and role are required'
            }, status=status.HTTP_400_BAD_REQUEST)

        if role not in ['admin', 'moderator', 'user']:
            return Response({
                'error': 'Invalid role'
            }, status=status.HTTP_400_BAD_REQUEST)

        try:
            user = User.objects.get(username=username)
            role_profile, created = UserRole.objects.get_or_create(user=user)
            role_profile.role = role
            role_profile.save()
            serializer = UserWithRoleSerializer(user)
            return Response(serializer.data)
        except User.DoesNotExist:
            return Response({
                'error': 'User not found'
            }, status=status.HTTP_404_NOT_FOUND)

    @action(detail=False, methods=['get'])
    def check_permission(self, request):
        """Check if user has a specific permission"""
        permission = request.query_params.get('permission')
        
        if not permission:
            return Response({
                'error': 'permission parameter is required'
            }, status=status.HTTP_400_BAD_REQUEST)

        try:
            role_profile = request.user.role_profile
            has_permission = role_profile.permissions.filter(name=permission).exists()
            
            return Response({
                'has_permission': has_permission,
                'role': role_profile.get_role_display()
            })
        except UserRole.DoesNotExist:
            return Response({
                'has_permission': False,
                'error': 'User role not configured'
            }, status=status.HTTP_404_NOT_FOUND)
