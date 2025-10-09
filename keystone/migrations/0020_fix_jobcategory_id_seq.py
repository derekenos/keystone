# Fix the keystone_jobcategory_id_seq value being < max(keystone_jobcategory.id)
# on account of the JobCategory.objects.create() in migration 0002_become_arch_client
# not triggering a sequence increment.

from django.db import migrations


class Migration(migrations.Migration):
    dependencies = [
        ("keystone", "0019_add_dataset_custom_permissions"),
    ]

    operations = [
        migrations.RunSQL(
            sql="SELECT setval('keystone_jobcategory_id_seq', (select max(id) from keystone_jobcategory), true);",
            reverse_sql=migrations.RunSQL.noop,
        ),
    ]
