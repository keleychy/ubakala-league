from django.core.management.base import BaseCommand
from django.contrib.auth.models import Group, Permission, User
from django.contrib.contenttypes.models import ContentType


class Command(BaseCommand):
    help = 'Create NewsUploader and ResultsEditor groups and assign permissions'

    def handle(self, *args, **options):
        # Ensure groups exist
        news_group, created = Group.objects.get_or_create(name='NewsUploader')
        results_group, created2 = Group.objects.get_or_create(name='ResultsEditor')

        # Assign permissions for News (add, change)
        try:
            news_ct = ContentType.objects.get(app_label='league', model='news')
            add_news = Permission.objects.get(content_type=news_ct, codename='add_news')
            change_news = Permission.objects.get(content_type=news_ct, codename='change_news')
            news_group.permissions.add(add_news, change_news)
            self.stdout.write(self.style.SUCCESS('Assigned news add/change permissions to NewsUploader'))
        except ContentType.DoesNotExist:
            self.stdout.write(self.style.WARNING('ContentType for News not found; run migrations first'))
        except Permission.DoesNotExist:
            self.stdout.write(self.style.WARNING('News permissions not found'))

        # Assign permission for Match (change)
        try:
            match_ct = ContentType.objects.get(app_label='league', model='match')
            change_match = Permission.objects.get(content_type=match_ct, codename='change_match')
            results_group.permissions.add(change_match)
            self.stdout.write(self.style.SUCCESS('Assigned match change permission to ResultsEditor'))
        except ContentType.DoesNotExist:
            self.stdout.write(self.style.WARNING('ContentType for Match not found; run migrations first'))
        except Permission.DoesNotExist:
            self.stdout.write(self.style.WARNING('Match permissions not found'))

        # Optionally ensure the keleychy user exists and is superuser
        try:
            u = User.objects.get(username='keleychy')
            if not u.is_superuser:
                u.is_superuser = True
                u.is_staff = True
                u.save()
                self.stdout.write(self.style.SUCCESS('Marked keleychy as superuser'))
            else:
                self.stdout.write(self.style.SUCCESS('User keleychy already superuser'))
        except User.DoesNotExist:
            self.stdout.write(self.style.WARNING('Superuser keleychy not found; create it with createsuperuser'))

        self.stdout.write(self.style.SUCCESS('Groups creation completed'))
