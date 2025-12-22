from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('league', '0014_news_author'),
    ]

    operations = [
        migrations.AddField(
            model_name='match',
            name='current_period',
            field=models.CharField(choices=[('not_started', 'Not started'), ('1st_half', "1st Half"), ('halftime', 'Half Time'), ('2nd_half', '2nd Half'), ('ended', 'Ended')], default='not_started', max_length=20, help_text='Current period/phase of the match'),
        ),
    ]
