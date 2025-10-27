from django.core.mail import EmailMultiAlternatives
from django.template.loader import get_template

from config import settings

from keystone.context_processors import (
    extra_builtins,
    helpers,
)
from keystone.models import JobStart


def send(template_base_name, context, subject, to_addresses):
    """Send a templated email."""
    # Extend the template context with our extra builtins.
    final_context = context | extra_builtins(request=None)
    txt_content = get_template(f"email/{template_base_name}.txt").render(final_context)
    html_content = get_template(f"email/{template_base_name}.html").render(
        final_context
    )
    msg = EmailMultiAlternatives(
        subject, txt_content, settings.DEFAULT_FROM_EMAIL, to_addresses
    )
    msg.attach_alternative(html_content, "text/html")
    msg.send()


def send_dataset_finished(request, job_complete):
    """Send a Dataset finished email."""
    job_start = job_complete.job_start
    user = job_start.user
    job_name = job_start.job_type.name
    collection_name = job_start.collection.name
    context = {
        "username": user.username,
        "job_name": job_name,
        "collection_name": collection_name,
        "dataset_url": helpers(request)["abs_url"](
            "dataset-detail", args=(job_start.dataset_set.first().id,)
        ),
        "support_url": settings.ARCH_SUPPORT_TICKET_URL,
    }
    subject = f"ARCH: Your {job_name} dataset from {collection_name} is ready to use"
    send("dataset-finished", context, subject, (user.email,))


def send_custom_collection_finished(request, job_complete):
    """Send a User-defined Query / Custom Collection finished email."""
    job_start = job_complete.job_start
    user = job_start.user
    collection = job_start.collection
    collection_name = collection.name
    context = {
        "username": user.username,
        "collection_name": collection_name,
        "collection_url": helpers(request)["abs_url"](
            "collection-detail", args=(collection.id,)
        ),
        "support_url": settings.ARCH_SUPPORT_TICKET_URL,
    }
    subject = f"ARCH: Your custom collection “{collection_name}” is ready to use"
    send("custom-collection-finished", context, subject, (user.email,))


def send_dataset_publication_complete(request, job_complete):
    """Send a Dataset Publication complete email."""
    job_start = job_complete.job_start
    user = job_start.user
    collection = job_start.collection
    collection_name = collection.name
    # Retrieve the dataset indicated in the publication job input spec.
    dataset = JobStart.objects.get(
        id=job_start.parameters["conf"]["inputSpec"]["uuid"]
    ).dataset_set.first()
    context = {
        "username": user.username,
        "collection_name": collection_name,
        "collection_url": helpers(request)["abs_url"](
            "collection-detail", args=(collection.id,)
        ),
        "dataset_type_name": dataset.job_start.job_type.name,
        "dataset_url": helpers(request)["abs_url"](
            "dataset-detail", args=(dataset.id,)
        ),
        "metadata": job_start.parameters["conf"]["params"]["metadata"],
        "support_url": settings.ARCH_SUPPORT_TICKET_URL,
    }
    subject = "ARCH: Your dataset is published!"
    send("dataset-publication-complete", context, subject, (user.email,))


def send_job_failed(request, job_complete, send_user_email):
    """Maybe send a job failed email to internal staff members and the initiating user."""
    job_start = job_complete.job_start
    job_status = job_start.get_job_status()
    user = job_start.user
    job_type = job_start.job_type.name
    collection = job_start.collection
    context = {
        "job_uuid": job_start.id,
        "job_type": job_type,
        "job_admin_url": helpers(request)["abs_url"](
            "admin:keystone_jobstart_change", args=(job_start.id,)
        ),
        "collection": collection,
        "collection_admin_url": helpers(request)["abs_url"](
            "admin:keystone_collection_change", args=(collection.id,)
        ),
        "username": user.username,
        "user_admin_url": helpers(request)["abs_url"](
            "admin:keystone_user_change", args=(user.id,)
        ),
        "started_at": job_status.start_time.strftime("%Y-%m-%d %H:%M:%S"),
        "failed_at": job_status.finished_time.strftime("%Y-%m-%d %H:%M:%S"),
        "retry_url": f'{helpers(request)["abs_url"]("datasets-generate")}?cid={collection.id}',
        "support_url": settings.ARCH_SUPPORT_TICKET_URL,
    }
    internal_to_addresses = settings.STAFF_EMAIL_ADDRESSES
    if internal_to_addresses:
        send(
            template_base_name="job-failed-internal",
            context=context,
            subject=f"ARCH Job Failed: ({job_type}) on ({collection.name}) by ({user.username})",
            to_addresses=internal_to_addresses,
        )
    if send_user_email:
        send(
            template_base_name="job-failed-user",
            context=context,
            subject=f"ARCH error message: Your {job_type} dataset from {collection.name} failed",
            to_addresses=(user.email,),
        )
