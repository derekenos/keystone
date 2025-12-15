"""Core Django models for Keystone."""

from collections import defaultdict, namedtuple
from functools import reduce
from operator import or_

from django.contrib.auth.base_user import BaseUserManager
from django.contrib.auth.models import AbstractUser
from django.contrib.contenttypes.models import ContentType
from django.contrib.contenttypes.fields import GenericForeignKey
from django.contrib.postgres.indexes import GinIndex
from django.core.exceptions import MultipleObjectsReturned
from django.core.serializers.json import DjangoJSONEncoder
from django.db import models
from django.db import transaction
from django.db import IntegrityError
from django.db.models import Exists, F, Q, OuterRef, Prefetch
from django.db.models.functions import Lower
from django.db.models.signals import post_save
from django.dispatch import receiver

import uuid6
from django_resized import ResizedImageField

from config import settings
from .validators import (
    validate_and_clean_collection_metadata,
    validate_username,
)
from .helpers import is_uuid7
from .permissions import Permissions
from .plugins import get_plugin_apps

# Define a namedtuple to return from JobStart.get_job_status()
JobStatus = namedtuple("JobStatus", ("state", "start_time", "finished_time"))


def choice_constraint(field, choices):
    """Create a check constraint for a given Django model field name and Choices
    subclass. Check constraints are enforced in the database."""
    q_objects = (Q(**{field: choice[0]}) for choice in choices.choices)
    return models.CheckConstraint(
        check=reduce(or_, q_objects),
        name=f"check_valid_{field}",
    )


class AccountTypes(models.TextChoices):
    """The types of accounts"""

    STAFF = "STAFF", "Staff"
    SUBSCRIBER = "SUBSCRIBER", "Subscriber"
    TRIAL = "TRIAL", "Trial"


class Account(models.Model):
    """Top-level for a group of Users."""

    name = models.CharField(max_length=255, unique=True)
    max_users = models.PositiveIntegerField(default=10)
    created_at = models.DateTimeField(auto_now_add=True)
    type = models.CharField(
        choices=AccountTypes.choices, max_length=10, default=AccountTypes.TRIAL
    )
    is_active = models.BooleanField(default=True, blank=True)

    class Meta:
        constraints = [
            choice_constraint(field="type", choices=AccountTypes),
        ]

    def __str__(self):
        return self.name


class UserRoles(models.TextChoices):
    """The roles to which a user can be assigned"""

    ADMIN = "ADMIN", "Admin"
    USER = "USER", "User"


class User(AbstractUser):
    """Keystone user. Django Auth model."""

    username = models.CharField(
        max_length=150,
        unique=True,
        validators=[validate_username],
    )

    email = models.EmailField(unique=True)
    account = models.ForeignKey(Account, on_delete=models.PROTECT)
    role = models.CharField(
        choices=UserRoles.choices, default=UserRoles.USER, max_length=16
    )
    teams = models.ManyToManyField("Team", blank=True, related_name="members")

    REQUIRED_FIELDS = (*AbstractUser.REQUIRED_FIELDS, "account_id", "role")

    class Meta:
        constraints = [choice_constraint(field="role", choices=UserRoles)]
        permissions = [("change_role", "Can change user roles")]

    @property
    def arch_username(self):
        """Return the user's corresponding ARCH username."""
        if self.username == settings.GLOBAL_USER_USERNAME:
            return settings.ARCH_GLOBAL_USERNAME
        return f"ks:{self.username}"

    def save(self, *args, **kwargs):
        """Normalize the email address (i.e. lowercase the domain part) to prevent
        dupes."""
        self.email = BaseUserManager.normalize_email(self.email)
        super().save()

    def has_perm(self, perm, obj=None):
        """Return a bool indicate whether the user has the specified permission.
        If obj is specified and obj defines a user_has_perm() method, delegate
        to that method. Note that Django only ever invokes this method from ModelAdmin
        and never with a non-None obj value, so our handling here of non-None obj
        values is specific to our application.
        """
        # Inactive users don't have any permissions.
        if not self.is_active:
            return False
        # Superusers have all permissions.
        if self.is_superuser:
            return True
        # Delegate to any Model-defined user_has_perm() method.
        if obj and hasattr(obj, "user_has_perm"):
            return obj.user_has_perm(self, perm)
        # The superuser clause above covers Django admin use cases, and calls to
        # model.user_has_perm() covers all current application use cases, so deny
        # everything else.
        return False

    def user_has_perm(self, user, perm):
        """Users are allowed to view/change themselves, and admins are allowed to
        view/change any user within their account.
        """
        # To clarify, we are checking whether `user` has permission `perm` on `self`.
        is_account_admin = (
            user.role == UserRoles.ADMIN and user.account_id == self.account_id
        )
        match perm:
            case Permissions.VIEW_USER | Permissions.CHANGE_USER:
                # Users are allowed to view/change themselves, and admins are allowed to
                # view/change any user within their account.
                return user.id == self.id or is_account_admin
            case Permissions.ADD_USER:
                # Admins are allowed to create users within their own account.
                return is_account_admin
            case _:
                return False

    def __str__(self):
        return self.username

    @staticmethod
    @transaction.atomic
    def create_users_from_data_dict_list(user_data):
        """Create Users from a list of dictionaries of user data"""

        try:
            with transaction.atomic():
                for row in user_data:
                    User.objects.create(
                        password=row["password"],
                        first_name=row["first_name"],
                        last_name=row["last_name"],
                        username=row["username"],
                        email=row["email"],
                        is_staff=False,
                        is_active=True,
                        role="USER",
                        is_superuser=False,
                        account_id=row["account_id"],
                    )
            return None
        except IntegrityError as e:
            return str(e)


class Team(models.Model):
    """Users may be members of zero or more teams.
    Teams belong to a single Account.
    """

    name = models.CharField(max_length=255)
    account = models.ForeignKey(Account, on_delete=models.PROTECT)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        permissions = [
            ("manage_membership", "Can add or remove members from teams"),
        ]
        constraints = [
            models.UniqueConstraint(Lower("name"), "account", name="team_unique")
        ]

    def user_has_perm(self, user, perm):
        """Return a bool indicating whether the user is allowed the specified permission
        on this Team instance.
        """
        match perm:
            case Permissions.ADD_TEAM | Permissions.CHANGE_TEAM:
                # An admin has permission to create and change teams within their own account.
                return (
                    user.role == UserRoles.ADMIN and user.account_id == self.account_id
                )
            case _:
                return False

    def __str__(self):
        return self.name


class CollectionTypes(models.TextChoices):
    """ARCH can use different types of collections as inputs for Jobs."""

    AIT = "AIT", "Archive-It"
    SPECIAL = "SPECIAL", "Special"
    CUSTOM = "CUSTOM", "Custom"


class Collection(models.Model):
    """Collections are the main inputs for ARCH jobs."""

    arch_id = models.CharField(max_length=255, unique=True)
    name = models.CharField(max_length=255)
    description = models.TextField(null=True, blank=True)
    collection_type = models.CharField(choices=CollectionTypes.choices, max_length=16)
    accounts = models.ManyToManyField(Account, blank=True, related_name="collections")
    teams = models.ManyToManyField(Team, blank=True, related_name="collections")
    users = models.ManyToManyField(User, blank=True, related_name="collections")
    created_at = models.DateTimeField(auto_now_add=True)
    size_bytes = models.PositiveBigIntegerField(default=0)
    info_url = models.URLField(null=True, blank=True)
    image = ResizedImageField(
        size=[settings.COLLECTION_IMAGE_MAX_WIDTH_PX, None], null=True, blank=True
    )
    metadata = models.JSONField(
        encoder=DjangoJSONEncoder,
        null=True,
        blank=True,
        validators=(validate_and_clean_collection_metadata,),
    )

    class Meta:
        constraints = [
            choice_constraint(field="collection_type", choices=CollectionTypes),
        ]
        indexes = [
            GinIndex("metadata__input_spec", name="metadata__input_spec_idx"),
        ]

    def save(self, *args, **kwargs):
        """Validate and clean metadata prior to save."""
        # Field "validators will not be run automatically when you save a model"
        # https://docs.djangoproject.com/en/4.2/ref/validators/#how-validators-are-run
        # We're calling validate_and_clean_collection_metadata() here instead of
        # self.clean_fields() so that we can pass in the Collection instance itself to
        # verify agreement between collection_type and detected metadata type.
        self.metadata = validate_and_clean_collection_metadata(self.metadata, self)
        return super().save(*args, **kwargs)

    @classmethod
    def user_queryset(cls, user, include_opted_out=False):
        """Return a queryset comprising all Collections the user has access to.
        If include_opted_out is specified, also include collections for which the
        user has previously opted-out."""
        return (
            Collection.objects.filter(
                Q(users=user) | Q(accounts__user=user) | Q(teams__members=user)
            )
            # Prefetch any CollectionUserSettings instances for this collection/user.
            # Apply order_by so that using usersettings_set.first() to retrieve any single
            # existing instance will hit the prefetch cache instead of issuing a new query.
            .prefetch_related(
                Prefetch(
                    "usersettings_set",
                    queryset=CollectionUserSettings.objects.filter(user=user).order_by(
                        "id"
                    ),
                )
            )
            .filter(
                *(
                    ()
                    if include_opted_out
                    else (~CollectionUserSettings.user_opt_out_exists_filter(user),)
                ),
            )
            .distinct()
        )

    @classmethod
    def handle_job_event(cls, job_event):
        """Update a Custom Collection's metadata.state"""
        state = job_event.job_start.get_job_status().state
        collection = job_event.job_start.collection
        if collection.collection_type != CollectionTypes.CUSTOM:
            return
        collection.metadata["state"] = state
        collection.save()

    @classmethod
    def handle_job_complete(cls, job_complete):
        """Update a Custom Collection's size"""
        collection = job_complete.job_start.collection
        if collection.collection_type != CollectionTypes.CUSTOM:
            return
        collection.size_bytes = job_complete.output_bytes
        collection.save()

    @property
    def input_spec(self):
        """Return the ARCH InputSpec object dict for this collection."""
        # pylint: disable-next=cyclic-import
        from .schemas import (
            LegacyCollectionInputSpec,
            CDXDatasetInputSpec,
        )
        from .validators import validate_collection_metadata

        if self.collection_type in (CollectionTypes.AIT, CollectionTypes.SPECIAL):
            # Return any explicitly-defined input spec for SPECIAL-type collections.
            if (
                self.collection_type == CollectionTypes.SPECIAL
                and self.metadata
                and "input_spec" in self.metadata
                and self.metadata["input_spec"]
            ):
                return validate_collection_metadata(self.metadata, self).input_spec
            # Return a legacy collection-type input spec for AIT and SPECIAL collections.
            return LegacyCollectionInputSpec(collectionId=self.arch_id)
        # Handle CUSTOM collections.
        if self.collection_type == CollectionTypes.CUSTOM:
            if len(splits := self.arch_id.split("-", 1)) == 2 and is_uuid7(splits[1]):
                # Return a CDX dataset type input spec for UUID-based custom collections.
                return CDXDatasetInputSpec(uuid=splits[1])
            # Return a legacy collection-type input spec for legacy custom collections.
            return LegacyCollectionInputSpec(collectionId=self.arch_id)
        raise NotImplementedError

    @property
    def user_runnable_job_types(self):
        """Return a list of user-runnable JobTypes."""
        # Define a base queryset for runnable, non-deprecated, JobTypes.
        job_type_qs = JobType.get_user_runnable()
        if not self.input_spec.is_warc_type:
            job_type_qs = job_type_qs.exclude(id__in=settings.WARC_ONLY_JOB_IDS)
        return job_type_qs

    @classmethod
    def get_for_input_spec(cls, input_spec):
        """Return the collection that matches the specified InputSpec object."""
        if input_spec["type"] == "collection":
            return cls.objects.get(arch_id=input_spec["collectionId"])

        if input_spec["type"] == "dataset":
            if input_spec.get("inputType") == "cdx":
                return cls.objects.get(arch_id=f"CUSTOM-{input_spec['uuid']}")
            if "uuid" in input_spec:
                return JobStart.objects.get(id=input_spec["uuid"]).collection

        # Try to match against a SPECIAL collection metadata.input_spec.
        special_collections = Collection.objects.filter(
            collection_type=CollectionTypes.SPECIAL,
            metadata__isnull=False,
            metadata__input_spec=input_spec,
        ).all()

        num_matched = len(special_collections)
        if num_matched == 1:
            return special_collections[0]
        if num_matched > 1:
            raise MultipleObjectsReturned(
                f"Multiple SPECIAL Collections ({[c.id for c in special_collections]}) "
                f"matched input_spec: {input_spec}"
            )

        raise NotImplementedError(input_spec)

    def refresh_metadata(self):
        """Call on any compatible installed plugins to update this collection's metadata."""
        for plugin in get_plugin_apps():
            if plugin.is_collection_metadata_handler(self):
                plugin.update_collection_metadata(self, timeout_ms=100)

    def user_has_perm(self, user, perm):
        """Return a bool indicating whether the user is allowed the specified permission
        on this Collection instance.
        """
        match perm:
            case Permissions.VIEW_COLLECTION:
                # View permissions are dictated by user_queryset(). We'll additionally request
                # opted-out collections because these remain directly viewable by otherwise
                # authorized users.
                return (
                    self.user_queryset(user, include_opted_out=True)
                    .filter(id=self.id)
                    .exists()
                )
            case Permissions.CHANGE_COLLECTION:
                # Users are currently only allowed to modify non-opted-out custom
                # collections of which they are the creator (i.e. associated JobStart user)
                return (
                    JobStart.objects.filter(
                        collection=self,
                        job_type__id=settings.KnownArchJobUuids.USER_DEFINED_QUERY,
                        user_id=user.id,
                    )
                    .exclude(
                        CollectionUserSettings.user_opt_out_exists_filter(
                            user, "collection"
                        )
                    )
                    .exists()
                )
            case _:
                return False

    def __str__(self):
        return self.name


class CollectionUserSettings(models.Model):
    """Collection-specific user settings."""

    collection = models.ForeignKey(
        Collection, on_delete=models.PROTECT, related_name="usersettings_set"
    )
    user = models.ForeignKey(User, on_delete=models.PROTECT)
    opt_out = models.BooleanField(default=False, blank=True)

    @classmethod
    def user_opt_out_exists_filter(cls, user, collection_path="pk"):
        """Return an Exists() clause that checks for whether the specified user
        has an opt_out=True setting for the referenced collection.
        """
        return Exists(
            cls.objects.filter(
                collection=OuterRef(collection_path), user=user, opt_out=True
            )
        )

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=("collection", "user"), name="collectionusersettings_unique"
            )
        ]


class ArchQuota(models.Model):
    """ArchQuotas can be assigned to Accounts, Teams, and Users.
    `content_type`, `object_id`, and `content_object` generically link ArchQuotas
    to one of those three models.
    """

    # TODO: audit quota changes
    content_type = models.ForeignKey(ContentType, on_delete=models.CASCADE)
    object_id = models.PositiveBigIntegerField()
    content_object = GenericForeignKey("content_type", "object_id")
    quota_input_bytes = models.PositiveBigIntegerField()
    quota_output_bytes = models.PositiveBigIntegerField()
    quota_download_bytes = models.PositiveBigIntegerField()
    quota_dom = models.PositiveSmallIntegerField()
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        indexes = [
            models.Index(fields=["content_type", "object_id"]),
        ]

    @classmethod
    def fetch_for_user(cls, user):
        """Return all ArchQuotas that apply to this user."""
        content_types = ContentType.objects.get_for_models(Account, Team, User)
        quotas = ArchQuota.objects.filter(
            Q(content_type=content_types[Account], object_id=user.account_id)
            | Q(content_type=content_types[Team], object_id__in=user.teams.all())
            | Q(content_type=content_types[User], object_id=user.id)
        )
        quota_dict = defaultdict(list)
        for quota in quotas:
            if quota.content_type == content_types[Account]:
                quota_dict[Account] = quota
            if quota.content_type == content_types[Team]:
                quota_dict[Team].append(quota)
            if quota.content_type == content_types[User]:
                quota_dict[User] = quota
        return quota_dict


class JobCategory(models.Model):
    """JobCategory represents JobType categories."""

    name = models.CharField(max_length=255, unique=True)
    description = models.CharField(max_length=255)


class JobType(models.Model):
    """JobTypes are the things we do in ARCH. We say JobType to disambiguate from
    any particular Job execution."""

    id = models.UUIDField(primary_key=True, default=uuid6.uuid7)
    name = models.CharField(max_length=255)
    category = models.ForeignKey(JobCategory, on_delete=models.PROTECT)
    description = models.TextField()
    can_run = models.BooleanField()
    can_publish = models.BooleanField()
    input_quota_eligible = models.BooleanField()
    output_quota_eligible = models.BooleanField()
    download_quota_eligible = models.BooleanField()
    created_at = models.DateTimeField(auto_now_add=True)
    parameters_schema = models.JSONField(null=True)
    info_url = models.URLField()
    code_url = models.URLField()

    @classmethod
    def get_user_runnable(cls):
        """Return a queryset of runnable, non-deprecated JobTypes."""
        return cls.objects.filter(can_run=True).exclude(
            Q(
                id__in=(
                    settings.KnownArchJobUuids.NAMED_ENTITIES,
                    settings.KnownArchJobUuids.ARCHIVESPARK_ENTITY_EXTRACTION_CHINESE,
                )
            )
            | Q(category__name="")
        )

    def __str__(self):
        return f"{self.id} - {self.name}"


class JobEventTypes(models.TextChoices):
    """ARCH can use different types of collections as inputs for Jobs."""

    # Choices are ordered from less to more advanced state.
    SUBMITTED = "SUBMITTED", "Submitted"
    QUEUED = "QUEUED", "Queued"
    RUNNING = "RUNNING", "Running"
    FINISHED = "FINISHED", "Finished"
    FAILED = "FAILED", "Failed"
    CANCELLED = "CANCELLED", "Cancelled"

    @classmethod
    def is_terminal(cls, name) -> bool:
        """Return a bool indicating whether an event type is terminal."""
        return cls.names.index(name) > cls.names.index(cls.RUNNING)


class JobStart(models.Model):
    """There should be a JobStart record each time a user runs a job."""

    id = models.UUIDField(primary_key=True, default=uuid6.uuid7, editable=False)
    collection = models.ForeignKey(Collection, on_delete=models.PROTECT)
    job_type = models.ForeignKey(JobType, on_delete=models.PROTECT)
    user = models.ForeignKey(User, on_delete=models.PROTECT)
    quotas = models.ManyToManyField(ArchQuota)
    input_bytes = models.PositiveBigIntegerField(default=0)
    sample = models.BooleanField(default=False)
    parameters = models.JSONField(null=False, blank=False)
    commit_hash = models.CharField(max_length=255)
    created_at = models.DateTimeField()

    def get_job_status(self):
        """Return a (state, start_time, finished_time) tuple representing the
        current state of the associated job."""
        job_events = self.jobevent_set.order_by("-created_at").all()
        # Return an empty JobStatus object if no JobEvents exist.
        if not job_events:
            return JobStatus(None, None, None)
        latest_job_event = job_events[0]
        latest_job_event_type = latest_job_event.event_type

        # Set start_time to the most recent RUNNING or QUEUED JobEvent, and if no
        # such event exists, fall back to JobStart.created_at.
        start_time = next(
            (
                job_event.created_at
                for job_event in job_events
                if job_event.event_type in (JobEventTypes.QUEUED, JobEventTypes.RUNNING)
            ),
            latest_job_event.job_start.created_at,
        )

        # Set finished_time to the created_at value of latest event if terminal,
        # or None if not terminal.
        finished_time = (
            latest_job_event.created_at
            if JobEventTypes.is_terminal(latest_job_event_type)
            else None
        )

        return JobStatus(latest_job_event_type, start_time, finished_time)


@receiver(post_save, sender=JobStart)
def job_start_post_save(sender, instance, **kwargs):  # pylint: disable=unused-argument
    """Maybe create a Dataset instance."""
    if kwargs["created"] and instance.job_type.can_run:
        Dataset.handle_job_start(instance)


class JobComplete(models.Model):
    """JobComplete tracks completed JobStarts against Quotas."""

    job_start = models.OneToOneField(JobStart, on_delete=models.PROTECT)
    output_bytes = models.PositiveBigIntegerField()
    created_at = models.DateTimeField()


@receiver(post_save, sender=JobComplete)
def job_complete_post_save(
    sender, instance, **kwargs
):  # pylint: disable=unused-argument
    """Maybe finalize a custom Collection instance in response to a JobComplete."""
    user_defined_query_type = JobType.objects.get(
        id=settings.KnownArchJobUuids.USER_DEFINED_QUERY
    )
    if instance.job_start.job_type == user_defined_query_type:
        Collection.handle_job_complete(instance)


class JobFile(models.Model):
    """A JobFile represents a single derivative file generated by a job run"""

    job_complete = models.ForeignKey(JobComplete, on_delete=models.PROTECT)
    filename = models.CharField(max_length=255)
    size_bytes = models.PositiveBigIntegerField()
    mime_type = models.CharField(max_length=255)
    line_count = models.PositiveBigIntegerField()
    file_type = models.CharField(max_length=32)
    creation_time = models.DateTimeField()
    md5_checksum = models.CharField(max_length=128, null=True)
    access_token = models.CharField(max_length=32)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["job_complete", "filename"], name="jobfile_unique"
            )
        ]


class JobEvent(models.Model):
    """jobEvent tracks the events that occur during a job run, eg.queued, running, etc."""

    job_start = models.ForeignKey(JobStart, on_delete=models.PROTECT)
    event_type = models.CharField(choices=JobEventTypes.choices, max_length=16)
    created_at = models.DateTimeField()


@receiver(post_save, sender=JobEvent)
def job_event_post_save(sender, instance, **kwargs):  # pylint: disable=unused-argument
    """Maybe update a Dataset or custom Collection instance in response to a JobEvent."""
    user_defined_query_type = JobType.objects.get(
        id=settings.KnownArchJobUuids.USER_DEFINED_QUERY
    )
    job_type = instance.job_start.job_type
    if job_type == user_defined_query_type:
        Collection.handle_job_event(instance)
    elif job_type.can_run:
        Dataset.handle_job_event(instance)


class Dataset(models.Model):
    """A Dataset represents an in-progress or completed Job."""

    job_start = models.ForeignKey(JobStart, on_delete=models.PROTECT)
    state = models.CharField(choices=JobEventTypes.choices, max_length=16)
    start_time = models.DateTimeField(auto_now_add=True)
    finished_time = models.DateTimeField(null=True)
    teams = models.ManyToManyField("Team", blank=True, related_name="datasets")

    class Meta:
        permissions = (
            ("change_dataset_teams", "Change Dataset Teams"),
            ("publish_dataset", "Publish a Dataset"),
        )

    def get_download_filename(self, jobfile_filename, preview=False):
        """Prefix the JobFile filename with the Keystone Dataset and Collection
        IDs to serve as the download filename."""
        return (
            f"ARCH-{self.job_start.collection.id}_{self.id}"
            f"{'_preview' if preview else ''}"
            # Strip .gz extension from previews which are delivered uncompressed.
            f"_{jobfile_filename.rstrip('.gz') if preview else jobfile_filename}"
        )

    @classmethod
    def user_queryset(cls, user):
        """Return a queryset that constrains access to the specified user."""
        # Include datasets which are either:
        #  - owned by the specified user
        #  - authorized for a team of which the owner and user are both members
        #  - owned by the global datasets user, is associated with a
        #    collection for which the user has been directly authorized via
        #    collection.users, and the user is a member of the Global Datasets team.
        #  AND of which the associated collection the user has not opted out
        return Dataset.objects.filter(
            Q(job_start__user=user)
            | (Q(teams=F("job_start__user__teams")) & Q(teams__members=user))
            | (
                Q(job_start__user__username=settings.GLOBAL_USER_USERNAME)
                & Q(job_start__collection__users=user)
                & Exists(user.teams.filter(name=settings.GLOBAL_DATASETS_TEAM_NAME))
            ),
            ~CollectionUserSettings.user_opt_out_exists_filter(
                user,
                collection_path="job_start__collection",
            ),
        ).distinct()

    @classmethod
    def handle_job_start(cls, job_start):
        """Create a new Dataset for each relevent JobStart."""
        cls.objects.create(job_start=job_start, state=JobEventTypes.SUBMITTED)

    @classmethod
    def handle_job_event(cls, job_event):
        """Update a Dataset in response to a JobEvent save."""
        state, start_time, finished_time = job_event.job_start.get_job_status()

        # Update the Dataset.
        dataset = cls.objects.get(job_start=job_event.job_start)
        dataset.state = state
        dataset.start_time = start_time
        dataset.finished_time = finished_time
        dataset.save()

    def user_has_perm(self, user, perm):
        """Return a bool indicating whether the user is allowed the specified permission
        on this Dataset instance.
        """
        match perm:
            case Permissions.VIEW_DATASET:
                # View permissions are dictated by user_queryset().
                return self.user_queryset(user).filter(id=self.id).exists()
            case Permissions.CHANGE_DATASET_TEAMS | Permissions.PUBLISH_DATASET:
                # A Dataset creator is allowed to change associated teams and publish.
                return user.id == self.job_start.user_id
            case _:
                return False
