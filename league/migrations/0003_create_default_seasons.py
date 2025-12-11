from django.db import migrations


def create_seasons(apps, schema_editor):
    Season = apps.get_model('league', 'Season')
    # Only create if not already present
    names = [
        ("2025 Senior Cup", "Senior boys"),
        ("2025 Girls Cup", "Girls"),
        ("2025 Junior Boys Cup", "Junior boys"),
    ]
    for name, category in names:
        if not Season.objects.filter(name=name, category=category).exists():
            Season.objects.create(name=name, start_date="2025-06-01", category=category)


def delete_seasons(apps, schema_editor):
    Season = apps.get_model('league', 'Season')
    Season.objects.filter(name__in=[
        "2025 Senior Cup",
        "2025 Girls Cup",
        "2025 Junior Boys Cup",
    ]).delete()


class Migration(migrations.Migration):

    dependencies = [
        ("league", "0002_add_season_category"),
    ]

    operations = [
        migrations.RunPython(create_seasons, reverse_code=delete_seasons),
    ]
