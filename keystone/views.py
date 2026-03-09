import functools
from datetime import datetime

from django.contrib import messages
from django.contrib.auth.decorators import login_required
from django.contrib.auth.models import AnonymousUser
from django.db.models import Exists, OuterRef
from django.forms import model_to_dict
from django.http import (
    HttpResponseBadRequest,
    HttpResponseForbidden,
    JsonResponse,
)
from django.shortcuts import (
    get_object_or_404,
    redirect,
    render,
)

from config import settings
from .arch_api import ArchAPI
from .context_processors import helpers as ctx_helpers
from .forms import CSVUploadForm
from .helpers import identity, parse_csv, parse_solr_facet_data
from .models import (
    Collection,
    CollectionTypes,
    Dataset,
    JobFile,
    JobStart,
    User,
)
from .permissions import Permissions
from .schemas import (
    MULTI_INPUT_SPEC_TYPE,
    EmbeddedCollectionUserSettingsSchema,
    EmbeddedDatasetUserSettingsSchema,
)
from .validators import validate_collection_metadata
from .solr import SolrClient


###############################################################################
# Globals
###############################################################################


CUSTOM_COLLECTION_PARAM_KEY_LABEL_FORMATTER_TUPLES = (
    ("surtPrefixesOR", "SURT Prefix(es)", identity),
    (
        "timestampFrom",
        "Crawl Date (start)",
        lambda x: f"on or after {format_custom_collection_crawl_date(x)}",
    ),
    (
        "timestampTo",
        "Crawl Date (end)",
        lambda x: f"on or before {format_custom_collection_crawl_date(x)}",
    ),
    ("statusPrefixesOR", "HTTP Status(es)", identity),
    ("mimesOR", "MIME Type(s)", identity),
)


###############################################################################
# Helpers
###############################################################################


def request_user_is_staff_or_superuser(request):
    """Return True if user is staff or a superuser"""

    user = request.user
    return user.is_authenticated and (user.is_staff or user.is_superuser)


def request_user_is_active_admin(request):
    """Return True if user is an active admin"""

    user = request.user
    return user.is_authenticated and user.is_active_admin


def request_user_has_perm(perm_name):
    """Return a function that will return True if the request user has the
    specified permission.
    """

    def f(request):
        return request.user.has_perm(getattr(Permissions, perm_name))

    return f


def format_custom_collection_crawl_date(s):
    """Parse a custom collection crawl date string."""

    return datetime.strftime(datetime.strptime(s, "%Y%m%d%H%M%S00"), "%h %d, %Y")


def get_custom_collection_configuration_info(collection):
    """Return a configuration info dict comprising the custom collections's
    input collections and configuration parameters."""
    # Lookup the custom collection job configuration.
    try:
        custom_conf = collection.jobstart_set.get(
            job_type__id=settings.KnownArchJobUuids.USER_DEFINED_QUERY
        ).parameters["conf"]
    except JobStart.DoesNotExist:
        # If for some reason there's no associated JobStart, return
        # input_collections=None which will will cause an error message
        # to be displayed on the frontend.
        return {
            "input_collections": None,
            "param_label_value_pairs": (),
        }
    # Create the list of input collections.
    input_spec = custom_conf["inputSpec"]
    try:
        input_collections = (
            [Collection.get_for_input_spec(x) for x in input_spec["specs"]]
            if input_spec["type"] == MULTI_INPUT_SPEC_TYPE
            else [Collection.get_for_input_spec(input_spec)]
        )
    except Collection.DoesNotExist:
        # If for some reason an input_spec can't be resolved to a collection,
        # set input_collections=None which will cause an error message to be
        # displayed on the frontend.
        input_collections = None
    # Create the list of param label/value pairs.
    custom_params = custom_conf["params"]
    custom_param_pairs = []
    for (
        param_key,
        param_label,
        param_formatter,
    ) in CUSTOM_COLLECTION_PARAM_KEY_LABEL_FORMATTER_TUPLES:
        if param_key not in custom_params:
            continue
        custom_param_pairs.append(
            (param_label, param_formatter(custom_params[param_key]))
        )
    return {
        "input_collections": input_collections,
        "param_label_value_pairs": custom_param_pairs,
    }


def get_special_collection_configuration_info(collection):
    """Return a configuration info dict comprising the special collections's
    configuration parameters, or None if no such configuration exists."""
    if not collection.metadata:
        return None
    input_spec = validate_collection_metadata(
        collection.metadata, collection
    ).input_spec
    if not input_spec:
        return None
    if not hasattr(input_spec, "get_collection_configuration_pairs"):
        return None
    pairs = input_spec.get_collection_configuration_pairs()
    return None if not pairs else {"param_label_value_pairs": pairs}


###############################################################################
# Decorators
###############################################################################


def user_passes_test(test_fn):
    """Variation of django.contrib.auth.decorators.user_passes_test() that
    returns a 403 instead of redirecting to the login page.
    """

    def decorator(view_func):
        """View function decorator to return a 403 if the requesting user is not
        staff or a superuser.
        """

        @functools.wraps(view_func)
        def wrapper(request, *args, **kwargs):
            if not test_fn(request):
                return HttpResponseForbidden()
            return view_func(request, *args, **kwargs)

        return wrapper

    return decorator


require_staff_or_superuser = user_passes_test(request_user_is_staff_or_superuser)


def require_permission(perm_name):
    """Decorator to forbid request if doesn't possess the specified permission.
    We pass the permission name instead of a reference to the Permissions object
    attribute because the latter requires that the database connection be established
    which may not yet true at module load time.
    """
    return user_passes_test(request_user_has_perm(perm_name))


###############################################################################
# Authenticated Staff and Superuser Views
###############################################################################


@require_staff_or_superuser
def bulk_add_users(request):
    """Create User records from csv data"""

    if request.method == "POST":
        form = CSVUploadForm(request.POST, request.FILES)
        if form.is_valid():
            user_data_dict_list = parse_csv(request.FILES["csv_file"])
            error_message = User.create_users_from_data_dict_list(user_data_dict_list)
            if error_message:
                messages.error(request, error_message)
                return render(
                    request, "keystone/bulk_add_users.html", {"form": CSVUploadForm()}
                )

            messages.success(request, "CSV file uploaded and processed successfully.")

    return render(request, "keystone/bulk_add_users.html", {"form": CSVUploadForm()})


@require_staff_or_superuser
def collection_surveyor(request):
    """render collection surveyor"""
    return render(request, "keystone/collection_surveyor.html")


@require_staff_or_superuser
def collection_surveyor_search(request):
    """search ait collections using search term or facet"""
    filter_query = ["type:Collection", "publiclyVisible:true"]

    search_query = request.GET.get("q", "")
    search_query = "*:*" if search_query == "" else search_query

    row_count = request.GET.get("r")

    try:
        row_count = int(row_count)
    except ValueError:
        return HttpResponseBadRequest(f"invalid value for r: {row_count}")

    solr_url = "http://wbgrp-svc515.us.archive.org:8983/solr"
    core_name = "ait"  # Replace with your Solr core or collection name

    # Initialize the Solr client
    solr_client = SolrClient(solr_url, core_name)

    # Perform a search query with facets
    result = solr_client.search(
        query=search_query,
        rows=row_count,
        fq=filter_query,
        facet_fields=["f_organizationName", "f_organizationType"],
    )

    # parse data for each facet field into list of dictionaries
    parsed_facets = parse_solr_facet_data(result["facet_counts"]["facet_fields"])

    return JsonResponse(
        {
            "collections": result["response"]["docs"],
            "facets": parsed_facets,
        }
    )


@require_staff_or_superuser
def get_arch_job_logs(request, log_type):
    """Return an ARCH job log response."""
    valid_log_types = ("jobs", "running", "failed")
    if log_type not in valid_log_types:
        return HttpResponseBadRequest(
            f"Unsupported log_type: {log_type}. Please specify one of: {valid_log_types}"
        )
    user = User.objects.get(username=settings.ARCH_SYSTEM_USER)
    return ArchAPI.proxy_admin_logs_request(user, log_type)


###############################################################################
# Authenticated Admin Views
###############################################################################


@require_permission("LIST_ACCOUNT_USERS")
def account(request):
    """Redirect to account-users view."""
    return redirect("account-users")


@require_permission("LIST_ACCOUNT_USERS")
def account_users(request):
    """Account users admin"""
    return render(
        request, "keystone/account-users.html", context={"user": request.user}
    )


@require_permission("LIST_ACCOUNT_TEAMS")
def account_teams(request):
    """Account teams admin"""
    return render(
        request, "keystone/account-teams.html", context={"user": request.user}
    )


###############################################################################
# Authenticated Normal User Views
###############################################################################


@login_required
def dashboard(request):
    """Dashboard"""
    user = request.user
    return render(
        request,
        "keystone/dashboard.html",
        context={
            "can_create_custom_collection": user.has_perm(
                Permissions.CREATE_CUSTOM_COLLECTION
            ),
            "can_generate_dataset": user.has_perm(Permissions.GENERATE_DATASET),
        },
    )


@login_required
def collections(request):
    """Collections table"""
    user = request.user
    return render(
        request,
        "keystone/collections.html",
        context={
            "can_create_custom_collection": user.has_perm(
                Permissions.CREATE_CUSTOM_COLLECTION
            ),
            "can_generate_dataset": user.has_perm(Permissions.GENERATE_DATASET),
        },
    )


@login_required
def hidden_collections(request):
    """Hidden Collections table"""
    return render(request, "keystone/hidden_collections.html")


@login_required
@require_permission("CREATE_CUSTOM_COLLECTION")
def sub_collection_builder(request):
    """Sub-Collection Builder"""
    return render(request, "keystone/sub-collection-builder.html")


@login_required
def collection_detail(request, collection_id):
    """Collection detail view"""
    user = request.user
    collection = get_object_or_404(
        Collection.user_queryset(user, include_opted_out=True), id=collection_id
    )
    # Ensure that the collection's metadata is up-to-date.
    collection.refresh_metadata()
    # Get the validated metadata object and any custom icons template name.
    validated_metadata = validate_collection_metadata(collection.metadata, collection)
    custom_metadata_icons_template = getattr(
        validated_metadata, "custom_metadata_icons_template_name", None
    )
    if collection.collection_type == CollectionTypes.CUSTOM:
        configuration_info = get_custom_collection_configuration_info(collection)
    elif collection.collection_type == CollectionTypes.SPECIAL:
        configuration_info = get_special_collection_configuration_info(collection)
    else:
        configuration_info = None
    # Get any defined user settings instance or None and validate it using
    # EmbeddedCollectionUserSettingsSchema to get a minimal (in the case
    # of an existing instance) or default (in the case of no existing instance) object.
    user_settings = EmbeddedCollectionUserSettingsSchema.validate(
        collection.usersettings_set.first()
    ).dict()
    return render(
        request,
        "keystone/collection-detail.html",
        context={
            "can_generate_dataset": user.has_perm(
                Permissions.GENERATE_DATASET, collection
            ),
            "collection": collection,
            "configuration_info": configuration_info,
            "custom_metadata_icons_template": custom_metadata_icons_template,
            "user_settings": user_settings,
            "Permissions": Permissions,
        },
    )


@login_required
def datasets(request):
    """Redirect to datasets-explore view."""
    return redirect("datasets-explore")


@login_required
def datasets_explore(request):
    """Datasets explorer table"""
    return render(
        request,
        "keystone/datasets-explore.html",
        context={
            "can_generate_dataset": request.user.has_perm(Permissions.GENERATE_DATASET),
        },
    )


@login_required
@require_permission("GENERATE_DATASET")
def datasets_generate(request):
    """Dataset generation form"""
    return render(request, "keystone/datasets-generate.html")


@login_required
def hidden_datasets(request):
    """Hidden Datasets table"""
    return render(request, "keystone/hidden_datasets.html")


@login_required
def dataset_detail(request, dataset_id):
    """Dataset detail page"""
    user = request.user
    dataset = get_object_or_404(
        Dataset.user_queryset(
            user, include_opted_out=True, include_opted_out_collections=True
        )
        .select_related("job_start")
        .select_related("job_start__job_type")
        .select_related("job_start__user")
        .select_related("job_start__jobcomplete")
        .annotate(
            collection_access=Exists(
                Collection.user_queryset(user).filter(
                    id=OuterRef("job_start__collection__id")
                )
            )
        ),
        id=dataset_id,
    )
    template_filename = settings.JOB_TYPE_UUID_NON_AUT_TEMPLATE_FILENAME_MAP.get(
        dataset.job_start.job_type.id, "aut-dataset.html"
    )
    files = dataset.job_start.jobcomplete.jobfile_set.all()
    # Get any defined user settings instance or None and validate it using
    # EmbeddedDatasetUserSettingsSchema to get a minimal (in the case
    # of an existing instance) or default (in the case of no existing instance) object.
    user_settings = EmbeddedDatasetUserSettingsSchema.validate(
        dataset.usersettings_set.first()
    ).dict()
    return render(
        request,
        f"keystone/{template_filename}",
        context={
            "dataset": dataset,
            "is_owner": user == dataset.job_start.user,
            "user_teams": [model_to_dict(x) for x in user.teams.all()],
            "dataset_teams": [model_to_dict(x) for x in dataset.teams.all()],
            "files": files,
            "show_single_file_preview": len(files) == 1 and files[0].line_count > 0,
            "user_settings": user_settings,
            "omit_publishing": settings.PUBLISHING_DISABLED,
            "disable_publishing": not user.has_perm(
                Permissions.PUBLISH_DATASET, dataset
            ),
            "output_is_cdx": dataset.job_start.job_type_id
            == settings.KnownArchJobUuids.CDX_DATASET,
        },
    )


@login_required
def dataset_file_preview(request, dataset_id, filename):
    """Download a Dataset file preview."""
    dataset = get_object_or_404(
        Dataset.user_queryset(request.user, include_opted_out=True), id=dataset_id
    )
    # Request on behalf of the Dataset owner in the event of teammate access.
    return ArchAPI.proxy_file_preview_download(
        user=dataset.job_start.user,
        job_run_uuid=dataset.job_start.id,
        filename=filename,
        download_filename=dataset.get_download_filename(filename, preview=True),
    )


@login_required
def dataset_file_colab(request, dataset_id, filename):
    """Open a Dataset file in Google Colab."""
    user = request.user
    dataset = get_object_or_404(
        Dataset.user_queryset(user, include_opted_out=True), id=dataset_id
    )
    job_file = get_object_or_404(
        JobFile, job_complete__job_start=dataset.job_start, filename=filename
    )
    if job_file.size_bytes > settings.COLAB_MAX_FILE_SIZE_BYTES:
        return HttpResponseBadRequest(
            f"File size ({job_file.size_bytes}) exceeds max supported "
            f"Google Colab size ({settings.COLAB_MAX_FILE_SIZE_BYTES})"
        )
    # Request on behalf of the Dataset owner in the event of teammate access.
    return ArchAPI.proxy_colab_redirect(
        dataset.job_start.user,
        dataset.job_start.id,
        filename,
        job_file.access_token,
        ctx_helpers(request)["abs_url"](
            "dataset-file-download", args=[dataset.id, filename]
        )
        + f"?access={job_file.access_token}",
    )


###############################################################################
# Multi-Authentication Option Views
###############################################################################


def dataset_file_download(request, dataset_id, filename):
    """Download a Dataset file."""
    access_token = request.GET.get("access")
    if access_token is not None:
        # Do an anonymous, access_key-based download request.
        user = AnonymousUser()
        dataset = get_object_or_404(Dataset, id=dataset_id)
    elif request.user.is_anonymous:
        # Deny anonymous requests that don't specify an access key.
        return HttpResponseForbidden()
    else:
        # Do a non-access_key-based / potentially-logged-in-user download request.
        # Lookup the Dataset using request.user.
        dataset = get_object_or_404(
            Dataset.user_queryset(request.user, include_opted_out=True), id=dataset_id
        )
        # Ensure view/download permissions.
        if not request.user.has_perm(Permissions.VIEW_DATASET, dataset):
            return HttpResponseForbidden()
        # Request on behalf of the Dataset owner in the event of teammate access.
        user = dataset.job_start.user

    return ArchAPI.proxy_file_download(
        user=user,
        job_run_uuid=dataset.job_start.id,
        filename=filename,
        download_filename=dataset.get_download_filename(filename),
        access_token=access_token,
    )
