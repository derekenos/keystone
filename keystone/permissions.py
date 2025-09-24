"""
This module provides helpers for working with Django's built-in permissions system.

Out of the box, Django permissions are only utilized by the Django admin site for the
purpose of tailoring the UI and authorizing actions per the permissions of the specific user,
but applications are free to leverage the permissions system for their own purposes.

Django permissions automatically ensures (via post_migrate hook) that a default set of
permissions (i.e. add, view, change, delete) is created for each Model type as
django.contrib.auth.models.Permission instances.

You can add custom, Model-specific permissions by defining Meta.permissions, followed by
makemigrations + migrate: https://docs.djangoproject.com/en/4.2/ref/models/options/#permissions

A permission is tested via the User.has_perm(<permission>, <obj>) method where permission is
a permissions string in the format "<app_label>.<action>_<model_name>" and obj is an optional
specific model instance against which to check.

To avoid having to deal with these permissions strings directly, the Permissions class defined in
this module provides enum-like access to these values, e.g. Permissions.ADD_USER will have a value
of "keystone.add_user".

In Keystone, superusers are granted all permissions, while other users' permissions are determined
per-instance via the Model.user_has_perm() method. Check out keystone.models.User.has_perm() for
details, and keystone.api for User.has_perm() usage examples.
"""

from django.contrib.auth.models import Permission

from keystone.apps import KeystoneConfig


class PermissionsBase(type):
    """Permissions metaclass to handle the db-verification/initialization of class attributes."""

    def __getattr__(cls, name):
        """If name matches the codename of an existing Keystone-related Permission
        instance, use name to set a class attribute equal to the full permission string
        value. If no match is found, raise an AttributeError.
        """
        # The rationale for implementing this as a single-attribute read-through cache
        # as opposed to batch loading / initializing all at once is:
        # - It proved difficult in the CI test environment to get batch initialization
        #   working using the connection_created and post_migrate Django signals
        # - A bulk init on first attribute miss would prevent permissions that were
        #   subsequently added via a migration from being recognized until the app
        #   was restarted
        # - We're currently referencing very few of these permissions in code, so we
        #   avoid creating unnecessary entries
        if not name.isupper():
            raise AttributeError(f"Expected uppercase permission name, got: {name}")
        app_label = KeystoneConfig.name
        codename = name.lower()
        if Permission.objects.filter(
            content_type__app_label=app_label, codename=codename
        ).exists():
            value = f"{app_label}.{codename}"
            setattr(cls, name, value)
            return value
        raise AttributeError(
            f"Permissions class has no attribute '{name}'. "
            "Perhaps you need to make/run the migration that creates it?"
        )


class Permissions(metaclass=PermissionsBase):
    """This class provides a database-verified, enum-like abstraction over permission
    strings, e.g. Permissions.ADD_COLLECTION will have a value of "keystone.add_collection".
    """
