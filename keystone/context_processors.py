import datetime

from django.conf import settings as _settings
from django.shortcuts import reverse

from keystone.models import CollectionTypes
from keystone.permissions import Permissions


def extra_builtins(request):
    """Make additional Python built-ins available in templates."""
    return {
        "datetime": datetime,
        "isinstance": isinstance,
        "len": len,
        "list": list,
        "str": str,
        "tuple": tuple,
    }


def settings(request):
    """A subset of (non-secret) settings values."""
    return {
        "settings": {
            "ARCH_SUPPORT_TICKET_URL": _settings.ARCH_SUPPORT_TICKET_URL,
            "KEYSTONE_GIT_COMMIT_HASH": _settings.KEYSTONE_GIT_COMMIT_HASH,
            "COLAB_MAX_FILE_SIZE_BYTES": _settings.COLAB_MAX_FILE_SIZE_BYTES,
            "SUPPORTED_COLAB_JOBFILE_FILENAMES": _settings.SUPPORTED_COLAB_JOBFILE_FILENAMES,
            "ALLOW_INACTIVE_USER_AS_VIEWER": _settings.ALLOW_INACTIVE_USER_AS_VIEWER,
        }
    }


def helpers(request):
    """Extra template helpers."""
    return {
        "abs_url": (
            lambda path, args=None: _settings.PUBLIC_BASE_URL + reverse(path, args=args)
        ),
        "intcomma": "{:,}".format,
        "CollectionTypes": CollectionTypes,
        "Permissions": Permissions,
    }
