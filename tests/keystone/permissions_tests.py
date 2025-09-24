from django.contrib.auth.models import Permission
from pytest import (
    mark,
    raises,
)

from keystone.permissions import Permissions


@mark.django_db
def test_Permissions_attributes():
    """The Permissions class is initialized with simplified/enum-like attributes
    representing keystone app-related entries in the auth_permission table.
    """
    # Check that all keystone-app-related entries from the auth_permission table
    # are represented as Permissions attributes.
    for codename in Permission.objects.filter(
        content_type__app_label="keystone"
    ).values_list("codename", flat=True):
        assert getattr(Permissions, codename.upper()) == f"keystone.{codename}"
    # Explicitly check for some app-specific / custom permissions.
    assert Permissions.ADD_DATASET == "keystone.add_dataset"
    assert Permissions.CHANGE_DATASET == "keystone.change_dataset"
    assert Permissions.VIEW_DATASET == "keystone.view_dataset"
    assert Permissions.DELETE_DATASET == "keystone.delete_dataset"
    assert Permissions.PUBLISH_DATASET == "keystone.publish_dataset"
    assert Permissions.CHANGE_DATASET_TEAMS == "keystone.change_dataset_teams"


def test_Permissions_bad_attribute_name():
    """Attempting to access a non-uppercase attribute name raises an AttributeError"""
    with raises(AttributeError) as exc_info:
        Permissions.add_user
    assert exc_info.value.args[0] == "Expected uppercase permission name, got: add_user"


@mark.django_db
def test_Permissions_permission_not_found():
    """Attempting to access a name for which no matching instance existing in the
    database raises an AttributeError"""
    with raises(AttributeError) as exc_info:
        Permissions.BAD_PERM
    assert (
        exc_info.value.args[0] == "Permissions class has no attribute 'BAD_PERM'. "
        "Perhaps you need to make/run the migration that creates it?"
    )
