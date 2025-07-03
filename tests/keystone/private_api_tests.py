from http import HTTPStatus
from unittest.mock import patch
from datetime import (
    datetime,
    timedelta,
    timezone,
)

from django.test import Client as _Client
from django.forms import model_to_dict
from model_bakery.baker import prepare
from pytest import (
    fixture,
    mark,
    raises,
)

from config.settings import (
    PRIVATE_API_KEY,
    KnownArchJobUuids,
)

from keystone.models import (
    CollectionTypes,
    JobComplete,
    JobEvent,
    JobEventTypes,
    JobFile,
    JobStart,
)


###############################################################################
# Helpers
###############################################################################

utc_now = lambda: datetime.now(tz=timezone.utc)


class Client(_Client):
    AUTH_HEADER = {"x-api-key": PRIVATE_API_KEY}

    def post(self, path, data):
        return super().post(path, data, "application/json", headers=self.AUTH_HEADER)

    def register_job_start(
        self, collection, uuid, job_type_id, username, input_bytes, sample, attempt
    ):
        return self.post(
            "/private/api/job/start",
            {
                "id": uuid,
                "job_type_id": job_type_id,
                "username": username,
                "input_bytes": input_bytes,
                "sample": sample,
                "parameters": {
                    "instance_hashcode": "dummy_instance_hashcode",
                    "attempt": attempt,
                    "conf": {
                        "inputSpec": {
                            "type": "collection",
                            "collectionId": collection.arch_id,
                        },
                        "outputPath": "dummy_ouputPath",
                        "sample": 100 if sample else -1,
                    },
                },
                "commit_hash": "dummy_commit_hash",
                "created_at": utc_now().isoformat(),
            },
        )

    def register_job_event(self, job_start_id, event_type, created_at):
        return self.post(
            "/private/api/job/event",
            {
                "job_start_id": job_start_id,
                "event_type": event_type,
                "created_at": created_at,
            },
        )

    def register_job_complete(
        self, job_start_id, event_type, output_bytes, created_at, files
    ):
        return self.post(
            "/private/api/job/complete",
            {
                "job_start_id": job_start_id,
                "event_type": event_type,
                "output_bytes": output_bytes,
                "created_at": created_at,
                "files": files,
            },
        )


def make_register_job_start_params(collection):
    """Return a dict of default Client.register_job_start() params for the
    given Collection."""
    return {
        "uuid": prepare(JobStart).id,
        "job_type_id": KnownArchJobUuids.DOMAIN_FREQUENCY,
        "username": collection.users.first().username,
        "input_bytes": 100,
        "sample": False,
        "attempt": 1,
    }


def make_register_job_complete_params(job_start):
    """Return a dict of default Client.register_job_complete() params for the
    given JobStart."""
    now_iso = utc_now().isoformat()
    return {
        "job_start_id": job_start.id,
        "event_type": "FINISHED",
        "output_bytes": 100,
        "created_at": now_iso,
        "files": [
            {
                "filename": "dummy-output.csv.gz",
                "sizeBytes": 123,
                "mimeType": "application/gzip",
                "lineCount": 10,
                "fileType": "a good one",
                "creationTime": now_iso,
                "md5Checksum": None,
                "accessToken": "12345678",
            }
        ],
    }


###############################################################################
# Fixtures
###############################################################################


@fixture
def user_collection(make_collection, make_user):
    collection = make_collection(collection_type=CollectionTypes.SPECIAL)
    user = make_user()
    collection.users.add(user)
    collection.save()
    return collection


@fixture
def make_jobstart(user_collection):
    """Override the dumb default make_jobstart in conftest.py with one that
    invokes the /private/api/job/start endpoint in order to create a
    well-formed object instance."""

    def maker():
        params = make_register_job_start_params(user_collection)
        Client().register_job_start(collection=user_collection, **params)
        return JobStart.objects.get(id=params["uuid"])

    return maker


###############################################################################
# Tests
###############################################################################


@mark.django_db
def test_register_job_start(user_collection):
    """A request to /private/api/job/start should create a JobStart record."""
    # Create the JobStart.
    params = make_register_job_start_params(user_collection)
    res = Client().register_job_start(collection=user_collection, **params)
    assert res.status_code == HTTPStatus.OK
    # Check that the JobStart is as expected.
    job_start = JobStart.objects.get(id=params["uuid"])
    assert job_start.user.username == params["username"]
    assert job_start.job_type_id == params["job_type_id"]
    assert job_start.sample == params["sample"]
    assert job_start.parameters["attempt"] == params["attempt"]


@mark.django_db
def test_register_job_start_attempt_update(user_collection):
    """A request to /private/api/job/start that specifies a monotonically increased
    attempt count should result in the existing JobStart attempt count being updated."""
    # Create the JobStart.
    params = make_register_job_start_params(user_collection)
    res = Client().register_job_start(collection=user_collection, **params)
    assert res.status_code == HTTPStatus.OK
    # Check that the attempt count is as expected.
    job_start = JobStart.objects.get(id=params["uuid"])
    assert job_start.parameters["attempt"] == params["attempt"]
    # Post again with an incremented attempt count.
    params["attempt"] += 1
    res = Client().register_job_start(collection=user_collection, **params)
    assert res.status_code == HTTPStatus.OK
    # Check that the attempt count was updated.
    job_start.refresh_from_db()
    assert job_start.parameters["attempt"] == params["attempt"]


@mark.django_db
def test_register_job_start_same_or_decreased_attempt_count(user_collection):
    """A request to /private/api/job/start that specifies the same or lower attempt count
    as that of the existing JobStart will be rejected."""
    # Create a JobStart with an initial attempt count of 2.
    params = make_register_job_start_params(user_collection)
    params["attempt"] = 2
    res = Client().register_job_start(collection=user_collection, **params)
    assert res.status_code == HTTPStatus.OK
    # Attempting to set the same count will be rejected.
    res = Client().register_job_start(collection=user_collection, **params)
    assert res.status_code == HTTPStatus.BAD_REQUEST
    assert res.json()["detail"].endswith("value can only be incremented")
    # Attempting to decrement the count will be rejected.
    params["attempt"] -= 1
    res = Client().register_job_start(collection=user_collection, **params)
    assert res.status_code == HTTPStatus.BAD_REQUEST
    assert res.json()["detail"].endswith("value can only be incremented")


@mark.django_db
def test_register_job_event_and_complete(make_jobstart):
    """Requests /private/api/job/event should create JobEvents, and a request to
    /private/api/job/completeb should create a JobComplete."""
    # Create a JobStart.
    job_start = make_jobstart()
    # Register a FINISHED event for the JobStart.
    client = Client()
    client.register_job_event(
        job_start_id=job_start.id,
        event_type=JobEventTypes.FINISHED,
        created_at=utc_now().isoformat(),
    )
    # Check that the JobEvents were created.
    job_events = (
        JobEvent.objects.filter(job_start=job_start).order_by("created_at").all()
    )
    assert len(job_events) == 1
    assert job_events[0].event_type == JobEventTypes.FINISHED
    # Create the JobComplete.
    params = make_register_job_complete_params(job_start)
    res = client.register_job_complete(**params)
    assert res.status_code == HTTPStatus.NO_CONTENT
    # Check that the JobComplete is as expected.
    job_complete = JobComplete.objects.get(job_start_id=params["job_start_id"])
    assert job_complete.output_bytes == params["output_bytes"]
    assert job_complete.created_at.isoformat() == params["created_at"]
    # Check that a JobFile was created and is as expected.
    job_files = job_complete.jobfile_set.all()
    assert len(job_files) == 1
    assert job_files[0].filename == "dummy-output.csv.gz"


@mark.django_db
@patch("keystone.api.report_warning")
def test_register_job_complete_purges_jobfiles_on_update(report_warning, make_jobstart):
    """Requests to /private/api/job/complete for which a corresponding JobComplete
    already exists, should result in updates to the JobComplete.{output_bytes,created_at}
    fields, the purging of all preexisting JobFiles, and the creation of new JobFiles.
    """
    client = Client()
    # Create a JobStart, JobComplete, and check that all is as expected.
    job_start = make_jobstart()
    params = make_register_job_complete_params(job_start)
    res = client.register_job_complete(**params)
    job_complete = JobComplete.objects.get(job_start_id=job_start.id)
    assert job_complete.output_bytes == params["output_bytes"]
    assert job_complete.created_at.isoformat() == params["created_at"]
    job_files = job_complete.jobfile_set.all()
    assert len(job_files) == 1 and job_files[0].filename == "dummy-output.csv.gz"

    # Create a second JobComplete w/ associated JobFile so that we can verify
    # that the JobFile purge doesn't clobber those of other JobCompletes.
    other_job_start = make_jobstart()
    client.register_job_complete(**make_register_job_complete_params(other_job_start))
    other_job_file = JobComplete.objects.get(
        job_start_id=other_job_start.id
    ).jobfile_set.first()

    # Modify the original JobComplete request params.
    params["output_bytes"] += 1
    params["created_at"] = (
        datetime.fromisoformat(params["created_at"]) + timedelta(minutes=1)
    ).isoformat()
    params["files"][0]["sizeBytes"] += 1
    # Reset the report_warning() mock state due to the fact that we've exercised
    # the auto-terminal-jobevent-creation logic above through our lack of manual
    # JobEvent creation, which will have invoked report_warning().
    report_warning.reset_mock()
    # Make the JobComplete update request.
    res = client.register_job_complete(**params)
    # Check that the JobComplete has been updated.
    job_complete = JobComplete.objects.get(job_start_id=job_start.id)
    assert job_complete.output_bytes == params["output_bytes"]
    assert job_complete.created_at.isoformat() == params["created_at"]
    # Check that the old JobFile was deleted.
    with raises(JobFile.DoesNotExist):
        job_files[0].refresh_from_db()
    # Check that Sentry was notified of the deletion.
    report_warning.assert_called_once()
    assert (
        report_warning.call_args.args[0]
        == "Deleted preexisting JobFile(s) during JobComplete update"
    )
    assert report_warning.call_args.kwargs["context"]["job_files"] == [
        model_to_dict(job_files[0])
    ]
    # Check that the new JobFile was created.
    new_job_files = job_complete.jobfile_set.all()
    assert len(new_job_files) == 1
    assert new_job_files[0].size_bytes == params["files"][0]["sizeBytes"]

    # Check that the JobFile associated with the other JobComplete was not
    # affected, using model_to_dict() instead of a direct == because the latter
    # only tests for an identical primary key value.
    assert model_to_dict(
        JobComplete.objects.get(job_start_id=other_job_start.id).jobfile_set.first()
    ) == model_to_dict(other_job_file)


@mark.django_db
@patch("keystone.api.report_warning")
def test_register_job_complete_retry_no_prev_jobcomplete(report_warning, make_jobstart):
    """A request to /private/api/job/complete for a JobStart with attempt > 1 but no
    existing JobComplete should create a JobComplete and notify Sentry of the creation.
    """
    # Create a JobStart and set its attempt count to 2.
    job_start = make_jobstart()
    job_start.parameters["attempt"] = 2
    job_start.save()
    # Register a FINISHED event for the JobStart.
    client = Client()
    client.register_job_event(
        job_start_id=job_start.id,
        event_type=JobEventTypes.FINISHED,
        created_at=utc_now().isoformat(),
    )
    # Create the JobComplete.
    params = make_register_job_complete_params(job_start)
    res = client.register_job_complete(**params)
    assert res.status_code == HTTPStatus.NO_CONTENT
    # Check that the JobComplete is as expected.
    job_complete = JobComplete.objects.get(job_start_id=params["job_start_id"])
    assert job_complete.output_bytes == params["output_bytes"]
    assert job_complete.created_at.isoformat() == params["created_at"]
    # Check that Sentry was notified.
    report_warning.assert_called_once()
    assert (
        report_warning.call_args.args[0]
        == "JobComplete was missing for JobStart with attempt > 1"
    )


@mark.django_db
@patch("keystone.api.report_warning")
def test_register_job_complete_zero_jobevents(report_warning, make_jobstart):
    """A request to /private/api/job/complete for a JobStart that has no related JobEvents
    will result in the creation of a terminal JobEvent."""
    # Create a JobStart.
    job_start = make_jobstart()
    # Make the JobComplete request.
    res = Client().register_job_complete(**make_register_job_complete_params(job_start))
    assert res.status_code == HTTPStatus.NO_CONTENT
    # Check that the JobEvent was created.
    job_events = JobEvent.objects.filter(job_start=job_start).all()
    assert len(job_events) == 1
    assert job_events[0].event_type == JobEventTypes.FINISHED
    # Check that Sentry was notified.
    report_warning.assert_called_once()
    assert report_warning.call_args.args[0] == "Created missing terminal JobEvent"


@mark.django_db
@patch("keystone.api.report_warning")
def test_register_job_complete_nonterminal_jobevent(report_warning, make_jobstart):
    """A request to /private/api/job/complete for a JobStart for which the latest associated
    JobEvent is a non-terminal type will result in a terminal JobEvent being created."""
    # Create a JobStart.
    job_start = make_jobstart()
    # Register an associated non-terminal job event.
    client = Client()
    client.register_job_event(
        job_start_id=job_start.id,
        event_type=JobEventTypes.RUNNING,
        created_at=utc_now().isoformat(),
    )
    # Make the JobComplete request.
    res = client.register_job_complete(**make_register_job_complete_params(job_start))
    assert res.status_code == HTTPStatus.NO_CONTENT
    # Check that the JobEvent was created.
    job_events = JobEvent.objects.filter(job_start=job_start).order_by("-id").all()
    assert len(job_events) == 2
    assert job_events[0].event_type == JobEventTypes.FINISHED
    # Check that Sentry was notified.
    report_warning.assert_called_once()
    assert report_warning.call_args.args[0] == "Created missing terminal JobEvent"
