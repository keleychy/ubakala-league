from django.db import migrations, models

class Migration(migrations.Migration):
    dependencies = [
        ('league', '0003_create_default_seasons'),
    ]

    operations = [
        migrations.CreateModel(
            name='Group',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('name', models.CharField(max_length=1)),
                ('category', models.CharField(max_length=20)),
                ('season', models.ForeignKey(on_delete=models.CASCADE, to='league.season')),
            ],
        ),
        migrations.CreateModel(
            name='TeamGroup',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('team', models.ForeignKey(on_delete=models.CASCADE, to='league.team')),
                ('group', models.ForeignKey(on_delete=models.CASCADE, to='league.group')),
                ('season', models.ForeignKey(on_delete=models.CASCADE, to='league.season')),
            ],
            options={
                'unique_together': {('team', 'group', 'season')},
            },
        ),
    ]
