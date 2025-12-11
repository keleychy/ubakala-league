from rest_framework import serializers
from django.contrib.auth.models import User
from league.models_rbac import UserRole, Permission


class PermissionSerializer(serializers.ModelSerializer):
    class Meta:
        model = Permission
        fields = ['id', 'name', 'get_name_display']


class UserRoleSerializer(serializers.ModelSerializer):
    permissions = PermissionSerializer(many=True, read_only=True)
    role_display = serializers.CharField(source='get_role_display', read_only=True)

    class Meta:
        model = UserRole
        fields = ['id', 'role', 'role_display', 'permissions', 'created_at']


class UserWithRoleSerializer(serializers.ModelSerializer):
    role_profile = UserRoleSerializer(read_only=True)

    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'first_name', 'last_name', 'role_profile']
