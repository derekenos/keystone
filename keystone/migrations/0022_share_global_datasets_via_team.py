from django.db.migrations import (
    Migration,
    RunPython,
)

from config.settings import (
    GLOBAL_USER_USERNAME,
    GLOBAL_DATASETS_TEAM_NAME,
)
from . import ModelGetter


_first_log = True


def log(level, s):
    global _first_log
    if _first_log:
        print()
        _first_log = False
    print(f"  - [{level}] {s}")


def warn(s):
    log("WARN", s)


def info(s):
    log("INFO", s)


def share_global_datasets_via_team(apps, schema_editor):
    """Create a team through which to facilitate the same sharing of global
    user-owned datasets that was previously enabled via implicit inclusion in
    Dataset.user_queryset().
    """
    models = ModelGetter(apps)
    _abort = lambda reason: warn(f"aborting creation of global datasets team: {reason}")
    # Get the global datasets user.
    global_user = models.User.objects.filter(username=GLOBAL_USER_USERNAME).first()
    # Abort if user does not exist.
    if not global_user:
        return _abort(f"'{GLOBAL_USER_USERNAME}' user not found")
    # Get or create the global datasets team.
    global_datasets_team, created = models.Team.objects.get_or_create(
        name=GLOBAL_DATASETS_TEAM_NAME, account=global_user.account
    )
    # Abort if the team already exists.
    if not created:
        return _abort(f"'{global_datasets_team}' team already exists")
    info(f"Created '{GLOBAL_DATASETS_TEAM_NAME}' team")
    # Authorize the the team to access all existing global datasets user-owned datasets, and
    # add all users that are directly authorized (via Collection.users) to access global
    # dataset-associated collections as members of the global datasets team.
    # The goal here is to restore access to users who previously, implicitly had access to
    # these datasets via the inclusion logic:
    #   - owned by the global datasets user and is associated with a
    #    collection to which the user has access
    # with the caveat that the code mistakenly only ever checked for user access via
    # membership in Collection.users, but not Collection.{accounts,teams}.
    authed_user_ids = set()
    for dataset in models.Dataset.objects.filter(job_start__user=global_user):
        authed_user_ids.update(
            dataset.job_start.collection.users.values_list("id", flat=True)
        )
    # Add all direct collection-authorized users as members of the global datasets team.
    global_datasets_team.members.add(*authed_user_ids)
    # Omit global_user from reported count if present.
    info(
        f"Added {len(authed_user_ids - {global_user.id})} "
        f"Dataset.job_start.collection.users-authorized users to "
        f"'{GLOBAL_DATASETS_TEAM_NAME}' team"
    )


def delete_global_datasets_via_team(apps, schema_editor):
    """Delete the global datasets team."""
    models = ModelGetter(apps)
    _abort = lambda reason: warn(f"aborting delete of global datasets team: {reason}")
    # Get the global datasets user.
    global_user = models.User.objects.filter(username=GLOBAL_USER_USERNAME).first()
    if not global_user:
        return _abort(f"{GLOBAL_USER_USERNAME} user not found")
    # Delete the global datasets team.
    global_datasets_team = models.Team.objects.filter(
        name=GLOBAL_DATASETS_TEAM_NAME, account__id=global_user.account_id
    ).first()
    if not global_datasets_team:
        return _abort(f"{GLOBAL_DATASETS_TEAM_NAME} team not found")
    global_datasets_team.delete()
    info(f"Deleted '{global_datasets_team.name}' team")


class Migration(Migration):
    dependencies = [
        ("keystone", "0021_collectionusersettings_and_more"),
    ]

    operations = [
        RunPython(
            code=share_global_datasets_via_team,
            reverse_code=delete_global_datasets_via_team,
        )
    ]
