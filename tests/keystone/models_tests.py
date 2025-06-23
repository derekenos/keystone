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
    JobEvent,
    JobEventTypes,
    JobStatus,
    Team,
    User,
)
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
