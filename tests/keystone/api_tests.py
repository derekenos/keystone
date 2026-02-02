import json
from http import HTTPStatus
from unittest.mock import patch

from django.forms import model_to_dict
from django.http import Http404
from django.test import Client as _Client
from model_bakery import baker
from ninja.errors import HttpError
from pytest import (
    fixture,
    mark,
    raises,
)

from config.settings import KnownArchJobUuids

from keystone.api import CreateUserSchema
from keystone.models import (
    Collection,
    CollectionTypes,
    Dataset,
    JobEventTypes,
    JobType,
    Team,
    User,
    UserRoles,
)


###############################################################################
# Fixtures
###############################################################################


@fixture
def make_create_user_dict(make_team):
    def f(account):
        prepared_user = baker.prepare(User, account=account)
        teams = [make_team(account=account), make_team(account=account)]
        return {
            k: getattr(prepared_user, k)
            for k in CreateUserSchema.schema()["properties"].keys()
            if k != "teams"
        } | {"teams": [model_to_dict(t) for t in teams]}

    return f


###############################################################################
# Helpers
###############################################################################


class Client(_Client):
    def __init__(self, user):
        super().__init__()
        self.force_login(user)

    def get_user(self, user_id: int):
        return self.get(f"/api/users/{user_id}")

    def create_user(self, user_d, send_welcome_email=True):
        return self.put(
            f"/api/users?send_welcome={json.dumps(send_welcome_email)}",
            user_d,
            "application/json",
        )

    def update_user(self, user, update_d):
        return self.patch(f"/api/users/{user.id}", update_d, "application/json")

    def list_teams(self):
        return self.get("/api/teams")

    def create_team(self, team_d):
        return self.put(
            f"/api/teams",
            team_d,
            "application/json",
        )

    def update_team(self, team, update_d):
        return self.patch(f"/api/teams/{team.id}", update_d, "application/json")

    def list_datasets(self, **params):
        return self.get(f"/api/datasets", params)

    def generate_dataset(self, collection, job_type, params):
        return self.post(
            "/api/datasets/generate",
            {
                "collection_id": collection.id,
                "job_type_id": job_type.id,
                "params": params,
            },
            "application/json",
        )

    def get_dataset(self, dataset_id):
        return self.get(f"/api/datasets/{dataset_id}")

    def update_dataset(self, dataset, update_d):
        return self.patch(f"/api/datasets/{dataset.id}", update_d, "application/json")

    def update_dataset_teams(self, dataset_id, teams):
        return self.post(
            f"/api/datasets/{dataset_id}/teams",
            [{"id": t.id, "name": t.name} for t in teams],
            "application/json",
        )

    def get_dataset_publication_info(self, dataset_id):
        return self.get(f"/api/datasets/{dataset_id}/publication")

    def list_collections(self, **params):
        return self.get("/api/collections", params)

    def update_collection(self, collection, update_d):
        return self.patch(
            f"/api/collections/{collection.id}", update_d, "application/json"
        )


###############################################################################
# /api/users tests
###############################################################################

#
# GET /api/users tests
#


@mark.django_db
@mark.parametrize(
    "role,account_active,allowed",
    (
        (UserRoles.ADMIN, True, True),
        (UserRoles.ADMIN, False, False),
        (UserRoles.USER, True, False),
        (UserRoles.VIEWER, True, False),
    ),
)
def test_admin_can_list_active_account_users(
    role, account_active, allowed, make_account, make_user
):
    """Only Admins of active accounts can list their account users."""
    # Make some same-account users.
    account = make_account(is_active=account_active)
    user = make_user(account=account, role=role)
    normal_user = make_user(account=account)

    # Make a user in a different account, which we'll expect to be absent
    # from the admin_user API responses.
    other_account = make_account()
    other_user = make_user(account=other_account)

    # Check that the ADMIN-type user can list their account users.
    client = Client(user)
    res = client.get("/api/users")
    if allowed:
        assert res.status_code == HTTPStatus.OK
        data = res.json()
        assert {user["id"] for user in data["items"]} == {user.id, normal_user.id}
    else:
        assert res.status_code == HTTPStatus.FORBIDDEN
        assert res.json() == {"detail": "FORBIDDEN"}


@mark.django_db
@mark.parametrize(
    "query_param_str_fn,status_code",
    (
        (lambda u: "", HTTPStatus.OK),
        (lambda u: f"?account_id={u.account_id}", HTTPStatus.OK),
        (lambda u: f"?account_id={u.account_id + 1}", HTTPStatus.FORBIDDEN),
    ),
)
def test_admin_cant_list_other_account_users(
    query_param_str_fn, status_code, make_user
):
    """Though no account_id param is expected / required in the request to /api/users
    (the ultimate account ID is inferred from the requesting user), if it was specified,
    check that attempting to retrieve users in a different account is not allowed.
    """
    admin = make_user(role=UserRoles.ADMIN)
    res = Client(admin).get(f"/api/users{query_param_str_fn(admin)}")
    assert res.status_code == status_code
    if status_code == HTTPStatus.OK:
        assert {user["id"] for user in res.json()["items"]} == {admin.id}


@mark.django_db
def test_admin_can_get_any_same_account_user(make_account, make_user):
    """Admins can retrieve any same-account user."""
    account = make_account()
    admin_user = make_user(account=account, role=UserRoles.ADMIN)
    other_admin = make_user(account=account, role=UserRoles.ADMIN)
    other_user = make_user(account=account, role=UserRoles.USER)
    client = Client(admin_user)
    for user in admin_user, other_admin, other_user:
        res = client.get_user(user.id)
        assert res.status_code == HTTPStatus.OK
        assert res.json()["id"] == user.id


@mark.django_db
def test_admin_cant_get_different_account_user(make_account, make_user):
    """Admins can not retrieve a different-account user."""
    admin_user = make_user(account=make_account(), role=UserRoles.ADMIN)
    other_account = make_account()
    other_account_admin = make_user(account=other_account, role=UserRoles.ADMIN)
    other_account_user = make_user(account=other_account, role=UserRoles.USER)
    client = Client(admin_user)
    for user in other_account_admin, other_account_user:
        res = client.get_user(user.id)
        assert res.status_code == HTTPStatus.FORBIDDEN


@mark.django_db
@mark.parametrize("role", (UserRoles.USER, UserRoles.VIEWER))
def test_non_admins_can_only_get_self(role, make_account, make_user):
    """Non-admins can only retrieve their own user."""
    account = make_account()
    user = make_user(account=account, role=role)
    other_admin = make_user(account=account, role=UserRoles.ADMIN)
    other_user = make_user(account=account, role=UserRoles.USER)
    other_account = make_account()
    other_account_admin = make_user(account=other_account, role=UserRoles.ADMIN)
    other_account_user = make_user(account=other_account, role=UserRoles.USER)
    client = Client(user)

    # Test that user can get self.
    res = client.get_user(user.id)
    assert res.status_code == HTTPStatus.OK
    assert res.json()["id"] == user.id

    # Test that user can't get anyone else.
    for user in other_admin, other_user, other_account_admin, other_account_user:
        res = client.get_user(user.id)
        assert res.status_code == HTTPStatus.FORBIDDEN


#
# PUT /api/users tests
#


@mark.django_db
@mark.parametrize("send_welcome_email", [True, False])
@patch("keystone.api.send_email")
def test_admin_can_create_same_account_user(
    jobmail_send, send_welcome_email, make_account, make_user, make_create_user_dict
):
    """Admins can create same-account users."""
    account = make_account()
    admin_user = make_user(account=account, role=UserRoles.ADMIN)

    # Create a new user and send a welcome email.
    client = Client(admin_user)
    new_user_d = make_create_user_dict(account)
    res = client.create_user(new_user_d, send_welcome_email)

    # Check that the user was created.
    assert res.status_code == HTTPStatus.CREATED
    new_user = User.objects.get(username=new_user_d["username"])
    for k, v in new_user_d.items():
        if k == "teams":
            assert set(new_user.teams.values_list("id", flat=True)) == {
                t["id"] for t in v
            }
        else:
            assert getattr(new_user, k) == v

    # Check that a welcome email was sent.
    if not send_welcome_email:
        jobmail_send.assert_not_called()
    else:
        jobmail_send.assert_called_once()
        jobmail_send_call_args = jobmail_send.call_args
        assert jobmail_send_call_args.args[0] == "new_user_welcome_email"
        assert jobmail_send_call_args.kwargs["context"]["user"] == new_user
        assert jobmail_send_call_args.kwargs["subject"] == "Welcome to ARCH!"
        assert jobmail_send_call_args.kwargs["to_addresses"] == (new_user.email,)


@mark.django_db
@mark.parametrize("role", (UserRoles.ADMIN, UserRoles.USER, UserRoles.VIEWER))
def test_no_user_can_create_other_account_user(
    role, make_account, make_user, make_create_user_dict
):
    """No user is allowed to create a user in a different account."""
    account = make_account()
    user = make_user(account=account, role=role)

    # Attempt to create a user belonging to a different account.
    new_user_d = make_create_user_dict(make_account())
    res = Client(user).create_user(new_user_d, False)

    # Check that the user was not created.
    assert res.status_code == HTTPStatus.FORBIDDEN
    with raises(User.DoesNotExist):
        User.objects.get(username=new_user_d["username"])


@mark.django_db
@mark.parametrize("role", (UserRoles.USER, UserRoles.VIEWER))
def test_non_admins_cant_create_users(
    role, make_account, make_user, make_create_user_dict
):
    """Non-admins can not create users."""
    account = make_account()
    user = make_user(account=account, role=role)

    # Attempt to create the user.
    new_user_d = make_create_user_dict(account)
    res = Client(user).create_user(new_user_d, False)

    # Check that the user was not created.
    assert res.status_code == HTTPStatus.FORBIDDEN
    with raises(User.DoesNotExist):
        User.objects.get(username=new_user_d["username"])


#
# PATCH /api/users tests
#


@mark.django_db
@mark.parametrize("role", (UserRoles.ADMIN, UserRoles.USER, UserRoles.VIEWER))
def test_all_users_can_update_self(role, make_account, make_user):
    """All users cam update themselves (less username, role, and teams)"""
    user = make_user(account=make_account(), role=role)
    new_email = "new@email.com"
    assert new_email != user.email
    res = Client(user).update_user(user, {"email": new_email})
    assert res.status_code == HTTPStatus.OK
    user.refresh_from_db()
    assert user.email == new_email


@mark.django_db
@mark.parametrize("role", (UserRoles.ADMIN, UserRoles.USER, UserRoles.VIEWER))
def test_username_can_not_be_updated(role, make_account, make_user):
    """Updates to username are not allowed."""
    user = make_user(account=make_account(), role=role)
    old_username = user.username
    new_username = "new username"
    assert new_username != old_username
    res = Client(user).update_user(user, {"username": new_username})
    assert res.status_code == HTTPStatus.UNPROCESSABLE_ENTITY
    user.refresh_from_db()
    assert user.username == old_username


@mark.django_db
@mark.parametrize("role", (UserRoles.ADMIN, UserRoles.USER, UserRoles.VIEWER))
def test_no_user_can_update_own_role(role, make_account, make_user):
    """No user can update their own role."""
    admin_user = make_user(account=make_account(), role=role)
    res = Client(admin_user).update_user(
        admin_user,
        {"role": UserRoles.USER if role == UserRoles.ADMIN else UserRoles.ADMIN},
    )
    assert res.status_code == HTTPStatus.FORBIDDEN
    assert res.json()["detail"] == "self role modification not allowed"


@mark.django_db
def test_admin_can_update_own_teams(make_account, make_user, make_team):
    """Admins can update their own teams."""
    admin_user = make_user(account=make_account(), role=UserRoles.ADMIN)
    team = make_team(account=admin_user.account)
    res = Client(admin_user).update_user(admin_user, {"teams": [model_to_dict(team)]})
    assert res.status_code == HTTPStatus.OK
    admin_user.refresh_from_db()
    assert tuple(admin_user.teams.all()) == (team,)


@mark.django_db
@mark.parametrize("role", (UserRoles.USER, UserRoles.VIEWER))
def test_non_admins_cant_update_own_teams(role, make_user, make_team):
    """Non-admins can not update their own teams."""
    user = make_user(role=role)
    team = make_team(account=user.account)
    res = Client(user).update_user(user, {"teams": [model_to_dict(team)]})
    assert res.status_code == HTTPStatus.FORBIDDEN


@mark.django_db
def test_admin_can_update_same_account_user(make_account, make_user):
    """Admins can update any same-account user."""
    account = make_account()
    admin_user = make_user(account=account, role=UserRoles.ADMIN)
    normal_user = make_user(account=account, role=UserRoles.USER)

    # Update normal_user.
    new_email = "new@email.com"
    new_role = UserRoles.ADMIN
    assert normal_user.email != new_email
    res = Client(admin_user).update_user(
        normal_user, {"email": new_email, "role": new_role}
    )

    # Check that the user was updated.
    assert res.status_code == HTTPStatus.OK
    normal_user.refresh_from_db()
    assert normal_user.email == new_email
    assert normal_user.role == new_role


@mark.django_db
@mark.parametrize("role", (UserRoles.USER, UserRoles.VIEWER))
def test_non_admins_cant_update_other_users(role, make_account, make_user):
    """Non-admins can not update other users."""
    account = make_account()
    user = make_user(account=account, role=role)

    # Test a same-account user.
    other_user = make_user(account=account, role=UserRoles.USER)
    res = Client(user).update_user(other_user, {"email": "new@email.com"})
    assert res.status_code == HTTPStatus.FORBIDDEN

    # Test a different-account user.
    other_user = make_user(account=make_account(), role=UserRoles.USER)
    res = Client(user).update_user(other_user, {"email": "new@email.com"})
    assert res.status_code == HTTPStatus.FORBIDDEN


@mark.django_db
@mark.parametrize("role", (UserRoles.ADMIN, UserRoles.USER, UserRoles.VIEWER))
def test_no_user_can_update_other_account_user(role, make_account, make_user):
    """No user is allowed to update another account's user."""
    user = make_user(account=make_account(), role=role)
    other_account_user = make_user(account=make_account(), role=UserRoles.USER)
    res = Client(user).update_user(other_account_user, {"email": "new@email.com"})
    assert res.status_code == HTTPStatus.FORBIDDEN


###############################################################################
# /api/teams tests
###############################################################################


@mark.django_db
def test_any_user_can_list_account_teams(make_user, make_team):
    """Any user can list their account's teams"""
    # Create a user on a team.
    user = make_user()
    team1 = make_team(account=user.account)
    user.teams.add(team1)
    # Create a second account team of which the user is not a member.
    team2 = make_team(account=user.account)
    # Create a different-account team.
    other_account_team = make_team()
    # Check that the user can list its account teams.
    res = Client(user).list_teams()
    assert res.status_code == HTTPStatus.OK
    assert {x["id"] for x in res.json()["items"]} == {team1.id, team2.id}


@mark.django_db
def test_admin_can_create_same_account_team(make_user):
    """Admins can create an account team."""
    user = make_user(role=UserRoles.ADMIN)
    team_name = baker.prepare(Team).name
    client = Client(user)
    assert client.list_teams().json()["items"] == []
    res = client.create_team({"account_id": user.account.id, "name": team_name})
    assert res.status_code == HTTPStatus.CREATED
    assert {x["name"] for x in client.list_teams().json()["items"]} == {team_name}


@mark.django_db
def test_admin_cant_create_different_account_team(make_account, make_user):
    """Admins can not create a team in a different account."""
    user = make_user(role=UserRoles.ADMIN)
    other_account = make_account()
    res = Client(user).create_team({"account_id": other_account.id, "name": "test"})
    assert res.status_code == HTTPStatus.FORBIDDEN


@mark.django_db
@mark.parametrize("role", (UserRoles.USER, UserRoles.VIEWER))
def test_non_admin_cant_create_teams(role, make_account, make_user):
    """Non-admins can not create a team in their own or other account."""
    user = make_user(role=role)
    for account in (user.account, make_account()):
        res = Client(user).create_team({"account_id": account.id, "name": "test"})
        assert res.status_code == HTTPStatus.FORBIDDEN


@mark.django_db
def test_admin_can_edit_account_team(make_user, make_team):
    """Admins can edit any account team."""
    user = make_user(role=UserRoles.ADMIN)
    team = make_team(account=user.account)
    new_name = baker.prepare(Team).name
    assert new_name != team.name
    client = Client(user)
    res = client.update_team(team, {"name": new_name})
    assert res.status_code == HTTPStatus.OK
    assert {x["name"] for x in client.list_teams().json()["items"]} == {new_name}


@mark.django_db
@mark.parametrize("role", (UserRoles.USER, UserRoles.VIEWER))
def test_non_admins_cant_edit_teams(role, make_user, make_team):
    """Non-admins can not edit teams."""
    user = make_user(role=role)
    team = make_team(account=user.account)
    new_name = baker.prepare(Team).name
    assert new_name != team.name
    res = Client(user).update_team(team, {"name": new_name})
    assert res.status_code == HTTPStatus.FORBIDDEN


@mark.django_db
@mark.parametrize("role", (UserRoles.ADMIN, UserRoles.USER, UserRoles.VIEWER))
def test_no_user_can_edit_other_account_team(role, make_user, make_team):
    """No user is allowed to edit another account's team."""
    user = make_user(role=role)
    team = make_team()
    res = Client(user).update_team(team, {"name": "test"})
    assert res.status_code == HTTPStatus.FORBIDDEN


###############################################################################
# /api/datasets tests
###############################################################################


@mark.django_db
def test_dataset_owner_and_team_access(
    make_team, make_user, make_user_dataset, make_collection
):
    """A dataset can only be accessed:
    - by its owner
    - by the members of any team for which the dataset has been authorized
    """
    # Create a user and add them to a team.
    user = make_user()
    team = make_team(account=user.account)
    user.teams.add(team)

    # Create a second same-account user, and a different-account user.
    other_user = make_user(account=user.account)
    other_account_user = make_user()

    # Create a couple of user datasets.
    user_dataset_ids = [make_user_dataset(user).id, make_user_dataset(user).id]

    def check_access(_user, list_result_ids, get_test_id, get_test_ok):
        """Check a user's ability to list and retrieve datasets."""
        client = Client(_user)
        res = client.list_datasets()
        assert res.status_code == HTTPStatus.OK
        assert {x["id"] for x in res.json()["items"]} == set(list_result_ids)
        res = client.get_dataset(get_test_id)
        assert res.status_code == (
            HTTPStatus.OK if get_test_ok else HTTPStatus.NOT_FOUND
        )

    # Check that the user can list and retrieve their own datasets.
    check_access(user, user_dataset_ids, user_dataset_ids[0], True)

    # Check that the other users can't do either.
    check_access(other_user, [], user_dataset_ids[0], False)
    check_access(other_account_user, [], user_dataset_ids[0], False)

    # Add the same-account user to the same team and check that they still don't
    # have access since the team is not yet authorized to access any datasets.
    other_user.teams.add(team)
    check_access(other_user, [], user_dataset_ids[0], False)

    # Authorize the team to access the first dataset.
    dataset = Dataset.objects.get(id=user_dataset_ids[0])
    dataset.teams.add(team)
    dataset.save()

    # Check that the same-account user can now access the dataset.
    check_access(other_user, [dataset.id], dataset.id, True)

    # Remove user from the team and check that, even though the dataset is still
    # authorized for the team, since the owning user is no longer on the team, the
    # team (i.e. other_user) no longer has access.
    user.teams.remove(team)
    user.save()
    check_access(other_user, [], dataset.id, False)

    # Check that adding the user and authorizing the dataset for a completely
    # different team doesn't restore other_user's access.
    other_team = make_team()
    user.teams.add(other_team)
    user.save()
    dataset.teams.add(other_team)
    dataset.save()
    check_access(other_user, [], dataset.id, False)

    # Check that adding other_user to other_team restores their access.
    other_user.teams.add(other_team)
    other_user.save()
    check_access(other_user, [dataset.id], dataset.id, True)


@mark.django_db
def test_dataset_no_implicit_global_access(
    make_user, make_user_dataset, global_datasets_user
):
    """Previously, all datasets owned by the global datasets user were automatically
    made available to all users who were authorized to access the associated collection,
    but the introduction of dataset sharing via teams has made this obsolete, so we've
    removed the implicit global datasets access, and this test asserts that.
    """
    # Create a test user with an owned dataset.
    user = make_user()
    user_dataset = make_user_dataset(user)
    # Create a global datasets user-owned dataset and authorized the test user to
    # access the associated collection.
    global_dataset = make_user_dataset(global_datasets_user)
    global_dataset.job_start.collection.users.add(user)
    # Check that the test user only has access to their own dataset, but not the
    # global dataset.
    res = Client(user).list_datasets()
    assert res.status_code == HTTPStatus.OK
    assert {x["id"] for x in res.json()["items"]} == {user_dataset.id}


@mark.django_db
@mark.parametrize("role", (UserRoles.ADMIN, UserRoles.USER, UserRoles.VIEWER))
def test_dataset_owner_can_update_teams(role, make_team, make_user, make_user_dataset):
    """A dataset owner (including viewers) can update the teams with which the
    dataset is shared."""
    user = make_user(role=role)
    team1 = make_team(account=user.account)
    team2 = make_team(account=user.account)
    team3 = make_team(account=user.account)
    user.teams.set((team1, team2))
    dataset = make_user_dataset(user)
    res = Client(user).update_dataset_teams(dataset.id, [team1, team2])
    assert res.status_code == HTTPStatus.NO_CONTENT
    dataset_teams = set(dataset.teams.values_list("id", flat=True))
    assert dataset_teams == {team1.id, team2.id}


@mark.django_db
@mark.parametrize("role", (UserRoles.ADMIN, UserRoles.USER, UserRoles.VIEWER))
def test_dataset_owner_cant_update_teams_with_nonmember_team(
    role, make_team, make_user, make_user_dataset
):
    """A dataset owner is not allowed to share a dataset with a team of which they're
    not a member."""
    user = make_user(role=role)
    team = make_team(account=user.account)
    dataset = make_user_dataset(user)
    res = Client(user).update_dataset_teams(dataset.id, [team])
    assert res.status_code == HTTPStatus.BAD_REQUEST
    assert res.json()["detail"] == f"Invalid team ID(s): [{team.id}]"


@mark.django_db
@mark.parametrize("role", (UserRoles.ADMIN, UserRoles.USER, UserRoles.VIEWER))
def test_non_dataset_owner_cant_update_teams(
    role, make_team, make_user, make_user_dataset
):
    """A user is not allowed to update the teams of a dataset that they don't own."""
    # Create a dataset owner and dataset.
    owner = make_user(role=role)
    dataset = make_user_dataset(owner)
    # Create a non-owner user, put them on a team with owner, and authorize the team to
    # access the dataset so that the dataset lookup in the API doesn't result in a 404.
    non_owner = make_user(account=owner.account)
    team = make_team(account=owner.account)
    team.members.set((owner, non_owner))
    dataset.teams.set((team,))
    # Check that the attempt by the non-owner to authorize the dataset for the team
    # is forbidden.
    res = Client(non_owner).update_dataset_teams(dataset.id, [team])
    assert res.status_code == HTTPStatus.FORBIDDEN


@mark.django_db
@patch("keystone.arch_api.ArchAPI.get_dataset_publication_info")
def test_publication_status_reflects_internal_job_state_when_arch_404s(
    get_dataset_publication_info,
    make_user,
    make_user_dataset,
    make_jobstart,
    make_jobevent,
):
    """Requests to /api/datasets/{id}/publication will respond with a synthetic
    publication info object with complete=False if the proxied ARCH request resulted
    in a 404 and the Keystone DB has evidence of an in-progress publication job.
    """
    # Patch ArchAPI.get_dataset_publication_info() to raise a Http404.
    get_dataset_publication_info.side_effect = Http404
    user = make_user()
    dataset = make_user_dataset(user)
    client = Client(user)

    def _make_request():
        return client.get_dataset_publication_info(dataset.id)

    # Check that no publication info is found.
    assert _make_request().status_code == HTTPStatus.NOT_FOUND
    # Create a corresponding DatasetPublication JobStart.
    js = make_jobstart(
        user=user,
        job_type_id=KnownArchJobUuids.DATASET_PUBLICATION,
        parameters={"conf": {"inputSpec": {"uuid": str(dataset.job_start_id)}}},
    )
    # Check that publication is still not found.
    assert _make_request().status_code == HTTPStatus.NOT_FOUND
    # Add a SUBMITTED (i.e. non-terminal state) JobEvent.
    make_jobevent(job_start=js, event_type=JobEventTypes.SUBMITTED)
    # Check that a synthetic publication info object is now returned.
    assert _make_request().json() == {
        "item": "",
        "inputId": "",
        "job": dataset.job_start.job_type.name,
        "complete": False,
        "sample": dataset.job_start.sample,
        "time": js.get_job_status()[1].isoformat(),
        "ark": "",
    }
    # Check that the synthetic info object is no longer returned when
    # the internal job state is terminal.
    make_jobevent(job_start=js, event_type=JobEventTypes.CANCELLED)
    assert _make_request().status_code == HTTPStatus.NOT_FOUND


@mark.django_db
def test_dataset_user_settings_update(make_user, make_user_dataset):
    """The Dataset endpoint supports creation / update of associated DatasetUserSettings
    instances via the "user_settings" payload field."""
    user = make_user()
    dataset = make_user_dataset(user)
    client = Client(user)
    # opted_out_count is always an integer when opted_out query param is not specified.
    pagination_response = client.list_datasets().json()
    assert pagination_response["count"] == 1
    assert pagination_response["opted_out_count"] == 0
    assert pagination_response["items"][0]["id"] == dataset.id
    # Create an opt-out user setting.
    res = client.update_dataset(dataset, {"user_settings": {"opt_out": True}})
    assert res.status_code == HTTPStatus.OK
    # Check that the dataset list endpoint exclude the opted-out dataset.
    pagination_response = client.list_datasets().json()
    assert pagination_response["count"] == 0
    assert pagination_response["opted_out_count"] == 1
    # Check that we can retrieve opted-out datasets by specifying the opted_out=true param.
    pagination_response = client.list_datasets(opted_out="true").json()
    assert pagination_response["count"] == 1
    # opted_out_count is null when opted_out=true param is specified.
    assert pagination_response["opted_out_count"] is None
    assert pagination_response["items"][0]["id"] == dataset.id


@mark.django_db
@patch("keystone.arch_api.ArchAPI.generate_dataset")
def test_generate_dataset_from_empty_custom_collection_not_allowed(
    ArchAPI_generate_dataset, make_user, make_collection
):
    """A user is not allowed to generate a dataset from an empty custom collection."""
    # Mock ArchAPI.generate_dataset() to ensure that it raises a 503 even if the ARCH
    # backend happens to be up.
    ArchAPI_generate_dataset.side_effect = HttpError(HTTPStatus.SERVICE_UNAVAILABLE, "")

    user = make_user()
    collection = make_collection(collection_type=CollectionTypes.CUSTOM, size_bytes=0)
    collection.users.add(user)
    make_generate_dataset_request = lambda: Client(user).generate_dataset(
        collection,
        JobType.objects.get(id=KnownArchJobUuids.DOMAIN_FREQUENCY),
        params={"sample": False},
    )
    res = make_generate_dataset_request()
    assert res.status_code == HTTPStatus.BAD_REQUEST
    assert res.json()["detail"] == "Can not generate a dataset from an empty collection"

    # Update the collection size to a non-zero value and check that the request now
    # results in a 503 on account of the arch backend not being up.
    collection.size_bytes = 1
    collection.save()
    res = make_generate_dataset_request()
    assert res.status_code == HTTPStatus.SERVICE_UNAVAILABLE


###############################################################################
# /api/collections tests
###############################################################################


@mark.django_db
@mark.parametrize("is_superuser", (True, False))
@mark.parametrize(
    "field",
    {f.name for f in Collection._meta.fields if f.name not in ("name", "image")},
)
def test_only_collection_name_can_be_updated(
    is_superuser, field, make_collection, make_user
):
    """The Collection endpoint does not support updates to any direct, non-name attribute.
    Note that user_settings updates are handled / tested elsewhere."""
    user = make_user(is_superuser=is_superuser)
    collection = make_collection()
    res = Client(user).update_collection(
        collection, {field: getattr(collection, field)}
    )
    assert res.status_code == HTTPStatus.UNPROCESSABLE_ENTITY


@mark.django_db
@mark.parametrize("role", (UserRoles.ADMIN, UserRoles.USER, UserRoles.VIEWER))
def test_collection_user_settings_update(role, make_user, make_collection):
    """The Collection endpoint supports creation / update of associated CollectionUserSettings
    instances via the "user_settings" payload field."""
    user = make_user(role=role)
    collection = make_collection(accounts=(user.account,))
    client = Client(user)
    # opted_out_count is always an integer when opted_out query param is not specified.
    pagination_response = client.list_collections().json()
    assert pagination_response["count"] == 1
    assert pagination_response["opted_out_count"] == 0
    assert pagination_response["items"][0]["id"] == collection.id
    # Create an opt-out user setting.
    res = client.update_collection(collection, {"user_settings": {"opt_out": True}})
    assert res.status_code == HTTPStatus.OK
    # Check that the collection list endpoint exclude the opted-out collection.
    pagination_response = client.list_collections().json()
    assert pagination_response["count"] == 0
    assert pagination_response["opted_out_count"] == 1
    # Check that we can retrieve opted-out collections by specifying the opted_out=true param.
    pagination_response = client.list_collections(opted_out="true").json()
    assert pagination_response["count"] == 1
    # opted_out_count is null when opted_out=true param is specified.
    assert pagination_response["opted_out_count"] is None
    assert pagination_response["items"][0]["id"] == collection.id


@mark.django_db
def test_superuser_can_update_any_collection(make_collection, make_user):
    """A superuser can update any collection instance"""
    user = make_user(is_superuser=True)
    # Create a collection from a totally different account.
    collection = make_collection(name="original name")
    res = Client(user).update_collection(collection, {"name": "new name"})
    assert res.status_code == HTTPStatus.OK
    collection.refresh_from_db()
    assert collection.name == "new name"


@mark.django_db
def test_normal_user_can_rename_own_custom_collection(
    make_collection, make_user, make_jobstart
):
    """A normal user has permission to change a custom collection that they created."""
    user = make_user()
    collection = make_collection(
        collection_type=CollectionTypes.CUSTOM, name="original name"
    )
    make_jobstart(
        collection=collection,
        user=user,
        job_type_id=KnownArchJobUuids.USER_DEFINED_QUERY,
    )
    res = Client(user).update_collection(collection, {"name": "new name"})
    assert res.status_code == HTTPStatus.OK
    collection.refresh_from_db()
    assert collection.name == "new name"


@mark.django_db
def test_viewer_cant_rename_own_custom_collection(
    make_collection, make_user, make_jobstart
):
    """Viewers can't rename a custom collection that they created."""
    user = make_user(role=UserRoles.VIEWER)
    collection = make_collection(
        collection_type=CollectionTypes.CUSTOM, name="original name"
    )
    make_jobstart(
        collection=collection,
        user=user,
        job_type_id=KnownArchJobUuids.USER_DEFINED_QUERY,
    )
    res = Client(user).update_collection(collection, {"name": "new name"})
    assert res.status_code == HTTPStatus.FORBIDDEN


@mark.django_db
@mark.parametrize("role", (UserRoles.USER, UserRoles.VIEWER))
@mark.parametrize("collection_type", ("AIT", "CUSTOM", "SPECIAL"))
def test_non_admins_cant_update_nonowned_noncustom_collection(
    role, collection_type, make_collection, make_user
):
    """Non-admins do not have permission to update the name of any
    collection that is not a custom collection that they created."""
    user = make_user(role=role)
    collection = make_collection(
        collection_type=getattr(CollectionTypes, collection_type),
        # Excessively authorize user read access
        accounts=(user.account,),
        users=(user,),
    )
    res = Client(user).update_collection(collection, {"name": "new name"})
    assert res.status_code == HTTPStatus.FORBIDDEN


@mark.django_db
def test_collection_empty_filter_works(make_user, make_collection):
    """Specify the empty=true query param should return collections with
    size_bytes=0, whereas empty=false should return collections with both
    >0 and None-type size_bytes values.
    """
    user = make_user()
    empty_collection = make_collection(accounts=[user.account], size_bytes=0)
    nonempty_collection = make_collection(accounts=[user.account], size_bytes=1)
    unknown_collection = make_collection(accounts=[user.account], size_bytes=None)
    client = Client(user)

    def _get_ids_set(empty):
        res = client.list_collections(**({"empty": empty} if empty is not None else {}))
        assert res.status_code == HTTPStatus.OK
        return {c["id"] for c in res.json()["items"]}

    # Test empty=True.
    assert _get_ids_set(empty=True) == {empty_collection.id}
    # Test empty=False.
    assert _get_ids_set(empty=False) == {nonempty_collection.id, unknown_collection.id}
    # Test empty unspecified.
    assert _get_ids_set(empty=None) == {
        empty_collection.id,
        nonempty_collection.id,
        unknown_collection.id,
    }
