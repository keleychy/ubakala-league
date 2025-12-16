from django.core.management.base import BaseCommand
from django.contrib.auth.models import User, Group


class Command(BaseCommand):
    help = 'Create role users and assign them to groups (safe to run multiple times)'

    def handle(self, *args, **options):
        # List of users to create: (username, group_name, password)
        users = [
            ('newsuser', 'NewsUploader', '5268'),
            ('resultsuser', 'ResultsEditor', '5268'),
        ]

        for username, group_name, password in users:
            user, created = User.objects.get_or_create(username=username, defaults={'is_active': True})
            if created:
                user.set_password(password)
                user.email = f'{username}@example.com'
                user.is_staff = False
                user.is_superuser = False
                user.save()
                self.stdout.write(self.style.SUCCESS(f"Created user '{username}'"))
            else:
                # Update password to the provided one to ensure access
                user.set_password(password)
                user.save()
                self.stdout.write(self.style.WARNING(f"User '{username}' already existed; password updated"))

            # Ensure group exists
            group, _ = Group.objects.get_or_create(name=group_name)
            user.groups.add(group)
            user.save()
            self.stdout.write(self.style.SUCCESS(f"Assigned '{username}' to group '{group_name}'"))

        self.stdout.write(self.style.SUCCESS('Role users creation/update completed.'))
