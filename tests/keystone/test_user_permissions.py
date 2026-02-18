import re
from http import HTTPStatus
from importlib import resources

from unittest import mock

from model_bakery.baker import prepare
from pytest import mark
from django.http import HttpResponse
from django.test import override_settings

from config.settings import KnownArchJobUuids
from keystone.models import (
    JobType,
    User,
    UserRoles,
)

from .api_tests import Client as _Client


###############################################################################
# Globals
###############################################################################


BOOL_WITH_CONDITIONAL_REGEX = re.compile(
    r"^(?P<has_perm>Yes|No)(?:\s*\((?P<perm_condition>[^\)]+)\))?$"
)

CATEGORIES = frozenset(("Collections", "Datasets", "Accounts"))


CATEGORY_FIELD_TEST_METHODS_MAP = {
    "Collections": {
        "View": (
            "_test_collections_view",
            "_test_collections_api_endpoint",
            "_test_collection_detail_view",
            "_test_collection_detail_api_endpoint",
        ),
        "Edit User Settings": ("_test_edit_collection_user_settings",),
        "Create Custom": ("_test_create_custom_collection",),
        "Edit Custom Name": ("_test_edit_custom_collection_name",),
    },
    "Datasets": {
        "View": (
            "_test_datasets_view",
            "_test_datasets_api_endpoint",
            "_test_dataset_detail_view",
            "_test_dataset_detail_api_endpoint",
        ),
        "Edit User Settings": ("_test_edit_dataset_user_settings",),
        "Generate": ("_test_generate_dataset",),
        "Download": ("_test_download_dataset",),
        "Colab": ("_test_dataset_colab",),
        "Modify Teams": ("_test_modify_dataset_teams",),
        "Publish": ("_test_publish_dataset",),
    },
    "Accounts": {
        "View Users": (
            "_test_account_users_view",
            "_test_account_users_api_endpoint",
        ),
        "Add User": ("_test_add_account_user",),
        "Edit User": ("_test_edit_account_user",),
        "View Teams": (
            "_test_account_teams_view",
            "_test_account_teams_api_endpoint",
        ),
        "Add Team": ("_test_add_account_team",),
        "Edit Team": ("_test_edit_account_team",),
    },
}


NUM_EXPECTED_TEST_CASES = 600


###############################################################################
# Helpers
###############################################################################


class Client(_Client):
    def __init__(self, user):
        super().__init__(user)
        self.user = user

    def publish_dataset(self, dataset, metadata):
        return self.post(
            f"/api/datasets/{dataset.id}/publication",
            {"metadata": metadata},
            "application/json",
        )


###############################################################################
# user-permissions-matrix.md parsing helpers
###############################################################################


def parse_next_heading(fh, level):
    """Find the next occurence of the specified level heading and
    return just the text.
    """
    while True:
        line = next(fh).strip()
        if line.startswith(f"{'#' * level} "):
            return line[level + 1 :]
    raise AssertionError("No next level {level} heading found")


def parse_next_allow_inactive_user_as_viewer_setting(fh):
    """Find the next ALLOW_INACTIVE_USER_AS_VIEWER setting indication
    header and return a bool corresponding to the specified setting.
    """
    s = parse_next_heading(fh, 2)
    assert s.startswith("When ALLOW_INACTIVE_USER_AS_VIEWER = ") and s.endswith(
        ("True", "False")
    )
    return s.endswith("True")


def parse_next_object_category(fh):
    """Find and return the name of the next permissions object category."""
    s = parse_next_heading(fh, 3)
    assert s in CATEGORIES
    return s


def parse_next_table(fh):
    """Parse the next data table into a list of row dicts"""
    while True:
        line = next(fh).strip()
        if not line.startswith("| "):
            continue
        assert line.endswith(" |")
        header = [s.strip() for s in line.split("|")[1:-1]]
        break
    # Assert that the next line is the table header/data row divider.
    assert next(fh).startswith(f"|{'-' * (len(header[0]) + 2)}|")
    # Parse the table rows.
    rows = []
    while True:
        try:
            line = next(fh).strip()
        except StopIteration:
            return [{h: row[i] for i, h in enumerate(header)} for row in rows]
        if not line.startswith("| "):
            return [{h: row[i] for i, h in enumerate(header)} for row in rows]
        row = [s.strip() for s in line.split("|")[1:-1]]
        assert len(row) == len(header)
        rows.append(row)


def parse_test_cases_from_permissions_md():
    """Return a test cases list in the format:
    [
      [
        <ALLOW_INACTIVE_USER_AS_VIEWER>,
        <user_role>,
        <user_is_active>
        <account_is_active>,
        <test_method>,
        <has_perm>,
        <perm_condition>,
      ],
      ...
    ]
    """
    test_cases = []
    fh = resources.open_text("tests.keystone", "user-permissions-matrix.md")
    for _ in (True, False):
        allow_inactive_user_as_viewer_setting = (
            parse_next_allow_inactive_user_as_viewer_setting(fh)
        )
        for _ in CATEGORIES:
            category = parse_next_object_category(fh)
            for row in parse_next_table(fh):
                user_role = row.pop("User Role").upper()
                user_is_active = row.pop("User Active") == "Yes"
                account_is_active = row.pop("Account Active") == "Yes"
                for k, v in row.items():
                    gd = BOOL_WITH_CONDITIONAL_REGEX.match(v).groupdict()
                    has_perm = gd["has_perm"] == "Yes"
                    perm_condition = gd["perm_condition"]
                    for test_method in CATEGORY_FIELD_TEST_METHODS_MAP[category][k]:
                        test_cases.append(
                            [
                                allow_inactive_user_as_viewer_setting,
                                user_role,
                                user_is_active,
                                account_is_active,
                                test_method,
                                has_perm,
                                perm_condition,
                            ]
                        )
    # Assert that parsing yieled the expected number of test cases.
    num_test_cases = len(test_cases)
    if num_test_cases != NUM_EXPECTED_TEST_CASES:
        raise AssertionError(
            f"Parsing user-permissions-matrix.md yielded {num_test_cases} "
            f"tests cases, but we expected {NUM_EXPECTED_TEST_CASES}. "
            "Maybe you need to update NUM_EXPECTED_TEST_CASES?"
        )
    return test_cases


###############################################################################
# Tests
###############################################################################


class TestUserPermissions:
    ########################################
    # Collection Helper Methods
    ########################################

    @classmethod
    def _test_collections_view(
        cls, allow_inactive_user_as_viewer, client, has_perm, perm_condition, fixtures_d
    ):
        """Test /collections view access."""
        assert perm_condition is None
        # Test view access.
        res = client.get("/collections")
        status = res.status_code
        if has_perm:
            assert status == HTTPStatus.OK
        elif not client.user.is_active and not allow_inactive_user_as_viewer:
            # Inactive users will be redirected to the login page when
            # allow_inactive_user_as_viewer=False.
            assert status == HTTPStatus.FOUND and res.headers["location"].startswith(
                "/login?"
            )
        else:
            assert status == HTTPStatus.FORBIDDEN

    @classmethod
    def _test_collections_api_endpoint(
        cls, allow_inactive_user_as_viewer, client, has_perm, perm_condition, fixtures_d
    ):
        """Test /api/collections API endpoint access."""
        assert perm_condition is None
        status = client.get("/api/collections").status_code
        if has_perm:
            assert status == HTTPStatus.OK
        else:
            assert status == HTTPStatus.UNAUTHORIZED

    @classmethod
    def _test_collection_detail_view(
        cls, allow_inactive_user_as_viewer, client, has_perm, perm_condition, fixtures_d
    ):
        """Test /collections/{collection_id} view access."""
        assert perm_condition is None
        collection = fixtures_d["make_collection"](collection_type="SPECIAL")
        collection.users.add(client.user)
        res = client.get(f"/collections/{collection.id}")
        status = res.status_code
        if has_perm:
            assert status == HTTPStatus.OK
        elif not client.user.is_active and not allow_inactive_user_as_viewer:
            # Inactive users will be redirected to the login page when
            # allow_inactive_user_as_viewer=False.
            assert status == HTTPStatus.FOUND and res.headers["location"].startswith(
                "/login?"
            )
        else:
            assert status == HTTPStatus.FORBIDDEN
        # Test API access.
        # The API does not support single collection retrieval.
        assert (
            client.get(f"/api/collections/{collection.id}").status_code
            == HTTPStatus.METHOD_NOT_ALLOWED
        )

    @classmethod
    def _test_collection_detail_api_endpoint(
        cls, allow_inactive_user_as_viewer, client, has_perm, perm_condition, fixtures_d
    ):
        """Test /api/collections/{collection_id} API endpoint access."""
        assert perm_condition is None
        collection = fixtures_d["make_collection"](collection_type="SPECIAL")
        collection.users.add(client.user)
        # The API does not support single collection retrieval.
        assert (
            client.get(f"/api/collections/{collection.id}").status_code
            == HTTPStatus.METHOD_NOT_ALLOWED
        )

    @classmethod
    def _test_edit_collection_user_settings(
        cls, allow_inactive_user_as_viewer, client, has_perm, perm_condition, fixtures_d
    ):
        """Test collection user settings editing."""
        assert perm_condition is None
        collection = fixtures_d["make_collection"](collection_type="SPECIAL")
        collection.users.add(client.user)
        status = client.update_collection(
            collection, {"user_settings": {"opt_out": True}}
        ).status_code
        if has_perm:
            assert status == HTTPStatus.OK
        elif not client.user.is_active and not allow_inactive_user_as_viewer:
            # Inactive user API requests will be rejected with a 401 when
            # allow_inactive_user_as_viewer=False.
            assert status == HTTPStatus.UNAUTHORIZED
        else:
            assert status == HTTPStatus.FORBIDDEN

    @classmethod
    @mock.patch("keystone.arch_api.ArchAPI.create_sub_collection")
    def _test_create_custom_collection(
        cls,
        allow_inactive_user_as_viewer,
        client,
        has_perm,
        perm_condition,
        fixtures_d,
        create_sub_collection,
    ):
        """Test custom collection creation."""
        create_sub_collection.return_value = HttpResponse()
        collection = fixtures_d["make_collection"](
            collection_type="SPECIAL", size_bytes=1024
        )
        collection.users.add(client.user)
        status = client.post(
            "/api/collections/custom",
            {"sources": [collection.id], "name": "Custom Collection"},
            "application/json",
        ).status_code
        if has_perm:
            assert status == HTTPStatus.OK
        elif not client.user.is_active and not allow_inactive_user_as_viewer:
            # Inactive user API requests will be rejected with a 401 when
            # allow_inactive_user_as_viewer=False.
            assert status == HTTPStatus.UNAUTHORIZED
        else:
            assert status == HTTPStatus.FORBIDDEN

    @classmethod
    def _test_edit_custom_collection_name(
        cls, allow_inactive_user_as_viewer, client, has_perm, perm_condition, fixtures_d
    ):
        """Test custom collection name editing."""
        assert perm_condition == ("if owner" if has_perm else None)
        collection = fixtures_d["make_collection"](
            collection_type="CUSTOM", name="Old Name"
        )
        collection.users.add(client.user)
        fixtures_d["make_jobstart"](
            collection=collection,
            user=client.user,
            job_type_id=KnownArchJobUuids.USER_DEFINED_QUERY,
        )
        status = client.update_collection(collection, {"name": "New Name"}).status_code
        if has_perm:
            assert status == HTTPStatus.OK
        elif not client.user.is_active and not allow_inactive_user_as_viewer:
            # Inactive user API requests will be rejected with a 401 when
            # allow_inactive_user_as_viewer=False.
            assert status == HTTPStatus.UNAUTHORIZED
        else:
            assert status == HTTPStatus.FORBIDDEN

    ########################################
    # Dataset Helper Methods
    ########################################

    @classmethod
    def _test_datasets_view(
        cls, allow_inactive_user_as_viewer, client, has_perm, perm_condition, fixtures_d
    ):
        """Test /datasets view access."""
        assert perm_condition is None
        res = client.get("/datasets/explore")
        status = res.status_code
        if has_perm:
            assert status == HTTPStatus.OK
        elif not client.user.is_active and not allow_inactive_user_as_viewer:
            # Inactive users will be redirected to the login page when
            # allow_inactive_user_as_viewer=False.
            assert status == HTTPStatus.FOUND and res.headers["location"].startswith(
                "/login?"
            )
        else:
            assert status == HTTPStatus.FORBIDDEN
        # Test API access.
        status = client.get("/api/datasets").status_code
        if has_perm:
            assert status == HTTPStatus.OK
        else:
            assert status == HTTPStatus.UNAUTHORIZED

    @classmethod
    def _test_datasets_api_endpoint(
        cls, allow_inactive_user_as_viewer, client, has_perm, perm_condition, fixtures_d
    ):
        """Test /api/datasets API endpoint access."""
        assert perm_condition is None
        status = client.get("/api/datasets").status_code
        if has_perm:
            assert status == HTTPStatus.OK
        else:
            assert status == HTTPStatus.UNAUTHORIZED

    @classmethod
    def _test_dataset_detail_view(
        cls, allow_inactive_user_as_viewer, client, has_perm, perm_condition, fixtures_d
    ):
        """Test /datasets/{dataset_id} view access."""
        assert perm_condition is None
        dataset = fixtures_d["make_user_dataset"](client.user)
        res = client.get(f"/datasets/{dataset.id}")
        status = res.status_code
        if has_perm:
            assert status == HTTPStatus.OK
        elif not client.user.is_active and not allow_inactive_user_as_viewer:
            # Inactive users will be redirected to the login page when
            # allow_inactive_user_as_viewer=False.
            assert status == HTTPStatus.FOUND and res.headers["location"].startswith(
                "/login?"
            )
        else:
            assert status == HTTPStatus.FORBIDDEN

    @classmethod
    def _test_dataset_detail_api_endpoint(
        cls, allow_inactive_user_as_viewer, client, has_perm, perm_condition, fixtures_d
    ):
        """Test /api/datasets/{dataset_id} API endpoint access."""
        assert perm_condition is None
        dataset = fixtures_d["make_user_dataset"](client.user)
        status = client.get(f"/api/datasets/{dataset.id}").status_code
        if has_perm:
            assert status == HTTPStatus.OK
        else:
            assert status == HTTPStatus.UNAUTHORIZED

    @classmethod
    def _test_edit_dataset_user_settings(
        cls, allow_inactive_user_as_viewer, client, has_perm, perm_condition, fixtures_d
    ):
        """Test dataset user settings editing."""
        assert perm_condition is None
        dataset = fixtures_d["make_user_dataset"](client.user)
        status = client.update_dataset(
            dataset, {"user_settings": {"opt_out": True}}
        ).status_code
        if has_perm:
            assert status == HTTPStatus.OK
        elif not client.user.is_active and not allow_inactive_user_as_viewer:
            # Inactive user API requests will be rejected with a 401 when
            # allow_inactive_user_as_viewer=False.
            assert status == HTTPStatus.UNAUTHORIZED
        else:
            assert status == HTTPStatus.FORBIDDEN

    @classmethod
    @mock.patch("keystone.arch_api.ArchAPI.generate_dataset")
    def _test_generate_dataset(
        cls,
        allow_inactive_user_as_viewer,
        client,
        has_perm,
        perm_condition,
        fixtures_d,
        generate_dataset,
    ):
        """Test dataset generation."""
        generate_dataset.return_value = HttpResponse()
        assert perm_condition is None
        collection = fixtures_d["make_collection"]()
        collection.users.add(client.user)
        status = client.generate_dataset(
            collection,
            JobType.objects.get(id=KnownArchJobUuids.DOMAIN_FREQUENCY),
            params={"sample": False},
        ).status_code
        if has_perm:
            assert status == HTTPStatus.OK
        elif not client.user.is_active and not allow_inactive_user_as_viewer:
            # Inactive user API requests will be rejected with a 401 when
            # allow_inactive_user_as_viewer=False.
            assert status == HTTPStatus.UNAUTHORIZED
        else:
            assert status == HTTPStatus.FORBIDDEN

    @classmethod
    @mock.patch("keystone.arch_api.ArchAPI.proxy_file_download")
    def _test_download_dataset(
        cls,
        allow_inactive_user_as_viewer,
        client,
        has_perm,
        perm_condition,
        fixtures_d,
        proxy_file_download,
    ):
        """Test dataset download."""
        proxy_file_download.return_value = HttpResponse()
        assert perm_condition is None
        dataset = fixtures_d["make_user_dataset"](client.user)
        filename = dataset.job_start.jobcomplete.jobfile_set.first().filename
        status = client.get(f"/datasets/{dataset.id}/files/{filename}").status_code
        if has_perm:
            assert status == HTTPStatus.OK
        else:
            assert status == HTTPStatus.FORBIDDEN

    @classmethod
    @mock.patch("keystone.arch_api.ArchAPI.proxy_colab_redirect")
    def _test_dataset_colab(
        cls,
        allow_inactive_user_as_viewer,
        client,
        has_perm,
        perm_condition,
        fixtures_d,
        proxy_colab_redirect,
    ):
        """Test dataset colab access."""
        proxy_colab_redirect.return_value = HttpResponse()
        assert perm_condition is None
        dataset = fixtures_d["make_user_dataset"](client.user)
        filename = dataset.job_start.jobcomplete.jobfile_set.first().filename
        res = client.get(f"/datasets/{dataset.id}/files/{filename}/colab")
        status = res.status_code
        if has_perm:
            assert status == HTTPStatus.OK
        elif not client.user.is_active and not allow_inactive_user_as_viewer:
            # Inactive users will be redirected to the login page when
            # allow_inactive_user_as_viewer=False.
            assert status == HTTPStatus.FOUND and res.headers["location"].startswith(
                "/login?"
            )
        else:
            assert status == HTTPStatus.FORBIDDEN

    @classmethod
    def _test_modify_dataset_teams(
        cls,
        allow_inactive_user_as_viewer,
        client,
        has_perm,
        perm_condition,
        fixtures_d,
    ):
        """Test dataset teams modification."""
        assert perm_condition == ("if owner" if has_perm else None)
        dataset = fixtures_d["make_user_dataset"](client.user)
        team = fixtures_d["make_team"](account=client.user.account)
        client.user.teams.add(team)
        status = client.update_dataset_teams(dataset.id, [team]).status_code
        if has_perm:
            assert status == HTTPStatus.NO_CONTENT
        elif not client.user.is_active and not allow_inactive_user_as_viewer:
            # Inactive user API requests will be rejected with a 401 when
            # allow_inactive_user_as_viewer=False.
            assert status == HTTPStatus.UNAUTHORIZED
        else:
            assert status == HTTPStatus.FORBIDDEN

    @classmethod
    @mock.patch("keystone.arch_api.ArchAPI.publish_dataset")
    def _test_publish_dataset(
        cls,
        allow_inactive_user_as_viewer,
        client,
        has_perm,
        perm_condition,
        fixtures_d,
        publish_dataset,
    ):
        """Test dataset publishing."""
        publish_dataset.return_value = HttpResponse()
        assert perm_condition == ("if owner" if has_perm else None)
        dataset = fixtures_d["make_user_dataset"](client.user)
        status = client.publish_dataset(dataset, {}).status_code
        if has_perm:
            assert status == HTTPStatus.OK
        elif not client.user.is_active and not allow_inactive_user_as_viewer:
            # Inactive user API requests will be rejected with a 401 when
            # allow_inactive_user_as_viewer=False.
            assert status == HTTPStatus.UNAUTHORIZED
        else:
            assert status == HTTPStatus.FORBIDDEN

    @classmethod
    def _test_account_users_view(
        cls,
        allow_inactive_user_as_viewer,
        client,
        has_perm,
        perm_condition,
        fixtures_d,
    ):
        """Test /accounts/users view access."""
        assert perm_condition is None
        status = client.get("/account/users").status_code
        if has_perm:
            assert status == HTTPStatus.OK
        else:
            assert status in (HTTPStatus.FORBIDDEN, HTTPStatus.UNAUTHORIZED)

    @classmethod
    def _test_account_users_api_endpoint(
        cls,
        allow_inactive_user_as_viewer,
        client,
        has_perm,
        perm_condition,
        fixtures_d,
    ):
        """Test /api/accounts/users API endpoint access."""
        assert perm_condition is None
        status = client.get("/api/users").status_code
        if has_perm:
            assert status == HTTPStatus.OK
        else:
            assert status in (HTTPStatus.FORBIDDEN, HTTPStatus.UNAUTHORIZED)

    @classmethod
    def _test_add_account_user(
        cls,
        allow_inactive_user_as_viewer,
        client,
        has_perm,
        perm_condition,
        fixtures_d,
    ):
        """Test account user creation."""
        assert perm_condition is None
        account = fixtures_d["make_account"]()
        _user = prepare(User)
        status = client.create_user(
            {
                "account_id": client.user.account_id,
                "username": _user.username,
                "first_name": _user.first_name,
                "last_name": _user.last_name,
                "email": _user.email,
                "role": _user.role,
                "teams": [],
            }
        ).status_code
        if has_perm:
            assert status == HTTPStatus.CREATED
        elif not client.user.is_active and not allow_inactive_user_as_viewer:
            # Inactive user API requests will be rejected with a 401 when
            # allow_inactive_user_as_viewer=False.
            assert status == HTTPStatus.UNAUTHORIZED
        else:
            assert status == HTTPStatus.FORBIDDEN

    @classmethod
    def _test_edit_account_user(
        cls,
        allow_inactive_user_as_viewer,
        client,
        has_perm,
        perm_condition,
        fixtures_d,
    ):
        """Test account user editing."""
        assert perm_condition is None
        user = fixtures_d["make_user"](account=client.user.account)
        status = client.update_user(
            user, {"first_name": user.first_name[::-1]}
        ).status_code
        if has_perm:
            assert status == HTTPStatus.OK
        elif not client.user.is_active and not allow_inactive_user_as_viewer:
            # Inactive user API requests will be rejected with a 401 when
            # allow_inactive_user_as_viewer=False.
            assert status == HTTPStatus.UNAUTHORIZED
        else:
            assert status == HTTPStatus.FORBIDDEN

    @classmethod
    def _test_account_teams_view(
        cls,
        allow_inactive_user_as_viewer,
        client,
        has_perm,
        perm_condition,
        fixtures_d,
    ):
        """Test /accounts/teams view access."""
        assert perm_condition in ("if member", None)
        # Create two account teams, one of which the test user is a member.
        member_team = fixtures_d["make_team"](account=client.user.account)
        member_team.members.add(client.user)
        nonmember_team = fixtures_d["make_team"](account=client.user.account)
        status = client.get("/account/teams").status_code
        if has_perm and perm_condition is None:
            assert status == HTTPStatus.OK
        else:
            assert status == HTTPStatus.FORBIDDEN

    @classmethod
    def _test_account_teams_api_endpoint(
        cls,
        allow_inactive_user_as_viewer,
        client,
        has_perm,
        perm_condition,
        fixtures_d,
    ):
        """Test /api/accounts/teams API endpoint access."""
        assert perm_condition in ("if member", None)
        # Create two account teams, one of which the test user is a member.
        member_team = fixtures_d["make_team"](account=client.user.account)
        member_team.members.add(client.user)
        nonmember_team = fixtures_d["make_team"](account=client.user.account)
        res = client.get("/api/teams")
        status = res.status_code
        if not client.user.is_active and not allow_inactive_user_as_viewer:
            # Inactive user API requests will be rejected with a 401 when
            # allow_inactive_user_as_viewer=False.
            assert status == HTTPStatus.UNAUTHORIZED
        else:
            assert status == HTTPStatus.OK
            team_ids = {x["id"] for x in res.json()["items"]}
            assert member_team.id in team_ids
            # Check that only member teams were returned for "if member" condition.
            if perm_condition == "if member":
                assert nonmember_team.id not in team_ids

    @classmethod
    def _test_add_account_team(
        cls,
        allow_inactive_user_as_viewer,
        client,
        has_perm,
        perm_condition,
        fixtures_d,
    ):
        """Test account team creation."""
        assert perm_condition is None
        # Test view and API access.
        account = fixtures_d["make_account"]()
        _user = prepare(User)
        status = client.create_team(
            {"account_id": client.user.account_id, "name": "Test Team"}
        ).status_code
        if has_perm:
            assert status == HTTPStatus.CREATED
        elif not client.user.is_active and not allow_inactive_user_as_viewer:
            # Inactive user API requests will be rejected with a 401 when
            # allow_inactive_user_as_viewer=False.
            assert status == HTTPStatus.UNAUTHORIZED
        else:
            assert status == HTTPStatus.FORBIDDEN

    @classmethod
    def _test_edit_account_team(
        cls,
        allow_inactive_user_as_viewer,
        client,
        has_perm,
        perm_condition,
        fixtures_d,
    ):
        """Test account team editing."""
        assert perm_condition is None
        # Test view and API access.
        team = fixtures_d["make_team"](account=client.user.account)
        status = client.update_team(team, {"name": team.name[::-1]}).status_code
        if has_perm:
            assert status == HTTPStatus.OK
        elif not client.user.is_active and not allow_inactive_user_as_viewer:
            # Inactive user API requests will be rejected with a 401 when
            # allow_inactive_user_as_viewer=False.
            assert status == HTTPStatus.UNAUTHORIZED
        else:
            assert status == HTTPStatus.FORBIDDEN

    @mark.django_db
    @mark.parametrize(
        "allow_inactive_user_as_viewer,user_role,user_is_active,account_is_active,test_method,has_perm,perm_condition",
        parse_test_cases_from_permissions_md(),
    )
    def test_user_permissions_via_method_dispatch(
        self,
        allow_inactive_user_as_viewer,
        user_role,
        user_is_active,
        account_is_active,
        test_method,
        has_perm,
        perm_condition,
        make_account,
        make_user,
        make_collection,
        make_jobstart,
        make_user_dataset,
        make_team,
    ):
        fixtures_d = {k: v for k, v in locals().items() if k.startswith("make_")}

        override_settings_kwargs = (
            {
                "ALLOW_INACTIVE_USER_AS_VIEWER": True,
                "AUTHENTICATION_BACKENDS": [
                    "django.contrib.auth.backends.AllowAllUsersModelBackend"
                ],
            }
            if allow_inactive_user_as_viewer
            else {
                "ALLOW_INACTIVE_USER_AS_VIEWER": False,
                "AUTHENTICATION_BACKENDS": [
                    "django.contrib.auth.backends.ModelBackend"
                ],
            }
        )

        with override_settings(**override_settings_kwargs):
            user = make_user(
                is_active=user_is_active,
                role=user_role,
                account=make_account(is_active=account_is_active),
            )
            getattr(self, test_method)(
                allow_inactive_user_as_viewer,
                Client(user),
                has_perm,
                perm_condition,
                fixtures_d,
            )
