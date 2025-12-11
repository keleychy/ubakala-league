from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('league', '0001_initial'),
    ]

    operations = [
        migrations.AddField(
            model_name='season',
            name='category',
            field=models.CharField(choices=[('senior_boys', 'Senior Boys'), ('girls', 'Girls'), ('junior_boys', 'Junior Boys')], default='senior_boys', max_length=20),
        ),
    ]
