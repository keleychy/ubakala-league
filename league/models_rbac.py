from django.db import models
from django.contrib.auth.models import User

class UserRole(models.Model):
    """Role-based access control for users"""
    ROLE_CHOICES = [
        ('admin', 'Administrator'),
        ('moderator', 'Moderator'),
        ('user', 'Regular User'),
    ]
    
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='role_profile')
    role = models.CharField(max_length=20, choices=ROLE_CHOICES, default='user')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.user.username} - {self.get_role_display()}"

    class Meta:
        verbose_name = "User Role"
        verbose_name_plural = "User Roles"


class Permission(models.Model):
    """Define specific permissions for roles"""
    PERMISSION_CHOICES = [
        ('view_matches', 'View Matches'),
        ('view_standings', 'View Standings'),
        ('view_results', 'View Results'),
        ('edit_matches', 'Edit Match Results'),
        ('manage_teams', 'Manage Teams'),
        ('manage_users', 'Manage Users'),
        ('manage_seasons', 'Manage Seasons'),
        ('view_admin_dashboard', 'View Admin Dashboard'),
        ('export_data', 'Export Data'),
    ]
    
    name = models.CharField(max_length=50, unique=True, choices=PERMISSION_CHOICES)
    role = models.ForeignKey(UserRole, on_delete=models.CASCADE, related_name='permissions')
    
    def __str__(self):
        return f"{self.role.get_role_display()} - {self.get_name_display()}"

    class Meta:
        unique_together = ('name', 'role')
