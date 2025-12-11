from django.core.management.base import BaseCommand
from django.contrib.auth.models import User
from league.models_rbac import UserRole, Permission


class Command(BaseCommand):
    help = 'Set up default RBAC roles and permissions'

    def handle(self, *args, **options):
        # Define role permissions
        role_permissions = {
            'admin': [
                'view_matches', 'view_standings', 'view_results',
                'edit_matches', 'manage_teams', 'manage_users',
                'manage_seasons', 'view_admin_dashboard', 'export_data'
            ],
            'moderator': [
                'view_matches', 'view_standings', 'view_results',
                'edit_matches', 'manage_teams', 'view_admin_dashboard'
            ],
            'user': [
                'view_matches', 'view_standings', 'view_results'
            ]
        }

        # Create roles with permissions
        for role_name, permissions_list in role_permissions.items():
            # Get or create all users with this role
            users_with_role = UserRole.objects.filter(role=role_name)
            
            for user_role in users_with_role:
                # Clear existing permissions
                user_role.permissions.all().delete()
                
                # Add new permissions
                for perm_name in permissions_list:
                    Permission.objects.create(
                        name=perm_name,
                        role=user_role
                    )
            
            self.stdout.write(
                self.style.SUCCESS(
                    f'✓ Configured {role_name} role with {len(permissions_list)} permissions'
                )
            )

        # Assign admin role to superuser if exists
        try:
            admin_user = User.objects.get(username='admin')
            admin_role, created = UserRole.objects.get_or_create(
                user=admin_user,
                defaults={'role': 'admin'}
            )
            if created:
                self.stdout.write(self.style.SUCCESS('✓ Assigned admin role to superuser'))
        except User.DoesNotExist:
            self.stdout.write(self.style.WARNING('⚠ No superuser found. Create one with: python manage.py createsuperuser'))

        self.stdout.write(self.style.SUCCESS('✓ RBAC setup completed successfully!'))
