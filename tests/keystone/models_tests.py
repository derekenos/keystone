from collections import defaultdict
from datetime import (
    datetime,
    timedelta,
    timezone,
)

from django.core.exceptions import ValidationError
from django.db import OperationalError
from model_bakery import baker
from pytest import mark
import pytest  # noqa

from keystone.models import (
    Account,
    ArchQuota,
    Collection,
    CollectionTypes,
    CollectionUserSettings,
    Dataset,
    DatasetUserSettings,
    JobEvent,
    JobEventTypes,
    JobStatus,
    Team,
    User,
)
from keystone.permissions import Permissions
from .test_helpers import read_json_file


utc_now = lambda: datetime.now(tz=timezone.utc)
one_min_later = lambda dt: dt + timedelta(minutes=1)


class TestCollection:
    @mark.django_db
    def test_user_queryset(self):
        # Given an account and a team with one user
        account = baker.make(Account)
        user = baker.make(User, account=account)
        team = baker.make(Team, account=account)
        team.members.add(user)

        # ...and 5 collections
        collection1 = baker.make(Collection)
        collection2 = baker.make(Collection)
        collection3 = baker.make(Collection)
        collection4 = baker.make(Collection)
        unowned_collection = baker.make(Collection)

        # Make account-only, user-only, and team-only associations
        account.collections.add(collection1, collection2)
        user.collections.add(collection2, collection3)
        team.collections.add(collection4)

        # When we fetch all collections for the user we get all
        # account-only, user-only, and team-only associated collections
        # (without any duplicated collections)
        assert set(Collection.user_queryset(user).all()) == {
            collection1,
            collection2,
            collection3,
            collection4,
        }

    @mark.django_db
    def test_user_queryset_include_opted_out(self, make_user, make_collection):
        """Specifying include_opted_out=True to Collection.user_queryset() will toggle
        the inclusion of opted-out collections."""
        user = make_user()
        collection = make_collection(accounts=(user.account,))
        assert Collection.user_queryset(user).filter(id=collection.id).exists()
        user_settings = CollectionUserSettings.objects.create(
            collection=collection, user=user, opt_out=True
        )
        assert not Collection.user_queryset(user).filter(id=collection.id).exists()
        assert (
            Collection.user_queryset(user, include_opted_out=True)
            .filter(id=collection.id)
            .exists()
        )

    @mark.django_db
    def test_collectionusersettings_opt_out(self, make_user, make_user_dataset):
        """A collection to which a user would otherwise have access to is
        excluded from Collection.user_queryset() when a corresponding CollectionUserSettings
        instance exists with opt_out=True.
        """
        # Create a test user and several other users, some of which belong to the
        # same account as the test user, and one of which is a superuser.
        test_user = make_user()
        other_users = (
            make_user(is_superuser=True, account=test_user.account),
            make_user(account=test_user.account),
            make_user(),  # different account user
        )
        # Create collections w/ associated datasets for each user.
        user_collections = defaultdict(list)
        collection_datasets = defaultdict(list)

        def make_user_collections_with_datasets(user):
            for _ in range(3):
                dataset = make_user_dataset(user)
                collection = dataset.job_start.collection
                collection_datasets[collection].append(dataset)
                user_collections[user].append(collection)

        for user in (test_user,) + other_users:
            make_user_collections_with_datasets(user)

        # The make_user_dataset() helper creates an user account-level authorization for
        # each collection that it creates, and we want to test that other users don't lose
        # access to a shared collection when one user opts-out, so let's collection all the
        # collection authorized for the test_user account.
        test_user_account_authorized_collections = Collection.objects.filter(
            accounts=test_user.account
        ).all()
        assert len(test_user_account_authorized_collections) == 9

        def has_collection_and_datasets_access(user, collection):
            """Return a bool indicating whether the user has access (via Model.user_queryset)
            to the specified collection and its associated datasets."""
            has_collection_access = (
                Collection.user_queryset(user).filter(id=collection.id).exists()
            )
            # By default, datasets are only accessible to the user that created them, so check
            # either for all collection-associated datasets or none to be visible based on
            # whether this collection was created on behalf of the user.
            dataset_ids = set(
                Dataset.user_queryset(user)
                .filter(job_start__collection=collection)
                .values_list("id", flat=True)
            )
            datasets_access_ok = dataset_ids == (
                {dataset.id for dataset in collection_datasets[collection]}
                if collection in user_collections[user]
                else set()
            )
            return has_collection_access and datasets_access_ok

        def assert_others_unaffected():
            """Assert that other users still have access to all of their collections and
            associated datasets."""
            for user in other_users:
                if user.account == test_user.account:
                    # User belongs to the same account as the test user, so check
                    # for access to all account-authorized collections.
                    collections = test_user_account_authorized_collections
                else:
                    # User does not belong to the same account as the test user,
                    # so just test against that user's collections.
                    collections = user_collections[user]
                for collection in collections:
                    assert has_collection_and_datasets_access(user, collection)

        # The test user starts off with access to all their account-authorized collections.
        for collection in test_user_account_authorized_collections:
            assert has_collection_and_datasets_access(test_user, collection)
        # The other users also have access to all their collections and datasets.
        assert_others_unaffected()

        # The test user chooses to opt-out from their first account-authorized collection.
        first_collection, *other_collections = test_user_account_authorized_collections
        user_settings = CollectionUserSettings.objects.create(
            collection=first_collection, user=test_user, opt_out=True
        )

        # The test user has lost access to their first collection and its datasets but
        # retains access to their other collections.
        assert not has_collection_and_datasets_access(test_user, first_collection)
        for collection in other_collections:
            assert has_collection_and_datasets_access(test_user, collection)
        # The other users retain access to all their collections and datasets.
        assert_others_unaffected()

        # The test user chooses to opt back in to their first collection. Note that this is
        # different than never having opted-out because the CollectionUserSettings instance
        # will continue to exist (whereas no such instance existed before) but with opt_out=False.
        user_settings.opt_out = False
        user_settings.save()
        for collection in test_user_account_authorized_collections:
            assert has_collection_and_datasets_access(test_user, collection)
        # The other users retain access to all their collections and datasets.
        assert_others_unaffected()

    @mark.django_db
    def test_collectionusersettings_opt_out_view_perms(
        self, make_user, make_collection
    ):
        """A user retains the VIEW_COLLECTION permission for opted-out collections."""
        user = make_user()
        collection = make_collection(accounts=(user.account,))
        assert Collection.user_queryset(user).filter(id=collection.id).exists()
        assert collection.user_has_perm(user, Permissions.VIEW_COLLECTION)
        user_settings = CollectionUserSettings.objects.create(
            collection=collection, user=user, opt_out=True
        )
        assert not Collection.user_queryset(user).filter(id=collection.id).exists()
        assert collection.user_has_perm(user, Permissions.VIEW_COLLECTION)

    @mark.django_db
    def test_ait_collection_input_spec(self, make_collection):
        """An AIT-type collection uses a legacy collection-type input spec."""
        c = make_collection(collection_type=CollectionTypes.AIT)
        assert c.input_spec.dict() == {
            "type": "collection",
            "collectionId": c.arch_id,
        }

    @mark.django_db
    def test_legacy_custom_collection_input_spec(self, make_collection):
        """A CUSTOM-type collection with a non-UUID-based arch_id uses a
        legacy collection-type input spec."""
        c = make_collection(
            collection_type=CollectionTypes.CUSTOM,
            arch_id="CUSTOM-ks:test:ARCHIVEIT-18017_1710966891017",
        )
        assert c.input_spec.dict() == {
            "type": "collection",
            "collectionId": c.arch_id,
        }

    @mark.django_db
    def test_cdx_dataset_custom_collection_input_spec(self, make_collection):
        """A CUSTOM-type collection with a UUID-based arch_id uses a dataset/cdx-type
        input spec."""
        c = make_collection(
            collection_type=CollectionTypes.CUSTOM,
            arch_id="CUSTOM-018fa5ec-523e-7a2d-bda5-d87b0d5c46b2",
        )
        assert c.input_spec.dict() == {
            "type": "dataset",
            "inputType": "cdx",
            "uuid": "018fa5ec-523e-7a2d-bda5-d87b0d5c46b2",
        }

    @mark.django_db
    def test_normal_special_collection_input_spec(self, make_collection):
        """A SPECIAL-type collection that does not define a custom metadata.input_spec
        uses a legacy collection-type input spec."""
        c = make_collection(collection_type=CollectionTypes.SPECIAL)
        assert c.input_spec.dict() == {
            "type": "collection",
            "collectionId": c.arch_id,
        }

    @mark.django_db
    def test_extra_special_collection_input_spec(
        self, FILES_INPUT_SPEC, make_collection
    ):
        """A SPECIAL-type collection that defines a valid metadata.input_spec value will have
        that value returned by its input_spec property."""
        c = make_collection(
            collection_type=CollectionTypes.SPECIAL,
            metadata={"input_spec": FILES_INPUT_SPEC},
        )
        assert c.input_spec.dict() == FILES_INPUT_SPEC

    @mark.django_db
    def test_extra_special_collection_input_spec_validation(
        self, FILES_INPUT_SPEC, make_collection
    ):
        """Validation is enforced on SPECIAL-type collection metadata.input_spec values."""
        with pytest.raises(ValidationError) as exc_info:
            make_collection(
                collection_type=CollectionTypes.SPECIAL,
                metadata={"input_spec": FILES_INPUT_SPEC | {"type": "filez"}},
            )
        exc_msg = exc_info.value.args[0]
        # Expect >=1 validations errors:
        #   1 for the invalid ArchFileInputSpec "type" value
        #   N for the invalid/unspecified plugin-supported *InputSpec field values
        num_errors, rest = exc_msg.split(" ", 1)
        assert int(num_errors) >= 1
        assert rest.startswith("validation errors") and "given=filez" in rest


class TestArchQuota:
    @mark.django_db
    def test_fetch_for_user(self):
        # Given a user in two teams within an account
        account = baker.make(Account)
        team1 = baker.make(Team, account=account)
        team2 = baker.make(Team, account=account)
        user = baker.make(User, account=account)
        user.teams.add(team1, team2)
        # Where each of the user, their teams, and their accounts have a quota
        account_quota = baker.make(ArchQuota, content_object=account)
        team1_quota = baker.make(ArchQuota, content_object=team1)
        team2_quota = baker.make(ArchQuota, content_object=team2)
        user_quota = baker.make(ArchQuota, content_object=user)
        qsort = lambda x: x.id
        team_quotas = sorted([team1_quota, team2_quota], key=qsort)

        # When we fetch all quotas for the user
        quota_dict = ArchQuota.fetch_for_user(user)

        # Each of the user, their teams, and their account quotas return
        assert quota_dict[Account] == account_quota
        assert sorted(quota_dict[Team], key=qsort) == team_quotas
        assert quota_dict[User] == user_quota


class TestUser:
    user_data_json_file = "test_user_data.json"
    user_data = read_json_file(user_data_json_file)

    @mark.django_db
    def test_user_email_normalized_on_save(self, make_user):
        """User.email is normalized on save to prevent dupes."""
        user = make_user()
        orig_email = "userName@DOMAIN.COM"
        norm_email = "userName@domain.com"
        user.email = orig_email
        user.save()
        # Expect the domain to have been lowercased.
        assert user.email == norm_email
        user.refresh_from_db()
        assert user.email == norm_email

    @mark.django_db
    def test_create_users_from_data_dict_list(self):
        # Creates multiple User records from input data and returns None if transaction is successful
        account = baker.make(Account, id=1)
        error_message = User.create_users_from_data_dict_list(TestUser.user_data)
        users = User.objects.all()

        assert error_message == None
        assert users.count() == 2

    @mark.django_db
    def test_create_users_from_data_dict__list_transaction_rollback(self):
        # Rolls back the transaction and returns an error message if any or all Users already exist
        account = baker.make(Account, id=1)
        user = baker.make(
            User, username=TestUser.user_data[0]["username"], account=account
        )
        error_message = User.create_users_from_data_dict_list(TestUser.user_data)
        users = User.objects.all()

        assert error_message != None
        assert users.count() == 1
        assert User.objects.first().username == "testuser"

    @mark.django_db
    def test_username_is_immutable(self, make_user):
        # Attempting to update username raises an OperationalError
        user = make_user()
        user.username = "new username"
        with pytest.raises(OperationalError) as exc_info:
            user.save()
        assert exc_info.value.args[0].startswith("username is immutable")

    @mark.django_db
    def test_job_start_get_job_status(self, make_jobstart):
        # JobStart.get_job_status() does its best to represent the current JobEvent state.
        job_start_created_at = utc_now()
        job_start = make_jobstart(created_at=job_start_created_at)
        # Check that get_job_status() returns an empty JobStatus in the absence of any JobEvents.
        assert job_start.get_job_status() == JobStatus(
            state=None, start_time=None, finished_time=None
        )

        # Create a QUEUED event and recheck get_job_status().
        queued_at = one_min_later(job_start_created_at)
        queued_je = JobEvent.objects.create(
            job_start=job_start, event_type=JobEventTypes.QUEUED, created_at=queued_at
        )
        assert job_start.get_job_status() == JobStatus(
            state=JobEventTypes.QUEUED, start_time=queued_at, finished_time=None
        )

        # Check that if we now create a RUNNING event, get_job_status() will report that created_at
        # timestamp as the start_time.
        running_at = one_min_later(queued_at)
        running_je = JobEvent.objects.create(
            job_start=job_start, event_type=JobEventTypes.RUNNING, created_at=running_at
        )
        assert job_start.get_job_status() == JobStatus(
            state=JobEventTypes.RUNNING, start_time=running_at, finished_time=None
        )

        # Check that if we create a FINISHED event, get_job_status() reports a non-None finished_time.
        finished_at = one_min_later(running_at)
        JobEvent.objects.create(
            job_start=job_start,
            event_type=JobEventTypes.FINISHED,
            created_at=finished_at,
        )
        assert job_start.get_job_status() == JobStatus(
            state=JobEventTypes.FINISHED,
            start_time=running_at,
            finished_time=finished_at,
        )

        # Check that in the absence of QUEUED or RUNNING JobEvents, get_job_status() will report
        # the JobStart.created_at as the start_time.
        queued_je.delete()
        running_je.delete()
        assert job_start.get_job_status() == JobStatus(
            state=JobEventTypes.FINISHED,
            start_time=job_start_created_at,
            finished_time=finished_at,
        )


class TestDataset:
    @mark.django_db
    def test_user_queryset_team_access(
        self,
        make_user,
        make_team,
        make_user_dataset,
    ):
        """A user can access a dataset that they don't own if the dataset
        is shared with a team of which both the dataset owner and the user
        are members.
        """
        # Make a dataset owner and a dataset.
        dataset_owner = make_user()
        dataset = make_user_dataset(dataset_owner)
        # Create a teammate user.
        teammate = make_user(account=dataset_owner.account)
        # Check that the teammate can not access the dataset.
        assert Dataset.user_queryset(teammate).count() == 0
        # Create a team with which the dataset is shared and add the
        # owner and the teammate as members.
        team = make_team(account=dataset_owner.account)
        team.members.add(dataset_owner, teammate)
        dataset.teams.add(team)
        # Check that the teammate now has access.
        assert set(Dataset.user_queryset(teammate).values_list("id", flat=True)) == {
            dataset.id
        }
        # Create a second team of which both the owner and teammate are members
        # to check that being teammates of some non-dataset-associated team doesn't
        # unexpectedly enable access during the following checks.
        team2 = make_team(account=team.account)
        team.members.add(dataset_owner, teammate)
        # Remove the owner from the team and check that teammate access is lost.
        team.members.remove(dataset_owner)
        assert Dataset.user_queryset(teammate).count() == 0
        # Add the owner back to the team but share the dataset and check that teammate
        # access is lost.
        team.members.add(dataset_owner)
        dataset.teams.remove(team)
        assert Dataset.user_queryset(teammate).count() == 0

    @mark.django_db
    def test_user_queryset_global_datasets_access(
        self,
        global_datasets_user,
        global_datasets_team,
        make_user,
        make_user_dataset,
        make_team,
    ):
        """A user can access a global dataset if they are a member of the "Global Datasets"
        team and they've been directly authorized via Collection.users to access the
        associated collection.
        """
        # Make a global dataset.
        global_dataset = make_user_dataset(global_datasets_user)
        # Create a test user.
        user = make_user()
        # Check that the user can not access the global dataset.
        assert Dataset.user_queryset(user).count() == 0
        # Add the user to the Global Datasets team and check that the user
        # still does not have access on account of not being directly authorized
        # to access the associated collection.
        global_datasets_team.members.add(user)
        assert Dataset.user_queryset(user).count() == 0
        # Test that granting the user account and team-level collection access
        # still don't allow access.
        collection = global_dataset.job_start.collection
        collection.accounts.add(user.account)
        collection.teams.add(make_team(account=user.account))
        assert Dataset.user_queryset(user).count() == 0
        # Directly authorize the user via collection.users and check that they
        # now have access.
        collection.users.add(user)
        assert set(Dataset.user_queryset(user).values_list("id", flat=True)) == {
            global_dataset.id
        }
        # Remove the user from the Global Datasets teams and check that access is lost.
        global_datasets_team.members.remove(user)
        assert Dataset.user_queryset(user).count() == 0

    @mark.django_db
    def test_user_queryset_excludes_dataset_if_associated_collection_opted_out(
        self, make_user, make_user_dataset
    ):
        """A dataset associated with a collection for which a user has opted-out
        will be excluded from Dataset.user_queryset().
        """
        user = make_user()
        dataset1 = make_user_dataset(user)
        dataset2 = make_user_dataset(user)

        def assert_test_user_dataset_ids(ids):
            assert set(Dataset.user_queryset(user).values_list("id", flat=True)) == ids

        # Check that both datasets are visible.
        assert_test_user_dataset_ids({dataset1.id, dataset2.id})

        # Opt the user out of the dataset1-associated collection and check that that
        # dataset is no longer available.
        collection_user_settings = CollectionUserSettings.objects.create(
            collection=dataset1.job_start.collection, user=user, opt_out=True
        )
        assert_test_user_dataset_ids({dataset2.id})

        # Set opt_out=False and check that it reappears.
        collection_user_settings.opt_out = False
        collection_user_settings.save()
        assert_test_user_dataset_ids({dataset1.id, dataset2.id})

    @mark.django_db
    def test_datasetusersettings_opt_out(
        self,
        make_account,
        make_user,
        make_team,
        global_datasets_team,
        global_datasets_user,
        make_user_dataset,
    ):
        """A dataset to which a user would otherwise have access to is
        excluded from Dataset.user_queryset() when a corresponding DatasetUserSettings
        instance exists with opt_out=True.
        """
        # Dataset.user_queryset() returns datasets that are either:
        #  - owned by the specified user
        #  - authorized for a team of which the owner and user are both members
        #  - owned by the global datasets user, is associated with a
        #    collection for which the user has been directly authorized via
        #    collection.users, and the user is a member of the Global Datasets team.
        #  AND of which the user has not opted out
        #  AND of which the associated collection the user has not opted out

        # Create a test user, a team member of that user, and the global user.
        user = make_user()
        team_member = make_user(account=user.account)
        global_datasets_user = global_datasets_user
        team = make_team(account=user.account)
        team.members.add(user, team_member)

        # Create a dataset belonging to each user type, to which the test user
        # will have access.
        user_dataset = make_user_dataset(user)
        team_member_dataset = make_user_dataset(team_member)
        # Share the team member dataset with the team.
        team_member_dataset.teams.add(team)
        # Need to ensure that user is directly authorized via Collection.users and is
        # a member of the Global Datasets team in order for the global dataset to become
        # visible. See comment in Dataset.user_queryset().
        user_dataset.job_start.collection.users.add(user)
        global_datasets_team.members.add(user)
        global_datasets_user_dataset = make_user_dataset(
            global_datasets_user, collection=user_dataset.job_start.collection
        )
        all_dataset_ids = {
            user_dataset.id,
            team_member_dataset.id,
            global_datasets_user_dataset.id,
        }

        def assert_test_user_dataset_ids(ids):
            assert set(Dataset.user_queryset(user).values_list("id", flat=True)) == ids

        # Check that the test user has access to all three datasets.
        assert_test_user_dataset_ids(all_dataset_ids)

        # Opt the test user out of each user dataset, check that it's omitted from
        # Dataset.user_queryset(), then set opt_out=False and check that it reappears.
        for dataset in (
            user_dataset,
            team_member_dataset,
            global_datasets_user_dataset,
        ):
            dataset_user_settings = DatasetUserSettings.objects.create(
                dataset=dataset, user=user, opt_out=True
            )
            # Check that all but this particular, opted-out dataset are visible.
            assert_test_user_dataset_ids(all_dataset_ids ^ {dataset.id})
            # Set opt_false=False and check that it reappaears.
            dataset_user_settings.opt_out = False
            dataset_user_settings.save()
            assert_test_user_dataset_ids(all_dataset_ids)
