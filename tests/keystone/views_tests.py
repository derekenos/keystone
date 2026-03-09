import os
from http import HTTPStatus
from unittest.mock import patch
from itertools import chain

from django.http import HttpResponse
from django.test import Client as _Client, override_settings
from pytest import mark

from config.settings import COLAB_MAX_FILE_SIZE_BYTES

from keystone.models import UserRoles


###############################################################################
# Helpers
###############################################################################


class Client(_Client):
    def __init__(self, user):
        super().__init__()
        self.force_login(user)


###############################################################################
# Tests
###############################################################################


@mark.django_db
def test_dataset_file_colab_file_size_limit(
    make_user, make_user_dataset, make_jobcomplete, make_jobfile
):
    """Attempting to open a file in Colab with a size that exceeds
    settings.COLAB_MAX_FILE_SIZE_BYTES results in a 400 response.
    """
    user = make_user()
    dataset = make_user_dataset(user)
    job_file = make_jobfile(
        job_complete=dataset.job_start.jobcomplete,
        size_bytes=COLAB_MAX_FILE_SIZE_BYTES + 1,
    )

    client = Client(user)
    res = client.get(f"/datasets/{dataset.id}/files/{job_file.filename}/colab")
    assert res.status_code == HTTPStatus.BAD_REQUEST
    assert (
        res.content.decode()
        == f"File size ({job_file.size_bytes}) exceeds max supported Google Colab size ({COLAB_MAX_FILE_SIZE_BYTES})"
    )


@mark.django_db
@override_settings(
    ALLOW_INACTIVE_USER_AS_VIEWER=False,
    AUTHENTICATION_BACKENDS=["django.contrib.auth.backends.ModelBackend"],
)
def test_inactive_user_cant_login_when_ALLOW_INACTIVE_USER_AS_VIEWER_notset(
    settings, make_user
):
    """An inactive user is not allowed to log in when ALLOW_INACTIVE_USER_AS_VIEWER=False
    and AUTHENTICATION_BACKENDS does not include AllowAllUsersModelBackend.
    """
    user = make_user(is_active=False)
    user.set_password("password")
    user.save()
    assert (
        _Client()
        .post("/login/", {"username": user.username, "password": "password"})
        .status_code
        == HTTPStatus.OK
    )


@mark.django_db
@override_settings(
    ALLOW_INACTIVE_USER_AS_VIEWER=True,
    AUTHENTICATION_BACKENDS=["django.contrib.auth.backends.AllowAllUsersModelBackend"],
)
def test_inactive_user_can_login_when_ALLOW_INACTIVE_USER_AS_VIEWER_isset(
    settings, make_user
):
    """An inactive user is allowed to log in when ALLOW_INACTIVE_USER_AS_VIEWER=True and
    AUTHENTICATION_BACKENDS does include AllowAllUsersModelBackend.
    """
    user = make_user(is_active=False)
    user.set_password("password")
    user.save()
    res = _Client().post("/login/", {"username": user.username, "password": "password"})
    assert res.status_code == HTTPStatus.FOUND and res.headers.get("location") == "/"
