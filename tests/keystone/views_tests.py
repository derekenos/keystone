from http import HTTPStatus
from unittest.mock import patch

from django.http import HttpResponse
from django.test import Client as _Client
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
@mark.parametrize(
    "role,status_code",
    (
        (UserRoles.USER, HTTPStatus.OK),
        (UserRoles.VIEWER, HTTPStatus.FORBIDDEN),
    ),
)
@patch("keystone.arch_api.ArchAPI.proxy_colab_redirect")
def test_dataset_file_colab_disallows_inactive_user(
    proxy_colab_redirect, role, status_code, make_user, make_user_dataset
):
    """A viewer user is not allowed to access the colab view."""
    proxy_colab_redirect.return_value = HttpResponse()
    user = make_user(role=role)
    dataset = make_user_dataset(user)
    filename = dataset.job_start.jobcomplete.jobfile_set.first().filename
    assert (
        Client(user).get(f"/datasets/{dataset.id}/files/{filename}/colab").status_code
        == status_code
    )
