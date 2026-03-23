# pylint: disable=too-many-lines

import re
from collections import defaultdict
from functools import wraps
from http import HTTPStatus
from datetime import (
    datetime,
    timezone,
)
from typing import (
    Any,
    List,
    Optional,
)

import django.utils
from django.contrib.auth.tokens import PasswordResetTokenGenerator
from django.contrib.postgres.aggregates import ArrayAgg
from django.core.exceptions import FieldDoesNotExist, ObjectDoesNotExist
from django.forms import model_to_dict
from django.shortcuts import get_object_or_404
from django.db import IntegrityError, OperationalError, transaction
from django.db.models import (
    CharField,
    Count,
    Exists,
    OuterRef,
    Prefetch,
    Q,
    QuerySet,
    Subquery,
)
from django.db.models.functions import Cast, Coalesce
from django.templatetags.static import static
from django.utils.datastructures import MultiValueDict
from django.http import (
    Http404,
    HttpRequest,
    HttpResponse,
    HttpResponseBadRequest,
    JsonResponse,
)
from ninja.errors import HttpError
from ninja.pagination import (
    LimitOffsetPagination,
    paginate,
)
from ninja.parser import Parser
from ninja.types import DictStrAny
from ninja import (
    NinjaAPI,
    Query,
    Schema,
)
from ninja.security import (
    APIKeyHeader,
    HttpBasicAuth,
    django_auth,
)
from pydantic import PositiveInt

from config.settings import (
    ARCH_GLOBAL_USERNAME,
    ARCH_SUPPORT_TICKET_URL,
    GLOBAL_USER_USERNAME,
    PUBLIC_BASE_URL,
    PRIVATE_API_KEY,
    KnownArchJobUuids,
)

from . import jobmail
from .arch_api import (
    ArchAPI,
    ArchRequestError,
)
from .context_processors import helpers as ctx_helpers
from .jobmail import send as send_email
from .helpers import (
    dot_to_dunder,
    find_field_from_lookup,
    report_exceptions,
    report_warning,
)
from .models import (
    Collection,
    CollectionTypes,
    CollectionUserSettings,
    Dataset,
    DatasetUserSettings,
    JobCategory,
    JobComplete,
    JobEvent,
    JobEventTypes,
    JobFile,
    JobStart,
    JobType,
    Team,
    User,
)
from .permissions import Permissions
from .schemas import (
    AvailableJobsCategory,
    CollectionFilterSchema,
    CollectionSchema,
    CreateTeamSchema,
    CreateUserSchema,
    DatasetFilterSchema,
    DatasetGenerationRequest,
    DatasetPublicationInfo,
    DatasetPublicationMetadata,
    DatasetSampleVizData,
    DatasetSchema,
    JobEventIn,
    JobEventOut,
    JobStartIn,
    JobStartOut,
    JobCategorySchema,
    JobCompleteIn,
    JobStateInfo,
    MinimalTeamSchema,
    MultiInputSpec,
    PermissionResponse,
    SubCollectionCreationRequest,
    TeamFilterSchema,
    TeamSchema,
    UpdateCollectionSchema,
    UpdateDatasetSchema,
    UpdateTeamSchema,
    UpdateUserSchema,
    UserFilterSchema,
    UserSchema,
    WasapiResponse,
)


###############################################################################
# Constants
###############################################################################


DATETIME_MIN = datetime.min.replace(tzinfo=timezone.utc)

UNIQUE_INTEGRITY_ERROR_REGEX = re.compile(r"Key \((.+)\)=\((.+)\) already exists")

MAX_USERS_INTEGRITY_ERROR_REGEX = re.compile(
    r"Account \((\d+)\) has reached its max users limit"
)


###############################################################################
# Custom Exceptions
###############################################################################


class PermissionDenied(HttpError):
    """A Ninja-friendly Django PermissionDenied exception."""

    def __init__(self, message="FORBIDDEN"):
        super().__init__(HTTPStatus.FORBIDDEN, message)


###############################################################################
# Authentication Classes
###############################################################################


class ApiKey(APIKeyHeader):
    """Auth handler for Keystone's private API.
    Server-to-server requests to Keystone use X-API-Key header to make
    authenticated requests.
    """

    param_name = "X-API-Key"

    def authenticate(self, request, key):
        if key == PRIVATE_API_KEY:
            return key
        return None


class BasicAuth(HttpBasicAuth):
    """Auth handler for HTTP Basic Authentication."""

    def authenticate(self, request, username, password):
        try:
            user = User.objects.get(username=username)
        except User.DoesNotExist:
            return None
        if user.check_password(password):
            request.user = user
            return username
        return None


###############################################################################
# Decorators
###############################################################################


def user_passes_test(test_fn):
    """Adapted from Django's contrib.auth.decorators.user_passes_test()"""

    def decorator(func):
        """Route decorator to enforce that the requesting user is an admin of an
        active account.
        """

        @wraps(func)
        def wrapper(request, *args, **kwargs):
            if not test_fn(request.user):
                raise PermissionDenied
            return func(request, *args, **kwargs)

        return wrapper

    return decorator


def require_permission(perm_name):
    """Decorator to forbid request if doesn't possess the specified permission.
    We pass the permission name instead of a reference to the Permissions object
    attribute because the latter requires that the database connection be established
    which may not yet true at module load time.
    """
    return user_passes_test(lambda user: user.has_perm(getattr(Permissions, perm_name)))


###############################################################################
# Request Helpers
###############################################################################


class KeystoneRequestParser(Parser):
    """Override default querydict parser to convert dot-delimited model
    field references to the double-underscore delimited references that Django
    expects.
    """

    def parse_querydict(
        self, data: MultiValueDict, list_fields: List[str], request: HttpRequest
    ) -> DictStrAny:
        result: DictStrAny = {}
        for key in data.keys():
            final_key = dot_to_dunder(key)
            if final_key in list_fields:
                result[final_key] = data.getlist(key)
            else:
                result[final_key] = data[key]
        return result


def apply_sort_param(
    sort_str: Optional[str], queryset: QuerySet, schema: type[Schema]
) -> QuerySet:
    """Apply any specified request "sort" param to the queryset as an
    order_by()"""
    if sort_str is None:
        return queryset
    # Resolve field aliases.
    order_by_args = []
    invalid_fields = []
    for field_spec in sort_str.split(","):
        # Get the field name less any leading "+" or "-".
        field_name = field_spec[1:] if field_spec.startswith(("-", "+")) else field_spec
        schema_field = schema.__fields__.get(field_name)
        if schema_field is None:
            invalid_fields.append(field_name)
        else:
            # Append the field alias as an order_by arg, with any specified "-"
            # prefix, and replacing all "." with "__" to make the related lookup
            # work, e.g. "job_start.job_type.category" becomes
            # "job_start__job_type__category".
            order_by_args.append(
                ("-" if field_spec.startswith("-") else "")
                + schema_field.alias.replace(".", "__")
            )
    if invalid_fields:
        raise HttpError(400, f"Can not sort by invalid fields: {invalid_fields}")
    return queryset.order_by(*order_by_args)


def get_model_queryset_filter_values(queryset, field_path, filter_schema):
    """For a given queryset, return the distinct, filterable values as
    (value, displayValue) tuples, less NULLs, that exist for the specified
    field path, or raise a HttpError(400, ...) if the filter_schema doesn't
    implement the specified field path.
    """
    # Replace all "." with "__" in the field_path.
    field_name = dot_to_dunder(field_path)
    # Return a 400 if field_name is not defined in the filter schema.
    filter_schema_props = filter_schema.schema()["properties"]
    if field_name not in filter_schema_props:
        raise HttpError(400, f"Filtering not supported for field: {field_path}")
    # Use the filter schema to de-alias the field path.
    field_prop_q = filter_schema_props[field_name].get("q")
    if field_prop_q is not None and isinstance(field_prop_q, str):
        field_name = field_prop_q.removesuffix("__in")
    # Attempt to lookup the field.
    try:
        field = find_field_from_lookup(queryset.model, field_name)
    except FieldDoesNotExist as e:
        raise HttpError(400, f"Filtering not supported for field: {field_name}") from e
    # Do the query.
    values = list(
        queryset.filter(**{f"{field_name}__isnull": False})
        .values_list(field_name, flat=True)
        .distinct()
    )
    # If the ultimate model field is a TextChoice, return (value, displayValue) tuples.
    value_display_map = dict(field.choices or ())
    return [(v, value_display_map.get(v, v)) for v in values]


###############################################################################
# APIs
###############################################################################


# Ninja requires distinct `urls_namespace` or `version` args for each NinjaAPI object.
# If csrf is on, Ninja will require it even if using APIKeyHeader.
public_api = NinjaAPI(
    urls_namespace="public",
    csrf=True,
    auth=[django_auth],
    parser=KeystoneRequestParser(),
)


@public_api.exception_handler(ArchRequestError)
def public_api_arch_request_error_handler(request, exc):
    """Convert ArchRequestErrors to HTTP responses."""
    return exc.to_http_response()


@public_api.exception_handler(IntegrityError)
def public_api_integrityerror_error_handler(request, exc):
    """Convert IntegrityErrors to JSON responses."""

    def make_response(details):
        return JsonResponse({"details": details}, status=400)

    # Check for unique constraint violation.
    match = UNIQUE_INTEGRITY_ERROR_REGEX.search(exc.args[0])
    if match:
        field, value = match.groups()
        if "," in field:
            values = tuple(value.split(", "))
            fields = tuple(field.split(", "))
            return make_response(f"values {values} already exists for fields {fields}")
        return make_response(f"value ({value}) already exists for field ({field})")
    # Check for account max users check violation.
    match = MAX_USERS_INTEGRITY_ERROR_REGEX.search(exc.args[0])
    if match:
        return make_response("Account has reached its max users limit")
    return make_response("Unhandled IntegrityError")


@public_api.exception_handler(OperationalError)
def public_api_operationalerror_error_handler(request, exc):
    """Convert expected OperationalErrors (i.e. those that we explicitly raise
    from within DB triggers) to JSON responses."""
    # Get the first line of the detail string.
    exc_detail = exc.args[0].split("\n")[0]
    if exc_detail == "account max users limit reached" or " is immutable" in exc_detail:
        return JsonResponse({"details": exc_detail}, status=400)
    return HttpResponse(status=HTTPStatus.INTERNAL_SERVER_ERROR)


@public_api.exception_handler(ObjectDoesNotExist)
def public_api_objectdoesnotexist_error_handler(request, exc):
    """Convert Model.DoesNotExist to a HTTP 404 response."""
    # pylint: disable=unused-argument
    return HttpResponse("Not Found", status=HTTPStatus.NOT_FOUND)


private_api = NinjaAPI(
    urls_namespace="private", auth=[ApiKey()], parser=KeystoneRequestParser()
)


wasapi_api = NinjaAPI(
    urls_namespace="wasapi",
    csrf=True,
    auth=[django_auth, BasicAuth()],
)


@wasapi_api.exception_handler(ArchRequestError)
def wasapi_api_arch_request_error_handler(request, exc):
    """Convert ArchRequestErrors to HTTP responses."""
    return exc.to_http_response()


###############################################################################
# Private API Endpoints
###############################################################################


@private_api.post("/job/start", response=JobStartOut)
@report_exceptions(Http404)
@transaction.atomic
def register_job_start(request, payload: JobStartIn):
    """Tell Keystone a user has started a job."""
    # pylint: disable=too-many-locals
    job_type = get_object_or_404(JobType, id=payload.job_type_id)
    username = payload.username
    # Maybe retrieve the global dataset user, or strip any "ks:" username
    # prefix.
    if username == ARCH_GLOBAL_USERNAME:
        username = GLOBAL_USER_USERNAME
    elif username.startswith("ks:"):
        username = username[3:]
    user = get_object_or_404(User, username=username)

    parameters = payload.parameters

    # If a matching JobStart exists, update the attempt count if the current request value
    # is greater than the existing JobStart value, otherwise return a 400.
    job_start = JobStart.objects.filter(id=payload.id).first()
    if job_start:
        current_attempt = parameters.attempt
        previous_attempt = job_start.parameters["attempt"]
        if current_attempt <= previous_attempt:
            raise HttpError(
                400,
                f"Can not update job ({job_start.id}) attempt count from "
                f"({previous_attempt}) to ({current_attempt}) - value can only be incremented",
            )
        job_start.parameters["attempt"] = current_attempt
        job_start.save()
        return job_start

    #
    # This is the first job run attempt (that we know of)
    #

    # If job is not a User-Defined Query, lookup the collection from the
    # provided inputSpec, otherwise create a new Collection to serve as the
    # job_start.collection value.
    if job_type.id != KnownArchJobUuids.USER_DEFINED_QUERY:
        input_spec = parameters.conf.inputSpec
        # Strip any included "size" input_spec field. See generate_dataset() for why
        # this may/will be here.
        if "size" in input_spec:
            del input_spec["size"]
        try:
            collection = Collection.get_for_input_spec(input_spec)
        except Collection.DoesNotExist as e:
            raise Http404 from e
    else:
        job_conf = parameters.conf

        # Parse the collection name and owning user from the outputPath param,
        # which has a format like:
        #  .../{pathsafe_username}/{collection_id}
        # or
        #  .../{uuid_outpath}/{uuid}
        # Example:
        #  .../ks-test/SPECIAL-test-collection_1707245569769
        _, arch_collection_id = job_conf.outputPath.rsplit("/", 2)[-2:]
        arch_id = f"CUSTOM-{arch_collection_id}"

        name = job_conf.params.get("name")
        if name is None:
            return HttpResponseBadRequest("Collection name required for UDQ")

        collection = Collection.objects.create(
            arch_id=arch_id,
            name=name,
            collection_type=CollectionTypes.CUSTOM,
            size_bytes=0,
            metadata={"state": JobEventTypes.SUBMITTED},
        )
        # Grant user and user-account level collection access.
        collection.accounts.add(user.account)
        collection.users.add(user)

    return JobStart.objects.create(
        id=payload.id,
        job_type=job_type,
        collection=collection,
        user=user,
        # See generate_dataset() for an explanation of the input_bytes field.
        input_bytes=None if payload.input_bytes == -1 else payload.input_bytes,
        sample=payload.sample,
        parameters=parameters.dict(),
        commit_hash=payload.commit_hash,
        created_at=payload.created_at,
    )


@private_api.post("/job/event", response=JobEventOut)
def register_job_event(request, payload: JobEventIn):
    """Tell Keystone an ARCH job event has occurred"""

    job_start = get_object_or_404(JobStart, id=payload.job_start_id)
    job_event = JobEvent.objects.create(
        job_start=job_start,
        event_type=payload.event_type,
        created_at=payload.created_at,
    )
    return job_event


@private_api.post("/job/complete", response={HTTPStatus.NO_CONTENT: None})
@report_exceptions(Http404)
def register_job_complete(request, payload: JobCompleteIn):
    """Tell Keystone a previously registered JobStart has now ended.
    "Complete" does not imply success. The job may have ended in error,
    cancelled by the user, or some other final state.
    """
    job_start = get_object_or_404(JobStart, id=payload.job_start_id)
    attempt_number = job_start.parameters["attempt"]

    # If no terminal event state was previously registered, create one from the
    # payload event_type value.
    job_status = job_start.get_job_status()
    if job_status.finished_time is None:
        terminal_job_event = JobEvent.objects.create(
            job_start=job_start,
            event_type=payload.event_type,
            created_at=payload.created_at,
        )
        report_warning(
            "Created missing terminal JobEvent",
            context={
                "request_payload": payload.dict(),
                "job_event": terminal_job_event,
            },
        )

    # Report a warning if this is a retry and no JobComplete was created after a
    # prior attempt. Ideally all failed, cancelled, etc. jobs would be reported as complete,
    # but let's be flexible and simply report a warning and create the missing JobComplete as
    # necessary.
    if (
        attempt_number > 1
        and not JobComplete.objects.filter(job_start=job_start).exists()
    ):
        report_warning(
            "JobComplete was missing for JobStart with attempt > 1",
            context={"request_payload": payload.dict(), "job_state": job_status.state},
        )

    # Create or update the JobComplete.
    job_complete, _ = JobComplete.objects.update_or_create(
        job_start=job_start,
        defaults={
            "output_bytes": payload.output_bytes,
            "created_at": payload.created_at,
        },
    )

    job_type = job_complete.job_start.job_type
    job_state = job_start.get_job_status().state

    # Notify on final attempt failure.
    if job_state == JobEventTypes.FAILED and attempt_number == 3:
        jobmail.send_job_failed(request, job_complete, send_user_email=job_type.can_run)
        return HTTPStatus.NO_CONTENT, None

    # Take no further action if job_state is anything other than FINISHED (e.g. CANCELLED).
    if job_state != JobEventTypes.FINISHED:
        return HTTPStatus.NO_CONTENT, None

    # Purge any existing associated JobFiles and notify Sentry of any deletions.
    existing_jobfile_qs = JobFile.objects.filter(job_complete=job_complete)
    existing_jobfiles = existing_jobfile_qs.all()
    if existing_jobfiles:
        existing_jobfile_qs.delete()
        report_warning(
            "Deleted preexisting JobFile(s) during JobComplete update",
            context={
                "request_payload": payload.dict(),
                "job_files": [model_to_dict(jobfile) for jobfile in existing_jobfiles],
            },
        )

    # Create the JobFiles.
    JobFile.objects.bulk_create(
        [
            JobFile(
                job_complete=job_complete,
                filename=f.filename,
                size_bytes=f.sizeBytes,
                mime_type=f.mimeType,
                line_count=max(f.lineCount, 0),
                file_type=f.fileType,
                creation_time=f.creationTime,
                md5_checksum=f.md5Checksum,
                access_token=f.accessToken,
            )
            for f in payload.files
        ]
    )

    # Send a finished notification email for dataset and custom collection-type jobs.
    if job_type.can_run:
        jobmail.send_dataset_finished(request, job_complete)
    elif job_type.id == KnownArchJobUuids.USER_DEFINED_QUERY:
        jobmail.send_custom_collection_finished(request, job_complete)
    elif job_type.id == KnownArchJobUuids.DATASET_PUBLICATION:
        jobmail.send_dataset_publication_complete(request, job_complete)

    return HTTPStatus.NO_CONTENT, None


# TODO: bulk endpoint for all jobs that can run on a given collection input
@private_api.get("/permission/run_job", response=PermissionResponse)
def user_can_run_job(
    request,
    username: str,
    # job_type_name: str,
    # job_type_version: str,
    # collections: list[str],  # TODO: list[str] makes ninja want a request body
    # estimated_size: int,
):
    """Check if a user can run a given job on a collection.
    Consider:
    - Permissions
    - Quotas
    """
    user = get_object_or_404(User, username=username)
    # job_type = get_object_or_404(JobType, name=job_type_name, version=job_type_version)
    if not user.has_perms([Permissions.ADD_JOBSTART]):
        raise HttpError(403, PermissionResponse(allow=False))
    # collections = get_list_or_404(Collection, name__in=collections)
    # quotas = ArchQuota.fetch_for_user(user)

    # TODO: actually implement some checks
    return PermissionResponse(allow=True)


###############################################################################
# Public API Endpoints
###############################################################################


class CollectionLimitOffsetPagination(LimitOffsetPagination):
    """Custom Collections pagination class to include opted_out_count in response."""

    class Output(LimitOffsetPagination.Output):
        """Extend the default LimitOffsetPagination.Output class with
        opted_out_count.
        """

        items: List[CollectionSchema]
        opted_out_count: Optional[int]

    # pylint: disable-next=arguments-differ
    def paginate_queryset(self, collections_opted_out_count, **params):
        """Paginate the queryset."""
        # The paginator class passes the return value of the endpoint function
        # as the first positional argument, so list_collections() returns a
        # ([<Collection>, ...], opted_out_count) tuple for the unpacking.
        collections, opted_out_count = collections_opted_out_count
        return super().paginate_queryset(collections, **params) | {
            "opted_out_count": opted_out_count
        }


@public_api.get("/collections", response=List[CollectionSchema])
@paginate(CollectionLimitOffsetPagination)
def list_collections(request, filters: CollectionFilterSchema = Query(...)):
    """Retrieve a user's Collections, including in-progress and finished, but
    not cancelled or failed, Custom collections."""
    # pylint: disable=too-many-locals
    user = request.user
    # https://stackoverflow.com/a/65613047
    datasets_count_subquery = Subquery(
        Dataset.user_queryset(user)
        .filter(job_start__collection__id=OuterRef("id"), state=JobEventTypes.FINISHED)
        .order_by()
        .values("job_start__collection__id")
        .annotate(count=Count("id", distinct=True))
        .values("count")
    )

    # Pop any latest_dataset.start_time sort param which we need to handle manually
    # since it's a computed field.
    sort_latest_dataset_dir = None
    querydict = request.GET.copy()
    if querydict.get("sort", "").endswith("latest_dataset.start_time"):
        # Note that QueryDict.pop() returns a list, whereas get() returns only the
        # last of possible multiple values.
        sort_latest_dataset_dir = -1 if querydict.pop("sort")[0][0] == "-" else 1

    queryset = filters.filter(
        # Include opted-out collections so that we can later calculate opted_out_count
        # and apply the appropriate filter based on whether the opted_out=true URL param
        # was specified.
        Collection.user_queryset(user, include_opted_out=True)
        .exclude(
            # Need to do a NULL check first so *__in will work as expected.
            Q(metadata__state__isnull=False)
            & Q(metadata__state__in=(JobEventTypes.CANCELLED, JobEventTypes.FAILED))
        )
        .annotate(dataset_count=Coalesce(datasets_count_subquery, 0))
    )

    # Get the opted-out count and apply the filter.
    # Doing this manually here instead of in CollectionFilterSchema because the latter
    # was a pain given the need for user access.
    user_opt_out_exists_filter = CollectionUserSettings.user_opt_out_exists_filter(user)
    include_opted_out = request.GET.get("opted_out") in ("true", "1")
    if include_opted_out:
        opted_out_count = None
        queryset = queryset.filter(user_opt_out_exists_filter)
    else:
        opted_out_count = queryset.filter(user_opt_out_exists_filter).count()
        queryset = queryset.filter(~user_opt_out_exists_filter)

    collections = list(
        apply_sort_param(querydict.get("sort"), queryset, CollectionSchema)
    )

    # Set latest_dataset.
    ordered_datasets = list(
        Dataset.user_queryset(user, include_opted_out_collections=include_opted_out)
        .prefetch_related("job_start")
        .prefetch_related("job_start__job_type")
        .prefetch_related("job_start__collection")
        .filter(job_start__collection__in=collections, state=JobEventTypes.FINISHED)
        .order_by("-finished_time")
    )
    collection_datasets_map = defaultdict(list)
    for dataset in ordered_datasets:
        collection_datasets_map[dataset.job_start.collection.id].append(dataset)
    for c in collections:
        datasets = collection_datasets_map[c.id]
        c.latest_dataset = None if not datasets else datasets[0]

    # Apply any latest_dataset.start_time sorting. The @paginate decorator operates
    # on the return value, so we're dealing with the full results set here.
    if sort_latest_dataset_dir is not None:
        collections = sorted(
            collections,
            key=lambda c: getattr(c.latest_dataset, "start_time", DATETIME_MIN),
            reverse=sort_latest_dataset_dir == -1,
        )

    # See CollectionLimitOffsetPagination.paginate_queryset() for an explanation
    # as to why we're returning a tuple here.
    return collections, opted_out_count


@public_api.get("/collections/filter_values", response=List[Any])
@paginate
def collections_filter_values(request, field: str):
    """Retrieve the distinct values for a specific Collection field."""
    user = request.user
    if request.GET.get("opted_out") not in ("true", "1"):
        queryset = Collection.user_queryset(user)
    else:
        queryset = Collection.user_queryset(user, include_opted_out=True).filter(
            CollectionUserSettings.user_opt_out_exists_filter(user)
        )
    # Leverage get_model_queryset_filter_values() for simple, non-collection-type fields.
    if field != "collection_type":
        return list(
            get_model_queryset_filter_values(
                queryset,
                field,
                CollectionFilterSchema,
            )
        )
    # Handle collection_type values.
    # Create a value -> displayname map from CollectionTypes.choices
    display_map = dict(CollectionTypes.choices)
    # If Collection.metadata defines a type_displayname, use that by casting to CharField and
    # stripping the surrounding quotes, otherwise use Collection.collection_type, and translate
    # all values through display_map.
    return [
        ((y := x.strip('"')), display_map.get(y, y))
        for x in queryset.values_list(
            Coalesce(
                Cast("metadata__type_displayname", CharField()), "collection_type"
            ),
            flat=True,
        )
    ]


@public_api.get("/collections/{collection_id}/dataset_states", response=dict)
def collection_dataset_states(request, collection_id: int):
    """Retrieve a collection's stats for each dataset type as a dicts in the format:
    {
      "{JobType.id}": [
        [ {dataset_id}, {most_recent_dataset_start_time}, {dataset_state} ],
        [ {dataset_id}, {next_most_recent_dataset_start_time}, {dataset_state} ],
        ...
      ],
      ...
    }
    """
    collection = get_object_or_404(
        Collection.user_queryset(request.user), id=collection_id
    )
    datasets = (
        Dataset.user_queryset(request.user)
        .select_related("job_start")
        .filter(
            job_start__collection_id=collection,
        )
        .order_by("-start_time")
        .all()
    )

    # I tried to use Django to do this grouping but...too....difficult...
    d = defaultdict(list)
    for dataset in datasets:
        d[str(dataset.job_start.job_type_id)].append(
            (dataset.id, dataset.start_time, dataset.state)
        )
    return d


class DatasetLimitOffsetPagination(LimitOffsetPagination):
    """Custom Datasets pagination class to include opted_out_count in response."""

    class Output(LimitOffsetPagination.Output):
        """Extend the default LimitOffsetPagination.Output class with
        opted_out_count.
        """

        items: List[DatasetSchema]
        opted_out_count: Optional[int]

    # pylint: disable-next=arguments-differ
    def paginate_queryset(self, datasets_opted_out_count, **params):
        """Paginate the queryset."""
        # The paginator class passes the return value of the endpoint function
        # as the first positional argument, so list_datasets() returns a
        # ([<Dataset>, ...], opted_out_count) tuple for the unpacking.
        datasets, opted_out_count = datasets_opted_out_count
        return super().paginate_queryset(datasets, **params) | {
            "opted_out_count": opted_out_count
        }


@public_api.get("/datasets", response=List[DatasetSchema])
@paginate(DatasetLimitOffsetPagination)
def list_datasets(request, filters: DatasetFilterSchema = Query(...)):
    """Retrieve the list of Datasets"""
    user = request.user
    queryset = filters.filter(
        # Include opted-out collections so that we can later calculate opted_out_count
        # and apply the appropriate filter based on whether the opted_out=true URL param
        # was specified.
        Dataset.user_queryset(
            user, include_opted_out=True, include_opted_out_collections=True
        )
        .prefetch_related("job_start")
        .prefetch_related("job_start__job_type")
        .prefetch_related("job_start__job_type__category")
        .prefetch_related("job_start__collection")
        .annotate(
            team_ids=ArrayAgg(
                "teams__id",
                distinct=True,
                filter=Q(teams__id__isnull=False),
                default=[],
            )
        )
        .annotate(
            collection_access=Exists(
                Collection.user_queryset(user, include_opted_out=True).filter(
                    id=OuterRef("job_start__collection__id")
                )
            )
        )
    )

    # Get the opted-out count and apply the filter.
    # Doing this manually here instead of in DatasetFilterSchema because the latter
    # was a pain given the need for user access.
    dataset_opt_out_filter = Q(DatasetUserSettings.user_opt_out_exists_filter(user))
    collection_opt_out_filter = Q(
        CollectionUserSettings.user_opt_out_exists_filter(
            user, collection_path="job_start__collection"
        )
    )
    opt_out_filters = dataset_opt_out_filter | collection_opt_out_filter
    if request.GET.get("opted_out") in ("true", "1"):
        opted_out_count = None
        queryset = queryset.filter(opt_out_filters)
    else:
        opted_out_count = queryset.filter(opt_out_filters).count()
        queryset = queryset.exclude(opt_out_filters)

    queryset = queryset.annotate(collection_opted_out=collection_opt_out_filter)

    return (
        apply_sort_param(request.GET.get("sort"), queryset, DatasetSchema),
        opted_out_count,
    )


@public_api.get("/datasets/filter_values", response=List[Any])
@paginate
def datasets_filter_values(request, field: str):
    """Retrieve the distinct values for a specific Dataset field."""
    user = request.user
    if request.GET.get("opted_out") not in ("true", "1"):
        queryset = Dataset.user_queryset(user)
    else:
        queryset = Dataset.user_queryset(
            user, include_opted_out=True, include_opted_out_collections=True
        ).filter(
            Q(DatasetUserSettings.user_opt_out_exists_filter(user))
            | Q(
                CollectionUserSettings.user_opt_out_exists_filter(
                    user, collection_path="job_start__collection"
                )
            )
        )
    return get_model_queryset_filter_values(
        queryset,
        field,
        DatasetFilterSchema,
    )


# Specify int:dataset_id to prevent collision with datasets/generate
@public_api.get("/datasets/{int:dataset_id}", response=DatasetSchema)
def get_dataset(request, dataset_id: int):
    """Retrieve a specific Dataset"""
    user = request.user
    return get_object_or_404(
        # Allow direct access to opted-out datasets.
        Dataset.user_queryset(
            user, include_opted_out=True, include_opted_out_collections=True
        )
        .prefetch_related("job_start")
        .prefetch_related("job_start__job_type")
        .prefetch_related("job_start__job_type__category")
        .prefetch_related("job_start__collection")
        .annotate(
            team_ids=ArrayAgg(
                "teams__id",
                distinct=True,
                filter=Q(teams__id__isnull=False),
                default=[],
            )
        )
        .annotate(
            collection_access=Exists(
                Collection.user_queryset(user).filter(
                    id=OuterRef("job_start__collection__id")
                )
            )
        )
        .annotate(
            collection_opted_out=Q(
                CollectionUserSettings.user_opt_out_exists_filter(
                    user, collection_path="job_start__collection"
                )
            )
        ),
        id=dataset_id,
    )


# Specify int:dataset_id to prevent collision with datasets/generate
@public_api.post(
    "/datasets/{int:dataset_id}/teams",
    response={HTTPStatus.NO_CONTENT: None},
)
def update_dataset_teams(request, dataset_id: int, payload: List[MinimalTeamSchema]):
    """Retrieve a specific Dataset"""
    # We're not returning the Dataset object here, so no need to use get_dataset()
    # to ensure that it conforms to DatasetSchema.
    dataset = get_object_or_404(
        Dataset.user_queryset(request.user, include_opted_out=True), id=dataset_id
    )
    # Enforce permissions.
    if not request.user.has_perm(Permissions.CHANGE_DATASET_TEAMS, dataset):
        raise PermissionDenied
    # Check that the user is a member of all the specified teams.
    team_ids = set(t.id for t in payload)
    bad_teams = team_ids - set(request.user.teams.values_list("id", flat=True))
    if bad_teams:
        raise HttpError(400, f"Invalid team ID(s): {list(bad_teams)}")
    # Do the update.
    dataset.teams.set(Team.objects.filter(id__in=team_ids))
    return HTTPStatus.NO_CONTENT, None


@public_api.get("/job-categories", response=List[JobCategorySchema])
@paginate
def list_job_categories(request):
    """Retrieve all JobCategory instances."""
    return JobCategory.objects.all()


@public_api.get("/available-jobs", response=List[AvailableJobsCategory])
def list_available_jobs(request, collection_id: Optional[int] = None):
    """Return the available, user-runnable JobTypes as an object matching
    the response from the ARCH /api/available-jobs endpoint."""

    def cat_img_url(job_cat):
        return static(f"/img/category/{job_cat.name.lower().replace(' ', '-')}.svg")

    # If a collection ID was not specified, return all user-runnable JobTypes, otherwise
    # filter by collection-specific JobTypes.
    if collection_id is None:
        job_types_qs = JobType.get_user_runnable()
    else:
        job_types_qs = (
            Collection.user_queryset(request.user)
            .get(id=collection_id)
            .user_runnable_job_types
        )

    # Prefetch categories.
    job_types_qs = job_types_qs.prefetch_related("category")

    # Group by category.
    job_category_job_types_map = defaultdict(list)
    for job_type in job_types_qs:
        job_category_job_types_map[job_type.category].append(job_type)
    return [
        {
            "categoryName": job_cat.name,
            "categoryDescription": job_cat.description,
            "categoryImage": cat_img_url(job_cat),
            "categoryId": job_cat.id,
            "jobs": [
                {
                    "id": str(job.id),
                    "name": job.name,
                    "description": job.description,
                    "info_url": job.info_url,
                    "code_url": job.code_url,
                    "parameters_schema": job.parameters_schema,
                }
                for job in job_types
            ],
        }
        for job_cat, job_types in job_category_job_types_map.items()
    ]


@public_api.get("/users", response=List[UserSchema])
@paginate
@require_permission("LIST_ACCOUNT_USERS")
def list_account_users(request, filters: UserFilterSchema = Query(...)):
    """Return the users that are members of the requesting ADMIN-type user's
    account."""
    user = request.user
    # While we infer the account ID from the requesting user itself and not from any
    # account_id query param, if such a param was specified, ensure that it matches
    # the requesting user's account ID.
    try:
        if int(request.GET.get("account_id")) != user.account_id:
            raise PermissionDenied
    except (TypeError, ValueError):
        pass
    queryset = filters.filter(
        User.objects.filter(account=user.account).prefetch_related("teams")
    )
    return apply_sort_param(request.GET.get("sort"), queryset, UserSchema)


@public_api.get("/users/filter_values", response=List[Any])
@paginate
@require_permission("LIST_ACCOUNT_USERS")
def users_filter_values(request, field: str):
    """Retrieve the distinct values for a specific User field."""
    return get_model_queryset_filter_values(
        User.objects.filter(account=request.user.account),
        field,
        UserFilterSchema,
    )


@public_api.get("/users/{user_id}", response=UserSchema)
def get_user(request, user_id: int):
    """Return a single User."""
    req_user = request.user
    target_user = User.objects.get(id=user_id)
    # Enforce permissions.
    if not req_user.has_perm(Permissions.VIEW_USER, target_user):
        raise PermissionDenied
    return target_user


@public_api.put("/users", response={HTTPStatus.CREATED: UserSchema})
@require_permission("ADD_ACCOUNT_USER")
@transaction.atomic
def create_user(request, payload: CreateUserSchema, send_welcome: bool):
    """Create a new User."""
    # Deny if the requesting and target user accounts are not the same.
    payload_d = payload.dict()
    teams = payload_d.pop("teams", ())
    # Instantiate a User for permissions testing.
    new_user = User(**payload_d)
    # Enforce permissions.
    if not request.user.has_perm(Permissions.ADD_USER, new_user):
        raise PermissionDenied
    # Create the user.
    new_user.save()
    # Handle "teams".
    new_user.teams.set(Team.objects.filter(id__in={t["id"] for t in teams}))
    # Maybe send welcome email.
    if send_welcome:
        send_email(
            "new_user_welcome_email",
            context={
                "user": new_user,
                "base_url": PUBLIC_BASE_URL,
                "uid": django.utils.http.urlsafe_base64_encode(
                    django.utils.encoding.force_bytes(new_user.id)
                ),
                "token": PasswordResetTokenGenerator().make_token(new_user),
                "arch_support_ticket_url": ARCH_SUPPORT_TICKET_URL,
            },
            subject="Welcome to ARCH!",
            to_addresses=(new_user.email,),
        )
    return HTTPStatus.CREATED, new_user


@public_api.patch("/collections/{int:collection_id}", response=CollectionSchema)
def update_collection(request, payload: UpdateCollectionSchema, collection_id: int):
    """Update an existing Collection."""
    req_user = request.user
    collection = Collection.objects.get(id=collection_id)
    payload_d = payload.dict(exclude_none=True)
    # Pop any specified user_settings for separate handling.
    user_settings = payload_d.pop("user_settings", None)
    if user_settings:
        # User only needs VIEW perms to modify user settings.
        if not req_user.has_perm(Permissions.VIEW_COLLECTION, collection):
            raise PermissionDenied
        CollectionUserSettings.objects.update_or_create(
            collection=collection,
            user=req_user,
            defaults=user_settings,
        )
    # Return if no collection instance attributes are to be updated.
    if not payload_d:
        return collection
    # Enforce collection change permissions.
    if not req_user.has_perm(Permissions.CHANGE_COLLECTION, collection):
        raise PermissionDenied
    # Update instance fields.
    for k, v in payload_d.items():
        setattr(collection, k, v)
    collection.save()

    return collection


@public_api.patch("/datasets/{int:dataset_id}", response=DatasetSchema)
def update_dataset(request, payload: UpdateDatasetSchema, dataset_id: int):
    """Update an existing Dataset."""
    req_user = request.user
    # Leverage get_dataset() to ensure that the instance object that we
    # return conforms to DatasetSchema (i.e. includes collection_access, and team_ids)
    dataset = get_dataset(request, dataset_id)
    payload_d = payload.dict(exclude_none=True)
    # Pop any specified user_settings for separate handling.
    user_settings = payload_d.pop("user_settings", None)
    if user_settings:
        # User only needs VIEW perms to modify user settings.
        if not req_user.has_perm(Permissions.VIEW_DATASET, dataset):
            raise PermissionDenied
        DatasetUserSettings.objects.update_or_create(
            dataset=dataset,
            user=req_user,
            defaults=user_settings,
        )
    # Only updates to user_settings are currently supported.
    if payload_d:
        raise HttpError(400, f"Can not update Dataset fields: {payload_d}")
    return dataset


@public_api.patch("/users/{user_id}", response=UserSchema)
def update_user(request, payload: UpdateUserSchema, user_id: int):
    """Update an existing User."""
    req_user = request.user
    target_user = User.objects.get(id=user_id)
    # Enforce permissions.
    if not req_user.has_perm(Permissions.CHANGE_USER, target_user):
        raise PermissionDenied
    updated = False
    for k, v in payload.dict(exclude_none=True).items():
        # Ignore unmodified fields.
        if getattr(target_user, k) == v:
            continue
        # A user is not allowed to modify their own role.
        if k == "role" and target_user == req_user:
            raise PermissionDenied("self role modification not allowed")
        # A user is not allowed to modify their own is_active.
        if k == "is_active" and target_user == req_user:
            raise PermissionDenied("self is_active modification not allowed")
        # Handle "teams".
        if k == "teams":
            team_ids = {x["id"] for x in v}
            if team_ids != set(target_user.teams.values_list("id", flat=True)):
                if req_user.has_perm(Permissions.ADMIN_ACCOUNT, target_user.account):
                    target_user.teams.set(Team.objects.filter(id__in=team_ids))
                else:
                    raise PermissionDenied("only account admins can update user teams")
        else:
            setattr(target_user, k, v)
            updated = True
    if updated:
        target_user.save()

    return target_user


@public_api.get("/teams", response=List[TeamSchema])
@paginate
def list_teams(request, filters: TeamFilterSchema = Query(...)):
    """Return all account teams if user has permission to do so, otherwise
    return only the teams of which the user is a member."""
    user = request.user
    filter_kwargs = {
        "account_id": user.account_id,
    }
    if not user.has_perm(Permissions.LIST_ACCOUNT_TEAMS):
        filter_kwargs["members"] = user
    queryset = filters.filter(
        Team.objects.filter(**filter_kwargs).prefetch_related(
            # Sort members by username ascending.
            Prefetch("members", queryset=User.objects.order_by("username"))
        )
    ).distinct()

    return apply_sort_param(request.GET.get("sort"), queryset, TeamSchema)


@public_api.put("/teams", response={HTTPStatus.CREATED: TeamSchema})
@require_permission("ADD_ACCOUNT_TEAM")
def create_team(request, payload: CreateTeamSchema):
    """Create a new Team."""
    # Instantiate a Team for permissions testing.
    new_team = Team(**payload.dict())
    # Enforce permissions.
    if not request.user.has_perm(Permissions.ADD_TEAM, new_team):
        raise PermissionDenied
    # Create the team.
    new_team.save()
    return HTTPStatus.CREATED, new_team


@public_api.patch("/teams/{team_id}", response=TeamSchema)
@require_permission("CHANGE_ACCOUNT_TEAM")
def update_team(request, payload: UpdateTeamSchema, team_id: int):
    """Update an existing Team."""
    req_user = request.user
    team = Team.objects.get(id=team_id)
    # Enforce permissions.
    if not req_user.has_perm(Permissions.CHANGE_TEAM, team):
        raise PermissionDenied
    payload_d = payload.dict()
    # Handle 'name'.
    name = payload_d.get("name")
    if name and name != team.name:
        team.name = payload.name
        team.save()
    # Handle 'members'.
    members = payload_d.get("members")
    if members is not None:
        member_ids = {x["id"] for x in members}
        if member_ids != set(team.members.values_list("id", flat=True)):
            team.members.set(User.objects.filter(id__in=member_ids))
    return team


###############################################################################
# Public API -> ARCH Proxy Endpoints
###############################################################################


@public_api.post("/collections/custom", response=JobStateInfo)
@require_permission("CREATE_CUSTOM_COLLECTION")
def generate_sub_collection(request, payload: SubCollectionCreationRequest):
    """Generate a sub collection"""
    user = request.user
    # Pop data.sources, which will either be a string (for a single selection)
    # or an string[] (for multiple selections).
    job_params = {k: v for k, v in dict(payload).items() if v is not None}
    sources = job_params.pop("sources")

    collections = list(Collection.user_queryset(user).filter(id__in=sources))
    if len(collections) != len(sources):
        raise HttpError(400, "Invalid collection ID(s)")

    # Handle single vs. multiple source collection cases.
    input_spec = (
        collections[0].input_spec
        if (len(collections) == 1)
        else MultiInputSpec(specs=[c.input_spec for c in collections])
    )

    return ArchAPI.create_sub_collection(user, input_spec.dict(), job_params)


@public_api.post("/datasets/generate", response=JobStateInfo)
@require_permission("GENERATE_DATASET")
def generate_dataset(request, payload: DatasetGenerationRequest):
    """Generate a dataset"""
    user = request.user
    collection = get_object_or_404(
        Collection.user_queryset(user), id=payload.collection_id
    )
    job_type = get_object_or_404(JobType, id=payload.job_type_id)

    # Deny a request to generate a dataset from an empty collection.
    if collection.size_bytes == 0:
        raise HttpError(400, "Can not generate a dataset from an empty collection")

    # Extend the input_spec with a "size" field that ARCH will pass back as
    # input_bytes in the call to register_job_start, which can serve as a snapshot of the
    # input collection size at the time of job run. ARCH expects this value to be of type
    # signed long, so we'll use -1 to indicate None.
    input_spec = collection.input_spec.dict() | {
        "size": -1 if collection.size_bytes is None else collection.size_bytes
    }

    return ArchAPI.generate_dataset(
        user,
        input_spec,
        str(job_type.id),  # Cast UUID to serializable
        payload.params,
    )


@public_api.post(
    "/datasets/{dataset_id}/cancel", response={HTTPStatus.NO_CONTENT: None}
)
def cancel_dataset(request, dataset_id: int):
    """Cancel an active Dataset job"""
    dataset = get_object_or_404(Dataset.user_queryset(request.user), id=dataset_id)
    # Allow any authorized publishers to unpublish.
    if not request.user.has_perm(Permissions.CANCEL_DATASET, dataset):
        raise PermissionDenied
    ArchAPI.cancel_job(request.user, dataset.job_start.id)
    return HTTPStatus.NO_CONTENT, None


@public_api.get("/datasets/{dataset_id}/publication", response=DatasetPublicationInfo)
def dataset_published_status(request, dataset_id: int):
    """Retrieve publication info for the specified Dataset"""
    dataset = get_object_or_404(
        Dataset.user_queryset(request.user, include_opted_out=True), id=dataset_id
    )
    # Request on behalf of the Dataset owner in the event of teammate access.
    try:
        return ArchAPI.get_dataset_publication_info(
            dataset.job_start.user, dataset.job_start.id
        )
    except Http404:
        # If ARCH reported no available publication data but we know that there's an
        # in-progress publication job, report that instead.
        job_start = (
            JobStart.objects.filter(
                parameters__conf__inputSpec__uuid=str(dataset.job_start_id)
            )
            .order_by("-created_at")
            .first()
        )
        # If no active publication job exists, raise the Http404.
        if not job_start:
            raise
        job_state, start_time, _ = job_start.get_job_status()
        if job_state is None or JobEventTypes.is_terminal(job_state):
            raise
        # Return a synthetic DatasetPublicationInfo object with complete=False.
        return {
            "item": "",
            "inputId": "",
            "job": dataset.job_start.job_type.name,
            "complete": False,
            "sample": dataset.job_start.sample,
            "time": start_time.isoformat(),
            "ark": "",
        }


@public_api.post("/datasets/{dataset_id}/publication", response=JobStateInfo)
def publish_dataset(request, dataset_id: int, metadata: DatasetPublicationMetadata):
    """Publish a dataset"""
    dataset = get_object_or_404(
        Dataset.user_queryset(request.user, include_opted_out=True), id=dataset_id
    )
    # Enforce permissions.
    if not request.user.has_perm(Permissions.PUBLISH_DATASET, dataset):
        raise PermissionDenied
    return ArchAPI.publish_dataset(
        request.user,
        {"type": "dataset", "uuid": str(dataset.job_start.id)},
        metadata=metadata.dict(
            exclude_none=True
        ),  # Cast DatasetPublicationMetadata to serializable
    )


@public_api.get(
    "/datasets/{dataset_id}/publication/metadata",
    response=DatasetPublicationMetadata,
    exclude_none=True,
)
def get_published_item_metadata(request, dataset_id: int):
    """Retrieve published petabox item metadata for the specified Dataset"""
    dataset = get_object_or_404(
        Dataset.user_queryset(request.user, include_opted_out=True), id=dataset_id
    )
    # Request on behalf of the Dataset owner in the event of teammate access.
    return ArchAPI.get_published_item_metadata(
        dataset.job_start.user, dataset.job_start.id
    )


@public_api.post(
    "/datasets/{dataset_id}/publication/metadata",
    response={HTTPStatus.NO_CONTENT: None},
)
def update_published_item_metadata(
    request, dataset_id: int, metadata: DatasetPublicationMetadata
):
    """Update the metadata of a published Dataset petabox item"""
    dataset = get_object_or_404(
        Dataset.user_queryset(request.user, include_opted_out=True), id=dataset_id
    )
    # Allow any authorized publishers to edit the metadata.
    if not request.user.has_perm(Permissions.PUBLISH_DATASET, dataset):
        raise PermissionDenied
    ArchAPI.update_published_item_metadata(
        request.user, dataset.job_start.id, metadata.dict(exclude_none=True)
    )
    return HTTPStatus.NO_CONTENT, None


@public_api.delete(
    "/datasets/{dataset_id}/publication", response={HTTPStatus.ACCEPTED: None}
)
def delete_published_item(request, dataset_id: int):
    """Delete (i.e hide) a published Dataset"""
    dataset = get_object_or_404(
        Dataset.user_queryset(request.user, include_opted_out=True), id=dataset_id
    )
    # Allow any authorized publishers to unpublish.
    if not request.user.has_perm(Permissions.PUBLISH_DATASET, dataset):
        raise PermissionDenied
    ArchAPI.delete_published_item(request.user, dataset.job_start.id)
    return HTTPStatus.ACCEPTED, None


@public_api.get("/datasets/{dataset_id}/sample_viz_data", response=DatasetSampleVizData)
def get_sample_viz_data(request, dataset_id: int):
    """Get the sample visualization data for the specific dataset."""
    dataset = get_object_or_404(
        Dataset.user_queryset(request.user, include_opted_out=True), id=dataset_id
    )
    # Request on behalf of the Dataset owner in the event of teammate access.
    return ArchAPI.get_dataset_sample_viz_data(
        dataset.job_start.user, dataset.job_start.id
    )


###############################################################################
# WASAPI Endpoints
###############################################################################


@wasapi_api.get(
    "/jobs/{dataset_id}/result",
    url_name="file_listing",
    response={HTTPStatus.OK: WasapiResponse, HTTPStatus.SERVICE_UNAVAILABLE: str},
)
def get_file_listing(request, dataset_id: PositiveInt, page: PositiveInt = 1):
    """Proxy as WASAPI datase file listing response from ARCH."""
    dataset = get_object_or_404(
        Dataset.user_queryset(request.user, include_opted_out=True), id=dataset_id
    )
    # Request on behalf of the Dataset owner in the event of teammate access.
    res = ArchAPI.list_wasapi_files(
        dataset.job_start.user,
        dataset.job_start.id,
        page,
    )
    # A response of { lazy: true } indicates that ARCH isn't yet done caching the
    # list of output files, so respond with an informative 503 - Service Unavailable.
    if res.get("lazy") is True:
        return HttpResponse(
            "This file list is in the process of being generated; please try again later.",
            status=HTTPStatus.SERVICE_UNAVAILABLE,
        )
    # Rewrite next/previous URLs to Keystone-specific values.
    base_pagination_url = ctx_helpers(request)["abs_url"](
        "wasapi:file_listing", args=[dataset_id]
    )
    if res.get("next"):
        res["next"] = f"{base_pagination_url}?page={page + 1}"
    if res.get("previous"):
        res["previous"] = f"{base_pagination_url}?page={page - 1}"
    # Rewrite the file location URLs to Keystone-specific values.
    base_download_url = ctx_helpers(request)["abs_url"](
        "dataset-file-download", args=[dataset.id, "dummy"]
    ).rsplit("/", 1)[0]
    for i, file_dict in enumerate(res["files"]):
        res["files"][i]["locations"] = [f"{base_download_url}/{file_dict['filename']}"]
    return res
