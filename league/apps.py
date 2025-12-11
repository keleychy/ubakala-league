from django.apps import AppConfig


class LeagueConfig(AppConfig):
    name = 'league'
    default_auto_field = 'django.db.models.BigAutoField'

    def ready(self):
        # import signals to ensure they're registered when app is ready
        try:
            from . import signals  # noqa: F401
        except Exception:
            pass
